import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const root=path.resolve(import.meta.dirname,"..");
const priv=path.join(root,"data","private");
const masterPath=path.join(priv,"people-index-source.csv");
const configs={
  "Merthyr Tydfil":{slug:"merthyr-tydfil",staging:"people-index-staging-merthyr-tydfil-production.csv",expected:1776,expectedEvidence:{birthDate:6,baptismDate:8,residence:21},expectedManual:4},
  Dowlais:{slug:"dowlais",staging:"people-index-staging-dowlais-production.csv",expected:456,expectedEvidence:{birthDate:0,baptismDate:16,residence:7},expectedManual:13},
};
function parse(text){const rows=[];let row=[],v="",q=false;for(let i=0;i<text.length;i++){const c=text[i];if(q){if(c==='"'&&text[i+1]==='"'){v+='"';i++;}else if(c==='"')q=false;else v+=c;}else if(c==='"')q=true;else if(c===','){row.push(v);v="";}else if(c==='\n'){row.push(v.replace(/\r$/, ""));if(row.some(Boolean))rows.push(row);row=[];v="";}else v+=c;}if(v||row.length){row.push(v.replace(/\r$/, ""));if(row.some(Boolean))rows.push(row);}return rows;}
const esc=v=>/[",\r\n]/.test(String(v??""))?`"${String(v??"").replaceAll('"','""')}"`:String(v??"");
function load(file){const p=parse(fs.readFileSync(file,"utf8").replace(/^\uFEFF/,"")),headers=p.shift();return{headers,rows:p.map(a=>Object.fromEntries(headers.map((h,i)=>[h,a[i]??""])))};}
function write(file,d){fs.writeFileSync(file,`${d.headers.join(",")}\n${d.rows.map(r=>d.headers.map(h=>esc(r[h])).join(",")).join("\n")}\n`);}
const digest=x=>crypto.createHash("sha256").update(JSON.stringify(x)).digest("hex");
const identity=r=>[r.nameAsWritten,r.entryNumber,r.imageFilename,r.imageRef,r.occurrenceType].join("|");
const master=load(masterPath),totalBefore=master.rows.length,targetBranches=new Set(Object.keys(configs)),otherBefore=digest(master.rows.filter(r=>!targetBranches.has(r.branch)));
const reports=[];
for(const [branch,cfg] of Object.entries(configs)){
  const evidence=load(path.join(priv,`people-index-${cfg.slug}-structured-field-pilot-evidence.csv`)).rows;
  const manual=load(path.join(priv,`people-index-${cfg.slug}-structured-field-pilot-manual-review.csv`)).rows;
  const occurrences=load(path.join(priv,`people-index-${cfg.slug}-structured-field-pilot-occurrences.csv`)).rows;
  if(manual.length!==cfg.expectedManual)throw new Error(`${branch}: manual-review set changed (${manual.length}).`);
  for(const [field,n] of Object.entries(cfg.expectedEvidence)){const found=evidence.filter(r=>r.field===field).length;if(found!==n)throw new Error(`${branch}: expected ${n} ${field}; found ${found}.`);}
  const manualPairs=new Set(manual.map(r=>`${r.occurrenceKey}|${r.field}`));
  if(evidence.some(r=>manualPairs.has(`${r.occurrenceKey}|${r.field}`)))throw new Error(`${branch}: manual-review field entered evidence set.`);
  const branchRows=master.rows.filter(r=>r.branch===branch);if(branchRows.length!==cfg.expected)throw new Error(`${branch}: expected ${cfg.expected} master rows; found ${branchRows.length}.`);
  const stagingPath=path.join(priv,cfg.staging),staging=load(stagingPath),stageRows=staging.rows.filter(r=>r.branch===branch);if(stageRows.length<cfg.expected)throw new Error(`${branch}: staging has only ${stageRows.length} rows.`);
  for(const h of ["birthDate","birthDateConfidence"]){if(!staging.headers.includes(h))staging.headers.splice(Math.max(0,staging.headers.indexOf("baptismDate")),0,h);}
  const identitiesBefore=branchRows.map(identity).join("\n"),imagesBefore=branchRows.map(r=>r.imageFilename).join("\n");let added=0,alreadyPresent=0;const changedKeys=new Set();
  for(const e of evidence){
    const matches=branchRows.filter(r=>r.imageFilename===e.imageFilename&&r.entryNumber===e.entryNumber&&r.nameAsWritten===e.memberName);if(matches.length!==1)throw new Error(`${branch}: ${e.occurrenceKey}/${e.memberName} matched ${matches.length} master rows.`);
    const row=matches[0],field=e.field,value=e.exactValueAsWritten;if(!["birthDate","baptismDate","residence"].includes(field))throw new Error(`Unexpected field ${field}.`);
    if(row[field]&&row[field]!==value)throw new Error(`${branch}: refusing conflicting ${field} for ${e.occurrenceKey}.`);
    if(row[field]===value)alreadyPresent++;else{row[field]=value;added++;changedKeys.add(e.occurrenceKey);}
    const sm=stageRows.filter(r=>r.imageFilename===e.imageFilename&&r.entryNumber===e.entryNumber&&r.nameAsWritten===e.memberName);if(sm.length!==1)throw new Error(`${branch}: ${e.occurrenceKey}/${e.memberName} matched ${sm.length} staging rows.`);
    if(sm[0][field]&&sm[0][field]!==value)throw new Error(`${branch}: staging conflict for ${e.occurrenceKey}.`);sm[0][field]=value;if(`${field}Confidence` in sm[0])sm[0][`${field}Confidence`]="clear";
  }
  if(branchRows.map(identity).join("\n")!==identitiesBefore||branchRows.map(r=>r.imageFilename).join("\n")!==imagesBefore)throw new Error(`${branch}: identity/source mapping changed.`);
  if(digest(master.rows.filter(r=>!targetBranches.has(r.branch)))!==otherBefore)throw new Error(`${branch}: a different branch changed.`);
  write(stagingPath,staging);
  const report={branch,confirmedEvidenceFields:evidence.length,newFieldsAdded:added,confirmedAlreadyPresent:alreadyPresent,promotedBirth:evidence.filter(r=>r.field==="birthDate").length,promotedBaptism:evidence.filter(r=>r.field==="baptismDate").length,promotedResidence:evidence.filter(r=>r.field==="residence").length,uniqueOccurrencesWithNewFields:changedKeys.size,pilotOccurrences:occurrences.length,manualReviewFieldsUntouched:manual.length,finalOccurrences:branchRows.length,finalBirth:branchRows.filter(r=>r.birthDate).length,finalBaptism:branchRows.filter(r=>r.baptismDate).length,finalResidence:branchRows.filter(r=>r.residence).length,duplicateIdentities:branchRows.length-new Set(branchRows.map(identity)).size,identityAndImageMappingsUnchanged:true};
  fs.writeFileSync(path.join(priv,`people-index-${cfg.slug}-pilot-promotion-report.json`),JSON.stringify(report,null,2)+"\n");reports.push(report);
}
if(master.rows.length!==totalBefore)throw new Error("Total occurrence count changed.");
write(masterPath,master);
console.log(JSON.stringify({totalOccurrences:master.rows.length,branches:reports},null,2));
