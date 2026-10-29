// World layout of the 3D pharmacy: one long wall of shelf units along the X axis,
// facing +Z. The camera and cart travel along the aisle in front of it.
// Stops: 0 = entrance, 1..N = company shelves, N+1 = checkout counter.

export const SPACING = 4.4; // distance between shelf centres
export const SHELF_W = 3.2;
export const SHELF_H = 2.5;
export const SHELF_D = 0.6;
export const COLS = 4;
export const ROWS = 3;
export const SLOTS = COLS * ROWS;
export const BOX = { w: 0.56, h: 0.56, d: 0.28 };

// Shelf boards sit at these heights (bottom of each row of products).
const ROW_Y = [1.68, 1.02, 0.36];

export type Vec3 = [number, number, number];
export type Pose = { cam: Vec3; look: Vec3; cart: Vec3 };

export const stopCount = (shelves: number) => shelves + 2;

export function shelfX(i: number, dir: number) {
  return dir * i * SPACING;
}

export function checkoutX(shelves: number, dir: number) {
  return shelfX(shelves - 1, dir) + dir * SPACING * 1.25;
}

/** Centre of a product box on shelf `shelf`, slot `slot` (row-major, top row first). */
export function slotPosition(shelf: number, slot: number, dir: number): Vec3 {
  const col = slot % COLS;
  const row = Math.floor(slot / COLS);
  const step = (SHELF_W - 0.4) / COLS;
  // Columns read in the language's direction: left-to-right in English, right-to-left in Arabic.
  const x = shelfX(shelf, dir) + dir * (-((COLS - 1) / 2) * step + col * step);
  return [x, ROW_Y[row] + BOX.h / 2 + 0.01, 0.02];
}

export function priceStripY(row: number) {
  return ROW_Y[row] - 0.05;
}

export function boardYs() {
  return [...ROW_Y, 2.34];
}

/**
 * Camera distance that fits a whole shelf (with its sign) on screen for the given aspect ratio
 * and vertical FOV. Wide screens also keep the parked cart beside the shelf in view.
 */
export function fitDistance(aspect: number, fov: number) {
  const halfTan = Math.tan(((fov / 2) * Math.PI) / 180);
  const width = SHELF_W + (aspect >= 1 ? 2.8 : 0.6);
  const byWidth = width / (2 * halfTan * aspect);
  const byHeight = (SHELF_H + 1.6) / (2 * halfTan);
  return Math.min(8, Math.max(3.8, byWidth, byHeight));
}

/** `wide` screens park the cart beside the shelf; narrow (portrait) screens park it in front. */
export function poseFor(stop: number, shelves: number, dir: number, dist: number, wide: boolean): Pose {
  if (stop <= 0) {
    const x0 = shelfX(0, dir);
    return {
      cam: [x0 - dir * 5.2, 2.7, dist + 3.2],
      look: [x0 + dir * 1.6, 1.1, 0],
      cart: [x0 - dir * 2.9, 0, 2.3],
    };
  }
  if (stop > shelves) {
    const cx = checkoutX(shelves, dir);
    return {
      cam: [cx - dir * 0.6, 2.2, dist + 0.6],
      look: [cx - dir * 0.3, 1.45, 0],
      cart: [cx - dir * 2.1, 0, 1.3],
    };
  }
  const sx = shelfX(stop - 1, dir);
  const shift = wide ? dir * 0.5 : 0;
  return {
    cam: [sx - shift, 1.8, dist],
    look: [sx - shift, wide ? 1.5 : 1.35, 0],
    cart: wide ? [sx - dir * 2.25, 0, 0.7] : [sx - dir * 0.6, 0, 3.4],
  };
}

/**
 * Turns raw scroll progress (0..stops-1) into a stop position that rests on each stop
 * for part of the scroll and travels smoothly between them.
 */
export function easeStops(raw: number, stops: number) {
  const max = stops - 1;
  const p = Math.min(max, Math.max(0, raw));
  const k = Math.floor(p);
  if (k >= max) return max;
  const f = p - k;
  const t = Math.min(1, Math.max(0, (f - 0.3) / 0.5));
  return k + t * t * (3 - 2 * t);
}

/** Raw progress value that lands squarely on a stop (inside its resting range). */
export const rawForStop = (stop: number, stops: number) => (stop >= stops - 1 ? stops - 1 : stop + 0.12);
