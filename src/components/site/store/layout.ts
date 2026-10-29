// World layout of the 3D pharmacy warehouse.
//
// One straight aisle runs from the entrance (z > 0) towards -Z. Every company gets a
// branded bay (a gondola shelf) along the aisle, alternating left and right; the
// opposite side of each bay holds a generic stock gondola. A checkout counter closes
// the aisle. Stops along the walk: 0 = entrance, 1..N = company bays, N+1 = checkout.

export const AISLE_HALF = 2.4; // aisle centre to shelf front
export const ZONE = 4.6; // distance between bays along the aisle
export const EYE = 1.62; // camera height

export const GONDOLA = { len: 3.6, h: 2.7, d: 0.7 };
export const COLS = 6;
export const ROWS = 4;
export const SLOTS = COLS * ROWS;
export const BOX = { w: 0.44, h: 0.42, d: 0.26 };

// Bottom of each row of boxes, top row first.
export const ROW_Y = [2.02, 1.48, 0.94, 0.4];
export const TOP_BOARD = 2.52;

export const stopCount = (bays: number) => bays + 2;
export const zoneZ = (i: number) => -2.6 - i * ZONE;
export const checkoutZ = (bays: number) => zoneZ(bays - 1) - 5.4;

/** -1 = left of the aisle, 1 = right. Arabic mirrors the order so the first bay is on the right. */
export const sideOf = (i: number, rtl: boolean) => (i % 2 === 0 ? -1 : 1) * (rtl ? -1 : 1);

/** Where a gondola stands and how it is turned so its front faces the aisle. */
export function gondolaFrame(z: number, side: number) {
  return {
    position: [side * (AISLE_HALF + GONDOLA.d / 2), 0, z] as [number, number, number],
    rotationY: side < 0 ? Math.PI / 2 : -Math.PI / 2,
  };
}

/** Shelf row of a slot; a bay with fewer products than slots fills the middle (eye-level) rows. */
export function slotRow(slot: number, count: number) {
  const rows = Math.min(ROWS, Math.ceil(Math.min(count, SLOTS) / COLS));
  return Math.floor((ROWS - rows) / 2) + Math.floor(slot / COLS);
}

/** Local position (inside the gondola frame) of a product slot, row-major from the top-left. */
export function slotLocal(slot: number, rtl: boolean, count: number): [number, number, number] {
  const col = slot % COLS;
  const row = slotRow(slot, count);
  const step = (GONDOLA.len - 0.3) / COLS;
  const x = -((COLS - 1) / 2) * step + col * step;
  // Columns read in the language's direction.
  return [rtl ? -x : x, ROW_Y[row] + BOX.h / 2 + 0.005, GONDOLA.d / 2 - BOX.d / 2 - 0.04];
}

/** World position of a product slot on company bay `bay`. */
export function slotWorld(bay: number, slot: number, rtl: boolean, count: number): [number, number, number] {
  const { position, rotationY } = gondolaFrame(zoneZ(bay), sideOf(bay, rtl));
  const [lx, ly, lz] = slotLocal(slot, rtl, count);
  const c = Math.cos(rotationY);
  const s = Math.sin(rotationY);
  return [position[0] + lx * c + lz * s, ly, position[2] - lx * s + lz * c];
}

/**
 * A resting pose of the shopper. `yaw`/`pitch` are the head (camera) angles; `lateral`
 * slides the parked cart sideways (camera-right positive) so it doesn't hide the shelf.
 */
export type Pose = { x: number; z: number; yaw: number; pitch: number; lateral: number };

/** Yaw that makes a camera at (x, z) face (tx, tz). Three.js cameras look down -Z at yaw 0. */
const yawTo = (x: number, z: number, tx: number, tz: number) => Math.atan2(-(tx - x), -(tz - z));

/**
 * `wide` (landscape) screens stand close and face the bay; narrow (portrait) screens stand
 * further back along the aisle and look at the bay at an angle, so the whole bay still fits.
 */
export function poseFor(stop: number, bays: number, rtl: boolean, wide: boolean): Pose {
  if (stop <= 0) return { x: 0, z: 3.4, yaw: 0, pitch: -0.06, lateral: 0 };
  // At checkout, wide screens step aside so the counter isn't hidden behind the receipt panel (on the end side).
  if (stop > bays) return { x: wide ? (rtl ? -0.9 : 0.9) : 0, z: checkoutZ(bays) + 4.4, yaw: 0, pitch: -0.1, lateral: 0 };

  const i = stop - 1;
  const side = sideOf(i, rtl);
  const z = zoneZ(i);
  const tx = side * AISLE_HALF;
  if (wide) {
    const x = -side * 1.7;
    const cz = z + 1.0;
    const dist = Math.hypot(tx - x, cz - z);
    return { x, z: cz, yaw: yawTo(x, cz, tx, z), pitch: -Math.atan((EYE - 1.5) / dist), lateral: -side * 0.95 };
  }
  // Narrow: aim halfway between the bay's two ends so the whole (foreshortened) bay fits.
  const x = -side * 1.7;
  const cz = z + 3.6;
  const half = GONDOLA.len / 2;
  const yaw = (yawTo(x, cz, tx, z + half) + yawTo(x, cz, tx, z - half)) / 2;
  return { x, z: cz, yaw, pitch: -0.04, lateral: -side * 0.6 };
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

/** Short aisle code shown on signs: A1, A2, ... */
export const aisleCode = (i: number) => `A${i + 1}`;
