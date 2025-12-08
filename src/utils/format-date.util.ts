/**
 * Formats a timestamp (in milliseconds) into a readable date string.
 *
 * The output format is:
 * `D/M/YYYY - HH:MM`
 *
 * @param ms - A timestamp expressed in milliseconds since the Unix epoch.
 * @returns A formatted date string.
 */
export function formatDate(ms: number): string {
  const d = new Date(ms);

  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()} - ${d.getHours()}:${d.getMinutes()}`;
}
