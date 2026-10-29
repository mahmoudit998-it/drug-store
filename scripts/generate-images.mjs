// Renders placeholder packshots, company logos/covers and marketing images into public/seed.
// Run: node scripts/generate-images.mjs
import sharp from "sharp";
import fs from "node:fs/promises";
import path from "node:path";
import { companies, products, productSlug } from "./seed-data.mjs";

const OUT = path.resolve("public/seed");
const FONT = "Segoe UI, Arial, Helvetica, sans-serif";

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const c = [n >> 16, (n >> 8) & 255, n & 255].map((v) =>
    Math.max(0, Math.min(255, Math.round(amt < 0 ? v * (1 + amt) : v + (255 - v) * amt)))
  );
  return "#" + c.map((v) => v.toString(16).padStart(2, "0")).join("");
}

// Greedy wrap into at most `maxLines`, shrinking the font until every line fits `width`.
function fitLines(text, width, maxSize, maxLines = 2, minSize = 14) {
  const words = text.split(" ");
  for (let size = maxSize; size >= minSize; size -= 1) {
    const maxChars = Math.floor(width / (size * 0.56));
    const lines = [];
    let cur = "";
    for (const w of words) {
      const next = cur ? `${cur} ${w}` : w;
      if (next.length <= maxChars) cur = next;
      else {
        lines.push(cur);
        cur = w;
      }
    }
    lines.push(cur);
    if (lines.length <= maxLines && lines.every((l) => l.length <= maxChars)) return { lines, size };
  }
  return { lines: [text], size: minSize };
}

function textBlock(text, cx, y, width, maxSize, opts = {}) {
  const { fill = "#1b2b24", weight = 700, maxLines = 2, lh = 1.12 } = opts;
  const { lines, size } = fitLines(text, width, maxSize, maxLines);
  const tspans = lines
    .map((l, i) => `<tspan x="${cx}" dy="${i === 0 ? 0 : size * lh}">${esc(l)}</tspan>`)
    .join("");
  return {
    svg: `<text x="${cx}" y="${y}" text-anchor="middle" font-family="${FONT}" font-weight="${weight}" font-size="${size}" fill="${fill}">${tspans}</text>`,
    height: size * lh * lines.length,
  };
}

const defs = `
<defs>
  <filter id="soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="14"/></filter>
  <linearGradient id="gloss" x1="0" x2="1" y1="0" y2="0">
    <stop offset="0" stop-color="#000" stop-opacity="0.10"/>
    <stop offset="0.18" stop-color="#fff" stop-opacity="0.35"/>
    <stop offset="0.32" stop-color="#fff" stop-opacity="0"/>
    <stop offset="0.85" stop-color="#000" stop-opacity="0"/>
    <stop offset="1" stop-color="#000" stop-opacity="0.18"/>
  </linearGradient>
</defs>`;

const shadow = (cx, cy, rx) =>
  `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${rx * 0.12}" fill="#1b2b24" opacity="0.22" filter="url(#soft)"/>`;

// A label: brand band with company name, product name, subtitle, pack size.
function label(c, p, x, y, w, h, { band = 0.24, dark = false } = {}) {
  const cx = x + w / 2;
  const bandH = h * band;
  const name = textBlock(p.name_en, cx, y + bandH + h * 0.17, w * 0.86, h * 0.13, { fill: dark ? "#fff" : "#16261f" });
  const sub = textBlock(p.subtitle_en, cx, y + bandH + h * 0.17 + name.height + h * 0.03, w * 0.86, h * 0.07, {
    fill: dark ? "#ffffffcc" : c.color,
    weight: 600,
    maxLines: 2,
  });
  return `
    <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#fff"/>
    <rect x="${x}" y="${y}" width="${w}" height="${bandH}" fill="${c.color}"/>
    <text x="${cx}" y="${y + bandH * 0.62}" text-anchor="middle" font-family="${FONT}" font-weight="800" letter-spacing="${w * 0.012}" font-size="${Math.min(bandH * 0.42, w * 0.09)}" fill="#fff">${esc(c.short)}</text>
    ${name.svg}${sub.svg}
    <rect x="${x}" y="${y + h * 0.84}" width="${w}" height="${h * 0.16}" fill="${shade(c.color, -0.15)}"/>
    <text x="${cx}" y="${y + h * 0.84 + h * 0.105}" text-anchor="middle" font-family="${FONT}" font-weight="700" font-size="${Math.min(h * 0.07, w * 0.08)}" fill="#fff">${esc(p.pack)}</text>`;
}

