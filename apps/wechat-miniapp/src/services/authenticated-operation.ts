import { MINIAPP_API_BASE_PATH, MINIAPP_API_OPERATIONS, type ApiEnvelope, type AuthSessionData, type MiniappApiJsonOperationId, type MiniappApiRequest, type MiniappApiResponse } from "@starward/miniapp-contracts";
export type AuthPolicy = "NONE" | "OPTIONAL" | "REQUIRED";
export interface RequestOperationScope {
  assertCurrent(): void;
  renewSession<T>(action: () => Promise<T>): Promise<T>;
}
interface OperationDependencies {
  resolveSession(policy: AuthPolicy): Promise<AuthSessionData | null>;
  readStoredSession(): AuthSessionData | null;
  clearStoredSession(rejected?: AuthSessionData): void;
  isPermissionDenied(error: unknown): boolean;
  request<T>(key: string, path: string, options: { method?: "GET" | "POST" | "PUT" | "DELETE"; body?: unknown; idempotencyKey?: string; signal?: AbortSignal; session?: AuthSessionData | null; reauthenticationCode?: string; cache?: boolean; independent?: boolean }): Promise<ApiEnvelope<T>>;
}
/** Generated endpoint projection and account-bound reauthentication; transport/cache stay injected. */
export function createAuthenticatedOperationRequester(deps: OperationDependencies) {
  const { resolveSession, readStoredSession, clearStoredSession, request, isPermissionDenied } = deps;
type OperationData<K extends MiniappApiJsonOperationId> =
  MiniappApiResponse<K>["data"];

function operationPath(
  operationId: MiniappApiJsonOperationId,
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

async function requestOperation<K extends MiniappApiJsonOperationId>(
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
    independent?: boolean;
    scope?: RequestOperationScope | undefined;
  } = {},
  retried = false,
  expectedUserId?: string,
): Promise<MiniappApiResponse<K>> {
  const policy = options.auth ?? "NONE";
  options.scope?.assertCurrent();
  const session = await resolveSession(policy);
  options.scope?.assertCurrent();
  if (expectedUserId && session?.userId !== expectedUserId) {
    throw new Error("账户已变化，请重新打开页面后再操作。");
  }
  try {
    const result = (await request<OperationData<K>>(
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
        ...(options.independent ? { independent: true } : {}),
      },
    )) as MiniappApiResponse<K>;
    options.scope?.assertCurrent();
    return result;
  } catch (error) {
    // An already sent request cannot be undone; a retired intent cannot renew identity or resend it.
    options.scope?.assertCurrent();
    if (
      !retried &&
      !options.reauthenticationCode &&
      policy !== "NONE" &&
      isPermissionDenied(error)
    ) {
      const currentSession = readStoredSession();
      if (currentSession && currentSession.userId !== session?.userId) throw error;
      const renew = async () => {
        if (session && (!currentSession || currentSession.accessToken === session.accessToken))
          clearStoredSession(session);
        return requestOperation(key, operationId, options, true, session?.userId);
      };
      return options.scope ? options.scope.renewSession(renew) : renew();
    }
    throw error;
  }
}

  return requestOperation;
}
