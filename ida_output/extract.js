const fs = require("fs");
const raw = fs.readFileSync("C:/Users/jorge/OneDrive/Desktop/ts/ida_output/cuistatdetail_Draw.txt", "utf8");
const idx1 = raw.indexOf('"code":"') + 8;
const idx2 = raw.indexOf('","refs"', idx1);
const escaped = raw.substring(idx1, idx2);
const code = escaped.replace(/\\n/g, "\n").replace(/\\t/g, "\t");
fs.writeFileSync("C:/Users/jorge/OneDrive/Desktop/ts/ida_output/cuistatdetail_Draw_full.txt", code, "utf8");
console.log("Written", code.length, "chars");
