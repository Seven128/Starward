import {
  AbortMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  CopyObjectCommand,
  CreateMultipartUploadCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  S3Client,
  UploadPartCopyCommand,
} from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { randomUUID } from "node:crypto";
import { PassThrough } from "node:stream";
import type { StagedImmutableRawSink, StagedImmutableRawUpload } from "./index";

const SINGLE_COPY_LIMIT = 5 * 1024 ** 3;
const COPY_PART_SIZE = 512 * 1024 ** 2;

export interface S3CommandClient {
  send(command: unknown): Promise<Record<string, any>>;
}

export interface MultipartUploadLike {
  done(): Promise<Record<string, any>>;
  abort(): Promise<void>;
}

export interface S3StagedImmutableRawSinkOptions {
  environment: "staging" | "production";
  endpoint: string;
  region: string;
  bucket: string;
  credentials?: { accessKeyId: string; secretAccessKey: string; sessionToken?: string };
  forcePathStyle?: boolean;
  stagingPrefix?: string;
  serverSideEncryption?: "AES256" | "aws:kms";
  sseKmsKeyId?: string;
  client?: S3CommandClient;
  uploadFactory?: (input: { client: S3CommandClient; params: Record<string, unknown> }) => MultipartUploadLike;
}

function normalizeMetadata(input: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(input).map(([key, value]) => [key.toLowerCase().replace(/[^a-z0-9._-]+/gu, "-"), value]));
}

function isMissing(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const value = error as { name?: string; $metadata?: { httpStatusCode?: number } };
  return value.name === "NotFound" || value.name === "NoSuchKey" || value.$metadata?.httpStatusCode === 404;
}

function copySource(bucket: string, key: string): string {
  return `${encodeURIComponent(bucket)}/${key.split("/").map(encodeURIComponent).join("/")}`;
}

function writeChunk(stream: PassThrough, chunk: Uint8Array): Promise<void> {
  return new Promise((resolve, reject) => {
    stream.write(Buffer.from(chunk), (error) => error ? reject(error) : resolve());
  });
}

function endStream(stream: PassThrough): Promise<void> {
  return new Promise((resolve, reject) => stream.end((error?: Error | null) => error ? reject(error) : resolve()));
}

export class S3StagedImmutableRawSink implements StagedImmutableRawSink {
  private readonly client: S3CommandClient;
  private readonly stagingPrefix: string;

  constructor(private readonly options: S3StagedImmutableRawSinkOptions) {
    const endpoint = new URL(options.endpoint);
    const localStagingHost = ["localhost", "127.0.0.1", "minio"].includes(endpoint.hostname);
    if (endpoint.protocol !== "https:" && !(options.environment === "staging" && endpoint.protocol === "http:" && localStagingHost)) {
      throw new TypeError("object_store_https_required");
    }
    if (!options.bucket.trim()) throw new TypeError("object_store_bucket_required");
    if (options.credentials && (!options.credentials.accessKeyId || !options.credentials.secretAccessKey)) throw new TypeError("object_store_credentials_incomplete");
    if (options.serverSideEncryption === "aws:kms" && !options.sseKmsKeyId) throw new TypeError("object_store_kms_key_required");
    this.stagingPrefix = (options.stagingPrefix ?? "_staging/raw-ingest").replace(/^\/+|\/+$/gu, "");
    this.client = options.client ?? new S3Client({
      endpoint: endpoint.toString(),
      region: options.region,
      credentials: options.credentials,
      forcePathStyle: options.forcePathStyle,
      followRegionRedirects: false,
    }) as unknown as S3CommandClient;
  }

