import csv
import json
import re
from datetime import datetime, timezone
from pathlib import Path

from pypdf import PdfReader


ROOT = Path(__file__).resolve().parents[1]
PDF_DIR = ROOT / "resources" / "transcriptions"
PRIVATE_DIR = ROOT / "data" / "private"
PLAN = ROOT / "outputs" / "internet-archive-split-plan" / "proposed-splits.csv"

PDF_PATTERN = "A - CDs * - Typed Transcripts.pdf"
RESULT_TYPE = "Typed branch-record extract"

CALL_TO_CD = {
    "141622": [35], "122087": [36], "241210": [37], "1761621": [38],
    "984611": [39], "1761622": [40, 60], "1761721": [41], "1175711": [42, 55],
    "1001111": [43, 60], "1272711": [44], "1201521": [45], "886310": [46],
    "101123": [47], "1240410": [48], "1314511": [49], "1219911": [50],
    "1175911": [51], "1128011": [52], "1128021": [53], "1175710": [54],
    "1277011": [56], "1240421": [57], "1134311": [58], "1115222": [59],
    "101111": [60], "886311": [61], "708611": [62],
}

EXPLICIT_PATTERNS = [re.compile(pattern, re.I) for pattern in [
    r"\buntil\s+\d{4}.{0,40}\bbranch\s+was\s+known\s+as\b",
    r"\b(?:branch|district)\b.{0,70}\b(?:was|be|is\s+to\s+be)\s+(?:joined|united)\s+(?:to|with)\b",
    r"\b(?:branch|district)\b.{0,50}\b(?:be|was)\s+(?:divided|split)\s+into\b",
    r"\b(?:branch|district)\b.{0,80}\b(?:be|was)\s+(?:organized|organised|disorganized|disorganised)\b.{0,80}\b(?:branch|district|council)\b",
    r"\b(?:disorganized|disorganised|broke\s+up)\b.{0,90}\b(?:joined|united)\s+to\b.{0,50}\bbranch\b",
    r"\b(?:dist|district)\b.{0,45}&.{0,45}\b(?:be|was)\s+united\b",
]]
AFFILIATION_PATTERNS = [
    re.compile(pattern, re.I) for pattern in [
        r"\b(?:branch|district|conference|mission)\s+(?:of|in|at)\b",
        r"\b(?:president|presiding|superintend(?:ent|ing))\s+(?:over|of)\b",
        r"\b(?:represented|representation of)\s+(?:the )?branch\b",
        r"\b(?:meeting|meetings|council)\s+(?:held|met)\s+(?:at|in)\b",
    ]
]
POSSIBLE_PATTERNS = [re.compile(pattern, re.I) for pattern in [
    r"\b(?:member|brother|sister|elder|he|she)\b.{0,80}\btransferred\s+to\b",
    r"\btransferred\s+to\b.{0,80}\b(?:branch|district|conference)\b",
]]

ADDITIONAL_BRANCH_ALIASES = {"Merthyr Tydfil": ["merthyr"]}


def compact(text):
    return " ".join((text or "").replace("\x00", " ").split())


def normalize(text):
    return re.sub(r"[^a-z0-9]+", " ", (text or "").lower()).strip()


def parse_pages(spec):
    pages = set()
    for part in spec.split(","):
        part = part.strip()
        if "-" in part:
            first, last = [int(value) for value in part.split("-", 1)]
            pages.update(range(first, last + 1))
        elif part:
            pages.add(int(part))
    return pages


def load_page_groups():
    groups = {}
    if not PLAN.exists():
        return groups
    with PLAN.open(encoding="utf-8-sig", newline="") as stream:
        for row in csv.DictReader(stream):
            source = row["source_pdf"]
            for page in parse_pages(row["pdf_pages"]):
                groups[(source, page)] = row["destination_record_group"]
    return groups


