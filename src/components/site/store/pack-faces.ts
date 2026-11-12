import * as THREE from "three";
import { canvasTexture, drawContained, fitText, fontFamily, loadImage, shade } from "./textures";
import type { Pack } from "./packs";
import type { StoreProduct, StoreShelf } from "./types";

export type PackLabels = { ingredient: string; pack: string; rx: string };

const loader = new THREE.TextureLoader();

/** A straightened photo face from /catalog/packs (same origin, already small). */
function photoFace(url: string) {
  const tex = loader.load(url);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/** Canvas sized to a pack face, `long` pixels on its longer edge. */
function faceCanvas(w: number, h: number, long: number, draw: (c: CanvasRenderingContext2D, W: number, H: number) => void) {
  const W = Math.round(w >= h ? long : (long * w) / h);
  const H = Math.round(h >= w ? long : (long * h) / w);
  return { ...canvasTexture(W, H, (c) => draw(c, W, H)), W, H };
}

const name = (p: { name_en: string; name_ar: string }, rtl: boolean) => (rtl ? p.name_ar || p.name_en : p.name_en);

/** Front for a product without a straightened photo: brand band, name, and the photo if there is one. */
function drawnFront(p: StoreProduct, shelf: StoreShelf, pack: Pack, rtl: boolean) {
  const [w, h] = pack.size;
  const color = shelf.brand_color;
  const { tex, ctx, W, H } = faceCanvas(w, h, 512, (c, W, H) => {
    c.fillStyle = "#fbfbf9";
    c.fillRect(0, 0, W, H);
    const band = H * 0.3;
    const g = c.createLinearGradient(0, 0, W, band);
    g.addColorStop(0, color);
    g.addColorStop(1, shade(color, -0.25));
    c.fillStyle = g;
    c.fillRect(0, 0, W, band);
    c.fillStyle = "#ffffff";
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.direction = rtl ? "rtl" : "ltr";
    fitText(c, name(p, rtl), W * 0.86, 800, band * 0.42);
    c.fillText(name(p, rtl), W / 2, band * 0.48);
    c.fillStyle = "rgba(255,255,255,.8)";
    fitText(c, name(shelf, rtl), W * 0.8, 600, band * 0.16);
    c.fillText(name(shelf, rtl), W / 2, band * 0.82);
    c.fillStyle = color;
    c.fillRect(0, H - H * 0.05, W, H * 0.05);
    if (p.pack_size) {
      c.fillStyle = "#2b2b2b";
      fitText(c, p.pack_size, W * 0.8, 700, H * 0.05);
      c.fillText(p.pack_size, W / 2, H * 0.89);
    }
  });
  if (p.image_url) {
    loadImage(p.image_url, 640)
      .then((img) => {
        drawContained(ctx, img, W * 0.08, H * 0.33, W * 0.84, H * 0.5);
        tex.needsUpdate = true;
      })
      .catch(() => {});
  }
  return tex;
}

/** Narrow side panel: the product name running up the brand colour. */
function drawnSide(p: StoreProduct, shelf: StoreShelf, pack: Pack, rtl: boolean) {
  const [, h, d] = pack.size;
  return faceCanvas(d, h, 256, (c, W, H) => {
    c.fillStyle = shelf.brand_color;
    c.fillRect(0, 0, W, H);
    c.save();
    c.translate(W / 2, H / 2);
    c.rotate(-Math.PI / 2);
    c.fillStyle = "#ffffff";
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.direction = rtl ? "rtl" : "ltr";
    fitText(c, name(p, rtl), H * 0.8, 800, W * 0.42);
    c.fillText(name(p, rtl), 0, 0);
    c.restore();
  }).tex;
}

/**
 * Materials for a shelf pack, in BoxGeometry order: right, left, top, bottom, front, back.
 * The back faces the shelf wall, so it only gets a plain colour here; the printed back is
 * drawn at full size when the pack is taken off the shelf.
 */
export function shelfPackMaterials(p: StoreProduct, shelf: StoreShelf, pack: Pack, rtl: boolean) {
  const front = pack.frontUrl ? photoFace(pack.frontUrl) : drawnFront(p, shelf, pack, rtl);
  const side = pack.sideUrl ? photoFace(pack.sideUrl) : drawnSide(p, shelf, pack, rtl);
  const flap = pack.edge ?? shade(shelf.brand_color, 0.82);
  const tint = p.in_stock ? "#ffffff" : "#9aa09d";
  const card = { roughness: 0.38, metalness: 0, color: tint };
  const materials = [
    new THREE.MeshStandardMaterial({ ...card, map: side }),
    new THREE.MeshStandardMaterial({ ...card, map: side }),
    new THREE.MeshStandardMaterial({ ...card, color: flap }),
    new THREE.MeshStandardMaterial({ ...card, color: flap }),
    new THREE.MeshStandardMaterial({ ...card, map: front }),
    new THREE.MeshStandardMaterial({ ...card, color: flap }),
  ];
  return {
    materials,
    textures: { front, side },
    dispose() {
      front.dispose();
      side.dispose();
      materials.forEach((m) => m.dispose());
    },
  };
}

function wrap(c: CanvasRenderingContext2D, text: string, maxW: number) {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (c.measureText(next).width > maxW && line) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

/** Deterministic EAN-like bars from the product id, so every pack has its own barcode. */
function drawBarcode(c: CanvasRenderingContext2D, seed: string, x: number, y: number, w: number, h: number) {
  let s = 0;
  for (const ch of seed) s = (s * 31 + ch.charCodeAt(0)) >>> 0;
  const rand = () => ((s = (s * 1103515245 + 12345) >>> 0) / 4294967296);
  c.fillStyle = "#ffffff";
  c.fillRect(x - 6, y - 6, w + 12, h + 12 + h * 0.22);
  c.fillStyle = "#111111";
  let cx = x;
  const unit = w / 95;
  while (cx < x + w - unit * 3) {
    const bw = unit * (1 + Math.floor(rand() * 3));
    if (rand() > 0.45) c.fillRect(cx, y, bw, h);
    cx += bw;
  }
  c.font = `500 ${Math.round(h * 0.2)}px ${fontFamily()}`;
  c.textAlign = "center";
  c.textBaseline = "top";
  c.direction = "ltr";
  const digits = Array.from({ length: 13 }, () => Math.floor(rand() * 10)).join("");
  c.fillText(digits, x + w / 2, y + h + 2);
}

/** The printed back of a pack, drawn from the product data at a size that stays sharp in the hand. */
export function packBack(p: StoreProduct, shelf: StoreShelf, pack: Pack, rtl: boolean, labels: PackLabels) {
  const [w, h] = pack.size;
  const color = shelf.brand_color;
  const { tex, ctx, W, H } = faceCanvas(w, h, 1024, (c, W, H) => {
    const u = Math.min(W, H) / 100; // layout unit
    const pad = u * 7;
    const start = rtl ? W - pad : pad;
    c.fillStyle = "#fbfbf8";
    c.fillRect(0, 0, W, H);
    // brand band with the product name
    const band = Math.max(u * 22, H * 0.16);
    c.fillStyle = color;
    c.fillRect(0, 0, W, band);
    c.fillStyle = shade(color, -0.2);
    c.fillRect(0, band, W, u * 1.2);
    c.direction = rtl ? "rtl" : "ltr";
    c.textAlign = rtl ? "right" : "left";
    c.textBaseline = "middle";
    c.fillStyle = "#ffffff";
    fitText(c, name(p, rtl), W - pad * 2, 800, band * 0.42);
    c.fillText(name(p, rtl), start, band * 0.42);
    c.fillStyle = "rgba(255,255,255,.82)";
    fitText(c, name(shelf, rtl), W - pad * 2, 600, band * 0.2);
    c.fillText(name(shelf, rtl), start, band * 0.76);

    // body text: subtitle, then the description, wrapped to fit
    let y = band + u * 9;
    const body = u * 5.4;
    const subtitle = rtl ? p.subtitle_ar || p.subtitle_en : p.subtitle_en;
    c.textBaseline = "alphabetic";
    if (subtitle) {
      c.fillStyle = color;
      c.font = `700 ${body * 1.15}px ${fontFamily()}`;
      for (const line of wrap(c, subtitle, W - pad * 2).slice(0, 2)) {
        c.fillText(line, start, y);
        y += body * 1.5;
      }
      y += body * 0.4;
    }
    const facts: [string, string][] = [];
    if (p.active_ingredient) facts.push([labels.ingredient, p.active_ingredient]);
    if (p.pack_size) facts.push([labels.pack, p.pack_size]);
    // wide packs put the facts side by side, tall packs stack them
    const inRow = W > H && facts.length > 1;
    const factsH = (inRow ? 1 : facts.length) * body * 3.1 + (p.requires_prescription ? body * 2.6 : 0);
    const footer = H * 0.16;
    const desc = rtl ? p.description_ar || p.description_en : p.description_en;
    if (desc) {
      c.fillStyle = "#3b3b3b";
      c.font = `400 ${body}px ${fontFamily()}`;
      const room = Math.max(0, Math.floor((H - footer - factsH - y - u * 4) / (body * 1.45)));
      const lines = wrap(c, desc, W - pad * 2);
      lines.slice(0, room).forEach((line, i) => {
        c.fillText(i === room - 1 && lines.length > room ? `${line.replace(/\S+$/, "")}…` : line, start, y);
        y += body * 1.45;
      });
      y += body * 0.6;
    }
    // key facts
    const colW = inRow ? (W - pad * 2) / facts.length : W - pad * 2;
    facts.forEach(([label, value], i) => {
      const x = inRow ? (rtl ? W - pad - i * colW : pad + i * colW) : start;
      const fy = inRow ? y : y + i * body * 3.1;
      c.fillStyle = "#e6e6e1";
      c.fillRect(inRow ? (rtl ? x - colW : x) : pad, fy - body * 0.9, inRow ? colW - u * 3 : W - pad * 2, u * 0.4);
      c.fillStyle = "#7a7a75";
      c.font = `600 ${body * 0.82}px ${fontFamily()}`;
      c.fillText(label, x, fy + body * 0.5);
      c.fillStyle = "#1d1d1d";
      fitText(c, value, colW - u * 4, 700, body);
      c.fillText(value, x, fy + body * 1.75);
    });
    y += (inRow ? 1 : facts.length) * body * 3.1;
    if (p.requires_prescription) {
      c.fillStyle = "#c62828";
      c.font = `800 ${body}px ${fontFamily()}`;
      c.fillText(`Rx · ${labels.rx}`, start, y + body * 0.6);
    }
    // footer: barcode on the end side, company on the start side
    const bw = Math.min(W * 0.42, u * 40);
    const bh = Math.min(footer * 0.5, u * 13);
    drawBarcode(c, p.id, rtl ? pad : W - pad - bw, H - pad - bh * 1.25, bw, bh);
    c.direction = rtl ? "rtl" : "ltr";
    c.textAlign = rtl ? "right" : "left";
    c.textBaseline = "alphabetic";
    c.fillStyle = color;
    fitText(c, name(shelf, rtl), W - pad * 3 - bw, 800, body * 1.05);
    c.fillText(name(shelf, rtl), start, H - pad - bh * 0.35);
  });
  // company logo above its name
  if (shelf.logo_url) {
    const u = Math.min(W, H) / 100;
    const size = Math.min(u * 14, H * 0.09);
    loadImage(shelf.logo_url, 128)
      .then((img) => {
        const x = rtl ? W - u * 7 - size : u * 7;
        drawContained(ctx, img, x, H - u * 7 - Math.min(H * 0.1, u * 13) * 1.25 - size * 0.55, size, size);
        tex.needsUpdate = true;
      })
      .catch(() => {});
  }
  return tex;
}
