from __future__ import annotations

import hashlib
import json
import re
import unicodedata
from collections import defaultdict
from pathlib import Path

from pypdf import PdfReader


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "data" / "private" / "all-records-prototype"
TRANSCRIPT_INDEX = ROOT / "data" / "private" / "typed-branch-record-index.local.json"
WELSH_SAINTS_BETA = ROOT / "research-beta" / "data" / "beta" / "welsh-saints-index.beta.js"
RON_DIR = ROOT / "resources" / "books" / "ron-dennis"
SHARDS = 32
METADATA_SHARD_SIZE = 250

BOOK_METADATA = {
    "AbleEvans.pdf": {"title": "Indefatigable Veteran: History and Biography of Abel Evans", "kind": "ron-dennis-publication", "author": "Ronald D. Dennis", "status": "Published work; local research copy", "public": False},
    "OPPOSITION TO THE GOSPEL MESSAGE IN WALES.pdf": {"title": "Opposition to the Gospel Message in Wales", "aliases": ["On Trial in the Welsh Press", "On Trial in the Welsh Press: Latter-day Saint Missionaries Declare and Defend the Faith, 1849-1860"], "kind": "ron-dennis-publication", "author": "Ronald D. Dennis", "status": "Prepublication version held in the local research corpus", "public": False},
    "Opposition to the Gospel Message in Wales.pdf": {"title": "Opposition to the Gospel Message in Wales", "aliases": ["On Trial in the Welsh Press", "On Trial in the Welsh Press: Latter-day Saint Missionaries Declare and Defend the Faith, 1849-1860"], "kind": "ron-dennis-publication", "author": "Ronald D. Dennis", "status": "Prepublication version held in the local research corpus", "public": False},
    "Prophet of the Jubilee.pdf": {"title": "Prophet of the Jubilee", "kind": "translation", "author": "Ronald D. Dennis, translator and editor", "status": "Published English translation; local research copy", "public": False},
    "The Call of Zion (First Welsh Mormon Emigration, Volume 2).pdf": {"title": "The Call of Zion: The First Welsh Mormon Emigration, Volume 2", "kind": "ron-dennis-publication", "author": "Ronald D. Dennis", "status": "Published work; local research copy", "public": False},
    "Welsh Mormon Writings (1844-1862).pdf": {"title": "Welsh Mormon Writings, 1844-1862", "kind": "ron-dennis-publication", "author": "Ronald D. Dennis", "status": "Published bibliography; local research copy", "public": False},
}

# Page-level branch associations are deliberately curated rather than inferred
# from every place-name mention in a publication. This prevents an index or
# passing reference from being presented as branch evidence.
CURATED_PUBLICATION_BRANCH_PAGES = {
    ("Opposition to the Gospel Message in Wales.pdf", 23): ["Overton"],
    ("AbleEvans.pdf", 135): ["Eglwysbach"],
    ("Zions Trumpet (1854).pdf", 446): ["Eglwysbach"],
}


def normalize(value: str) -> str:
    text = unicodedata.normalize("NFD", value or "")
    text = "".join(char for char in text if unicodedata.category(char) != "Mn")
    return re.sub(r"[^a-z0-9]+", " ", text.lower()).strip()


def tokens(value: str) -> list[str]:
    return re.findall(r"[a-z0-9]+", normalize(value))


def compact(value: str) -> str:
    return " ".join((value or "").replace("\x00", " ").split())