function box(c, p) {
  const w = p.wide ? 470 : 380;
  const h = p.wide ? 300 : 400;
  const d = 64;
  const x1 = (800 - w - d) / 2;
  const y2 = 640;
  const y1 = y2 - h;
  const x2 = x1 + w;
  const dy = d * 0.6;
  return `${shadow(400, y2 + 8, (w + d) * 0.55)}
    <polygon points="${x1},${y1} ${x1 + d},${y1 - dy} ${x2 + d},${y1 - dy} ${x2},${y1}" fill="${shade(c.color, 0.35)}"/>
    <polygon points="${x2},${y1} ${x2 + d},${y1 - dy} ${x2 + d},${y2 - dy} ${x2},${y2}" fill="${shade(c.color, -0.28)}"/>
    <rect x="${x1}" y="${y1}" width="${w}" height="${h}" fill="#fff"/>
    <path d="M ${x1} ${y1 + h * 0.7} Q ${x1 + w * 0.5} ${y1 + h * 0.55} ${x2} ${y1 + h * 0.66} L ${x2} ${y1 + h * 0.84} L ${x1} ${y1 + h * 0.84} Z" fill="${c.color}" opacity="0.10"/>
    ${label(c, p, x1, y1, w, h)}
    ${p.rx ? `<rect x="${x1 + 14}" y="${y1 + h * 0.84 - 42}" width="58" height="30" rx="6" fill="#c62828"/><text x="${x1 + 43}" y="${y1 + h * 0.84 - 21}" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="17" fill="#fff">Rx</text>` : ""}
    <rect x="${x1}" y="${y1}" width="${w}" height="${h}" fill="none" stroke="#0000001a"/>`;
}

function bottle(c, p) {
  const amber = ["medicines", "herbal"].includes(p.category);
  const body = amber ? "#7b3f12" : "#ffffff";
  const x = 285, w = 230, top = 300, bottom = 650;
  return `${shadow(400, bottom + 6, 150)}
    <rect x="352" y="186" width="96" height="70" rx="10" fill="${shade(c.color, -0.2)}"/>
    ${[0, 1, 2, 3, 4, 5].map((i) => `<rect x="${358 + i * 15}" y="192" width="6" height="58" rx="3" fill="#ffffff22"/>`).join("")}
    <path d="M 370 254 L 430 254 L 432 280 Q 515 290 ${x + w} ${top + 30} L ${x + w} ${bottom - 18} Q ${x + w} ${bottom} ${x + w - 18} ${bottom} L ${x + 18} ${bottom} Q ${x} ${bottom} ${x} ${bottom - 18} L ${x} ${top + 30} Q 285 290 368 280 Z" fill="${body}" stroke="#0000001f"/>
    <g>${label(c, p, x + 12, top + 50, w - 24, 270, { band: 0.22 })}</g>
    <path d="M 370 254 L 430 254 L 432 280 Q 515 290 ${x + w} ${top + 30} L ${x + w} ${bottom - 18} Q ${x + w} ${bottom} ${x + w - 18} ${bottom} L ${x + 18} ${bottom} Q ${x} ${bottom} ${x} ${bottom - 18} L ${x} ${top + 30} Q 285 290 368 280 Z" fill="url(#gloss)"/>`;
}

