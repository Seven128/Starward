import { randomUUID } from "node:crypto";
import type { ArgumentsHost, ExceptionFilter } from "@nestjs/common";
import { Catch, HttpException } from "@nestjs/common";
import { SpotPublicationBlockedError } from "./spot-completeness-policy.ts";

export function classifyExceptionMessage(message: string) {
  if (/not_found/u.test(message))
    return { status: 404, code: "NOT_FOUND", retryable: false } as const;
  if (/conflict|revision|not_editable|already_resolved/u.test(message))
    return { status: 409, code: "CONFLICT", retryable: true } as const;
  if (/admin_auth|permission|identity_scope|auth_(?:header_invalid|required|session)/u.test(message))
    return { status: 403, code: "PERMISSION_DENIED", retryable: false } as const;
  if (/expired/u.test(message))
    return { status: 410, code: "STALE_REJECTED", retryable: false } as const;
  if (/budget/u.test(message))
    return { status: 429, code: "BUDGET_EXCEEDED", retryable: true } as const;
  if (/provider/u.test(message))
    return { status: 503, code: "PROVIDER_UNAVAILABLE", retryable: true } as const;
  if (/capability|requires_postgres|schema_missing/u.test(message))
    return { status: 503, code: "CAPABILITY_DISABLED", retryable: false } as const;
  if (/invalid|required|unsupported|closure|incomplete|too_short|mismatch|rights|consent/u.test(message))
    return { status: 400, code: "INVALID_INPUT", retryable: false } as const;
  return { status: 500, code: "PROVIDER_UNAVAILABLE", retryable: true } as const;
}

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const response = context.getResponse();
    const request = context.getRequest<{ headers?: Record<string, unknown> }>();
    const message = exception instanceof Error ? exception.message : "unknown";
    const requestId =
      typeof request.headers?.["x-request-id"] === "string" &&
      /^[a-zA-Z0-9._:-]{8,128}$/u.test(request.headers["x-request-id"] as string)
        ? (request.headers["x-request-id"] as string)
        : randomUUID();
    if (exception instanceof SpotPublicationBlockedError) {
      response.status(422).send({
        code: "INVALID_INPUT",
        message: "SPOT_PUBLICATION_INCOMPLETE",
        retryable: false,
        recovery: ["COMPLETE_MISSING_SPOT_EVIDENCE", "REVIEW_AND_RETRY"],
        requestId,
        details: exception.assessment,
      });
      return;
    }
    const classified =
      exception instanceof HttpException
        ? {
            status: exception.getStatus(),
            code: exception.getStatus() === 404 ? "NOT_FOUND" : "INVALID_INPUT",
            retryable: false,
          }
        : classifyExceptionMessage(message);
    response.status(classified.status).send({
      code: classified.code,
      message: classified.code,
      retryable: classified.retryable,
      recovery:
        classified.code === "CONFLICT"
          ? ["REFETCH", "PRESERVE_DRAFT", "RETRY"]
          : classified.retryable
            ? ["RETRY", "USE_STABLE_FALLBACK"]
            : ["CORRECT_INPUT_OR_USE_AVAILABLE_FALLBACK"],
      requestId,
    });
  }
}
