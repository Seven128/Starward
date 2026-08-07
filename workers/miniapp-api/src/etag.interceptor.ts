import type {
  CallHandler,
  ExecutionContext,
  NestInterceptor,
} from "@nestjs/common";
import { Injectable } from "@nestjs/common";
import { map, type Observable } from "rxjs";

interface ConditionalEnvelope {
  etag: string;
}

function hasEtag(value: unknown): value is ConditionalEnvelope {
  return (
    typeof value === "object" &&
    value !== null &&
    "etag" in value &&
    typeof (value as { etag?: unknown }).etag === "string"
  );
}

@Injectable()
export class EtagInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<{
      method?: string;
      headers?: Record<string, string | string[] | undefined>;
    }>();
    const response = http.getResponse<{
      header(name: string, value: string): void;
      status(code: number): void;
    }>();
    return next.handle().pipe(
      map((payload: unknown) => {
        if (request.method !== "GET" || !hasEtag(payload)) return payload;
        response.header("ETag", payload.etag);
        response.header("Cache-Control", "private, max-age=0, must-revalidate");
        response.header("Vary", "If-None-Match");
        const candidate = request.headers?.["if-none-match"];
        const supplied = Array.isArray(candidate) ? candidate[0] : candidate;
        if (supplied === payload.etag) {
          response.status(304);
          return undefined;
        }
        return payload;
      }),
    );
  }
}