function spray(c, p) {
  const x = 315, w = 170, top = 330, bottom = 650;
  return `${shadow(400, bottom + 6, 120)}
    <path d="M 385 150 L 415 150 L 420 250 L 380 250 Z" fill="#f4f6f5" stroke="#0000001f"/>
    <rect x="360" y="250" width="80" height="60" rx="8" fill="${c.color}"/>
    <path d="M 360 310 L 440 310 L 440 320 Q ${x + w} 322 ${x + w} ${top + 20} L ${x + w} ${bottom - 14} Q ${x + w} ${bottom} ${x + w - 14} ${bottom} L ${x + 14} ${bottom} Q ${x} ${bottom} ${x} ${bottom - 14} L ${x} ${top + 20} Q ${x} 322 360 320 Z" fill="#fff" stroke="#0000001f"/>
    ${label(c, p, x + 8, top + 30, w - 16, 260, { band: 0.22 })}
    <rect x="${x}" y="${top}" width="${w}" height="${bottom - top}" rx="14" fill="url(#gloss)"/>`;
}

function jar(c, p) {
  const big = p.big;
  const x = big ? 220 : 255, w = big ? 360 : 290;
  const top = big ? 300 : 335, bottom = 650;
  const capH = big ? 80 : 68;
  const glass = p.honey ? "#c9851a" : "#ffffff";
  const capColor = p.honey ? "#b8913a" : c.color;
  return `${shadow(400, bottom + 6, w * 0.62)}
    <rect x="${x + 10}" y="${top - capH}" width="${w - 20}" height="${capH}" rx="10" fill="${capColor}"/>
    ${Array.from({ length: Math.floor((w - 40) / 14) }, (_, i) => `<rect x="${x + 22 + i * 14}" y="${top - capH + 8}" width="5" height="${capH - 16}" rx="2.5" fill="#ffffff26"/>`).join("")}
    <rect x="${x}" y="${top}" width="${w}" height="${bottom - top}" rx="22" fill="${glass}" stroke="#0000001f"/>
    ${label(c, p, x, top + 34, w, bottom - top - 64, { band: 0.22 })}
    <rect x="${x}" y="${top}" width="${w}" height="${bottom - top}" rx="22" fill="url(#gloss)"/>`;
}

function tube(c, p) {
  const top = 160, crimp = 34, bottom = 590;
  const wTop = 250, wBot = 150;
  const xl = 400 - wTop / 2, xr = 400 + wTop / 2;
  const bl = 400 - wBot / 2, br = 400 + wBot / 2;
  const cx = 400;
  const name = textBlock(p.name_en, cx, top + crimp + 150, wTop * 0.8, 34, { maxLines: 3 });
  const sub = textBlock(p.subtitle_en, cx, top + crimp + 150 + name.height + 10, wTop * 0.78, 20, { fill: c.color, weight: 600 });
  return `${shadow(400, 672, 120)}
    <rect x="${xl - 4}" y="${top}" width="${wTop + 8}" height="${crimp}" rx="4" fill="${shade(c.color, 0.75)}" stroke="#0000001f"/>
    ${Array.from({ length: 16 }, (_, i) => `<line x1="${xl + 6 + i * 16}" y1="${top + 4}" x2="${xl + 6 + i * 16}" y2="${top + crimp - 4}" stroke="#0000001a" stroke-width="2"/>`).join("")}
    <path d="M ${xl} ${top + crimp} L ${xr} ${top + crimp} L ${br} ${bottom} L ${bl} ${bottom} Z" fill="#fff" stroke="#0000001f"/>
    <path d="M ${xl} ${top + crimp} L ${xr} ${top + crimp} L ${xr - 6} ${top + crimp + 90} L ${xl + 6} ${top + crimp + 90} Z" fill="${c.color}"/>
    <text x="${cx}" y="${top + crimp + 58}" text-anchor="middle" font-family="${FONT}" font-weight="800" letter-spacing="3" font-size="28" fill="#fff">${esc(c.short)}</text>
    ${name.svg}${sub.svg}
    <path d="M ${xl + 38} ${bottom - 110} L ${xr - 38} ${bottom - 110} L ${br - 2} ${bottom} L ${bl + 2} ${bottom} Z" fill="${shade(c.color, -0.1)}"/>
    <text x="${cx}" y="${bottom - 40}" text-anchor="middle" font-family="${FONT}" font-weight="700" font-size="22" fill="#fff">${esc(p.pack)}</text>
    <rect x="${400 - 52}" y="${bottom}" width="104" height="72" rx="10" fill="${c.color}"/>
    <rect x="${400 - 52}" y="${bottom}" width="104" height="72" rx="10" fill="url(#gloss)"/>
    <path d="M ${xl} ${top + crimp} L ${xr} ${top + crimp} L ${br} ${bottom} L ${bl} ${bottom} Z" fill="url(#gloss)"/>`;
}

