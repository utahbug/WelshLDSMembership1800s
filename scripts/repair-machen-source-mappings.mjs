import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const privateDir = path.join(root, "data", "private");
const masterPath = path.join(privateDir, "people-index-source.csv");
const stagingPath = path.join(privateDir, "people-index-staging-machen-production.csv");
const oldImage = "Machen-pdf-page-011.jpg";
const newImage = "Machen-pdf-page-007.jpg";
const targets = [
  ["Margaret Smith", "21"], ["James Richard", "22"], ["William Richard", "23"],
  ["George Conner", ""], ["Sarah Smith", ""], ["James John", ""],
  ["Harriet Richard", ""], ["Charlotte Williams", ""],
];

function parseCsv(text) {
  const rows=[]; let row=[]; let field=""; let quoted=false;
  for(let i=0;i<text.length;i+=1){const c=text[i];if(quoted){if(c==='"'&&text[i+1]==='"'){field+='"';i+=1;}else if(c==='"')quoted=false;else field+=c;}else if(c==='"')quoted=true;else if(c===','){row.push(field);field="";}else if(c==='\n'){row.push(field.replace(/\r$/, ""));if(row.some(Boolean))rows.push(row);row=[];field="";}else field+=c;}
  if(field||row.length){row.push(field.replace(/\r$/, ""));if(row.some(Boolean))rows.push(row);} return rows;
}
const quote=(value)=>/[",\r\n]/.test(String(value??""))?`"${String(value??"").replaceAll('"','""')}"`:String(value??"");
function updateCsv(filePath) {
  const parsed=parseCsv(fs.readFileSync(filePath,"utf8").replace(/^\uFEFF/,""));
  const headers=parsed[0]; const objects=parsed.slice(1).map(values=>Object.fromEntries(headers.map((h,i)=>[h,values[i]??""])));
  const changes=[];
  for(const [name,entry] of targets){
    const matches=objects.filter(row=>row.branch==="Machen"&&row.nameAsWritten===name&&row.entryNumber===entry&&row.imageFilename===oldImage);
    if(matches.length!==1) throw new Error(`${path.basename(filePath)}: expected one ${name} entry ${entry||"[blank]"}; found ${matches.length}.`);
    const row=matches[0]; const before={...row}; row.imageFilename=newImage;
    for(const field of ["nameAsWritten","entryNumber","birthDate","baptismDate","residence","verified","occurrenceType"]){if(row[field]!==before[field])throw new Error(`Unexpected ${field} change for ${name}.`);}
    changes.push({memberName:name,entryNumber:entry,oldImage,newImage});
  }
  fs.writeFileSync(filePath,`${headers.join(",")}\n${objects.map(row=>headers.map(h=>quote(row[h])).join(",")).join("\n")}\n`);
  return changes;
}
const masterChanges=updateCsv(masterPath); const stagingChanges=updateCsv(stagingPath);
if(JSON.stringify(masterChanges)!==JSON.stringify(stagingChanges))throw new Error("Master/staging mapping changes differ.");
const report={mode:"source-image mapping repair only",branch:"Machen",changedOccurrences:masterChanges.length,oldImage,newImage,changes:masterChanges,fieldsPreserved:["nameAsWritten","entryNumber","birthDate","baptismDate","residence","verified","occurrenceType"],duplicatesCreated:0};
fs.writeFileSync(path.join(privateDir,"people-index-machen-source-mapping-repair.json"),`${JSON.stringify(report,null,2)}\n`);
console.log(JSON.stringify(report,null,2));
