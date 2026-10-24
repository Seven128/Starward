import type { ItineraryStage, ItineraryStop, Operation } from "./index";
import type { PrivateCommandOwnerQualification } from "../../../contracts/src/private-command-owner";

/** User intent is persisted independently of unavailable provider evidence. */
export interface ItineraryDraftInputs {
  date: string;
  origin: string;
  people: number;
  transport: "drive" | "walk" | "mixed";
  target: string;
  userType: string;
  latestReturnLocal: string | null;
  overnight: boolean;
  collaborative: false;
}

export interface ItineraryDraft {
  schemaVersion: "starward-itinerary-draft-v1";
  id: string;
  ownerId: string;
  title: string;
  timezone: string;
  revision: number;
  sequence: number;
  createdAt: string;
  updatedAt: string;
  inputs: ItineraryDraftInputs;
  source: { kind: "user-input"; capturedAt: string };
  stops: ItineraryStop[];
  stages: ItineraryStage[];
  operationLog: Operation[];
  state: "draft";
  evidence: { route: "missing"; weather: "missing"; astronomy: "missing"; spot: "unverified" };
}

export type ItineraryDraftCommand = {
  command: "create-draft";
  idempotencyKey: string;
  input: { title: string; timezone: string; inputs: ItineraryDraftInputs };
} | {
  command: "patch-draft";
  idempotencyKey: string;
  itineraryId: string;
  baseRevision: number;
  patch: { title?: string; inputs?: ItineraryDraftInputs; stages?: ItineraryStage[] };
};

export interface ItineraryDraftResult {
  schemaVersion: "starward-itinerary-v2";
  status: "saved";
  replayed: boolean;
  itinerary: ItineraryDraft;
  receipt: { idempotencyKey: string; itineraryId: string; revision: number; committedAt: string };
}

export interface ItineraryDraftLibrary {
  schemaVersion: "starward-itinerary-v2";
  items: Array<Pick<ItineraryDraft, "id" | "title" | "revision" | "updatedAt">>;
  nextCursor: string | null;
  scope: "local-owner-poc";
  /** Absent on older APIs: readable history is not original-attempt authority. */
  ownerQualification?: PrivateCommandOwnerQualification;
}