function pouch(c, p) {
  const x = 150, y = 300, w = 500, h = 300;
  const cx = 400;
  const name = textBlock(p.name_en, cx, y + 175, w * 0.7, 42);
  return `${shadow(400, y + h + 8, 270)}
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="60" fill="${shade(c.color, 0.85)}" stroke="#0000001f"/>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="60" fill="url(#gloss)"/>
    <rect x="${cx - 120}" y="${y + 24}" width="240" height="84" rx="34" fill="${c.color}"/>
    <text x="${cx}" y="${y + 78}" text-anchor="middle" font-family="${FONT}" font-weight="800" letter-spacing="4" font-size="30" fill="#fff">${esc(c.short)}</text>
    ${name.svg}
    <text x="${cx}" y="${y + 255}" text-anchor="middle" font-family="${FONT}" font-weight="700" font-size="24" fill="${c.color}">${esc(p.pack)} · ${esc(p.subtitle_en)}</text>`;
}

function device(c, p) {
  const col = c.color;
  const brand = `<text x="400" y="%Y%" text-anchor="middle" font-family="${FONT}" font-weight="800" letter-spacing="3" font-size="22" fill="${col}">${esc(c.short)}</text>`;
  if (p.device === "bp") {
    return `${shadow(400, 640, 260)}
      <path d="M 120 610 Q 90 470 200 430 L 260 430 L 260 610 Z" fill="#dfe6e3" stroke="#0000001f"/>
      <path d="M 260 520 Q 230 560 200 600" stroke="#9aa5a0" stroke-width="10" fill="none"/>
      <rect x="230" y="300" width="440" height="330" rx="44" fill="#fff" stroke="#0000001f"/>
      <rect x="275" y="340" width="350" height="190" rx="18" fill="#cfe3d8"/>
      <text x="300" y="430" font-family="${FONT}" font-weight="300" font-size="86" fill="#1b2b24">120</text>
      <text x="300" y="510" font-family="${FONT}" font-weight="300" font-size="62" fill="#1b2b24">80</text>
      <text x="600" y="430" text-anchor="end" font-family="${FONT}" font-size="22" fill="#1b2b24">SYS</text>
      <text x="600" y="510" text-anchor="end" font-family="${FONT}" font-size="22" fill="#1b2b24">DIA</text>
      <circle cx="450" cy="580" r="26" fill="${col}"/><circle cx="520" cy="580" r="16" fill="#e3e8e6"/><circle cx="380" cy="580" r="16" fill="#e3e8e6"/>
      ${brand.replace("%Y%", "330")}
      <rect x="230" y="300" width="440" height="330" rx="44" fill="url(#gloss)"/>`;
  }
  if (p.device === "thermometer") {
    return `${shadow(400, 650, 200)}
      <path d="M 220 260 Q 220 200 290 200 L 560 200 Q 610 200 610 250 L 610 330 Q 610 370 560 370 L 470 370 L 450 620 Q 445 650 410 650 L 370 650 Q 340 650 345 620 L 370 370 L 290 370 Q 220 370 220 300 Z" fill="#fff" stroke="#0000001f"/>
      <rect x="380" y="225" width="200" height="110" rx="14" fill="#cfe3d8"/>
      <text x="480" y="305" text-anchor="middle" font-family="${FONT}" font-weight="300" font-size="66" fill="#1b2b24">36.8°</text>
      <rect x="200" y="245" width="40" height="80" rx="12" fill="${col}"/>
      <rect x="372" y="420" width="60" height="90" rx="18" fill="${col}"/>
      ${brand.replace("%Y%", "580")}`;
  }
  if (p.device === "oximeter") {
    return `${shadow(400, 600, 190)}
      <rect x="230" y="290" width="340" height="270" rx="70" fill="${col}"/>
      <rect x="230" y="250" width="340" height="140" rx="60" fill="${shade(col, 0.15)}"/>
      <rect x="290" y="330" width="220" height="150" rx="16" fill="#101820"/>
      <text x="310" y="395" font-family="${FONT}" font-size="22" fill="#5ad1ff">SpO2%</text>
      <text x="310" y="460" font-family="${FONT}" font-weight="300" font-size="62" fill="#5ad1ff">98</text>
      <text x="490" y="395" text-anchor="end" font-family="${FONT}" font-size="22" fill="#ffd54f">PR</text>
      <text x="490" y="460" text-anchor="end" font-family="${FONT}" font-weight="300" font-size="62" fill="#ffd54f">72</text>
      <circle cx="400" cy="520" r="16" fill="#ffffff55"/>
      <rect x="230" y="250" width="340" height="310" rx="70" fill="url(#gloss)"/>`;
  }
  // glucometer
  return `${shadow(400, 650, 170)}
    <rect x="290" y="200" width="220" height="440" rx="60" fill="#fff" stroke="#0000001f"/>
    <rect x="290" y="460" width="220" height="180" rx="0" fill="${col}"/>
    <path d="M 290 460 L 510 460 L 510 580 Q 510 640 450 640 L 350 640 Q 290 640 290 580 Z" fill="${col}"/>
    <rect x="320" y="240" width="160" height="170" rx="14" fill="#cfe3d8"/>
    <text x="400" y="340" text-anchor="middle" font-family="${FONT}" font-weight="300" font-size="72" fill="#1b2b24">112</text>
    <text x="400" y="385" text-anchor="middle" font-family="${FONT}" font-size="22" fill="#1b2b24">mg/dL</text>
    <circle cx="400" cy="440" r="18" fill="#e3e8e6"/>
    <rect x="388" y="140" width="24" height="64" rx="3" fill="#c8ced0"/>
    <text x="400" y="560" text-anchor="middle" font-family="${FONT}" font-weight="800" letter-spacing="3" font-size="24" fill="#fff">${esc(c.short)}</text>
    <rect x="290" y="200" width="220" height="440" rx="60" fill="url(#gloss)"/>`;
}

