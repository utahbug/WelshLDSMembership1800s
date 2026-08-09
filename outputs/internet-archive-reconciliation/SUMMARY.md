# Internet Archive reconciliation summary

Audit date: 2026-08-08  
Internet Archive item: `ldswelshmembership`  
Metadata API: <https://archive.org/metadata/ldswelshmembership>  
Download root: <https://archive.org/download/ldswelshmembership/>

The Viewer was not changed during this audit.

## Results

- Local intended membership/viewer images: **5,484**
- Internet Archive original JPEG/PNG files: **3,149**
- Exact relative-path, size, MD5, and SHA-1 matches: **3,137**
- Local intended images missing remotely: **2,347**
- Remote originals absent anywhere on the local disk: **0**
- Remote originals excluded from the intended Viewer set: **12** (`_color`, `_color2`, and `_focus` CD-interface helper images)
- Same-path or same-name checksum mismatches: **0**
- Complete top-level folders: **17**
- Incomplete top-level folders: **22**
- Duplicate basename groups spanning two local branch folders: **956**

## Folder preservation

All **39** local top-level folder names are present remotely with the same names. Archive.org preserved the relative folder hierarchy rather than flattening it. Of the remote originals, **2,545** use `branch/images/filename` and **604** are stored directly as `branch/filename`, matching the two structures in the local source.

The full remote path safely preserves branch association. Basenames alone do not: 956 basenames occur in two branch folders. Those duplicates happen to be byte-identical, but flattening would still discard which branch/collection path was intended.

## Evidence of an incomplete upload

Every one of the 22 incomplete folders contains exactly **100** remote originals. Larger local folders stop at that boundary. Examples include:

- `2-Castell Nedd,1879-1884,LR1967/images/1544__M_00100.jpg` matched; `...00101.jpg` is missing.
- `20-Rhymney,1850-1887,LR124517/Images/892__M_00100.jpg` matched; `...00101.jpg` is missing.
- `21-Cardiff,1847-1876,LR14167/Images/848__M_00100.jpg` matched; `...00101.jpg` is missing.

This is strong evidence that the upload stopped or was capped at 100 files per affected folder, rather than evidence of random corruption. The 3,137 uploaded intended images are exact checksum matches.

## Why 3,149 and 8,016 differ

The site's **8,016** count covers more than this membership upload:

- **5,481** retained `original-cds` images (5,484 intended local images minus three byte-identical Ffestiniog copies collapsed within that collection)
- **2,535** retained Merthyr Bishop images, which are a separate non-LDS collection and were not part of this Internet Archive item

`5,481 + 2,535 = 8,016`.

The Archive item contains 3,149 original images: 3,137 intended viewer images plus 12 locally present CD-interface helper images excluded by the Viewer.

## Safest later Viewer integration

Keep the GitHub catalog authoritative for collection membership and image order. Store the complete Archive relative path for each image; never construct a URL from basename alone. Build remote URLs by encoding each path segment beneath `https://archive.org/download/ldswelshmembership/` while preserving `/` separators.

Keep local `file:///` and `/archive/original-cds/` paths unchanged for the local/USB editions. Add remote paths as a separate public-edition field only after checksum reconciliation. Until the missing 2,347 files are uploaded and a fresh audit passes, either enable online viewing only for the 17 complete folders or leave incomplete collections marked as locally available but not fully online. Do not silently omit missing pages from a public sequence.

The canonical download endpoint returned HTTP 200, the expected image size, byte-range support, and `Access-Control-Allow-Origin: *` for a tested reconciled image, which is suitable for the Viewer and browser-side enhancement once integration is authorized.
