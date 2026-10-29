"use client";

import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { BOX, COLS, GONDOLA, ROWS, ROW_Y, SLOTS, aisleCode, gondolaFrame, sideOf, slotLocal, slotRow, zoneZ } from "./layout";
import { GondolaFrame } from "./environment";
import { aisleSign, bayHeader, priceStrip, shade } from "./textures";
import type { StoreShelf } from "./types";

export type HoverHandler = (slot: number | null, x?: number, y?: number) => void;

type BayProps = {
  shelf: StoreShelf;
  index: number;
  rtl: boolean;
  faces: THREE.Texture[];
  price: (v: number) => string;
  selectedSlot: number | null;
  onPick: (slot: number) => void;
  onHover: HoverHandler;
};

/** One company's branded bay: gondola, back-lit header, price rails, products and the aisle sign above. */
export function CompanyBay({ shelf, index, rtl, faces, price, selectedSlot, onPick, onHover }: BayProps) {
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

  const sideColor = useMemo(() => shade(shelf.brand_color, 0.35), [shelf.brand_color]);

  return (
    <>
      <group position={position} rotation-y={rotationY}>
        <GondolaFrame color="#ffffff" accent={shelf.brand_color} />
        {/* back-lit header */}
        <mesh position={[0, GONDOLA.h + 0.2, 0.02]}>
          <boxGeometry args={[GONDOLA.len + 0.06, 0.48, 0.16]} />
          <meshStandardMaterial color={shelf.brand_color} />
        </mesh>
        <mesh position={[0, GONDOLA.h + 0.2, 0.101]}>
          <planeGeometry args={[GONDOLA.len, GONDOLA.len / 8]} />
          <meshBasicMaterial map={header} toneMapped={false} />
        </mesh>
        {/* price rails on the board edges */}
        {rails.map((tex, row) => (
          <mesh key={row} position={[0, ROW_Y[row] - 0.035, GONDOLA.d / 2 - 0.015]}>
            <planeGeometry args={[GONDOLA.len - 0.1, 0.075]} />
            <meshBasicMaterial map={tex} toneMapped={false} />
          </mesh>
        ))}
        {shelf.products.slice(0, SLOTS).map((p, slot) => (
          <ProductBox
            key={p.id}
            position={slotLocal(slot, rtl, count)}
            face={faces[slot]}
            sideColor={sideColor}
            highlight={shelf.brand_color}
            inStock={p.in_stock}
            selected={selectedSlot === slot}
            onPick={() => onPick(slot)}
            onHover={(on, x, y) => onHover(on ? slot : null, x, y)}
          />
        ))}
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
            <meshBasicMaterial color="#9aa6a0" />
          </mesh>
        ))}
      </group>
    </>
  );
}

// Slightly rounded packs; the geometry keeps the box's six material groups (front face = 4).
const packGeometry = new RoundedBoxGeometry(BOX.w, BOX.h, BOX.d, 2, 0.016);
const outlineGeometry = new THREE.BoxGeometry(BOX.w, BOX.h, BOX.d);

function ProductBox({
  position,
  face,
  sideColor,
  highlight,
  inStock,
  selected,
  onPick,
  onHover,
}: {
  position: [number, number, number];
  face: THREE.Texture;
  sideColor: string;
  highlight: string;
  inStock: boolean;
  selected: boolean;
  onPick: () => void;
  onHover: (on: boolean, x?: number, y?: number) => void;
}) {
  const group = useRef<THREE.Group>(null);
  const outline = useRef<THREE.Mesh>(null);
  const hovered = useRef(false);

  useFrame((state, delta) => {
    const g = group.current;
    if (!g) return;
    const s = 1 - Math.exp(-delta * 10);
    const active = selected || hovered.current;
    const z = position[2] + (selected ? 0.34 : hovered.current ? 0.1 : 0);
    const y = position[1] + (selected ? 0.05 + Math.sin(state.clock.elapsedTime * 2.4) * 0.02 : 0);
    g.position.z += (z - g.position.z) * s;
    g.position.y += (y - g.position.y) * s;
    const scale = selected ? 1.12 : hovered.current ? 1.05 : 1;
    g.scale.setScalar(g.scale.x + (scale - g.scale.x) * s);
    g.rotation.y += ((selected ? Math.sin(state.clock.elapsedTime * 1.3) * 0.2 : 0) - g.rotation.y) * s;
    if (outline.current) outline.current.visible = active;
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

  const tint = inStock ? "#ffffff" : "#b9c2bd";
  return (
    <group ref={group} position={position}>
      <mesh
        onClick={(e) => {
          e.stopPropagation();
          onPick();
        }}
        onPointerOver={over}
        onPointerMove={(e) => onHover(true, e.nativeEvent.clientX, e.nativeEvent.clientY)}
        onPointerOut={out}
        geometry={packGeometry}
      >
        <meshStandardMaterial attach="material-0" color={sideColor} />
        <meshStandardMaterial attach="material-1" color={sideColor} />
        <meshStandardMaterial attach="material-2" color={sideColor} />
        <meshStandardMaterial attach="material-3" color={sideColor} />
        <meshStandardMaterial attach="material-4" map={face} color={tint} roughness={0.4} />
        <meshStandardMaterial attach="material-5" color={sideColor} />
      </mesh>
      {/* outline: a slightly larger back-faced box in the brand colour */}
      <mesh ref={outline} geometry={outlineGeometry} scale={1.09} visible={false} raycast={() => null}>
        <meshBasicMaterial color={highlight} side={THREE.BackSide} />
      </mesh>
    </group>
  );
}

export function FlyingBox({
  from,
  face,
  color,
  cartRef,
  duration,
  onDone,
}: {
  from: [number, number, number];
  face: THREE.Texture | undefined;
  color: string;
  cartRef: RefObject<THREE.Group | null>;
  duration: number;
  onDone: () => void;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const start = useRef<number | null>(null);
  const done = useRef(false);
  const origin = useMemo(() => new THREE.Vector3(...from), [from]);
  const to = useMemo(() => new THREE.Vector3(), []);

  useFrame((state) => {
    const m = ref.current;
    const cart = cartRef.current;
    if (!m || !cart || done.current) return;
    if (start.current === null) start.current = state.clock.elapsedTime;
    const t = Math.min(1, (state.clock.elapsedTime - start.current) / duration);
    const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    cart.localToWorld(to.set(0, 0.8, -0.7));
    m.position.lerpVectors(origin, to, e);
    m.position.y += Math.sin(Math.PI * t) * 0.55;
    m.rotation.set(t * Math.PI * 0.7, t * Math.PI * 2, 0);
    m.scale.setScalar(1.05 - 0.65 * e);
    if (t >= 1) {
      done.current = true;
      onDone();
    }
  });

  return (
    <mesh ref={ref} position={origin} geometry={packGeometry}>
      <meshStandardMaterial attach="material-0" color={color} />
      <meshStandardMaterial attach="material-1" color={color} />
      <meshStandardMaterial attach="material-2" color={color} />
      <meshStandardMaterial attach="material-3" color={color} />
      <meshStandardMaterial attach="material-4" map={face ?? null} />
      <meshStandardMaterial attach="material-5" color={color} />
    </mesh>
  );
}
