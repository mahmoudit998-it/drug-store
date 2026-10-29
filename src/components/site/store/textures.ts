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
  tex.anisotropy = 4;
  return { tex, ctx };
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = optimized(src);
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

/** Front face of a product box: the product photo on white with a thin brand-coloured band. */
export function productFace(imageUrl: string | null, color: string) {
  const S = 256;
  const { tex, ctx } = canvasTexture(S, S, (c) => {
    c.fillStyle = "#ffffff";
    c.fillRect(0, 0, S, S);
    c.fillStyle = color;
    c.fillRect(0, S - 14, S, 14);
  });
  if (imageUrl) {
    loadImage(imageUrl)
      .then((img) => {
        drawContained(ctx, img, 10, 6, S - 20, S - 26);
        tex.needsUpdate = true;
      })
      .catch(() => {});
  }
  return tex;
}

/** Company sign on top of a shelf unit. */
export function shelfSign(name: string, logoUrl: string | null, color: string, rtl: boolean) {
  const W = 1024;
  const H = 160;
  const logo = 112;
  const pad = 26;
  const { tex, ctx } = canvasTexture(W, H, (c) => {
    c.fillStyle = color;
    c.fillRect(0, 0, W, H);
    c.fillStyle = "#ffffff";
    c.textBaseline = "middle";
    c.direction = rtl ? "rtl" : "ltr";
    c.textAlign = rtl ? "right" : "left";
    const textStart = pad + (logoUrl ? logo + pad : 0);
    fitText(c, name, W - textStart - pad, 800, 72);
    c.fillText(name, rtl ? W - textStart : textStart, H / 2 + 4);
  });
  if (logoUrl) {
    loadImage(logoUrl)
      .then((img) => {
        const x = rtl ? W - pad - logo : pad;
        const y = (H - logo) / 2;
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(x, y, logo, logo, 22);
        ctx.fillStyle = "#ffffff";
        ctx.fill();
        ctx.clip();
        drawContained(ctx, img, x + 6, y + 6, logo - 12, logo - 12);
        ctx.restore();
        tex.needsUpdate = true;
      })
      .catch(() => {});
  }
  return tex;
}

/** Price labels along the front edge of one shelf board. `labels` are positioned at evenly spaced slots. */
export function priceStrip(labels: (string | null)[], cols: number, rtl: boolean) {
  const W = 1024;
  const H = 56;
  const { tex } = canvasTexture(W, H, (c) => {
    c.fillStyle = "#f7faf8";
    c.fillRect(0, 0, W, H);
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.direction = rtl ? "rtl" : "ltr";
    const step = W / cols;
    labels.forEach((label, i) => {
      if (!label) return;
      const cx = rtl ? W - (i + 0.5) * step : (i + 0.5) * step;
      c.fillStyle = "#ffffff";
      c.strokeStyle = "#d9ece1";
      c.lineWidth = 3;
      c.beginPath();
      c.roundRect(cx - step / 2 + 14, 6, step - 28, H - 12, 10);
      c.fill();
      c.stroke();
      c.fillStyle = "#0b5d34";
      fitText(c, label, step - 48, 800, 30);
      c.fillText(label, cx, H / 2 + 1);
    });
  });
  return tex;
}

/** A large wall or counter sign: bold text on a coloured background. */
export function textSign(text: string, bg: string, fg: string, w = 1024, h = 220, size = 96) {
  return canvasTexture(w, h, (c) => {
    c.fillStyle = bg;
    c.fillRect(0, 0, w, h);
    c.fillStyle = fg;
    c.textAlign = "center";
    c.textBaseline = "middle";
    fitText(c, text, w - 60, 800, size);
    c.fillText(text, w / 2, h / 2 + 4);
  }).tex;
}

/** Light floor tiles, repeated across the floor plane. */
export function floorTiles() {
  const S = 256;
  const { tex } = canvasTexture(S, S, (c) => {
    c.fillStyle = "#f3f6f4";
    c.fillRect(0, 0, S, S);
    c.strokeStyle = "#e1e8e4";
    c.lineWidth = 4;
    c.strokeRect(0, 0, S, S);
  });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

/** Soft round shadow used under the cart and shelf units. */
export function softShadow() {
  const S = 128;
  const { tex } = canvasTexture(S, S, (c) => {
    const g = c.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    g.addColorStop(0, "rgba(16,40,28,0.35)");
    g.addColorStop(1, "rgba(16,40,28,0)");
    c.fillStyle = g;
    c.fillRect(0, 0, S, S);
  });
  return tex;
}
