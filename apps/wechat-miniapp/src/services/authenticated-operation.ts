import { MINIAPP_API_BASE_PATH, MINIAPP_API_OPERATIONS, type ApiEnvelope, type AuthSessionData, type MiniappApiOperationId, type MiniappApiRequest, type MiniappApiResponse } from "@starward/miniapp-contracts";
export type AuthPolicy = "NONE" | "OPTIONAL" | "REQUIRED";
interface OperationDependencies {
  resolveSession(policy: AuthPolicy): Promise<AuthSessionData | null>;
  readStoredSession(): AuthSessionData | null;
  clearStoredSession(): void;
  isPermissionDenied(error: unknown): boolean;
  request<T>(key: string, path: string, options: { method?: "GET" | "POST" | "PUT" | "DELETE"; body?: unknown; idempotencyKey?: string; signal?: AbortSignal; session?: AuthSessionData | null; reauthenticationCode?: string; cache?: boolean }): Promise<ApiEnvelope<T>>;
}
/** Generated endpoint projection and account-bound reauthentication; transport/cache stay injected. */
export function createAuthenticatedOperationRequester(deps: OperationDependencies) {
  const { resolveSession, readStoredSession, clearStoredSession, request, isPermissionDenied } = deps;
type OperationData<K extends MiniappApiOperationId> =
  MiniappApiResponse<K>["data"];

function operationPath(
  operationId: MiniappApiOperationId,
  pathParams: Readonly<Record<string, string>> = {},
  query = "",
) {
  let value: string = MINIAPP_API_OPERATIONS[operationId].path;
  for (const [key, replacement] of Object.entries(pathParams))
    value = value.replace(
      "{" + key + "}",
      encodeURIComponent(replacement),
    );
  if (/\{[^}]+\}/u.test(value))
    throw new Error(
      "miniapp_sdk_path_parameter_missing:" + operationId,
    );
  const path = MINIAPP_API_BASE_PATH + value;
  return query ? path + "?" + query : path;
}

async function requestOperation<K extends MiniappApiOperationId>(
  key: string,
  operationId: K,
  options: {
    pathParams?: Readonly<Record<string, string>>;
    query?: string;
    body?: MiniappApiRequest<K>;
    idempotencyKey?: string;
    signal?: AbortSignal;
    auth?: AuthPolicy;
    reauthenticationCode?: string;
    cache?: boolean;
  } = {},
  retried = false,
  expectedUserId?: string,
): Promise<MiniappApiResponse<K>> {
  const policy = options.auth ?? "NONE";
  const session = await resolveSession(policy);
  if (expectedUserId && session?.userId !== expectedUserId) {
    throw new Error("账户已变化，请重新打开页面后再操作。");
  }
  try {
    return (await request<OperationData<K>>(
      key,
      operationPath(operationId, options.pathParams, options.query),
      {
        method: MINIAPP_API_OPERATIONS[operationId].method,
        ...(options.body === undefined ? {} : { body: options.body }),
        ...(options.idempotencyKey
          ? { idempotencyKey: options.idempotencyKey }
          : {}),
        ...(options.signal ? { signal: options.signal } : {}),
        ...(session ? { session } : {}),
        ...(options.reauthenticationCode ? { reauthenticationCode: options.reauthenticationCode } : {}),
        ...(options.cache === undefined ? {} : { cache: options.cache }),
      },
    )) as MiniappApiResponse<K>;
  } catch (error) {
    if (
      !retried &&
      !options.reauthenticationCode &&
      policy !== "NONE" &&
      isPermissionDenied(error)
    ) {
      const currentSession = readStoredSession();
      if (currentSession && currentSession.userId !== session?.userId) throw error;
      clearStoredSession();
      return requestOperation(key, operationId, options, true, session?.userId);
    }
    throw error;
  }
}

  return requestOperation;
}
