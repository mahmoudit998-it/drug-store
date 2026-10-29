import * as THREE from "three";

/** Same-origin, resized copy of an image through the Next.js image optimizer (avoids CORS on textures). */
export const optimized = (src: string, w = 256) => `/_next/image?url=${encodeURIComponent(src)}&w=${w}&q=75`;

const fontFamily = () => getComputedStyle(document.body).fontFamily;

function canvasTexture(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  draw(ctx);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return { tex, ctx };
}

function loadImage(src: string, w = 256) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = optimized(src, w);
  });
}

function drawContained(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const s = Math.min(w / img.width, h / img.height);
  const dw = img.width * s;
  const dh = img.height * s;
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

function fitText(ctx: CanvasRenderingContext2D, text: string, maxW: number, weight: number, size: number) {
  let px = size;
  do {
    ctx.font = `${weight} ${px}px ${fontFamily()}`;
    px -= 2;
  } while (ctx.measureText(text).width > maxW && px > 10);
}

function drawLogo(ctx: CanvasRenderingContext2D, tex: THREE.Texture, url: string, x: number, y: number, size: number) {
  loadImage(url, size > 128 ? 256 : 128)
    .then((img) => {
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(x, y, size, size, size * 0.2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
      ctx.clip();
      drawContained(ctx, img, x + size * 0.06, y + size * 0.06, size * 0.88, size * 0.88);
      ctx.restore();
      tex.needsUpdate = true;
    })
    .catch(() => {});
}

/** Front face of a product box: the product photo on white with a thin brand-coloured band. */
export function productFace(imageUrl: string | null, color: string) {
  const S = 512;
  const { tex, ctx } = canvasTexture(S, S, (c) => {
    c.fillStyle = "#ffffff";
    c.fillRect(0, 0, S, S);
    c.fillStyle = color;
    c.fillRect(0, S - 24, S, 24);
  });
  if (imageUrl) {
    // 640 is the smallest optimizer width above the 512px canvas
    loadImage(imageUrl, 640)
      .then((img) => {
        drawContained(ctx, img, 16, 8, S - 32, S - 40);
        tex.needsUpdate = true;
      })
      .catch(() => {});
  }
  return tex;
}

/** Back-lit header on top of a company bay: logo and name on the brand colour. */
export function bayHeader(name: string, logoUrl: string | null, color: string, rtl: boolean) {
  const W = 2048;
  const H = 256;
  const logo = 192;
  const pad = 44;
  const { tex, ctx } = canvasTexture(W, H, (c) => {
    const g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, color);
    g.addColorStop(1, shade(color, -0.18));
    c.fillStyle = g;
    c.fillRect(0, 0, W, H);
    c.fillStyle = "#ffffff";
    c.textBaseline = "middle";
    c.direction = rtl ? "rtl" : "ltr";
    c.textAlign = rtl ? "right" : "left";
    const start = pad + (logoUrl ? logo + pad : 0);
    fitText(c, name, W - start - pad, 800, 128);
    c.fillText(name, rtl ? W - start : start, H / 2 + 6);
  });
  if (logoUrl) drawLogo(ctx, tex, logoUrl, rtl ? W - pad - logo : pad, (H - logo) / 2, logo);
  return tex;
}

/** Hanging aisle sign: code badge + company name + arrow towards the bay's side. */
export function aisleSign(code: string, name: string, color: string, arrowRight: boolean, rtl: boolean) {
  const W = 1024;
  const H = 200;
  // drawn at 2x for sharpness
  return canvasTexture(W * 2, H * 2, (c) => {
    c.scale(2, 2);
    c.fillStyle = "#13241b";
    c.beginPath();
    c.roundRect(0, 0, W, H, 28);
    c.fill();
    // code badge
    const bx = rtl ? W - 24 - 170 : 24;
    c.fillStyle = color;
    c.beginPath();
    c.roundRect(bx, 24, 170, H - 48, 20);
    c.fill();
    c.fillStyle = "#ffffff";
    c.textAlign = "center";
    c.textBaseline = "middle";
    fitText(c, code, 140, 800, 92);
    c.fillText(code, bx + 85, H / 2 + 4);
    // arrow on the far side from the badge
    const ax = rtl ? 90 : W - 90;
    c.save();
    c.translate(ax, H / 2);
    if (!arrowRight) c.scale(-1, 1);
    c.beginPath();
    c.moveTo(-34, -40);
    c.lineTo(30, 0);
    c.lineTo(-34, 40);
    c.lineWidth = 16;
    c.lineCap = "round";
    c.lineJoin = "round";
    c.strokeStyle = color;
    c.stroke();
    c.restore();
    // name
    c.direction = rtl ? "rtl" : "ltr";
    c.textAlign = rtl ? "right" : "left";
    c.fillStyle = "#ffffff";
    fitText(c, name, W - 170 - 200, 700, 76);
    c.fillText(name, rtl ? W - 24 - 170 - 36 : 24 + 170 + 36, H / 2 + 4);
  }).tex;
}

/** Price labels along the front edge of one shelf board, one per column. */
export function priceStrip(labels: (string | null)[], cols: number, rtl: boolean) {
  const W = 1024;
  const H = 48;
  return canvasTexture(W * 2, H * 2, (c) => {
    c.scale(2, 2);
    c.fillStyle = "#ffffff";
    c.fillRect(0, 0, W, H);
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.direction = rtl ? "rtl" : "ltr";
    const step = W / cols;
    labels.forEach((label, i) => {
      if (!label) return;
      const cx = rtl ? W - (i + 0.5) * step : (i + 0.5) * step;
      c.fillStyle = "#fff6d6";
      c.beginPath();
      c.roundRect(cx - step / 2 + 10, 5, step - 20, H - 10, 6);
      c.fill();
      c.fillStyle = "#13241b";
      fitText(c, label, step - 36, 800, 28);
      c.fillText(label, cx, H / 2 + 1);
    });
  }).tex;
}

/** A plain sign: bold text on a coloured background. */
export function textSign(text: string, bg: string, fg: string, w = 1024, h = 200, size = 96) {
  return canvasTexture(w * 2, h * 2, (c) => {
    c.scale(2, 2);
    c.fillStyle = bg;
    c.fillRect(0, 0, w, h);
    c.fillStyle = fg;
    c.textAlign = "center";
    c.textBaseline = "middle";
    fitText(c, text, w - 60, 800, size);
    c.fillText(text, w / 2, h / 2 + 4);
  }).tex;
}

/** Polished warehouse floor: large pale tiles with a faint seam. */
export function floorTiles() {
  const S = 256;
  const { tex } = canvasTexture(S, S, (c) => {
    c.fillStyle = "#eef1ef";
    c.fillRect(0, 0, S, S);
    c.strokeStyle = "#dde3df";
    c.lineWidth = 3;
    c.strokeRect(0, 0, S, S);
  });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

/** Wire mesh used for the shopping cart basket (transparent between the wires). */
export function wireMesh() {
  const S = 128;
  const { tex } = canvasTexture(S, S, (c) => {
    c.clearRect(0, 0, S, S);
    c.strokeStyle = "#ffffff";
    c.lineWidth = 7;
    c.strokeRect(0, 0, S, S);
  });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

let baseShadowTex: THREE.Texture | null = null;

/** Shared gradient strip: dark at a shelf's base, fading out across the floor. */
export function baseShadow() {
  if (!baseShadowTex) {
    baseShadowTex = canvasTexture(4, 64, (c) => {
      const g = c.createLinearGradient(0, 0, 0, 64);
      g.addColorStop(0, "rgba(16,40,28,0)");
      g.addColorStop(1, "rgba(16,40,28,0.28)");
      c.fillStyle = g;
      c.fillRect(0, 0, 4, 64);
    }).tex;
  }
  return baseShadowTex;
}

/** Soft round shadow, used under the cart and gondolas instead of real-time shadows. */
export function softShadow() {
  const S = 128;
  const { tex } = canvasTexture(S, S, (c) => {
    const g = c.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    g.addColorStop(0, "rgba(16,40,28,0.32)");
    g.addColorStop(1, "rgba(16,40,28,0)");
    c.fillStyle = g;
    c.fillRect(0, 0, S, S);
  });
  return tex;
}

/** Lightens (amount > 0) or darkens (amount < 0) a hex colour. */
export function shade(hex: string, amount: number) {
  const c = new THREE.Color(hex);
  return "#" + c.lerp(new THREE.Color(amount > 0 ? "#ffffff" : "#000000"), Math.abs(amount)).getHexString();
}