const shapes = { box, bottle, spray, jar, tube, pouch, device };

function productSvg(c, p) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800">${defs}${shapes[p.shape](c, p)}</svg>`;
}

function logoSvg(c) {
  const initial = c.name_en[0];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${shade(c.color, 0.18)}"/><stop offset="1" stop-color="${shade(c.color, -0.25)}"/></linearGradient></defs>
    <rect width="400" height="400" rx="96" fill="url(#g)"/>
    <circle cx="300" cy="100" r="34" fill="#ffffff" opacity="0.9"/>
    <rect x="292" y="80" width="16" height="40" rx="3" fill="${c.color}"/>
    <rect x="280" y="92" width="40" height="16" rx="3" fill="${c.color}"/>
    <text x="190" y="290" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-weight="700" font-size="240" fill="#fff">${initial}</text>
  </svg>`;
}

function coverSvg(c) {
  const dots = [];
  for (let r = 0; r < 6; r++)
    for (let k = 0; k < 20; k++)
      dots.push(`<circle cx="${60 + k * 70}" cy="${60 + r * 70}" r="20" fill="#fff" opacity="${Math.max(0, 0.1 - k * 0.005).toFixed(3)}"/>`);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="2400" height="480" viewBox="0 0 2400 480">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${shade(c.color, -0.35)}"/><stop offset="1" stop-color="${shade(c.color, 0.1)}"/></linearGradient></defs>
    <rect width="2400" height="480" fill="url(#g)"/>
    ${dots.join("")}
    <ellipse cx="2000" cy="560" rx="620" ry="260" fill="#fff" opacity="0.12"/>
  </svg>`;
}

