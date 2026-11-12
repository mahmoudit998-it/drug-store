"use client";

import { useFrame } from "@react-three/fiber";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from "react";
import * as THREE from "three";
import { gondolaFrame, sideOf, slotBase, zoneZ, bayToWorld } from "./layout";
import { packBack, type PackLabels } from "./pack-faces";
import { HAND_SCALE, SHELF_SCALE } from "./packs";
import { packGeometry, takenFacing, type PackVisual } from "./bay";
import { Hand, type PosedHand } from "./hand";
import type { Flight, Pick, StoreShelf } from "./types";

/** Where the pack in hand is right now, shared with the cart flight and the focus blur. */
export type HeldPose = { active: boolean; pos: THREE.Vector3; quat: THREE.Quaternion; scale: number; /** clock time of the last update */ stamp: number };
export const newHeldPose = (): HeldPose => ({ active: false, pos: new THREE.Vector3(), quat: new THREE.Quaternion(), scale: SHELF_SCALE, stamp: -1 });

/** Drag rotation of the pack in hand, written by the page's drag layer. */
export type Spin = { yaw: number; pitch: number };

type Held = { pick: Pick; visual: PackVisual; materials: THREE.Material[]; dispose: () => void; key: number };

const Y = new THREE.Vector3(0, 1, 0);
const DIST = 0.42; // metres in front of the eye

/** Pack position in front of the camera (camera space), clear of the details panel. */
function holdPoint(camera: THREE.PerspectiveCamera, aspect: number, rtl: boolean, out: THREE.Vector3) {
  const wide = aspect >= 1;
  const halfH = DIST * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  // wide: the panel sits on the end side, so hold the pack towards the start side; phones: upper half
  const nx = wide ? (rtl ? 0.24 : -0.24) : 0;
  const ny = wide ? -0.02 : 0.34;
  return out.set(nx * halfH * aspect, ny * halfH, -DIST);
}

/**
 * The picked pack: lifted off the shelf into a hand in front of the shopper, turned by
 * dragging (its printed back is drawn from the product data), and put back when closed.
 * After "add to cart" it hands over to the cart flight instead of going back.
 */
