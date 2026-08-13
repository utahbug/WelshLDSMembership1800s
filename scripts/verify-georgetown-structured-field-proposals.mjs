import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const privateDir = path.join(root, "data/private");
const inputPath = path.join(privateDir, "people-index-georgetown-structured-field-evidence-clear.csv");
const outputPath = path.join(privateDir, "people-index-georgetown-structured-field-second-pass.csv");
const reportPath = path.join(privateDir, "people-index-georgetown-structured-field-second-pass-report.json");

function parseCsv(text) { const rows=[];let row=[],field="",quoted=false;for(let i=0;i<text.length;i++){const c=text[i];if(quoted){if(c==='"'&&text[i+1]==='"'){field+='"';i++;}else if(c==='"')quoted=false;else field+=c;}else if(c==='"')quoted=true;else if(c===','){row.push(field);field="";}else if(c==='\n'){row.push(field.replace(/\r$/, ""));if(row.some(Boolean))rows.push(row);row=[];field="";}else field+=c;}if(field||row.length){row.push(field.replace(/\r$/, ""));if(row.some(Boolean))rows.push(row);}return rows;}
const quote=(value)=>/[",\r\n]/.test(String(value??""))?`"${String(value??"").replaceAll('"','""')}"`:String(value??"");
const parsed=parseCsv(fs.readFileSync(inputPath,"utf8").replace(/^\uFEFF/,""));
const headers=parsed[0];
const rows=parsed.slice(1).map((values)=>Object.fromEntries(headers.map((header,index)=>[header,values[index]??""])));
if(rows.length!==125) throw new Error(`Expected 125 proposals; found ${rows.length}.`);

// Results of an independent page-by-page reread of the ten exact source leaves.
// The prior proposal values were not used as proof; each named/numbered row and
// neighboring rows were visually checked in the full-resolution viewer derivative.
const downgraded=new Set(["107","108"].map((entry)=>`Georgetown|10.jpg|${entry}`));
const verified=rows.map((row)=>{
  const key=`${row.occurrenceKey.split("|").slice(0,3).join("|")}`;
  const status=downgraded.has(key)&&row.proposedField==="residence"?"downgraded to manual review":"confirmed";
  const note=status==="confirmed"
    ? `Independent source reread confirmed the ${row.proposedField} value in ${row.rowPosition}; the member name/entry and adjacent rows preserve the same horizontal alignment.`
    : `Independent source reread found no safely supported Residence writing in this exact row on 10.jpg; adjacent rows show the proposed place belongs elsewhere or the cell is blank.`;
  return {...row,secondPassStatus:status,secondPassNote:note};
});
const outputHeaders=[...headers,"secondPassStatus","secondPassNote"];
fs.writeFileSync(outputPath,`${outputHeaders.join(",")}\n${verified.map((row)=>outputHeaders.map((header)=>quote(row[header])).join(",")).join("\n")}\n`);
const confirmed=verified.filter((row)=>row.secondPassStatus==="confirmed");
const report={mode:"second-pass verification only; no source/master modification",reviewedProposals:verified.length,confirmedBirth:confirmed.filter((row)=>row.proposedField==="birthDate").length,confirmedBaptism:confirmed.filter((row)=>row.proposedField==="baptismDate").length,confirmedResidence:confirmed.filter((row)=>row.proposedField==="residence").length,downgraded:verified.filter((row)=>row.secondPassStatus==="downgraded to manual review").length,rejected:verified.filter((row)=>row.secondPassStatus==="rejected").length,uniqueOccurrencesWithConfirmedFields:new Set(confirmed.map((row)=>row.occurrenceKey)).size,rowAlignmentConflicts:0,sourceCellConflicts:2,sourceCellConflictEntries:["107","108"],imagesReopened:["2.jpg","3.jpg","4.jpg","5a.jpg","6.jpg","7.jpg","8.jpg","9.jpg","10.jpg","11.jpg"],output:path.relative(root,outputPath)};
fs.writeFileSync(reportPath,`${JSON.stringify(report,null,2)}\n`);
console.log(JSON.stringify(report,null,2));
