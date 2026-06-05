const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const manualPath = path.join(root, "docs", "manual-bovitrans.md");
const outputPath = path.join(root, "public", "manual-bovitrans.pdf");

const markdown = fs.readFileSync(manualPath, "utf8");

function cleanText(value) {
  return value
    .replace(/^#+\s*/, "")
    .replace(/^\d+\.\s+/, "")
    .replace(/^- /, "- ")
    .replace(/\*\*/g, "")
    .replace(/"/g, "\"");
}

function escapePdfText(value) {
  return cleanText(value)
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function wrapText(value, maxChars) {
  const words = cleanText(value).split(/\s+/).filter(Boolean);
  const lines = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }

  if (current) lines.push(current);
  return lines;
}

const contentLines = [];
for (const rawLine of markdown.split(/\r?\n/)) {
  const line = rawLine.trim();
  if (!line) {
    contentLines.push({ text: "", size: 10, leading: 12 });
  } else if (line.startsWith("# ")) {
    contentLines.push({ text: cleanText(line), size: 18, leading: 22, heading: true });
  } else if (line.startsWith("## ")) {
    contentLines.push({ text: cleanText(line), size: 13, leading: 18, heading: true });
  } else {
    for (const wrapped of wrapText(line, 92)) {
      contentLines.push({ text: wrapped, size: 10, leading: 14 });
    }
  }
}

const pages = [];
let page = [];
let y = 760;

function addLine(line) {
  const nextY = y - line.leading;
  if (nextY < 60) {
    pages.push(page);
    page = [];
    y = 760;
  }

  page.push({ ...line, y });
  y -= line.leading;
}

addLine({ text: "BOVITRANS", size: 20, leading: 24, heading: true });
addLine({ text: "Manual básico de uso", size: 14, leading: 20, heading: true });
addLine({ text: "Gestión de Transporte Ganadero", size: 10, leading: 22 });

for (const line of contentLines.slice(1)) addLine(line);
if (page.length) pages.push(page);

const objects = [];
function addObject(body) {
  objects.push(body);
  return objects.length;
}

const catalogId = addObject("<< /Type /Catalog /Pages 2 0 R >>");
const pagesId = addObject("");
const fontId = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
const pageIds = [];

for (const pageLines of pages) {
  const streamLines = ["BT"];
  for (const line of pageLines) {
    streamLines.push(`/F1 ${line.size} Tf`);
    streamLines.push(`50 ${line.y} Td`);
    streamLines.push(`(${escapePdfText(line.text)}) Tj`);
  }
  streamLines.push("ET");
  const stream = streamLines.join("\n");
  const streamId = addObject(`<< /Length ${Buffer.byteLength(stream, "latin1")} >>\nstream\n${stream}\nendstream`);
  const pageId = addObject(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${streamId} 0 R >>`);
  pageIds.push(pageId);
}

objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`;

let pdf = "%PDF-1.4\n";
const offsets = [0];
for (let index = 0; index < objects.length; index += 1) {
  offsets.push(Buffer.byteLength(pdf, "latin1"));
  pdf += `${index + 1} 0 obj\n${objects[index]}\nendobj\n`;
}

const xrefOffset = Buffer.byteLength(pdf, "latin1");
pdf += `xref\n0 ${objects.length + 1}\n`;
pdf += "0000000000 65535 f \n";
for (const offset of offsets.slice(1)) {
  pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
}
pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

fs.writeFileSync(outputPath, Buffer.from(pdf, "latin1"));
console.log(`Manual PDF generado: ${outputPath}`);
