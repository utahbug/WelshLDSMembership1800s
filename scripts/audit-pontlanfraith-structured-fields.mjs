import fs from "node:fs";
import path from "node:path";

const root=path.resolve(import.meta.dirname,"..");
const privateDir=path.join(root,"data/private");
const sourcePath=path.join(privateDir,"people-index-source.csv");
const evidencePath=path.join(privateDir,"people-index-pontlanfraith-structured-field-proposals.csv");
const reportPath=path.join(privateDir,"people-index-pontlanfraith-structured-field-proposals-report.json");
function parseCsv(text){const rows=[];let row=[],field="",quoted=false;for(let i=0;i<text.length;i++){const c=text[i];if(quoted){if(c==='"'&&text[i+1]==='"'){field+='"';i++;}else if(c==='"')quoted=false;else field+=c;}else if(c==='"')quoted=true;else if(c===','){row.push(field);field="";}else if(c==='\n'){row.push(field.replace(/\r$/, ""));if(row.some(Boolean))rows.push(row);row=[];field="";}else field+=c;}if(field||row.length){row.push(field.replace(/\r$/, ""));if(row.some(Boolean))rows.push(row);}return rows;}
const quote=(v)=>/[",\r\n]/.test(String(v??""))?`"${String(v??"").replaceAll('"','""')}"`:String(v??"");
const parsed=parseCsv(fs.readFileSync(sourcePath,"utf8").replace(/^\uFEFF/,"")),headers=parsed[0],rows=parsed.slice(1).map(v=>Object.fromEntries(headers.map((h,i)=>[h,v[i]??""])));
const branchRows=rows.filter(r=>r.branch==="Pontlanfraith");if(branchRows.length!==5)throw new Error(`Expected 5 Pontlanfraith occurrences; found ${branchRows.length}.`);
const proposals=new Map([
  ["1",{birthDate:"29 Jan 1878",imageFilename:"Pontlanfraith-pdf-page-004.jpg",cardPosition:"card 1, top card on right-hand register page"}],
  ["4",{birthDate:"9 Apr 1868",imageFilename:"Pontlanfraith-pdf-page-004.jpg",cardPosition:"card 4, fourth card on right-hand register page"}],
  ["5",{birthDate:"17 Jan 1879",imageFilename:"Pontlanfraith-pdf-page-004.jpg",cardPosition:"card 5, bottom card on right-hand register page"}],
  ["6",{birthDate:"6 Aug 1912",imageFilename:"Pontlanfraith-pdf-page-005.jpg",cardPosition:"card 6, upper-left card"}],
  ["8",{birthDate:"26 June 1920",imageFilename:"Pontlanfraith-pdf-page-005.jpg",cardPosition:"card 8, left column, third card"}],
]);
const evidence=[];
for(const row of branchRows){const p=proposals.get(row.entryNumber);if(!p)throw new Error(`No proposal for entry ${row.entryNumber}.`);if(row.imageFilename!==p.imageFilename)throw new Error(`Image mismatch for entry ${row.entryNumber}.`);if(row.birthDate)throw new Error(`Birth already populated for entry ${row.entryNumber}.`);evidence.push({occurrenceKey:[row.branch,row.imageFilename,row.entryNumber,row.nameAsWritten].join("|"),memberName:row.nameAsWritten,entryNumber:row.entryNumber,imageFilename:row.imageFilename,rowPosition:p.cardPosition,proposedField:"birthDate",exactValueAsWritten:p.birthDate,confidence:"clear",evidenceNote:`The card's Name in Full and No. ${row.entryNumber} identify this occurrence; the Birth date is read directly from the Born at row on the same bounded card. Neighboring card borders prevent row transfer.`});}
const outHeaders=["occurrenceKey","memberName","entryNumber","imageFilename","rowPosition","proposedField","exactValueAsWritten","confidence","evidenceNote"];
fs.writeFileSync(evidencePath,`${outHeaders.join(",")}\n${evidence.map(r=>outHeaders.map(h=>quote(r[h])).join(",")).join("\n")}\n`);
const report={mode:"audit-only; no source/master modification",selectedBranch:"Pontlanfraith",reason:"Smallest complete, clean candidate: five existing occurrences on individually bounded member cards with exact image and entry identity.",reviewedOccurrences:5,proposedBirth:5,proposedBaptism:0,existingBaptismVerified:5,proposedResidence:0,occurrencesReceivingMultipleNewFields:0,unchangedOccurrences:0,manualReviewOccurrences:0,residenceDisposition:"No Residence field is present on these cards; birthplace text was not reclassified as residence.",output:path.relative(root,evidencePath)};
fs.writeFileSync(reportPath,`${JSON.stringify(report,null,2)}\n`);console.log(JSON.stringify(report,null,2));
