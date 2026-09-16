const fs = require("node:fs");
const path = require("node:path");
const root = "D:/WD/civilmart";

const schema = fs.readFileSync(path.join(root, "prisma/schema.prisma"), "utf8");
const genBlock = schema.match(/generator\s+client\s*\{[\s\S]*?\n\}/);
console.log("=== generator client block in schema ===");
console.log(genBlock ? genBlock[0] : "(none)");

function walk(dir, out) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith(".ts") || e.name.endsWith(".js")) out.push(p);
  }
}
const files = [];
walk(path.join(root, "src/generated"), files);
console.log("\n=== tradeId occurrences across src/generated ===");
let found = false;
for (const f of files) {
  const t = fs.readFileSync(f, "utf8");
  const n = t.split("tradeId").length - 1;
  if (n > 0) {
    found = true;
    console.log(path.relative(root, f) + ": " + n);
  }
}
if (!found) console.log("none in src/generated");

console.log("\n=== does any OTHER generated dir exist? ===");
console.log("node_modules/.prisma:", fs.existsSync(path.join(root, "node_modules/.prisma")));
if (fs.existsSync(path.join(root, "node_modules/.prisma"))) {
  const nm = [];
  walk(path.join(root, "node_modules/.prisma"), nm);
  for (const p2 of nm.filter((x) => !x.includes("internals"))) {
    const t = fs.readFileSync(p2, "utf8");
    const n = t.split("tradeId").length - 1;
    if (n > 0) console.log("node_modules/.prisma/" + path.relative(path.join(root, "node_modules/.prisma"), p2) + ": " + n);
  }
}

console.log("\n=== src/generated/prisma contents (who is 'client'?) ===");
console.log(fs.readdirSync(path.join(root, "src/generated/prisma")).join(", "));
