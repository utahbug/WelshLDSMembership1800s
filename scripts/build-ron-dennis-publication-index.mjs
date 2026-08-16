import fs from "node:fs";
import path from "node:path";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

const root = path.resolve(import.meta.dirname, "..");
const publications = [
  {
    id: "call-of-zion",
    title: "The Call of Zion: The Story of the First Welsh Mormon Emigration",
    source: "The Call of Zion (First Welsh Mormon Emigration, Volume 2).pdf",
  },
  {
    id: "welsh-mormon-writings",
    title: "Welsh Mormon Writings from 1844 to 1862: A Historical Bibliography",
    source: "Welsh Mormon Writings (1844-1862).pdf",
  },
  {
    id: "indefatigable-veteran",
    title: "Indefatigable Veteran: History and Biography of Abel Evans, a Welsh Mormon Elder",
    source: "AbleEvans.pdf",
  },
  {
    id: "prophet-of-the-jubilee",
    title: "Prophet of the Jubilee",
    source: "Prophet of the Jubilee.pdf",
  },
  {
    id: "steamboat-for-an-eldership",
    title: "A Steamboat for an Eldership: Dan Jones and the Beginnings of Mormonism in Wales",
    source: "A Steamboat for an Eldership.pdf",
  },
  {
    id: "on-trial-welsh-press",
    title: "On Trial in the Welsh Press: Latter-day Saint Missionaries Declare and Defend the Faith, 1840-1860",
    source: "On Trial in the Welsh Press.pdf",
  },
  {
    id: "llyfr-mormon-translation",
    title: "Llyfr Mormon: The Translation of the Book of Mormon into Welsh",
    source: "Translating the Welsh Book of Mormon.pdf",
  },
  { id: "zions-trumpet-1849", title: "Zion's Trumpet - Vol. 1 - 1849", source: "Zions Trumpet (1849).pdf" },
  { id: "zions-trumpet-1850", title: "Zion's Trumpet - Vol. 2 - 1850", source: "Zions Trumpet (1850).pdf" },
  { id: "zions-trumpet-1851", title: "Zion's Trumpet - Vol. 3 - 1851", source: "Zions Trumpet (1851).pdf" },
  { id: "zions-trumpet-1852", title: "Zion's Trumpet - Vol. 4 - 1852", source: "Zions Trumpet (1852).pdf" },
  { id: "zions-trumpet-1853", title: "Zion's Trumpet - Vols. 5-6 - 1853", source: "Zions Trumpet (1853).pdf" },
  { id: "zions-trumpet-1854", title: "Zion's Trumpet - Vol. 7 - 1854", source: "Zions Trumpet (1854).pdf" },
  { id: "zions-trumpet-1855", title: "Zion's Trumpet - Vol. 8 - 1855", source: "Zions Trumpet (1855).pdf" },
  { id: "zions-trumpet-1856-1857", title: "Zion's Trumpet - Vols. 9-10 - 1856-1857", source: "Zions Trumpet (1856-1857).pdf" },
];

const reports = [];
for (const publication of publications) {
  const source = path.join(root, "resources/books/ron-dennis", publication.source);
  const output = path.join(root, "local-development/data/publication-search", `${publication.id}.json`);
  const pdf = await pdfjsLib.getDocument(source).promise;
  const pages = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const text = content.items.map((item) => item.str).join(" ").replace(/\s+/g, " ").trim();
    pages.push({ pageNumber, text });
  }
  const index = {
    schemaVersion: 1,
    sourceType: "ronald-dennis-publication",
    publicationId: publication.id,
    title: publication.title,
    author: "Ronald D. Dennis",
    extraction: "Embedded PDF text; no OCR or source-text correction.",
    pageCount: pdf.numPages,
    pages,
  };
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, `${JSON.stringify(index)}\n`, "utf8");
  reports.push({ output, pageCount: pages.length, textPages: pages.filter((page) => page.text.trim()).length });
}
console.log(JSON.stringify(reports, null, 2));
