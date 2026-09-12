import { normalizeAccountNickname, type AccountAvatarSaveRequest, type AccountNicknameSaveRequest } from "@starward/miniapp-contracts";
import type { createAuthenticatedOperationRequester } from "./authenticated-operation";
import { createMutationRetry } from "./mutation-retry";

export function createAccountProfileClient(deps: {
  request: ReturnType<typeof createAuthenticatedOperationRequester>;
  currentUser(): string | null;
  makeKey(): string;
  invalidate(): Promise<void>;
}) {
  const retry = createMutationRetry(deps.makeKey);
  const check = (owner: string) => {
    if (!owner || deps.currentUser() !== owner) throw new Error("账户已变化，请重新打开个人资料。");
  };
  return {
    async getAccountProfile(owner: string, signal?: AbortSignal) {
      check(owner);
      const result = await deps.request("account-profile", "accountProfileGet", {
        auth: "REQUIRED", cache: false, ...(signal ? { signal } : {}),
      }, false, owner);
      check(owner);
      return result;
    },
    async saveAccountNickname(owner: string, input: AccountNicknameSaveRequest) {
      check(owner);
      const body = { ...input, nickname: normalizeAccountNickname(input.nickname) };
      const result = await retry(owner, body, key => deps.request("account-profile-mutation", "accountNicknamePut", {
        auth: "REQUIRED", body, idempotencyKey: key,
      }, false, owner));
      check(owner);
      await deps.invalidate();
      check(owner);
      return result;
    },
    async getAccountAvatar(owner: string, signal?: AbortSignal) {
      check(owner);
      const result = await deps.request("account-avatar", "accountAvatarGet", {
        auth: "REQUIRED", cache: false, ...(signal ? { signal } : {}),
      }, false, owner);
      check(owner);
      return result;
    },
    async saveAccountAvatar(owner: string, input: AccountAvatarSaveRequest) {
      check(owner);
      const result = await retry(owner + ":avatar", input, key => deps.request("account-avatar-mutation", "accountAvatarPut", {
        auth: "REQUIRED", body: input, idempotencyKey: key,
      }, false, owner));
      check(owner);
      await deps.invalidate();
      check(owner);
      return result;
    },
  };
}
