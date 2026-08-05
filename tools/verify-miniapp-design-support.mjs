import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

export async function sha256File(filePath) {
  const bytes = await readFile(filePath);
  return createHash("sha256").update(bytes).digest("hex");
}

export function markdownSection(source, heading) {
  const lines = source.split(/\r?\n/);
  const start = lines.findIndex((line) => line === heading);
  assert.notEqual(start, -1, `missing markdown heading: ${heading}`);
  const level = heading.match(/^#+/)[0].length;
  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    const nextHeading = lines[index].match(/^(#+)\s/);
    if (nextHeading && nextHeading[1].length <= level) {
      end = index;
      break;
    }
  }
  return lines.slice(start + 1, end).join("\n");
}

export function parseMarkdownColorTable(source, heading) {
  const section = markdownSection(source, heading);
  const values = {};
  for (const line of section.split(/\r?\n/)) {
    const match = line.match(/^\|\s*`([^`]+)`\s*\|\s*`(#[0-9A-Fa-f]{6})`\s*\|\s*$/);
    if (!match) continue;
    assert(!Object.hasOwn(values, match[1]), `duplicate color role under ${heading}: ${match[1]}`);
    values[match[1]] = match[2].toUpperCase();
  }
  assert(Object.keys(values).length > 0, `missing color table under ${heading}`);
  return values;
}

export function parseBacktickTableValues(source, keys, label) {
  const expectedKeys = new Set(keys);
  const values = {};
  for (const line of source.split(/\r?\n/)) {
    const match = line.match(/^\|\s*`([^`]+)`\s*\|\s*`([^`]+)`\s*\|/);
    if (!match || !expectedKeys.has(match[1])) continue;
    assert(!Object.hasOwn(values, match[1]), `duplicate ${label} token: ${match[1]}`);
    values[match[1]] = match[2];
  }
  assert.deepEqual(Object.keys(values).sort(), [...expectedKeys].sort(), `${label} token set drifted`);
  return values;
}

export function parseTypographyTable(source, label) {
  const roles = new Set(["display", "page-title", "section-title", "body", "label", "caption", "data"]);
  const values = {};
  for (const line of source.split(/\r?\n/)) {
    const match = line.match(/^\|\s*`([^`]+)`\s*\|\s*`([^`]+)`\s*\|\s*(\d+)\s*\|/);
    if (!match || !roles.has(match[1])) continue;
    assert(!Object.hasOwn(values, match[1]), `duplicate ${label} typography role: ${match[1]}`);
    values[match[1]] = { sizeLine: match[2], weight: Number(match[3]) };
  }
  assert.deepEqual(Object.keys(values).sort(), [...roles].sort(), `${label} typography role set drifted`);
  return values;
}

export function parseMotionDurations(source, label) {
  const events = new Set([
    "Press-in",
    "Release/cancel",
    "State/content swap",
    "Compact sheet/panel",
    "Mode transition",
    "Reduced motion",
  ]);
  const values = {};
  for (const line of source.split(/\r?\n/)) {
    const match = line.match(/^\|\s*([^|`]+?)\s*\|\s*`([^`]+)`\s*\|/);
    if (!match || !events.has(match[1].trim())) continue;
    const event = match[1].trim();
    assert(!Object.hasOwn(values, event), `duplicate ${label} motion event: ${event}`);
    values[event] = match[2];
  }
  assert.deepEqual(Object.keys(values).sort(), [...events].sort(), `${label} motion event set drifted`);
  return values;
}

export function canonicalPrompt(source, label) {
  const match = source.match(/Canonical day master prompt:\s*\r?\n\r?\n>\s*(.+)/);
  assert(match, `missing ${label} canonical Tier-B prompt`);
  return match[1].trim();
}

function relativeLuminance(hex) {
  const channels = [1, 3, 5].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16) / 255);
  const linear = channels.map((channel) =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

export function contrastRatio(foreground, background) {
  const foregroundLuminance = relativeLuminance(foreground);
  const backgroundLuminance = relativeLuminance(background);
  return (
    (Math.max(foregroundLuminance, backgroundLuminance) + 0.05) /
    (Math.min(foregroundLuminance, backgroundLuminance) + 0.05)
  );
}
