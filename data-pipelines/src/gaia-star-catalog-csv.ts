/** CSV parsing and row validation for the fixed Gaia DR3 TAP response. */

import {
  GAIA_DR3_SELECTED_FIELDS,
  validateGaiaDr3Rows,
  type GaiaDr3Row,
} from "../../packages/astronomy-core/src/gaia-catalog-data.ts";
import { fail } from "./gaia-star-catalog-errors.ts";

interface CsvState {
  readonly records: string[][];
  record: string[];
  cell: string;
  quoted: boolean;
  justClosedQuote: boolean;
}

function appendCell(state: CsvState): void {
  state.record.push(state.cell);
  state.cell = "";
}

function appendRecord(state: CsvState): void {
  appendCell(state);
  if (state.record.some((value) => value.length > 0)) {
    state.records.push(state.record);
  }
  state.record = [];
}

function consumeQuotedCharacter(
  source: string,
  index: number,
  state: CsvState,
): number {
  const char = source[index]!;
  if (char !== '"') {
    state.cell += char;
    return index + 1;
  }
  if (source[index + 1] === '"') {
    state.cell += '"';
    return index + 2;
  }
  state.quoted = false;
  state.justClosedQuote = true;
  return index + 1;
}

function consumeUnquotedCharacter(
  source: string,
  index: number,
  state: CsvState,
): number {
  const char = source[index]!;
  if (char === '"') {
    if (state.cell.length !== 0 || state.justClosedQuote)
      fail("csv_quote_position_invalid");
    state.quoted = true;
    return index + 1;
  }
  if (state.justClosedQuote) {
    if (char !== "," && char !== "\r" && char !== "\n")
      fail("csv_data_after_quote_invalid");
    state.justClosedQuote = false;
  }
  if (char === ",") {
    appendCell(state);
    return index + 1;
  }
  if (char === "\r" || char === "\n") {
    if (char === "\r" && source[index + 1] === "\n") {
      appendRecord(state);
      return index + 2;
    }
    appendRecord(state);
    return index + 1;
  }
  state.cell += char;
  return index + 1;
}

function parseCsvRecords(source: string): string[][] {
  const state: CsvState = {
    records: [],
    record: [],
    cell: "",
    quoted: false,
    justClosedQuote: false,
  };
  let index = 0;
  while (index < source.length) {
    index = state.quoted
      ? consumeQuotedCharacter(source, index, state)
      : consumeUnquotedCharacter(source, index, state);
  }
  if (state.quoted) fail("csv_unterminated_quote");
  if (state.cell.length > 0 || state.record.length > 0) appendRecord(state);
  return state.records;
}

function readCsvNumber(value: string, field: string): number {
  if (value.trim() === "") fail(`${field}_null`);
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) fail(`${field}_not_finite`);
  return parsed;
}

function readOptionalCsvNumber(value: string, field: string): number | null {
  return value.trim() === "" ? null : readCsvNumber(value, field);
}

function parseGaiaRow(values: string[], index: number): GaiaDr3Row {
  if (values.length !== GAIA_DR3_SELECTED_FIELDS.length)
    fail(`csv_row_${index}_field_count_invalid`);
  const sourceIdValue = values[0]!;
  if (!/^\d{1,19}$/u.test(sourceIdValue))
    fail(`csv_row_${index}_source_id_invalid`);
  const g = readCsvNumber(values[6]!, "g_mag");
  const bp = readOptionalCsvNumber(values[7]!, "bp_mag");
  const rp = readOptionalCsvNumber(values[8]!, "rp_mag");
  return {
    sourceId: sourceIdValue,
    raDeg: readCsvNumber(values[1]!, "ra_deg"),
    decDeg: readCsvNumber(values[2]!, "dec_deg"),
    pmRaMasYr: readCsvNumber(values[3]!, "pm_ra"),
    pmDecMasYr: readCsvNumber(values[4]!, "pm_dec"),
    refEpoch: readCsvNumber(values[5]!, "ref_epoch"),
    gMag: g,
    bpRp: bp === null || rp === null ? null : Number((bp - rp).toFixed(6)),
  } satisfies GaiaDr3Row;
}

function assertHeader(records: string[][]): string[][] {
  if (records.length < 2) fail("csv_header_or_rows_missing");
  const header = records[0]!;
  if (
    header.length !== GAIA_DR3_SELECTED_FIELDS.length ||
    header.some((field, index) => field !== GAIA_DR3_SELECTED_FIELDS[index])
  )
    fail("csv_header_invalid");
  return records;
}

/** Parse a strict RFC 4180-ish CSV response from the Gaia TAP service. */
export function parseGaiaDr3Csv(csv: string): GaiaDr3Row[] {
  if (typeof csv !== "string" || csv.length === 0) fail("response_empty");
  const source = csv.charCodeAt(0) === 0xfeff ? csv.slice(1) : csv;
  const records = assertHeader(parseCsvRecords(source));
  const rows = records.slice(1).map(parseGaiaRow);
  return validateGaiaDr3Rows(rows);
}