  async begin(input: { stagingHint: string; metadata: Record<string, string> }): Promise<StagedImmutableRawUpload> {
    const temporaryKey = `${this.stagingPrefix}/${randomUUID()}`;
    const stream = new PassThrough({ highWaterMark: 8 * 1024 ** 2 });
    const metadata = normalizeMetadata({ ...input.metadata, stagingHint: input.stagingHint });
    const params = {
      Bucket: this.options.bucket,
      Key: temporaryKey,
      Body: stream,
      Metadata: metadata,
      ServerSideEncryption: this.options.serverSideEncryption,
      SSEKMSKeyId: this.options.sseKmsKeyId,
    };
    const upload = this.options.uploadFactory
      ? this.options.uploadFactory({ client: this.client, params })
      : new Upload({
        client: this.client as unknown as S3Client,
        params,
        queueSize: 2,
        partSize: 8 * 1024 ** 2,
        leavePartsOnError: false,
      });
    const uploadDone = upload.done();
    void uploadDone.catch(() => undefined);
    let closed = false;

    const removeTemporary = async () => {
      await this.client.send(new DeleteObjectCommand({ Bucket: this.options.bucket, Key: temporaryKey }));
    };

    const copyLargeObject = async (targetKey: string, bytes: number, finalMetadata: Record<string, string>) => {
      const created = await this.client.send(new CreateMultipartUploadCommand({
        Bucket: this.options.bucket,
        Key: targetKey,
        Metadata: finalMetadata,
        ServerSideEncryption: this.options.serverSideEncryption,
        SSEKMSKeyId: this.options.sseKmsKeyId,
      }));
      const uploadId = String(created.UploadId ?? "");
      if (!uploadId) throw new Error("object_store_copy_upload_id_missing");
      const parts: Array<{ ETag: string; PartNumber: number }> = [];
      try {
        for (let start = 0, partNumber = 1; start < bytes; start += COPY_PART_SIZE, partNumber += 1) {
          const end = Math.min(bytes - 1, start + COPY_PART_SIZE - 1);
          const copied = await this.client.send(new UploadPartCopyCommand({
            Bucket: this.options.bucket,
            Key: targetKey,
            UploadId: uploadId,
            PartNumber: partNumber,
            CopySource: copySource(this.options.bucket, temporaryKey),
            CopySourceRange: `bytes=${start}-${end}`,
          }));
          const etag = String(copied.CopyPartResult?.ETag ?? "");
          if (!etag) throw new Error("object_store_copy_part_etag_missing");
          parts.push({ ETag: etag, PartNumber: partNumber });
        }
        return await this.client.send(new CompleteMultipartUploadCommand({
          Bucket: this.options.bucket,
          Key: targetKey,
          UploadId: uploadId,
          MultipartUpload: { Parts: parts },
        }));
      } catch (error) {
        await this.client.send(new AbortMultipartUploadCommand({ Bucket: this.options.bucket, Key: targetKey, UploadId: uploadId })).catch(() => undefined);
        throw error;
      }
    };

    return {
      write: async (chunk) => {
        if (closed) throw new Error("object_store_staged_upload_closed");
        await writeChunk(stream, chunk);
      },
      commit: async ({ key, sha256, bytes, metadata: sourceMetadata }) => {
        if (closed) throw new Error("object_store_staged_upload_closed");
        closed = true;
        await endStream(stream);
        await uploadDone;
        if (bytes > 5 * 1024 ** 4) throw new RangeError("object_store_object_too_large");
        const finalMetadata = normalizeMetadata({ ...sourceMetadata, sha256, bytes: String(bytes) });
        try {
          const existing = await this.client.send(new HeadObjectCommand({ Bucket: this.options.bucket, Key: key }));
          if (Number(existing.ContentLength) !== bytes || existing.Metadata?.sha256 !== sha256) throw new Error("immutable_object_key_conflict");
          await removeTemporary();
          return { stored: false, versionId: String(existing.VersionId ?? existing.ETag ?? `existing:${sha256}`) };
        } catch (error) {
          if (!isMissing(error)) throw error;
        }
        const copied = bytes <= SINGLE_COPY_LIMIT
          ? await this.client.send(new CopyObjectCommand({
            Bucket: this.options.bucket,
            Key: key,
            CopySource: copySource(this.options.bucket, temporaryKey),
            Metadata: finalMetadata,
            MetadataDirective: "REPLACE",
            ServerSideEncryption: this.options.serverSideEncryption,
            SSEKMSKeyId: this.options.sseKmsKeyId,
          }))
          : await copyLargeObject(key, bytes, finalMetadata);
        await removeTemporary();
        return { stored: true, versionId: String(copied.VersionId ?? copied.CopyObjectResult?.ETag ?? `sha256:${sha256}`) };
      },
      abort: async (reason) => {
        if (!closed) {
          closed = true;
          stream.destroy(new Error(reason));
        }
        await Promise.allSettled([upload.abort(), uploadDone, removeTemporary()]);
      },
    };
  }
}
