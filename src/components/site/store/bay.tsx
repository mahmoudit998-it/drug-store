"use client";

import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { COLS, GONDOLA, ROWS, ROW_GAP, ROW_Y, SLOTS, SLOT_STEP, aisleCode, gondolaFrame, sideOf, slotBase, slotRow, zoneZ } from "./layout";
import { GondolaFrame } from "./environment";
import { SHELF_SCALE, packLayout, type Pack } from "./packs";
import { aisleSign, bayHeader, priceStrip } from "./textures";
import type { Pick, StoreShelf } from "./types";

export type HoverHandler = (slot: number | null, x?: number, y?: number) => void;

/** A product's pack shape and its six face materials (shared by shelf, hand and cart copies). */
export type PackVisual = { pack: Pack; materials: THREE.Material[] };

const geometries = new Map<string, { pack: THREE.BufferGeometry; outline: THREE.BufferGeometry }>();

/** Rounded pack geometry in centimetres (scale it to metres); cached per pack shape. */
export function packGeometry(pack: Pack) {
  const id = pack.size.join("x");
  let g = geometries.get(id);
  if (!g) {
    const [w, h, d] = pack.size;
    g = {
      pack: new RoundedBoxGeometry(w, h, d, 2, Math.min(0.3, d * 0.08)),
      outline: new THREE.BoxGeometry(w + 0.7, h + 0.7, d + 0.7),
    };
    geometries.set(id, g);
  }
  return g;
}

type BayProps = {
  shelf: StoreShelf;
  index: number;
  rtl: boolean;
  visuals: PackVisual[];
  price: (v: number) => string;
  /** The pack currently in the shopper's hand; its shelf copy is hidden meanwhile. */
  takenRef: RefObject<Pick | null>;
  onPick: (slot: number) => void;
  onHover: HoverHandler;
};

/** One company's branded bay: gondola, back-lit header, price rails, packs and the aisle sign above. */
export function CompanyBay({ shelf, index, rtl, visuals, price, takenRef, onPick, onHover }: BayProps) {
  const side = sideOf(index, rtl);
  const { position, rotationY } = gondolaFrame(zoneZ(index), side);
  const name = rtl ? shelf.name_ar || shelf.name_en : shelf.name_en;

  const header = useMemo(() => bayHeader(name, shelf.logo_url, shelf.brand_color, rtl), [name, shelf.logo_url, shelf.brand_color, rtl]);
  // Seen walking down the aisle, the bay is on the screen's left for side -1, right for side 1.
  const sign = useMemo(() => aisleSign(aisleCode(index), name, shelf.brand_color, side > 0, rtl), [index, name, shelf.brand_color, side, rtl]);
  const count = shelf.products.length;
  const rails = useMemo(() => {
    const labels: (string | null)[][] = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    shelf.products.slice(0, SLOTS).forEach((p, slot) => (labels[slotRow(slot, count)][slot % COLS] = price(p.price)));
    return labels.map((row) => priceStrip(row, COLS, rtl));
  }, [shelf.products, count, price, rtl]);
  useEffect(() => () => header.dispose(), [header]);
  useEffect(() => () => sign.dispose(), [sign]);
  useEffect(() => () => rails.forEach((r) => r.dispose()), [rails]);

  return (
    <>
      <group position={position} rotation-y={rotationY}>
        <GondolaFrame accent={shelf.brand_color} />
        {/* back-lit header */}
        <mesh position={[0, GONDOLA.h + 0.2, 0.02]}>
          <boxGeometry args={[GONDOLA.len + 0.06, 0.48, 0.16]} />
          <meshStandardMaterial color="#141416" roughness={0.5} metalness={0.4} />
        </mesh>
        <mesh position={[0, GONDOLA.h + 0.2, 0.101]}>
          <planeGeometry args={[GONDOLA.len, GONDOLA.len / 8]} />
          <meshBasicMaterial map={header} toneMapped={false} />
        </mesh>
        {/* price rails on the board edges */}
        {rails.map((tex, row) => (
          <mesh key={row} position={[0, ROW_Y[row] - 0.035, GONDOLA.d / 2 - 0.012]}>
            <planeGeometry args={[GONDOLA.len - 0.1, 0.075]} />
            <meshStandardMaterial map={tex} roughness={0.6} emissive="#ffffff" emissiveMap={tex} emissiveIntensity={0.18} />
          </mesh>
        ))}
        {shelf.products.slice(0, SLOTS).map((p, slot) =>
          visuals[slot] ? (
            <ShelfPacks
              key={p.id}
              visual={visuals[slot]}
              base={slotBase(slot, rtl, count)}
              seed={index * 31 + slot}
              highlight={shelf.brand_color}
              isTaken={() => takenRef.current?.shelf === index && takenRef.current.slot === slot}
              onPick={() => onPick(slot)}
              onHover={(on, x, y) => onHover(on ? slot : null, x, y)}
            />
          ) : null
        )}
      </group>

      {/* hanging aisle sign over the aisle */}
      <group position={[side * 0.9, 3.55, zoneZ(index) + 1.2]}>
        <mesh>
          <planeGeometry args={[2.0, 0.39]} />
          <meshBasicMaterial map={sign} toneMapped={false} transparent />
        </mesh>
        {[-0.8, 0.8].map((x) => (
          <mesh key={x} position={[x, 0.5, 0]}>
            <cylinderGeometry args={[0.006, 0.006, 0.62, 6]} />
            <meshStandardMaterial color="#3a3a3c" metalness={0.8} roughness={0.4} />
          </mesh>
        ))}
      </group>
    </>
  );
}

