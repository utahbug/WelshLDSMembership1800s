# Private people-name index

The people-name index is a private/local finding aid. The original membership-register image remains the authority.

## Private files

- Human-edited source: `data/private/people-index-source.csv`
- Generated browser index: `data/private/people-index.local.js`
- Generated JSON copy: `data/private/people-index.local.json`
- Validation report: `data/private/people-index-report.local.json`

The entire `data/private/` directory is excluded by `.gitignore`. GitHub Pages receives none of these files. The tracked search page activates only when the catalog explicitly says the edition is `local` or `portable`; the public edition neither shows the local People Search menu item nor requests the private index.

## 1. Add one person

Open `data/private/people-index-source.csv` in Excel or a text editor and add one row. Keep `nameAsWritten` exactly as it appears in the historical record. Separate multiple aliases with `|`. Do not add a normalized name; the builder creates it.

Use `occurrenceType` = `member` for the person whose membership row is being indexed. Use `associated` for missionaries, officiators, or other people merely named in that row. Keep separate occurrences as separate rows, even when names look alike.

Blank baptism dates, residences, entry numbers, and image references are allowed. Never guess an image reference.

## 2. Rebuild the private index

From the project folder, run:

```powershell
node scripts/build-people-index.mjs
```

The builder normalizes searchable names, maps known historical branch spellings to canonical branches, checks occurrence types and dates, warns about unknown branches and likely duplicates, and regenerates the three private output files.

## 3. Add another branch

Enter the canonical branch in `branch`. If the source uses a different spelling, preserve it in `sourceBranchSpelling`. For example, use canonical `Ffestiniog` and source spelling `Festiniog`. Known variants entered in the branch column are mapped to their canonical branch; an unrecognized branch produces a warning.

## 4. Verify an image link later

Enter either a one-based viewer sequence in `imageRef` or the exact existing filename in `imageFilename`, then set `verified` to `true` only after checking the source image. Rebuild the index. A verified, resolvable reference displays **Open record**; otherwise the result links to branch resources and says that the exact image is not yet linked.

After rebuilding, refresh the portable edition with:

```powershell
node scripts/build-portable-drive.mjs "C:\Users\kenro\Documents\LDSWelshMembers-Portable"
```
