# Private people-name index

The people-name index is a private/local finding aid. The historical membership-register image remains the authority.

## Storage and public exclusion

The working data is stored at `data/private/people-index.local.js`. The entire `data/private/` directory is excluded by `.gitignore`, so the name database is not committed to or served by GitHub Pages. The tracked search code activates only when the catalog explicitly identifies the edition as `local` or `portable`; the public edition neither displays the local menu link nor requests the private database.

The portable builder copies the private index and the people-search interface into the finished portable folder.

## Adding one occurrence

Add one object to the `records` array in `data/private/people-index.local.js`. Keep every occurrence separate, even when two names appear to describe the same person. Required fields are `nameAsWritten`, `normalizedName`, and `branch`. Optional fields include `aliases`, `baptismDate`, `residence`, `year`, `date`, `entryNumber`, `collectionId`, `imageSequence`, `imageIdentifier`, `pageNumber`, `notes`, and `verified`.

Use the exact spelling from the register for `nameAsWritten`. Use `normalizedName` only for searching. Set `verified` to `true` only after checking the source image. `imageSequence` is one-based. When both `collectionId` and a verified `imageSequence` are supplied, the result displays **Open record** and deep-links to that image. Without a reliable image reference, it links only to the branch resources page and says that the exact image is not yet linked.

## Adding another branch

Add separate occurrence objects for that branch. No branch-specific search setup is needed: all records are searched together, and branch is always presented as a result field.

The canonical project branch is `Ffestiniog`. The original book spelling `Festiniog` is retained in `sourceBranchAsWritten` and may be included as a branch alias, but must not replace the canonical folder, key, or URL.
