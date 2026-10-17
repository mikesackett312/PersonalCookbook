# Recover photos without restoring recipes

On the device running this build:

1. Keep a copy of the current app data/current backup if available. Do not uninstall the app or clear its storage. A normal complete backup can fail when current photo files are missing; recovery does not require creating one.
2. Open More → Recover Photos from Backup → Recover Photos.
3. In Files, select `RecipeBox-Backup-2026-10-02T01-27-19.recipebox`.
4. Confirm **Recover Photos**, not **Restore Backup**. Stay on More; do not edit recipes or run another restore while this is running.
5. Review the recovered/kept counts and the selectable skipped-ID details. Open the affected recipes and verify their photos, including HEIC images, then restart the app and verify again. Create a fresh complete backup afterward.

This operation requires an exact unique recipe ID and exact unique current photo ID. It never matches titles, imports backup recipe content, restores removed recipes/photos, deletes files, or overwrites an existing file. A readable nonempty durable photo is retained even if the backup has different bytes. Identical current durable files and prior recovered files are reused by full Base64 comparison. Extensions JPG/JPEG, PNG, HEIC and WebP are supported; image decoding still depends on the device.

All files must be written and read back successfully before one photo-reference-only storage update. An error before that update leaves references unchanged. Successfully written files or partial files may remain after failure; retry reuses verified files and avoids partial files. No cleanup runs. Storage errors are surfaced rather than reported as success.

Current raw recipe fields, recipe order, photo order and main-photo selection are preserved. The legacy `photoUri` alias changes only when it points at the replaced URI. Duplicate backup IDs, malformed Base64, unsupported extensions, missing payload references and inconsistent counts reject recovery before writes. Unmatched/ambiguous current IDs and unreferenced embedded photos are reported. Missing current photo IDs are deliberately skipped: they may represent intentional deletions.

The service `recoverPhotosFromBackup(uri)` returns a typed report and can support other callers later. Normal backup/restore is unchanged. AsyncStorage has no atomic compare-and-swap: the service checks for changes since its snapshot before saving, but callers must keep editing/other storage writers idle during recovery. Simultaneous recovery calls are rejected.

Run mocked checks with `node --test tests/photoRecovery.test.cjs`. They compile the real TypeScript services with native filesystem and AsyncStorage mocks; they never access device data. The actual October 2 backup was not available in the workspace, so this implementation has not been run against its nine payloads or the device collection.
