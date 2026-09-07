/** Feedback timestamps are entered in China standard time; reject date normalization. */
export function parseObservationInput(date: string, time: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return null;
  const timestamp = new Date(`${date}T${time}:00+08:00`);
  if (!Number.isFinite(timestamp.getTime())) return null;
  const enteredClock = new Date(timestamp.getTime() + 8 * 60 * 60 * 1000).toISOString().slice(0, 16);
  return enteredClock === `${date}T${time}` ? timestamp.toISOString() : null;
}
