// Shared query behavior for future public and portable Welsh Saints adapters.
export const CONTEXT = Object.freeze({
  TITLE: 1,
  NAME_ALTERNATE: 2,
  BRANCH: 4,
  PLACE: 8,
  DATE: 16,
  FAMILY: 32,
  MIGRATION: 64,
  BIOGRAPHICAL: 128,
  HISTORICAL: 256,
});

const DASHES = /[\u2010-\u2015\u2212-]/g;
const APOSTROPHES = /[\u2018\u2019\u02bc']/g;

export function normalizeText(value = "") {
  return String(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en")
    .replace(APOSTROPHES, "")
    .replace(DASHES, " ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function tokenize(value = "") {
  const normalized = normalizeText(value);
  return normalized ? normalized.split(" ") : [];
}

export function compactForm(value = "") {
  return normalizeText(value).replace(/\s+/g, "");
}

export function personNameForms(displayTitle = "") {
  const exact = normalizeText(displayTitle);
  const forms = new Set(exact ? [exact] : []);
  const comma = String(displayTitle).match(/^\s*([^,]+),\s*(.+?)\s*$/);
  if (comma) forms.add(normalizeText(`${comma[2]} ${comma[1]}`));
  return [...forms].filter(Boolean);
}

export function queryForms(query, aliasMap = {}) {
  const normalized = normalizeText(query);
  const forms = new Set(normalized ? [normalized] : []);
  if (aliasMap[normalized]) for (const alias of aliasMap[normalized]) forms.add(normalizeText(alias));
  const comma = String(query).match(/^\s*([^,]+),\s*(.+?)\s*$/);
  if (comma) forms.add(normalizeText(`${comma[2]} ${comma[1]}`));
  return [...forms].filter(Boolean);
}

export function contextLabels(mask) {
  const labels = [];
  if (mask & (CONTEXT.TITLE | CONTEXT.NAME_ALTERNATE)) labels.push("person name");
  if (mask & CONTEXT.BRANCH) labels.push("branch references");
  if (mask & CONTEXT.PLACE) labels.push("place information");
  if (mask & CONTEXT.DATE) labels.push("date information");
  if (mask & CONTEXT.FAMILY) labels.push("family relationships");
  if (mask & CONTEXT.MIGRATION) labels.push("migration information");
  if (mask & CONTEXT.BIOGRAPHICAL) labels.push("biographical information");
  if (mask & CONTEXT.HISTORICAL) labels.push("historical information");
  return [...new Set(labels)];
}

export function rankRecord(record, postingMatches, query) {
  const normalizedQuery = normalizeText(query);
  const titleForms = record.nameForms || personNameForms(record.title);
  let score = 0;
  if (titleForms.includes(normalizedQuery)) score += 120;
  else if (titleForms.some((form) => form.startsWith(normalizedQuery))) score += 90;

  let combinedMask = 0;
  for (const posting of postingMatches) {
    const [, mask, frequencyBucket] = posting;
    combinedMask |= mask;
    if (mask & CONTEXT.TITLE) score += 24;
    if (mask & CONTEXT.NAME_ALTERNATE) score += 20;
    if (mask & CONTEXT.BRANCH) score += 16;
    if (mask & CONTEXT.PLACE) score += 13;
    if (mask & CONTEXT.FAMILY) score += 11;
    if (mask & CONTEXT.DATE) score += 9;
    if (mask & CONTEXT.MIGRATION) score += 6;
    if (mask & CONTEXT.BIOGRAPHICAL) score += 3;
    if (mask & CONTEXT.HISTORICAL) score += 2;
    score += Math.min(frequencyBucket, 3);
  }
  return { score, contextMask: combinedMask };
}
