import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const root = process.argv[2] ? path.resolve(process.argv[2]) : path.resolve(import.meta.dirname, "..");
const coreContext = {};
vm.runInNewContext(fs.readFileSync(path.join(root, "people-search-core.js"), "utf8"), coreContext);
const core = coreContext.WELSH_PEOPLE_SEARCH_CORE;
if (!core) throw new Error("People Search core did not initialize.");

const index = JSON.parse(fs.readFileSync(path.join(root, "data", "private", "people-index.local.json"), "utf8"));
const catalogContext = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(root, "data", "catalog.local.js"), "utf8"), catalogContext);
const collections = new Map(catalogContext.window.WELSH_RECORD_CATALOG.collections.map((collection) => [collection.id, collection]));

const search = (query) => index.records.filter((record) => core.matches(record, query, collections.get(record.collectionId)));
const includes = (query, name, branch) => search(query).some((record) => record.nameAsWritten === name && record.branch === branch);
const tests = [
  ["1846", "David Roberts", "Ffestiniog"],
  ["Mai 24 46", "David Roberts", "Ffestiniog"],
  ["May 24 1846", "David Roberts", "Ffestiniog"],
  ["24 May 1846", "David Roberts", "Ffestiniog"],
  ["David Roberts Ffestiniog 1846", "David Roberts", "Ffestiniog"],
  ["March 1861", "William Coalman", "Abertillery"],
  ["Cwmtillery 1853", "Abel Brooks", "Cwmtillery"],
  ["Machen April 1857", "George Conner", "Machen"],
  ["Catharine Davies Twyncarno entry 1", "Catharine Davies", "Twyncarno"],
  ["Henry Thomas Crumlin", "Henry Thomas", "Crumlin"],
  ["James Jones Pantmawr", "James Jones", "Llansawel (Carmarthenshire)"],
  ["John Hughes Maentwrog", "John Hughes", "Ffestiniog"],
  ["Thomas Phillips Stepaside 1810", "Thomas Phillips", "Stepaside"],
  ["4 August 1810", "Thomas Phillips", "Stepaside"],
  ["LR1887 Cwmtillery", "Abel Brooks", "Cwmtillery"],
  ["Margaret Lewis Alltwen Janr 14=23", "Margaret Lewis", "Alltwen"],
  ["Mary Lewis Alltwen Gorff 1/56", "Mary Lewis", "Alltwen"],
  ["Lydia Sophia Wheeler 23 Jul 1884", "Lydia Sophia Wheeler", "Abersychan"],
  ["Margaret Vaughan Mai 1/17", "Margaret Vaughan", "Georgetown"],
  ["Margaret Vaughan Mai 2/45", "Margaret Vaughan", "Georgetown"],
  ["John Thomas Ynysfach entry 3", "John Thomas", "Georgetown"],
  ["Gertrude Dora Hill Dance 29 Jan 1878", "Gertrude Dora Hill Dance", "Pontlanfraith"],
  ["William Griffiths 9 Apr 1868", "William Griffiths", "Pontlanfraith"],
  ["Julia Rose Griffiths Hoard 26 June 1920", "Julia Rose Griffiths Hoard", "Pontlanfraith"],
];

const failures = tests.filter(([query, name, branch]) => !includes(query, name, branch));
if (failures.length) throw new Error(`People Search failures:\n${failures.map((test) => test.join(" | ")).join("\n")}`);
if (index.counts.occurrences !== 11473 || index.records.length !== 11473) throw new Error(`Unexpected occurrence count: ${index.records.length}`);
if (index.counts.associated !== 0) throw new Error(`Associated-person count changed unexpectedly: ${index.counts.associated}`);
if (index.counts.withBirthDate !== 49) throw new Error(`Expected 49 birth dates, found ${index.counts.withBirthDate}`);
if (index.counts.withBaptismDate !== 153) throw new Error(`Expected 153 baptism dates, found ${index.counts.withBaptismDate}`);
if (index.records.some((record) => record.verified && (!record.collectionId || (!record.imageSequence && !record.imageFilename)))) throw new Error("A verified record lost its exact viewer linkage.");

console.log(JSON.stringify({
  occurrences: index.records.length,
  birthDates: index.counts.withBirthDate,
  baptismDates: index.counts.withBaptismDate,
  associated: index.counts.associated,
  tests: tests.map(([query]) => ({ query, matches: search(query).length })),
}, null, 2));
