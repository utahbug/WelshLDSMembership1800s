# LDS Welsh Membership Records, 1800s

A preservation-friendly local HTML viewer for nineteenth-century Welsh Latter-day Saint membership records, branch minutes, conference minutes, and related historical images.

The catalog preserves relevant records through 1911 when they occur in the source collections. The project title and public-facing description remain focused on records from the 1800s; the later records are retained for archival completeness rather than advertised as the project's main scope.

The repository contains the viewer and catalog-building tools. The multi-gigabyte record images remain in their existing archive folders and are not committed to GitHub. The viewer separates LDS membership and branch records, LDS conference and district minutes, the important but non-LDS Merthyr Bishop Records, and recovered research notes or unfinished indexes into clearly labeled categories.

## Build the local catalog

1. Copy `sources.example.json` to `sources.local.json` and enter the archive locations. A configured local file is already present on the original project computer.
2. Run `node scripts/build-catalog.mjs`.
3. Run `node scripts/serve-local.mjs`.
4. Open the displayed local address in a web browser. No records are uploaded; the launcher only makes the configured archives available to the viewer on this computer.

The builder scans each configured archive, includes supported transcription documents, excludes thumbnail/helper images, identifies byte-for-byte duplicate files with SHA-256, and creates `data/catalog.local.js`. It never changes or deletes archive files.

## Living branch registry

- [`BRANCH_REGISTRY.csv`](BRANCH_REGISTRY.csv) is the portable, plain-text master list.
- [`Welsh-LDS-Branch-Registry.xlsx`](outputs/branch-registry/Welsh-LDS-Branch-Registry.xlsx) is the filterable handoff workbook, with separate Master Registry, Evidence Log, and How to Use sheets.
- `node scripts/build-branch-registry-data.mjs` rebuilds the CSV from the recovered 2007 CD index, RoboHelp research topics, and documented FamilySearch catalog evidence.
- `node scripts/build-branch-registry-workbook.mjs` rebuilds the Excel workbook.

Canonical names are finding aids, not corrections to the historic record. Every spelling as found remains in the evidence log, and “FamilySearch only” or “local only” means more checking is needed—not that the other collection lacks the branch.

The surviving CDs are the primary source for record images because their content is more detailed than the limited FamilySearch indexing project. FamilySearch is being used as a branch-name discovery and comparison source: a name found only there remains in the registry so it will not be lost, without creating a goal to duplicate FamilySearch images.

The first public starter emphasizes the branch registry. Conference transcriptions will be added selectively from the previously prepared PDF set when it is recovered; questionable legacy Word conversions are not treated as authoritative public copies.

## Project handoff and recovery

- [`work-remaining.html`](work-remaining.html) is the human-readable web guide to material identified as needing transcription, translation, or source-page recovery. On the full local edition, its source links filter the archive viewer to the likely collection; on the public starter, unavailable source files are clearly identified as not yet online.
- [`TRANSCRIPTION_INVENTORY.md`](TRANSCRIPTION_INVENTORY.md) records the readability of every surviving conference-minute transcription file.
- [`TRANSCRIPTION_STATUS_NOTES.md`](TRANSCRIPTION_STATUS_NOTES.md) records the handwritten and typed 2007 page-level completion evidence found at the front of the combined PDFs.
- [`RECOVERY_PLACEHOLDERS.md`](RECOVERY_PLACEHOLDERS.md) preserves the 2007 project's known incomplete work and missing-folder clues by CD and call number.
- [`RIGHTS_AND_PROVENANCE.md`](RIGHTS_AND_PROVENANCE.md) records reported permission, attribution, and source-handling guidance.
- `node scripts/audit-transcriptions.mjs` regenerates the transcription integrity inventory without changing the originals.

## Keyboard navigation

- Use the left and right arrow keys to move between record images.
- Type in **Find a collection** to filter branch and conference names.

## Privacy and preservation

Machine-specific catalog files and absolute archive paths are excluded from Git. The source archives remain authoritative and untouched.

### Private Welsh Saints research index

Run `node scripts/build-welsh-saints-index.mjs` to create or refresh the local searchable index of public Welsh Saints Project listings. Open `welsh-saints-research.html` from the local viewer or use **About & tools → Welsh Saints research index (local)**. The generated files are stored under `data/private/`, are excluded from Git, and retain each Welsh Saints source ID and original public URL. The indexer does not access administrator-only pages or copy linked source documents.

The public social card uses a 2019 photograph supplied by the project owner of a historic Ffestiniog family home. The photograph is cropped and captioned for sharing without altering the building or landscape.

## Build a portable flash-drive edition

Use an empty folder on an exFAT-formatted flash drive; 64 GB is recommended. The builder is resumable, copies only cataloged unique files, and never changes the source archives.

```powershell
node scripts/build-portable-drive.mjs "E:\Welsh LDS Records"
```

Replace `E:` with the flash drive's actual letter. The completed package opens through `START_HERE.html` and requires no internet connection, RoboHelp installation, or subscription.