def load_branch_names():
    data = json.loads((ROOT / "data" / "branch-registry.json").read_text(encoding="utf-8"))
    names = []
    details = {}
    for branch in data["registry"]:
        canonical = branch["canonicalName"]
        details[canonical] = branch
        variants = [canonical] + [value.strip() for value in (branch.get("variants") or "").split(";") if value.strip()]
        for value in variants:
            key = normalize(value)
            if len(key) >= 4:
                names.append((canonical, key))
        for value in ADDITIONAL_BRANCH_ALIASES.get(canonical, []):
            names.append((canonical, normalize(value)))
    names.sort(key=lambda item: len(item[1]), reverse=True)
    return names, details


def matched_branches(text, names):
    haystack = f" {normalize(text)} "
    found = []
    for canonical, key in names:
        if f" {key} " in haystack and canonical not in found:
            found.append(canonical)
    return found


def call_references(text):
    found = []
    for match in re.finditer(r"\b(?:LR\s*)?(\d{3,6})\s+((?:10|11|21|22|23|7))\b", text[:1200], re.I):
        compact_call = f"{match.group(1)}{match.group(2)}"
        if compact_call in CALL_TO_CD:
            label = f"LR{match.group(1)}{match.group(2)}"
            if label not in found:
                found.append(label)
    return found


def source_cd_range(filename):
    match = re.search(r"CDs?\s+(\d+)(?:-(\d+))?", filename, re.I)
    if not match:
        return []
    first, last = int(match.group(1)), int(match.group(2) or match.group(1))
    return list(range(first, last + 1))


def page_context(text, query_match, radius=210):
    start = max(0, query_match.start() - radius)
    end = min(len(text), query_match.end() + radius)
    snippet = text[start:end].strip()
    return ("..." if start else "") + snippet + ("..." if end < len(text) else "")


def candidate_evidence(record):
    candidates = []
    seen = set()
    for classification, patterns, kind in [
        ("confirmed", EXPLICIT_PATTERNS, "explicit relationship language"),
        ("probable", AFFILIATION_PATTERNS, "organizational or meeting-place language"),
        ("possible", POSSIBLE_PATTERNS, "individual transfer or co-location language"),
    ]:
        for pattern in patterns:
            for match in pattern.finditer(record["text"]):
                context = page_context(record["text"], match)
                candidate_classification = classification
                candidate_kind = kind
                if candidate_classification == "confirmed" and re.search(r"\b(?:united with us|joined another denomination)\b", context, re.I):
                    candidate_classification = "possible"
                    candidate_kind = "individual status language near an organizational term"
                key = normalize(context)
                if key in seen:
                    continue
                seen.add(key)
                candidates.append({
                    "classification": candidate_classification,
                    "candidateKind": candidate_kind,
                    "branchesMentioned": record["associatedBranches"],
                    "sourceFile": record["sourceFile"],
                    "pdfPage": record["pdfPage"],
                    "sourceCds": record["sourceCds"],
                    "lrNumbers": record["lrNumbers"],
                    "recordGroup": record["recordGroup"],
                    "context": context,
                    "reviewStatus": "manual review required",
                })
    return candidates