export function HeldPack({
  selected,
  shelves,
  rtl,
  visuals,
  labels,
  spinRef,
  takenRef,
  poseRef,
  flights,
  reducedMotion,
}: {
  selected: Pick | null;
  shelves: StoreShelf[];
  rtl: boolean;
  visuals: PackVisual[][];
  labels: PackLabels;
  spinRef: RefObject<Spin>;
  takenRef: RefObject<Pick | null>;
  poseRef: RefObject<HeldPose>;
  flights: Flight[];
  reducedMotion: boolean;
}) {
  const [held, setHeld] = useState<Held | null>(null);
  const packRef = useRef<THREE.Mesh>(null);
  const handRef = useRef<THREE.Group>(null);
  const handModelRef = useRef<PosedHand | null>(null);
  const animRef = useRef({ t: 0, dir: 0, yaw: 0, pitch: 0 });
  const tmp = useMemo(
    () => ({ local: new THREE.Vector3(), target: new THREE.Vector3(), from: new THREE.Vector3(), q: new THREE.Quaternion(), qs: new THREE.Quaternion(), e: new THREE.Euler(0, 0, 0, "YXZ"), m: new THREE.Matrix4() }),
    []
  );
  const lastFlightRef = useRef(0);
  const heldRef = useRef<Held | null>(null);
  // latest props for the frame loop, which does the picking up and putting back
  const inputRef = useRef({ selected, shelves, visuals, rtl, labels, flights });
  useLayoutEffect(() => {
    inputRef.current = { selected, shelves, visuals, rtl, labels, flights };
  });

  useEffect(() => () => heldRef.current?.dispose(), []);

  const onHand = useCallback((h: PosedHand) => (handModelRef.current = h), []);

  const replace = (next: Held | null) => {
    heldRef.current?.dispose();
    heldRef.current = next;
    takenRef.current = next?.pick ?? null;
    setHeld(next);
  };

  /** Reacts to selection and cart changes; returns false while there is nothing to draw. */
  const sync = () => {
    const { selected: want, shelves: sh, visuals: vis, rtl: right, labels: lab, flights: fl } = inputRef.current;
    const a = animRef.current;
    const current = heldRef.current;
    // "add to cart": the pack leaves the hand for the cart, it doesn't go back to the shelf
    const latest = fl[fl.length - 1];
    if (latest && latest.key > lastFlightRef.current) {
      lastFlightRef.current = latest.key;
      if (current && latest.shelf === current.pick.shelf && latest.slot === current.pick.slot) {
        replace(null);
        a.dir = 0;
        a.t = 0;
        return;
      }
    }
    if (want && (!current || current.pick.shelf !== want.shelf || current.pick.slot !== want.slot)) {
      const shelf = sh[want.shelf];
      const product = shelf?.products[want.slot];
      const visual = vis[want.shelf]?.[want.slot];
      if (!product || !visual) return;
      const back = packBack(product, shelf, visual.pack, right, lab);
      const backMat = new THREE.MeshStandardMaterial({ map: back, roughness: 0.38 });
      replace({ pick: want, visual, materials: [...visual.materials.slice(0, 5), backMat], key: Date.now(), dispose: () => (back.dispose(), backMat.dispose()) });
      Object.assign(a, { t: 0, dir: 1, yaw: 0, pitch: 0 });
    } else if (!want && current && a.dir >= 0) {
      a.dir = -1;
    }
  };

  useFrame((state, rawDelta) => {
    sync();
    const p = poseRef.current;
    const mesh = packRef.current;
    const a = animRef.current;
    const h = heldRef.current;
    if (!h || !mesh) {
      if (p) p.active = false;
      if (handRef.current) handRef.current.visible = false;
      return;
    }
    const delta = Math.min(rawDelta, 0.1);
    a.t = Math.min(1, Math.max(0, a.t + a.dir * (delta / (reducedMotion ? 0.05 : 0.7))));
    if (a.dir < 0 && a.t <= 0) {
      replace(null);
      a.dir = 0;
      return;
    }
    const e = a.t * a.t * (3 - 2 * a.t);
    const camera = state.camera as THREE.PerspectiveCamera;
    const aspect = state.size.width / Math.max(1, state.size.height);

    // smoothed drag rotation, plus a slow idle sway so the hand feels alive
    const s = 1 - Math.exp(-delta * 10);
    a.yaw += ((spinRef.current?.yaw ?? 0) - a.yaw) * s;
    a.pitch += ((spinRef.current?.pitch ?? 0) - a.pitch) * s;
    const time = state.clock.elapsedTime;
    const sway = reducedMotion ? 0 : 1;
    tmp.e.set(a.pitch + Math.sin(time * 0.9) * 0.02 * sway, a.yaw + Math.sin(time * 0.6) * 0.04 * sway, Math.sin(time * 0.7) * 0.015 * sway);
    tmp.qs.setFromEuler(tmp.e);

    // the pack rests on the palm: lift it by its rotated half height
    const [w, hgt, d] = h.visual.pack.size;
    tmp.m.makeRotationFromQuaternion(tmp.qs);
    const el = tmp.m.elements;
    const halfY = 0.5 * (Math.abs(el[1]) * w + Math.abs(el[5]) * hgt + Math.abs(el[9]) * d) * HAND_SCALE;
    holdPoint(camera, aspect, rtl, tmp.local);

    // shelf pose of the picked facing
    const bay = h.pick.shelf;
    const count = shelves[bay]?.products.length ?? 0;
    const base = slotBase(h.pick.slot, rtl, count);
    const f = takenFacing(h.visual.pack);
    tmp.from.set(...bayToWorld(bay, rtl, [base[0] + f.x, base[1] + f.y, base[2] + f.z]));
    const shelfQ = tmp.q.setFromAxisAngle(Y, gondolaFrame(zoneZ(bay), sideOf(bay, rtl)).rotationY);

    tmp.target.copy(tmp.local);
    camera.localToWorld(tmp.target);
    mesh.position.lerpVectors(tmp.from, tmp.target, e);
    mesh.position.y += Math.sin(Math.PI * e) * 0.08;
    const handQ = camera.quaternion.clone().multiply(tmp.qs);
    mesh.quaternion.slerpQuaternions(shelfQ, handQ, e);
    mesh.scale.setScalar(SHELF_SCALE + (HAND_SCALE - SHELF_SCALE) * e);

    if (p) {
      p.active = e > 0.02;
      p.pos.copy(mesh.position);
      p.quat.copy(mesh.quaternion);
      p.scale = mesh.scale.x;
      p.stamp = time;
    }

    // the hand rises into view under the pack as it arrives
    const hg = handRef.current;
    const hh = handModelRef.current;
    if (hg && hh) {
      const k = Math.min(1, Math.max(0, (e - 0.35) / 0.65));
      hg.visible = k > 0;
      const rise = (1 - k * k * (3 - 2 * k)) * 0.22;
      tmp.target.set(tmp.local.x - hh.palm.x, tmp.local.y - halfY - hh.palm.y - rise, tmp.local.z - hh.palm.z);
      camera.localToWorld(tmp.target);
      hg.position.copy(tmp.target);
      hg.quaternion.copy(camera.quaternion);
    }
  });

  return (
    <>
      {held && <mesh key={held.key} ref={packRef} geometry={packGeometry(held.visual.pack).pack} material={held.materials} castShadow receiveShadow />}
      <Hand ref={handRef} onReady={onHand} />
    </>
  );
}