/** Local position (in the slot) of the copy that is picked up and put back. */
export function takenFacing(pack: Pack) {
  return new THREE.Vector3(...packLayout(pack, SLOT_STEP, ROW_GAP)[0]);
}

const hidden = new THREE.Matrix4().makeScale(0, 0, 0);

/** All facings of one product in its slot, drawn as one instanced mesh (one draw per face). */
function ShelfPacks({
  visual,
  base,
  seed,
  highlight,
  isTaken,
  onPick,
  onHover,
}: {
  visual: PackVisual;
  base: [number, number, number];
  seed: number;
  highlight: string;
  isTaken: () => boolean;
  onPick: () => void;
  onHover: (on: boolean, x?: number, y?: number) => void;
}) {
  const { pack, materials } = visual;
  const geo = packGeometry(pack);
  const layout = useMemo(() => packLayout(pack, SLOT_STEP, ROW_GAP), [pack]);
  const facings = layout.length;
  const group = useRef<THREE.Group>(null);
  const mesh = useRef<THREE.InstancedMesh>(null);
  const outline = useRef<THREE.InstancedMesh>(null);
  const hovered = useRef(false);
  const wasTaken = useRef(false);

  const matrices = useMemo(() => {
    const r = { s: seed * 9301 + 49297 };
    const rand = () => (r.s = (r.s * 9301 + 49297) % 233280) / 233280;
    return layout.map(([x, y, z]) => {
      // packs are never lined up perfectly on a real shelf
      const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), (rand() - 0.5) * 0.06);
      const p = new THREE.Vector3(x + (rand() - 0.5) * 0.008, y, z - rand() * 0.012);
      return new THREE.Matrix4().compose(p, q, new THREE.Vector3(SHELF_SCALE, SHELF_SCALE, SHELF_SCALE));
    });
  }, [layout, seed]);

  useLayoutEffect(() => {
    for (const m of [mesh.current, outline.current]) {
      if (!m) continue;
      matrices.forEach((mat, i) => m.setMatrixAt(i, mat));
      m.instanceMatrix.needsUpdate = true;
      m.computeBoundingSphere();
    }
    wasTaken.current = false;
  }, [matrices]);

  useFrame((_, delta) => {
    const g = group.current;
    const m = mesh.current;
    if (!g || !m) return;
    const taken = isTaken();
    if (taken !== wasTaken.current) {
      wasTaken.current = taken;
      m.setMatrixAt(0, taken ? hidden : matrices[0]);
      m.instanceMatrix.needsUpdate = true;
    }
    const s = 1 - Math.exp(-delta * 12);
    const z = base[2] + (hovered.current ? 0.04 : 0);
    g.position.z += (z - g.position.z) * s;
    if (outline.current) outline.current.visible = hovered.current;
  });

  const over = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    hovered.current = true;
    document.body.style.cursor = "pointer";
    onHover(true, e.nativeEvent.clientX, e.nativeEvent.clientY);
  };
  const out = () => {
    hovered.current = false;
    document.body.style.cursor = "";
    onHover(false);
  };
  useEffect(() => () => {
    document.body.style.cursor = "";
  }, []);

  return (
    <group ref={group} position={base}>
      <instancedMesh
        ref={mesh}
        args={[geo.pack, materials, facings]}
        castShadow
        receiveShadow
        onClick={(e) => {
          e.stopPropagation();
          onPick();
        }}
        onPointerOver={over}
        onPointerMove={(e) => onHover(true, e.nativeEvent.clientX, e.nativeEvent.clientY)}
        onPointerOut={out}
      />
      {/* hover outline: slightly larger back faces in the brand colour */}
      <instancedMesh ref={outline} args={[geo.outline, undefined, facings]} visible={false} raycast={() => null}>
        <meshBasicMaterial color={highlight} side={THREE.BackSide} toneMapped={false} />
      </instancedMesh>
    </group>
  );
}
