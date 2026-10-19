/**
 * Guards for persisted (zustand + localStorage) stores.
 */

/**
 * Every version bump needs exactly one migration step (v0 → v1, v1 → v2, …),
 * so the step count must equal the store version. A mismatch is a
 * programming error: report it and stop before any data is touched.
 */
export function assertMigrationsMatchVersion(
  storeName: string,
  version: number,
  migrationCount: number,
): void {
  if (version === migrationCount) return
  const message = `Store "${storeName}": version (${version}) does not match the number of migrations (${migrationCount})`
  console.error(message)
  throw new Error(message)
}