/** A pack flying from the hand into the cart after "add to cart". */
export function FlyingBox({
  visual,
  poseRef,
  fallback,
  cartRef,
  duration,
  onDone,
}: {
  visual: PackVisual | undefined;
  poseRef: RefObject<HeldPose>;
  /** Shelf position to start from when no pack is in hand. */
  fallback: [number, number, number];
  cartRef: RefObject<THREE.Group | null>;
  duration: number;
  onDone: () => void;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const start = useRef<{ time: number; pos: THREE.Vector3; quat: THREE.Quaternion; scale: number } | null>(null);
  const done = useRef(false);
  const to = useMemo(() => new THREE.Vector3(), []);

  useFrame((state) => {
    const m = ref.current;
    const cart = cartRef.current;
    if (!m || !cart || done.current) return;
    if (!start.current) {
      const p = poseRef.current;
      // the pack was in hand a moment ago: start from there
      start.current =
        p && state.clock.elapsedTime - p.stamp < 0.25
          ? { time: state.clock.elapsedTime, pos: p.pos.clone(), quat: p.quat.clone(), scale: p.scale }
          : { time: state.clock.elapsedTime, pos: new THREE.Vector3(...fallback), quat: new THREE.Quaternion(), scale: SHELF_SCALE };
    }
    const s = start.current;
    const t = Math.min(1, (state.clock.elapsedTime - s.time) / duration);
    const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    cart.localToWorld(to.set(0, 0.8, -0.7));
    m.position.lerpVectors(s.pos, to, e);
    m.position.y += Math.sin(Math.PI * t) * 0.35;
    m.quaternion.copy(s.quat);
    m.rotateY(t * Math.PI * 1.5);
    m.rotateX(t * Math.PI * 0.5);
    m.scale.setScalar(s.scale + (SHELF_SCALE * 0.8 - s.scale) * e);
    if (t >= 1) {
      done.current = true;
      onDone();
    }
  });

  if (!visual) return null;
  return <mesh ref={ref} geometry={packGeometry(visual.pack).pack} material={visual.materials} visible castShadow />;
}
