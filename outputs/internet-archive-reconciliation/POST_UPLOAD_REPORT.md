# Internet Archive post-upload reconciliation

Archive.org item: `ldswelshmembership`

Final settled reconciliation results:

- Intended membership images: 5,484
- Exact remote path, size, MD5, and SHA-1 matches: 5,484
- Missing intended images: 0
- Image checksum conflicts: 0
- Complete membership-image folders: 39
- Incomplete membership-image folders: 0
- Remote original JPEG/PNG files: 5,496
- Viewer-excluded helper images preserved remotely: 12
- Approved transcription PDFs uploaded and MD5-verified: 24
- Archive guide/index files uploaded and MD5-verified: 3
- Approved upload-manifest objects present with matching MD5: 2,374 of 2,374

## Transcription PDFs

The upload contains four confidently mapped original transcription PDFs and twenty lossless page-level derivatives from the approved compound sources. Every derived PDF was reopened, its page count verified, and every page content-stream SHA-256 compared with the corresponding source page before upload. Remote MD5 values match all 24 approved local PDFs.

The original compound PDFs remain unchanged locally in `resources/transcriptions/` for provenance.

## Deferred source

`A - CDs 60-62 - Typed Transcripts.pdf` remains local and was not uploaded. PDF pages 28-30 contain mixed Welsh District and Pontypool material, with a record-group boundary inside page 30. No split, duplication, or content alteration was performed.

## Viewer gate

This audit satisfies the required zero-missing and zero-conflict data gate. Archive.org has not yet been enabled as the Viewer image source; that remains a separate future change.
