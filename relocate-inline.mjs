import { readFileSync, writeFileSync } from "node:fs";
const f="D:/WD/civilmart/src/app/admin/supplier-catalog/page.tsx";
let s=readFileSync(f,"utf8");
const A="{!loading && (";
const a=s.indexOf(A); if(a===-1) throw new Error("A");
const T="\n    </div>\n  );\n}\n";
const t=s.lastIndexOf(T); if(t===-1) throw new Error("T"); if(t<a) throw new Error("TA");
const block=s.slice(a,t);
for(const k of ["<Card>","supplierId","saveRateList","md:w-96"]){ if(block.indexOf(k)===-1) throw new Error("k-"+k); }
s=s.slice(0,a)+s.slice(t);
const W='<div key={supplier.id} className="rounded-md border bg-background">';
const w=s.indexOf(W); if(w===-1) throw new Error("W");
let open=0, i=w+W.length;
for(;;){
  const o=s.indexOf("<div",i); const c=s.indexOf("</div>",i);
  if(o===-1 && c===-1) throw new Error("endless");
  if(c!==-1 && (o===-1 || c<o)){
    open--; i=c+6sage; if(open===0) break;
  } else { open++; i=o+4; }
}
// i is right after the wrapper's closing </div> -> insert before it
const ins=i-6;
s=s.slice(0,ins)+block+"\n"+s.slice(ins);
writeFileSync(f,s,"utf8");
console.log("relocated block="+block.length+" final="+s.length);