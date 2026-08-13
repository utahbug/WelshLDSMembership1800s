import fs from "node:fs";
import path from "node:path";

const root=path.resolve(import.meta.dirname,"..");
const privateDir=path.join(root,"data/private");
const sourcePath=path.join(privateDir,"people-index-source.csv");
const stagingPath=path.join(privateDir,"people-index-staging-pontlanfraith-production.csv");
const evidencePath=path.join(privateDir,"people-index-pontlanfraith-structured-field-proposals.csv");
const reportPath=path.join(privateDir,"people-index-pontlanfraith-confirmed-promotion-report.json");
function parseCsv(text){const rows=[];let row=[],field="",quoted=false;for(let i=0;i<text.length;i++){const c=text[i];if(quoted){if(c==='"'&&text[i+1]==='"'){field+='"';i++;}else if(c==='"')quoted=false;else field+=c;}else if(c==='"')quoted=true;else if(c===','){row.push(field);field="";}else if(c==='\n'){row.push(field.replace(/\r$/, ""));if(row.some(Boolean))rows.push(row);row=[];field="";}else field+=c;}if(field||row.length){row.push(field.replace(/\r$/, ""));if(row.some(Boolean))rows.push(row);}return rows;}
const quote=(v)=>/[",\r\n]/.test(String(v??""))?`"${String(v??"").replaceAll('"','""')}"`:String(v??"");
const read=(file)=>{const p=parseCsv(fs.readFileSync(file,"utf8").replace(/^\uFEFF/,""));return{headers:p[0],rows:p.slice(1).map(v=>Object.fromEntries(p[0].map((h,i)=>[h,v[i]??""])))};};
const write=(file,headers,rows)=>fs.writeFileSync(file,`${headers.join(",")}\n${rows.map(r=>headers.map(h=>quote(r[h]??"")).join(",")).join("\n")}\n`);
const assert=(c,m)=>{if(!c)throw new Error(m);};
const source=read(sourcePath),staging=read(stagingPath),evidence=read(evidencePath);
assert(evidence.rows.length===5,"Expected five approved proposals.");
assert(evidence.rows.every(r=>r.proposedField==="birthDate"&&r.confidence==="clear"),"Evidence contains non-Birth or non-clear proposal.");
const expected=new Map([["1","29 Jan 1878"],["4","9 Apr 1868"],["5","17 Jan 1879"],["6","6 Aug 1912"],["8","26 June 1920"]]);
const beforeCount=source.rows.length,beforeBranch=source.rows.filter(r=>r.branch==="Pontlanfraith"),beforeIdentity=beforeBranch.map(r=>[r.nameAsWritten,r.entryNumber,r.imageFilename,r.imageRef,r.occurrenceType].join("|")).join("\n");
for(const proposal of evidence.rows){assert(expected.get(proposal.entryNumber)===proposal.exactValueAsWritten,`Unexpected value for entry ${proposal.entryNumber}.`);const matches=source.rows.filter(r=>r.branch==="Pontlanfraith"&&r.nameAsWritten===proposal.memberName&&r.entryNumber===proposal.entryNumber&&r.imageFilename===proposal.imageFilename);assert(matches.length===1,`Master match count ${matches.length} for ${proposal.occurrenceKey}.`);const row=matches[0];assert(!row.birthDate,"Refusing to overwrite existing Birth.");assert(row.baptismDate,"Existing Baptism missing before promotion.");assert(!row.residence,"Residence unexpectedly populated.");row.birthDate=proposal.exactValueAsWritten;const stage=staging.rows.filter(r=>r.nameAsWritten===proposal.memberName&&r.entryNumber===proposal.entryNumber&&r.imageFilename===proposal.imageFilename);assert(stage.length===1,`Staging match count ${stage.length}.`);stage[0].birthDate=proposal.exactValueAsWritten;stage[0].birthDateConfidence="confirmed exact card alignment";}
if(!staging.headers.includes("birthDate"))staging.headers.splice(staging.headers.indexOf("baptismDate"),0,"birthDate");if(!staging.headers.includes("birthDateConfidence"))staging.headers.splice(staging.headers.indexOf("baptismDateConfidence"),0,"birthDateConfidence");
assert(source.rows.length===beforeCount,"Occurrence count changed.");const after=source.rows.filter(r=>r.branch==="Pontlanfraith"),afterIdentity=after.map(r=>[r.nameAsWritten,r.entryNumber,r.imageFilename,r.imageRef,r.occurrenceType].join("|")).join("\n");assert(beforeIdentity===afterIdentity,"Occurrence identities changed.");assert(after.length===5&&after.filter(r=>r.birthDate).length===5&&after.filter(r=>r.baptismDate).length===5&&after.filter(r=>r.residence).length===0,"Post-promotion field counts invalid.");
write(sourcePath,source.headers,source.rows);write(stagingPath,staging.headers,staging.rows);const report={promotedBirth:5,preservedBaptism:5,residence:0,pontlanfraithOccurrences:5,totalOccurrences:source.rows.length,identityMappingsUnchanged:true,duplicatesCreated:0};fs.writeFileSync(reportPath,`${JSON.stringify(report,null,2)}\n`);console.log(JSON.stringify(report,null,2));