def bounded_snippet(value: str, limit: int = 420) -> str:
    text = compact(value)
    if len(text) <= limit:
        return text
    cut = text[:limit]
    boundary = max(cut.rfind(". "), cut.rfind("; "), cut.rfind(" "))
    return cut[:boundary if boundary > limit // 2 else limit].rstrip() + "..."


CURATED_TRANSCRIPT_TITLES = {
    "A - CDs 35-39 (2 of 2) - Typed Transcripts.pdf": "East Glamorgan Conference Minutes, 1853–1863",
}


def transcript_display_title(source: dict) -> str:
    title = source.get("title") or source.get("sourceFile") or "Typed transcript"
    if not re.match(r"^A - CDs? .+ - Typed Transcripts$", title, re.I):
        return title
    return CURATED_TRANSCRIPT_TITLES.get(source.get("sourceFile", ""), "Welsh Branch and Conference Typed Transcripts")


def publication_search_text(text: str, title: str) -> str:
    """Remove a repeated running title at the start of a photographed page.

    This affects discovery postings only. The bounded source snippet remains
    unchanged, and substantive title mentions later in a page remain searchable.
    """
    title_pattern = r"\s*".join(re.escape(part) for part in re.findall(r"[A-Za-z0-9]+", title))
    if not title_pattern:
        return text
    return re.sub(rf"^\s*{title_pattern}\b[\s\W]*", "", text, count=1, flags=re.I)


def load_js_payload(path: Path) -> dict:
    raw = path.read_text(encoding="utf-8")
    return json.loads(raw.split("=", 1)[1].rsplit(";", 1)[0])


def book_metadata(path: Path) -> dict:
    configured = BOOK_METADATA.get(path.name)
    if configured:
        return configured
    match = re.fullmatch(r"Zions Trumpet \((.+)\)\.pdf", path.name)
    if match:
        years = match.group(1)
        return {"title": f"Zion's Trumpet, {years}", "aliases": [f"Zions Trumpet {years}", f"Udgorn Seion {years}"], "kind": "translation", "author": "Ronald D. Dennis, translator and editor", "status": "Published English translation; local research copy", "public": False}
    return {"title": path.stem, "kind": "ron-dennis-publication", "author": "Ronald D. Dennis", "status": "Local research copy", "public": False}


records: list[dict] = []
search_documents: list[str] = []


def add_record(record: dict, searchable: str) -> None:
    record["id"] = len(records)
    records.append(record)
    search_documents.append(searchable)


transcripts = json.loads(TRANSCRIPT_INDEX.read_text(encoding="utf-8"))
transcript_exclusions = []
transcript_mixed_review = []
for source in transcripts["records"]:
    classification = source.get("pageClassification", "transcript-translation-content")
    if not source.get("fullSearchEligible", True):
        item = {
            "sourceFile": source["sourceFile"],
            "pdfPage": source["pdfPage"],
            "classification": classification,
            "reason": source.get("classificationReason", "Excluded by page-level transcript classification"),
        }
        transcript_exclusions.append(item)
        if source.get("mixedContentReview"):
            transcript_mixed_review.append(item)
        continue
    text = compact(source.get("text", ""))
    add_record({
        "sourceType": "transcription",
        "sourceId": source["id"],
        "title": transcript_display_title(source),
        "technicalSourceTitle": source.get("sourceFile"),
        "snippet": bounded_snippet(text),
        "location": f"PDF page {source['pdfPage']}",
        "branches": source.get("associatedBranches") or [],
        "branchConfidence": "Name match in typed page text; review source context",
        "provenance": "Typed Welsh branch/conference record extract",
        "viewerUrl": source.get("viewerUrl"),
        "sourceUrl": source.get("url"),
        "publicAvailability": False,
        "viewerAvailability": bool(source.get("viewerUrl")),
        "downloadAvailability": False,
        "pageClassification": classification,
    }, " ".join([text, source.get("title", ""), source.get("sourceFile", ""), " ".join(source.get("associatedBranches") or []), " ".join(map(str, source.get("sourceCds") or [])), " ".join(source.get("lrNumbers") or [])]))


saints = load_js_payload(WELSH_SAINTS_BETA)
for source in saints["records"]:
    add_record({
        "sourceType": "welsh-saints",
        "sourceId": f"welsh-saints:{source['type']}:{source['sourceId']}",
        "title": source.get("title") or f"Welsh Saints record {source['sourceId']}",
        "snippet": bounded_snippet(source.get("summary", "")),
        "location": f"Welsh Saints source ID {source['sourceId']}",
        "branches": source.get("matchedBranches") or [],
        "branchConfidence": "Project branch-name match in Welsh Saints discovery metadata",
        "provenance": "Welsh Saints Project",
        "sourceUrl": source.get("url"),
        "publicAvailability": True,
        "viewerAvailability": False,
        "downloadAvailability": False,
        "recordSubtype": source.get("type"),
    }, " ".join([source.get("title", ""), source.get("summary", ""), source.get("searchTerms", ""), " ".join(source.get("cells") or []), " ".join(source.get("categories") or []), " ".join(source.get("matchedBranches") or [])]))


book_reports = []
for pdf in sorted(RON_DIR.glob("*.pdf"), key=lambda item: item.name.casefold()):
    metadata = book_metadata(pdf)
    reader = PdfReader(str(pdf), strict=False)
    text_pages = 0
    aliases = metadata.get("aliases", [])
    source_hash = hashlib.sha256(pdf.name.encode('utf-8')).hexdigest()[:12]
    add_record({
        "sourceType": metadata["kind"],
        "sourceId": f"ron-dennis:{source_hash}:source",
        "recordLevel": "source",
        "title": metadata["title"],
        "alternateTitles": aliases,
        "author": metadata["author"],
        "versionStatus": metadata["status"],
        "snippet": "Publication-level discovery record. Search results for matching text cite individual PDF pages.",
        "location": "Publication record",
        "branches": [],
        "branchConfidence": "No automatic canonical-branch assertion",
        "provenance": "Ron Dennis publication in the local research corpus",
        "publicAvailability": metadata["public"],
        "viewerAvailability": False,
        "downloadAvailability": False,
    }, " ".join([metadata["title"], *aliases, metadata["author"]]))
    for page_number, page in enumerate(reader.pages, 1):
        try:
            text = compact(page.extract_text() or "")
        except Exception:
            text = ""
        if len(text) < 20:
            continue
        text_pages += 1
        page_branches = CURATED_PUBLICATION_BRANCH_PAGES.get((pdf.name, page_number), [])
        add_record({
            "sourceType": metadata["kind"],
            "sourceId": f"ron-dennis:{source_hash}:{page_number}",
            "recordLevel": "page",
            "title": metadata["title"],
            "author": metadata["author"],
            "versionStatus": metadata["status"],
            "snippet": bounded_snippet(text),
            "location": f"PDF page {page_number}",
            "branches": page_branches,
            "branchConfidence": "Curated page-level branch association from explicit historical text" if page_branches else "No automatic canonical-branch assertion",
            "provenance": "Ron Dennis publication in the local research corpus",
            "publicAvailability": metadata["public"],
            "viewerAvailability": False,
            "downloadAvailability": False,
        }, publication_search_text(text, metadata["title"]))
    book_reports.append({"file": pdf.name, "title": metadata["title"], "pages": len(reader.pages), "textPages": text_pages, "sourceType": metadata["kind"], "publicAvailability": metadata["public"]})


postings: dict[str, list[int]] = defaultdict(list)
for record_id, document in enumerate(search_documents):
    for term in sorted(set(tokens(document))):
        postings[term].append(record_id)


def shard_for(term: str) -> int:
    # FNV-1a is intentionally mirrored by the browser adapter so local file://
    # use does not depend on Web Crypto being available.
    value = 2166136261
    for byte in term.encode("utf-8"):
        value ^= byte
        value = (value * 16777619) & 0xFFFFFFFF
    return value % SHARDS


OUTPUT.mkdir(parents=True, exist_ok=True)
for old in OUTPUT.glob("*.js"):
    old.unlink()

metadata_files = []
for start in range(0, len(records), METADATA_SHARD_SIZE):
    shard = records[start:start + METADATA_SHARD_SIZE]
    name = f"records-{start // METADATA_SHARD_SIZE:03d}.js"
    (OUTPUT / name).write_text(f"window.ALL_RECORDS_DISCOVERY.registerRecords({json.dumps(shard, ensure_ascii=False, separators=(',', ':'))});\n", encoding="utf-8")
    metadata_files.append({"file": name, "first": start, "last": start + len(shard) - 1})

term_files = []
for shard_number in range(SHARDS):
    values = {term: ids for term, ids in postings.items() if shard_for(term) == shard_number}
    name = f"terms-{shard_number:03d}.js"
    (OUTPUT / name).write_text(f"window.ALL_RECORDS_DISCOVERY.registerTerms({json.dumps(values, separators=(',', ':'))});\n", encoding="utf-8")
    term_files.append({"file": name, "shard": shard_number, "terms": len(values)})

counts = {
    "members": 11473,
    "transcription": sum(record["sourceType"] == "transcription" for record in records),
    "welshSaints": sum(record["sourceType"] == "welsh-saints" for record in records),
    "ronDennisPages": sum(record["sourceType"] in {"translation", "ron-dennis-publication"} and record.get("recordLevel") == "page" for record in records),
    "ronDennisSourceRecords": sum(record.get("recordLevel") == "source" for record in records),
    "historicalRecords": len(records),
    "allRecords": 11473 + len(records),
}
manifest = {
    "schemaVersion": 1,
    "prototype": True,
    "privateLocalOnly": True,
    "counts": counts,
    "termShardCount": SHARDS,
    "metadataShardSize": METADATA_SHARD_SIZE,
    "metadataFiles": metadata_files,
    "termFiles": term_files,
    "bookReports": book_reports,
    "transcriptClassification": {
        "sourceTextPages": transcripts["counts"]["pageTextRecords"],
        "includedInFullSearch": sum(record["sourceType"] == "transcription" for record in records),
        "excludedFromFullSearch": len(transcript_exclusions),
        "mixedContentReview": len(transcript_mixed_review),
        "excludedPages": transcript_exclusions,
        "mixedReviewPages": transcript_mixed_review,
        "pagesWithoutUsableEmbeddedText": transcripts["counts"]["pagesWithoutUsableEmbeddedText"],
        "pagesWithoutTextNote": "Preserved in the source PDFs and private page inventories; not classified as blank and not indexed without OCR.",
    },
    "rightsNote": "Discovery metadata and bounded snippets only. No Ron Dennis PDF, complete page prose, filesystem path, viewer, or download is included.",
}
(OUTPUT / "manifest.js").write_text(f"window.ALL_RECORDS_DISCOVERY_MANIFEST = {json.dumps(manifest, ensure_ascii=False, separators=(',', ':'))};\n", encoding="utf-8")
(OUTPUT / "build-report.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
print(json.dumps(manifest, ensure_ascii=False, indent=2))
