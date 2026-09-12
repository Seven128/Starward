/** App-owned identity; never a write to the user's WeChat profile. */
export interface AccountProfileRecord {
  nickname: string | null;
  avatar: AccountAvatarMetadata | null;
  revision: number;
  updatedAt: string;
}

export type AccountAvatarMimeType = "image/jpeg" | "image/png" | "image/webp";

export interface AccountAvatarMetadata {
  version: string;
  mimeType: AccountAvatarMimeType;
  zoom: number;
}

export interface AccountAvatarData extends AccountAvatarMetadata {
  dataBase64: string;
}

export interface AccountAvatarSaveRequest {
  dataBase64: string;
  mimeType: AccountAvatarMimeType;
  declaredByteSize: number;
  zoom: number;
  expectedRevision: number;
}

export interface AccountNicknameSaveRequest {
  nickname: string;
  expectedRevision: number;
}

export function normalizeAccountNickname(value: unknown): string {
  if (typeof value !== "string") throw new Error("account_nickname_invalid");
  const nickname = value.trim().normalize("NFC");
  if (!nickname || [...nickname].length > 40 || /[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/u.test(nickname))
    throw new Error("account_nickname_invalid");
  return nickname;
}
