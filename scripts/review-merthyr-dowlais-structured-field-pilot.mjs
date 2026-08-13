import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const privateDir = path.join(root, "data", "private");

function parseCsv(text) {
  const rows=[]; let row=[],field="",quoted=false;
  for(let i=0;i<text.length;i+=1){const c=text[i];if(quoted){if(c==='"'&&text[i+1]==='"'){field+='"';i+=1;}else if(c==='"')quoted=false;else field+=c;}else if(c==='"')quoted=true;else if(c===','){row.push(field);field="";}else if(c==='\n'){row.push(field.replace(/\r$/, ""));rows.push(row);row=[];field="";}else field+=c;}
  if(field||row.length){row.push(field);rows.push(row);} const header=rows.shift();
  return rows.filter(r=>r.some(Boolean)).map(r=>Object.fromEntries(header.map((h,i)=>[h,r[i]??""])));
}
function csv(rows){if(!rows.length)return "";const h=Object.keys(rows[0]);const e=v=>/[",\r\n]/.test(String(v??""))?`"${String(v??"").replaceAll('"','""')}"`:String(v??"");return `${h.join(",")}\n${rows.map(r=>h.map(k=>e(r[k])).join(",")).join("\n")}\n`;}
const source=parseCsv(fs.readFileSync(path.join(privateDir,"people-index-source.csv"),"utf8"));
const k=(image,entry)=>`${image}|${entry}`;

const specs={
  "Merthyr Tydfil":{
    slug:"merthyr-tydfil", selection:r=>(r.imageFilename==="LR-5450-7_v1_00014.jpg"&&+r.entryNumber>=13&&+r.entryNumber<=23)||(r.imageFilename==="LR-5450-7_v1_00018.jpg"&&+r.entryNumber>=37&&+r.entryNumber<=48&&+r.entryNumber!==44),
    values:{
      [k("LR-5450-7_v1_00014.jpg",13)]:{birthDate:"Chwef 14/28",baptismDate:"Hydref /45"},
      [k("LR-5450-7_v1_00014.jpg",14)]:{birthDate:"Hyd 5/30"},
      [k("LR-5450-7_v1_00014.jpg",15)]:{baptismDate:"Awst 23/46"},
      [k("LR-5450-7_v1_00018.jpg",37)]:{birthDate:"Mawrth, 1833",baptismDate:"Mawrth 16, 1848"},
      [k("LR-5450-7_v1_00018.jpg",38)]:{baptismDate:"Mawrth 16, 1848"},
      [k("LR-5450-7_v1_00018.jpg",39)]:{baptismDate:"May 1849"},
      [k("LR-5450-7_v1_00018.jpg",40)]:{birthDate:"Ion 13, 1848",baptismDate:"Ion 13, 1849"},
      [k("LR-5450-7_v1_00018.jpg",41)]:{birthDate:"May, 1848",baptismDate:"May 1848"},
      [k("LR-5450-7_v1_00018.jpg",47)]:{birthDate:"Awst 26/36"},
      [k("LR-5450-7_v1_00018.jpg",48)]:{baptismDate:"Rhag /46"}
    },
    ambiguous:{
      [k("LR-5450-7_v1_00018.jpg",38)]:{birthDate:"Visible but incomplete/uncertain year after ‘Mawr. 11’."},
      [k("LR-5450-7_v1_00018.jpg",39)]:{birthDate:"Visible May date; year is not safely legible."},
      [k("LR-5450-7_v1_00018.jpg",47)]:{baptismDate:"Only ‘/48’ is safely visible; month/day cannot be assigned."},
      [k("LR-5450-7_v1_00018.jpg",48)]:{birthDate:"Visible ‘Mawrth’ notation is incomplete and not safely interpretable."}
    },
    scale:"Practical but labor-intensive. Volume 1 has strong numbered-row alignment and many clear residence values; birth and baptism are sparse and use Welsh abbreviations. Expect careful visual review of every row and a meaningful ambiguous-field queue."
  },
  Dowlais:{
    slug:"dowlais",selection:r=>(r.imageFilename==="LR-128-7_00040.jpg"&&+r.entryNumber>=96&&+r.entryNumber<=107)||(r.imageFilename==="LR-128-7_00042.jpg"&&+r.entryNumber>=108&&+r.entryNumber<=119&&+r.entryNumber!==114),
    values:{
      [k("LR-128-7_00040.jpg",96)]:{baptismDate:"Tach 7, 51"},[k("LR-128-7_00040.jpg",97)]:{baptismDate:"Aws 14, 51",residence:"queen Street"},[k("LR-128-7_00040.jpg",98)]:{baptismDate:"Aws 16, 51"},[k("LR-128-7_00040.jpg",99)]:{baptismDate:"Aws 22, 51"},[k("LR-128-7_00040.jpg",100)]:{baptismDate:"Ion 10, 52"},[k("LR-128-7_00040.jpg",101)]:{baptismDate:"Ion 17, 52",residence:"queen Street"},[k("LR-128-7_00040.jpg",102)]:{baptismDate:"Ion 18, 52"},[k("LR-128-7_00040.jpg",103)]:{baptismDate:"Ion 20, 52"},[k("LR-128-7_00040.jpg",104)]:{baptismDate:"Ion 26, 52"},[k("LR-128-7_00040.jpg",105)]:{baptismDate:"Awst 6, 52",residence:"New S. Wales"},
      [k("LR-128-7_00042.jpg",108)]:{baptismDate:"Chwef 15, 52",residence:"Cwm yr y bed"},[k("LR-128-7_00042.jpg",109)]:{baptismDate:"Chwef 15, 52"},[k("LR-128-7_00042.jpg",110)]:{baptismDate:"Chwef 15, 52"},[k("LR-128-7_00042.jpg",111)]:{baptismDate:"Chwef 28, 52"},[k("LR-128-7_00042.jpg",112)]:{baptismDate:"Mawr 5, 52",residence:"Pantywaun"},[k("LR-128-7_00042.jpg",113)]:{baptismDate:"Mawr 5, 52"},[k("LR-128-7_00042.jpg",115)]:{residence:"New S. Wales"},[k("LR-128-7_00042.jpg",116)]:{residence:"Pantywaun"}
    },
    ambiguous:{
      [k("LR-128-7_00040.jpg",96)]:{residence:"Place name is present but not safely legible."},[k("LR-128-7_00040.jpg",98)]:{residence:"Place name is present but not safely legible."},[k("LR-128-7_00040.jpg",99)]:{residence:"Place name is present but not safely legible."},[k("LR-128-7_00040.jpg",100)]:{residence:"Place name is present but not safely legible."},[k("LR-128-7_00040.jpg",102)]:{residence:"Place name is present but not safely legible."},[k("LR-128-7_00040.jpg",103)]:{residence:"Place name is present but not safely legible."},[k("LR-128-7_00040.jpg",104)]:{residence:"Ditto mark is clear, but resolved place wording requires a separate controlled ditto pass."},[k("LR-128-7_00042.jpg",109)]:{residence:"Ditto mark; not expanded in this evidence-only pilot."},[k("LR-128-7_00042.jpg",110)]:{residence:"Ditto mark; not expanded in this evidence-only pilot."},[k("LR-128-7_00042.jpg",113)]:{residence:"Ditto mark; not expanded in this evidence-only pilot."},[k("LR-128-7_00042.jpg",117)]:{residence:"Ditto mark; not expanded in this evidence-only pilot."},[k("LR-128-7_00042.jpg",118)]:{residence:"Ditto mark; not expanded in this evidence-only pilot."},[k("LR-128-7_00042.jpg",119)]:{residence:"Ditto mark; not expanded in this evidence-only pilot."}
    },
    scale:"Practical for the numbered register. Row rules and entry numbers are strong, and baptism dates are often clear. Birth values are very sparse; residences require a controlled place-name and ditto-mark pass. The unnumbered supplement should remain a separate, higher-risk project."
  }
};

for(const [branch,s] of Object.entries(specs)){
  const rows=source.filter(r=>r.branch===branch&&s.selection(r)); const evidence=[]; const ambiguous=[]; const reviews=[];
  for(const r of rows){const key=k(r.imageFilename,r.entryNumber);const v=s.values[key]||{};const a=s.ambiguous[key]||{};const final={birthDate:v.birthDate||"",baptismDate:v.baptismDate||"",residence:v.residence||r.residence||""};
    for(const [field,value] of Object.entries(final))if(value)evidence.push({occurrenceKey:key,memberName:r.nameAsWritten,entryNumber:r.entryNumber,imageFilename:r.imageFilename,rowPosition:`entry ${r.entryNumber} on photographed numbered-register page`,field,exactValueAsWritten:value,confidence:"clear",evidenceNote:"Read directly from the same horizontal ledger row; entry number and neighboring numbered rows confirm alignment."});
    for(const [field,note] of Object.entries(a))ambiguous.push({occurrenceKey:key,memberName:r.nameAsWritten,entryNumber:r.entryNumber,imageFilename:r.imageFilename,rowPosition:`entry ${r.entryNumber} on photographed numbered-register page`,field,status:"manual review",evidenceNote:note});
    reviews.push({occurrenceKey:key,memberName:r.nameAsWritten,entryNumber:r.entryNumber,imageFilename:r.imageFilename,birthDate:final.birthDate,baptismDate:final.baptismDate,residence:final.residence,ambiguousFields:Object.keys(a).join(";"),status:"evidence only—not promoted"});
  }
  const count=f=>evidence.filter(e=>e.field===f).length;const per=new Map();evidence.forEach(e=>per.set(e.occurrenceKey,(per.get(e.occurrenceKey)||0)+1));
  const report={branch,generatedAt:new Date().toISOString(),evidenceOnly:true,promoted:false,occurrencesReviewed:rows.length,clearValues:{Birth:count("birthDate"),Baptism:count("baptismDate"),Residence:count("residence")},multipleFieldOccurrences:[...per.values()].filter(n=>n>1).length,unreadableOrAmbiguousFields:ambiguous.length,rowAlignmentProblems:0,selection:[...new Set(rows.map(r=>r.imageFilename))],estimatedScaleEffortAndQuality:s.scale};
  const base=path.join(privateDir,`people-index-${s.slug}-structured-field-pilot`);fs.writeFileSync(`${base}-evidence.csv`,csv(evidence));fs.writeFileSync(`${base}-manual-review.csv`,csv(ambiguous));fs.writeFileSync(`${base}-occurrences.csv`,csv(reviews));fs.writeFileSync(`${base}-report.json`,JSON.stringify(report,null,2)+"\n");console.log(JSON.stringify(report,null,2));
}