// Green shopping bag with the SDS mark, used in the hero.
function bagSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="560" height="700" viewBox="0 0 560 700">
    <defs><linearGradient id="b" x1="0" x2="1"><stop offset="0" stop-color="#0b6a3b"/><stop offset="0.6" stop-color="#0d7a45"/><stop offset="1" stop-color="#075530"/></linearGradient></defs>
    <path d="M 170 190 Q 170 40 280 40 Q 390 40 390 190" fill="none" stroke="#06502c" stroke-width="22" stroke-linecap="round"/>
    <path d="M 40 170 L 520 170 L 540 680 L 20 680 Z" fill="url(#b)"/>
    <path d="M 40 170 L 520 170 L 522 210 L 38 210 Z" fill="#ffffff" opacity="0.08"/>
    <path d="M 430 170 L 520 170 L 540 680 L 470 680 Z" fill="#000" opacity="0.12"/>
    <rect x="130" y="270" width="300" height="200" rx="30" fill="#fff"/>
    <text x="280" y="560" text-anchor="middle" font-family="${FONT}" font-weight="800" letter-spacing="2" font-size="40" fill="#fff">SHARJAH</text>
    <text x="280" y="610" text-anchor="middle" font-family="${FONT}" font-weight="600" letter-spacing="9" font-size="26" fill="#ffffffcc">DRUG STORE</text>
  </svg>`;
}

function blisterSvg() {
  const pills = [];
  for (let r = 0; r < 2; r++)
    for (let k = 0; k < 5; k++)
      pills.push(`<g transform="translate(${70 + k * 92} ${70 + r * 110})"><rect x="-26" y="-40" width="52" height="80" rx="26" fill="#d7dfdb"/><rect x="-20" y="-34" width="40" height="68" rx="20" fill="#0d7a45"/><rect x="-20" y="0" width="40" height="34" rx="0" fill="#f2f5f3"/><path d="M -20 34 L 20 34 L 20 0 L -20 0 Z" fill="#f2f5f3"/><rect x="-20" y="-34" width="40" height="68" rx="20" fill="none" stroke="#00000022"/></g>`);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="520" height="260" viewBox="0 0 520 260">
    <rect x="10" y="10" width="500" height="240" rx="26" fill="#e9eeec" stroke="#c9d3cf" stroke-width="3"/>
    ${pills.join("")}
  </svg>`;
}

const capsule = (a, b) => `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="50" viewBox="0 0 120 50">
  <rect x="2" y="2" width="116" height="46" rx="23" fill="${b}"/><path d="M 25 2 L 60 2 L 60 48 L 25 48 A 23 23 0 0 1 25 2 Z" fill="${a}"/>
  <rect x="10" y="9" width="90" height="8" rx="4" fill="#fff" opacity="0.35"/></svg>`;

async function alphaBounds(png, min = 8) {
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let x0 = info.width, y0 = info.height, x1 = 0, y1 = 0;
  for (let y = 0; y < info.height; y++)
    for (let x = 0; x < info.width; x++)
      if (data[(y * info.width + x) * 4 + 3] > min) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
  return { left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 };
}

