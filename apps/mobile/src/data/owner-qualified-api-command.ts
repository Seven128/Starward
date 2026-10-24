import { createPendingApiCommand, type CommandInput, type PendingCommandStorage } from "./pending-api-command";

export interface CommandOwnerQualification<Schema extends string = string> { schemaVersion: Schema; ownerId: string }
export type OwnerQualifiedCommand<C, Schema extends string> = C & { ownerQualification?: CommandOwnerQualification<Schema>; requestedOwnerId?: string | null };
function qualified<Schema extends string>(value: unknown, schemaVersion: Schema): value is CommandOwnerQualification<Schema> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const item = value as Record<string, unknown>;
  return Object.keys(item).length === 2 && item.schemaVersion === schemaVersion
    && typeof item.ownerId === "string" && !!item.ownerId.trim() && !/[\u0000-\u001f]/u.test(item.ownerId);
}
function wire<C, Schema extends string>(value: OwnerQualifiedCommand<C, Schema>): C {
  const { ownerQualification: _qualification, requestedOwnerId: _requested, ...command } = value;
  return command as C;
}
/** Shared attempt lifecycle; domain validation, authority acquisition and HTTP
 * readback remain with each real client. Existing unqualified bytes stay unknown. */
export function createOwnerQualifiedApiCommand<C extends { idempotencyKey: string }, T, Schema extends string>(options: {
  schemaVersion: Schema;
  storage: PendingCommandStorage;
  storageKey: string;
  newKey(): string;
  parseCommand(value: unknown): C;
  qualify(command: C, requestedOwnerId: string | undefined): Promise<string>;
  currentOwner(): string | undefined;
  dispatch(command: C, retry: boolean, originalOwnerId: string): Promise<T>;
  error(reason: "pending_invalid" | "pending_owner_unqualified" | "save_in_progress" | "pending_requires_retry" | "pending_missing"): Error;
  canDiscard(error: unknown, retry: boolean): boolean;
}) {
  type Stored = OwnerQualifiedCommand<C, Schema>;
  const owner = createPendingApiCommand<Stored, T>({
    ...options,
    parse: value => {
      try {
        if (!value || typeof value !== "object" || Array.isArray(value)) throw Error("invalid");
        const stored = value as Stored;
        if (Object.hasOwn(stored, "requestedOwnerId") || Object.hasOwn(stored, "ownerQualification") && !qualified(stored.ownerQualification, options.schemaVersion)) throw Error("invalid");
        options.parseCommand(wire(stored));
      } catch { throw options.error("pending_invalid"); }
      return value as Stored;
    },
    prepare: async command => {
      const original = wire(command);
      const ownerId = await options.qualify(original, command.requestedOwnerId ?? undefined);
      const qualification = { schemaVersion: options.schemaVersion, ownerId };
      if (!qualified(qualification, options.schemaVersion)) throw options.error("pending_owner_unqualified");
      return { ...original, ownerQualification: qualification };
    },
    dispatch: (command, retry) => {
      if (!qualified(command.ownerQualification, options.schemaVersion)) return Promise.reject(options.error("pending_owner_unqualified"));
      return options.dispatch(wire(command), retry, command.ownerQualification.ownerId);
    },
  });
  return { ...owner,
    command: (input: CommandInput<C>, requestedOwnerId = options.currentOwner()) =>
      owner.command({ ...input, requestedOwnerId: requestedOwnerId ?? null } as CommandInput<Stored>),
  };
}
