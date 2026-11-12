// Real pack shapes for the 3D store.
//
// Each catalog photo shows its pack at an angle; the visible front (and, when readable,
// one side) were cut out and straightened into flat faces under /catalog/packs/. Sizes
// are the pack's real outer size in centimetres (width, height, depth). Products without
// an entry get a generic pack whose faces are drawn from the product data.

import type { StoreProduct } from "./types";

type PackInfo = { size: [number, number, number]; front?: boolean; side?: boolean; edge?: string };

const PACKS: Record<string, PackInfo> = {
  asonor: { size: [6, 15, 4.5], front: true, side: true, edge: "#1c4b7b" },
  camazink2: { size: [13, 7.5, 3], front: true, side: true, edge: "#014be0" },
  celine: { size: [12, 9, 4.5], front: true, side: true, edge: "#e9e9e9" },
  coliflor: { size: [5, 13, 3.5], front: true, side: true, edge: "#2d9754" },
  curagen: { size: [5, 11, 5], side: true },
  "cyclofert-female": { size: [12, 9, 4.5], front: true, side: true, edge: "#e9e9e9" },
  "cyclofert-male": { size: [12, 9, 4.5], front: true, side: true, edge: "#e9e9e9" },
  "fermix-forte": { size: [8, 11.5, 3], front: true, side: true, edge: "#f2f2f2" },
  "fermix-liposoft": { size: [8.5, 12, 3], front: true, side: true, edge: "#f2f2f2" },
  "hemopure-c": { size: [12, 9.5, 4.5], front: true, side: true, edge: "#f4f4f4" },
  insucure: { size: [14, 8, 6] },
  jointcure: { size: [16, 8.5, 4], front: true, side: true, edge: "#e9e7e4" },
  "joswe-folate": { size: [7, 13, 5], front: true, side: true, edge: "#f0f1f9" },
  magnetrex: { size: [8.5, 12, 3], front: true, side: true, edge: "#f2f2f2" },
  "magnetrex-biactif": { size: [10, 14, 3], front: true, edge: "#86ab4e" },
  "menoflavon-40mg": { size: [12, 8.5, 4], front: true, edge: "#e6e4e2" },
  vagiderm: { size: [7, 16, 4], front: true, side: true, edge: "#e8e8e8" },
  vitafolin: { size: [8.5, 12, 3], front: true, side: true, edge: "#f2f2f2" },
};

const GENERIC: PackInfo = { size: [9, 12, 4] };

/** Shelf packs are drawn larger than life so they stay readable from the aisle. */
export const SHELF_SCALE = 0.024; // metres per real centimetre
/** Held in the hand, packs are life size. */
export const HAND_SCALE = 0.01;

export type Pack = {
  key: string;
  /** Real size in centimetres: width, height, depth. */
  size: [number, number, number];
  frontUrl: string | null;
  sideUrl: string | null;
  /** Colour of the pack's top and bottom flaps. */
  edge: string | null;
};

export function packFor(p: StoreProduct): Pack {
  const name = p.image_url?.match(/\/catalog\/products\/([a-z0-9-]+)\.webp$/)?.[1] ?? null;
  const info = (name && PACKS[name]) || GENERIC;
  return {
    key: name && PACKS[name] ? name : `generic-${p.id}`,
    size: info.size,
    frontUrl: name && info.front ? `/catalog/packs/${name}-front.webp` : null,
    sideUrl: name && info.side ? `/catalog/packs/${name}-side.webp` : null,
    edge: info.edge ?? null,
  };
}

/** How many copies of a pack stand side by side in one shelf slot. */
export function facingsFor(pack: Pack, slotWidth: number) {
  const w = pack.size[0] * SHELF_SCALE;
  return Math.max(1, Math.min(4, Math.floor((slotWidth - 0.04) / (w + 0.012))));
}

/** Low, wide packs are stacked two high when they fit under the board above. */
export function stackFor(pack: Pack, rowGap: number) {
  const h = pack.size[1] * SHELF_SCALE;
  return h * 2 + 0.006 < rowGap - 0.05 ? 2 : 1;
}

/**
 * Local offsets (inside the slot, bottom-centre at the shelf front) of every copy of a pack.
 * The first one is the copy that gets picked up: front-left, on top of its stack.
 */
export function packLayout(pack: Pack, slotWidth: number, rowGap: number) {
  const [w, h, d] = pack.size.map((v) => v * SHELF_SCALE);
  const n = facingsFor(pack, slotWidth);
  const stack = stackFor(pack, rowGap);
  const out: [number, number, number][] = [];
  for (let i = 0; i < n; i++)
    for (let k = stack - 1; k >= 0; k--) out.push([(i - (n - 1) / 2) * (w + 0.012), h / 2 + k * (h + 0.003), -d / 2]);
  return out;
}
