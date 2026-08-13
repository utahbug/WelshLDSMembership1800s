import fs from "node:fs";
import path from "node:path";

const root=path.resolve(import.meta.dirname,"..");
const privateDir=path.join(root,"data/private");
const sourcePath=path.join(privateDir,"people-index-source.csv");
const stagingPath=path.join(privateDir,"people-index-staging-georgetown-production.csv");
const verifiedPath=path.join(privateDir,"people-index-georgetown-structured-field-second-pass.csv");
const reportPath=path.join(privateDir,"people-index-georgetown-confirmed-promotion-report.json");

function parseCsv(text){const rows=[];let row=[],field="",quoted=false;for(let i=0;i<text.length;i++){const c=text[i];if(quoted){if(c==='"'&&text[i+1]==='"'){field+='"';i++;}else if(c==='"')quoted=false;else field+=c;}else if(c==='"')quoted=true;else if(c===','){row.push(field);field="";}else if(c==='\n'){row.push(field.replace(/\r$/, ""));if(row.some(Boolean))rows.push(row);row=[];field="";}else field+=c;}if(field||row.length){row.push(field.replace(/\r$/, ""));if(row.some(Boolean))rows.push(row);}return rows;}
const quote=(v)=>/[",\r\n]/.test(String(v??""))?`"${String(v??"").replaceAll('"','""')}"`:String(v??"");
const read=(file)=>{const p=parseCsv(fs.readFileSync(file,"utf8").replace(/^\uFEFF/,""));return{headers:p[0],rows:p.slice(1).map(v=>Object.fromEntries(p[0].map((h,i)=>[h,v[i]??""])))};};
const write=(file,headers,rows)=>fs.writeFileSync(file,`${headers.join(",")}\n${rows.map(r=>headers.map(h=>quote(r[h]??"")).join(",")).join("\n")}\n`);
const assert=(condition,message)=>{if(!condition)throw new Error(message);};

const source=read(sourcePath),staging=read(stagingPath),verified=read(verifiedPath);
const confirmed=verified.rows.filter(r=>r.secondPassStatus==="confirmed");
assert(verified.rows.length===125,`Expected 125 second-pass rows; found ${verified.rows.length}.`);
assert(confirmed.length===123,`Expected 123 confirmed values; found ${confirmed.length}.`);
assert(confirmed.filter(r=>r.proposedField==="birthDate").length===1,"Expected one confirmed Birth value.");
assert(confirmed.filter(r=>r.proposedField==="baptismDate").length===11,"Expected eleven confirmed Baptism values.");
assert(confirmed.filter(r=>r.proposedField==="residence").length===111,"Expected 111 confirmed Residence values.");
assert(!confirmed.some(r=>r.imageFilename==="10.jpg"&&["107","108"].includes(r.entryNumber)&&r.proposedField==="residence"),"Downgraded entries 107/108 entered confirmed set.");

const beforeCount=source.rows.length;
const beforeIdentities=source.rows.filter(r=>r.branch==="Georgetown").map(r=>[r.nameAsWritten,r.entryNumber,r.imageFilename,r.imageRef,r.occurrenceType].join("|")).join("\n");
const touched=new Set();
for(const proposal of confirmed){
  const matches=source.rows.filter(r=>r.branch==="Georgetown"&&r.nameAsWritten===proposal.memberName&&r.entryNumber===proposal.entryNumber&&r.imageFilename===proposal.imageFilename);
  assert(matches.length===1,`Expected one master occurrence for ${proposal.occurrenceKey}; found ${matches.length}.`);
  const row=matches[0],field=proposal.proposedField,value=proposal.exactValueAsWritten;
  assert(["birthDate","baptismDate","residence"].includes(field),`Unexpected field ${field}.`);
  assert(!row[field]||row[field]===value,`Refusing to overwrite ${field} for ${proposal.occurrenceKey}.`);
  row[field]=value;touched.add(proposal.occurrenceKey);

  const stageMatches=staging.rows.filter(r=>r.branch==="Georgetown"&&r.nameAsWritten===proposal.memberName&&r.entryNumber===proposal.entryNumber&&r.imageFilename===proposal.imageFilename);
  assert(stageMatches.length===1,`Expected one staging occurrence for ${proposal.occurrenceKey}; found ${stageMatches.length}.`);
  stageMatches[0][field]=value;
  stageMatches[0][`${field}Confidence`]="independently confirmed";
  stageMatches[0].reviewNotes=[stageMatches[0].reviewNotes,"Structured field independently verified against exact source row and neighboring rows."].filter(Boolean).join(" ");
}

for(const entry of ["107","108"]){const row=source.rows.find(r=>r.branch==="Georgetown"&&r.entryNumber===entry&&r.imageFilename==="10.jpg");assert(row&&!row.residence,`Downgraded Residence must remain blank for entry ${entry}.`);}
assert(source.rows.length===beforeCount,"Occurrence count changed during field-only promotion.");
const afterIdentities=source.rows.filter(r=>r.branch==="Georgetown").map(r=>[r.nameAsWritten,r.entryNumber,r.imageFilename,r.imageRef,r.occurrenceType].join("|")).join("\n");
assert(beforeIdentities===afterIdentities,"Georgetown occurrence identity or source mapping changed.");

for(const header of ["birthDate","birthDateConfidence"]){if(!staging.headers.includes(header)){const index=staging.headers.indexOf("baptismDate");staging.headers.splice(index,0,header);}}
write(sourcePath,source.headers,source.rows);
write(stagingPath,staging.headers,staging.rows);
const report={promoted:{birth:1,baptism:11,residence:111,totalFields:123,uniqueOccurrences:touched.size},georgetownOccurrences:source.rows.filter(r=>r.branch==="Georgetown").length,totalOccurrences:source.rows.length,downgradedResidenceBlank:[{entryNumber:"107",imageFilename:"10.jpg"},{entryNumber:"108",imageFilename:"10.jpg"}],identityMappingsUnchanged:true};
fs.writeFileSync(reportPath,`${JSON.stringify(report,null,2)}\n`);console.log(JSON.stringify(report,null,2));