def main():
    pdfs = sorted(PDF_DIR.glob(PDF_PATTERN), key=lambda path: path.name.lower())
    if not pdfs:
        raise RuntimeError(f"No typed source PDFs found in {PDF_DIR}")
    page_groups = load_page_groups()
    branch_names, branch_details = load_branch_names()
    records = []
    source_reports = []
    candidates = []

    for pdf in pdfs:
        reader = PdfReader(pdf)
        source_range = source_cd_range(pdf.name)
        usable = 0
        empty_pages = []
        active_lrs = []
        active_cds = []
        for page_number, page in enumerate(reader.pages, 1):
            text = compact(page.extract_text() or "")
            if len(text) < 20:
                empty_pages.append(page_number)
                continue
            usable += 1
            detected_lrs = call_references(text)
            if detected_lrs:
                active_lrs = detected_lrs
                detected_cds = {cd for value in detected_lrs for cd in CALL_TO_CD.get(re.sub(r"\D", "", value), [])}
                active_cds = sorted(detected_cds.intersection(source_range) or detected_cds)
            group = page_groups.get((pdf.name, page_number), "")
            branches = matched_branches(f"{group} {text}", branch_names)
            lrs = detected_lrs or active_lrs
            cds = active_cds or source_range
            relative_path = pdf.relative_to(ROOT).as_posix()
            record = {
                "id": f"typed-pdf:{pdf.name}:{page_number}",
                "type": "typed-branch-record-extract",
                "resultType": RESULT_TYPE,
                "title": group or pdf.stem,
                "sourceFile": pdf.name,
                "pdfPage": page_number,
                "text": text,
                "summary": text[:520] + ("..." if len(text) > 520 else ""),
                "associatedBranches": branches,
                "sourceCds": cds,
                "lrNumbers": lrs,
                "recordGroup": group,
                "originalLocalPath": relative_path,
                "url": f"{relative_path}#page={page_number}",
            }
            records.append(record)
            candidates.extend(candidate_evidence(record))
        source_reports.append({
            "sourceFile": pdf.name,
            "originalLocalPath": pdf.relative_to(ROOT).as_posix(),
            "bytes": pdf.stat().st_size,
            "pages": len(reader.pages),
            "pagesWithUsableEmbeddedText": usable,
            "pagesWithoutUsableEmbeddedText": len(empty_pages),
            "pagesWithoutText": empty_pages,
            "sourceCdRange": source_range,
        })

    # Preserve every candidate, but keep exact duplicate contexts out of the review file.
    unique_candidates = []
    candidate_keys = set()
    for candidate in candidates:
        key = (candidate["sourceFile"], candidate["pdfPage"], candidate["classification"])
        if key not in candidate_keys:
            candidate_keys.add(key)
            unique_candidates.append(candidate)

    generated = datetime.now(timezone.utc).isoformat()
    index = {
        "privateLocalIndex": True,
        "generatedAt": generated,
        "resultType": RESULT_TYPE,
        "counts": {
            "sourcePdfs": len(pdfs),
            "totalPdfPages": sum(item["pages"] for item in source_reports),
            "pageTextRecords": len(records),
            "pagesWithoutUsableEmbeddedText": sum(item["pagesWithoutUsableEmbeddedText"] for item in source_reports),
            "candidateEvidence": len(unique_candidates),
        },
        "sources": source_reports,
        "records": records,
    }
    evidence = {
        "privateLocalIndex": True,
        "generatedAt": generated,
        "notice": "Candidate evidence only. Do not update branch metadata without manual source review.",
        "classifications": {
            "confirmed": "Explicit relationship wording is present in the typed extract; transcription and historical interpretation still require review.",
            "probable": "Organizational affiliation or meeting-place wording is present; the exact relationship requires review.",
            "possible": "Co-occurrence or locality evidence only; not asserted automatically.",
        },
        "candidates": unique_candidates,
    }
    report = {
        "generatedAt": generated,
        "counts": index["counts"],
        "sources": source_reports,
        "candidateCounts": {
            level: sum(1 for item in unique_candidates if item["classification"] == level)
            for level in ["confirmed", "probable", "possible"]
        },
    }

    PRIVATE_DIR.mkdir(parents=True, exist_ok=True)
    (PRIVATE_DIR / "typed-branch-record-index.local.json").write_text(json.dumps(index, ensure_ascii=False, indent=2), encoding="utf-8")
    (PRIVATE_DIR / "typed-branch-record-index.local.js").write_text(f"window.TYPED_BRANCH_RECORD_PRIVATE_INDEX = {json.dumps(index, ensure_ascii=False)};\n", encoding="utf-8")
    (PRIVATE_DIR / "typed-branch-evidence-candidates.local.json").write_text(json.dumps(evidence, ensure_ascii=False, indent=2), encoding="utf-8")
    (PRIVATE_DIR / "typed-branch-record-index-report.local.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