async function main() {
  await fs.mkdir(path.join(OUT, "products"), { recursive: true });
  await fs.mkdir(path.join(OUT, "companies"), { recursive: true });
  const rendered = {};

  for (const c of companies) {
    for (const p of products[c.slug]) {
      const slug = productSlug(c, p);
      // Trim by the alpha channel only (trimming RGBA directly also eats white label areas)
      const raw = await sharp(Buffer.from(productSvg(c, p))).png().toBuffer();
      const { left, top, width, height } = await alphaBounds(raw);
      const trimmed = { data: await sharp(raw).extract({ left, top, width, height }).png().toBuffer() };
      const side = Math.round(Math.max(width, height) * 1.12);
      const padded = await sharp(trimmed.data)
        .extend({
          top: Math.floor((side - height) / 2),
          bottom: Math.ceil((side - height) / 2),
          left: Math.floor((side - width) / 2),
          right: Math.ceil((side - width) / 2),
          background: "#0000",
        })
        .png()
        .toBuffer();
      // separate pipeline: sharp always applies resize before extend within one pipeline
      const buf = await sharp(padded).resize(800, 800).webp({ quality: 88 }).toBuffer();
      await fs.writeFile(path.join(OUT, "products", `${slug}.webp`), buf);
      rendered[slug] = buf;
    }
    await sharp(Buffer.from(logoSvg(c))).webp({ quality: 92 }).toFile(path.join(OUT, "companies", `${c.slug}-logo.webp`));

    // Cover: brand gradient + three of the company's packshots on the right
    const picks = products[c.slug].slice(0, 3).map((p) => rendered[productSlug(c, p)]);
    // Wide (5:1) so it survives object-cover on large screens; packshots sit in the upper part
    // because the profile card overlaps the bottom of the cover.
    const layers = await Promise.all(
      picks.map((b, i) => sharp(b).resize(i === 1 ? 300 : 250).png().toBuffer())
    );
    await sharp(Buffer.from(coverSvg(c)))
      .composite([
        { input: layers[0], left: 1720, top: 50 },
        { input: layers[2], left: 2040, top: 50 },
        { input: layers[1], left: 1850, top: 20 },
      ])
      .webp({ quality: 85 })
      .toFile(path.join(OUT, "companies", `${c.slug}-cover.webp`));
  }

  // Hero composition (transparent): bag + supplements + blister + loose capsules
  const get = (slug) => rendered[slug];
  const mark = await sharp("public/brand/logo-mark.png").resize(250).png().toBuffer();
  const bag = await sharp(Buffer.from(bagSvg())).composite([{ input: mark, left: 155, top: 300 }]).png().toBuffer();
  const omega = await sharp(get("medilife-omega-3-fish-oil-1000mg")).resize(380).png().toBuffer();
  const vitd = await sharp(get("medilife-vitamin-d3-5000-iu")).resize(330).png().toBuffer();
  const blister = await sharp(Buffer.from(blisterSvg())).rotate(-12, { background: "#0000" }).resize(380).png().toBuffer();
  const cap1 = await sharp(Buffer.from(capsule("#0d7a45", "#f2f5f3"))).rotate(25, { background: "#0000" }).png().toBuffer();
  const cap2 = await sharp(Buffer.from(capsule("#e8a317", "#f2f5f3"))).rotate(-15, { background: "#0000" }).png().toBuffer();
  await sharp({ create: { width: 1100, height: 820, channels: 4, background: "#0000" } })
    .composite([
      { input: bag, left: 470, top: 20 },
      { input: omega, left: 160, top: 300 },
      { input: vitd, left: 370, top: 380 },
      { input: blister, left: 700, top: 610 },
      { input: cap1, left: 220, top: 700 },
      { input: cap2, left: 520, top: 730 },
    ])
    .webp({ quality: 90 })
    .toFile(path.join(OUT, "hero.webp"));

  // Offer banner composition: a row of best-selling packshots
  const row = ["crescent-glucocheck-test-strips", "medilife-vitamin-d3-5000-iu", "zayna-sunscreen-spf-50", "nova-novadol-500-tablets"];
  const sizes = [300, 360, 300, 280];
  const lefts = [0, 210, 470, 690];
  const tops = [140, 80, 140, 170];
  const rowLayers = await Promise.all(row.map((s, i) => sharp(get(s)).resize(sizes[i]).png().toBuffer()));
  await sharp({ create: { width: 980, height: 460, channels: 4, background: "#0000" } })
    .composite(rowLayers.map((input, i) => ({ input, left: lefts[i], top: tops[i] })))
    .webp({ quality: 90 })
    .toFile(path.join(OUT, "offer-banner.webp"));

  console.log(`Rendered ${Object.keys(rendered).length} products, ${companies.length} companies`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
