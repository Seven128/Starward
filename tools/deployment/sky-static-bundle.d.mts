export interface SkyStaticRecord { route: string; bytes: number; sha256: string; headers: Record<string, string> }
export interface SkyStaticInput { route: string; bytes: Buffer; headers: Record<string, string> }
export function skyStaticHash(bytes: Uint8Array | string): string;
export function validSkyStaticRoute(route: string): boolean;
export function assertSkyStaticRecord(record: SkyStaticRecord): SkyStaticRecord;
export function skyStaticDeliveryFragment(records: readonly SkyStaticRecord[]): string;
export function writeSkyStaticBundle(outputDirectory: string, inputs: AsyncIterable<SkyStaticInput>): Promise<{output: string; publicationHash: string; files: number; bytes: number}>;
export function validateSkyStaticBundle(directory: string): Promise<{directory: string; schemaVersion: "starward-sky-static-export-v1"; publicationHash: string; records: SkyStaticRecord[]; files: number; bytes: number}>;
