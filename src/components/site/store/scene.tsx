"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { SLOTS, checkoutZ, slotWorld, stopCount } from "./layout";
import { Pharmacist } from "./character";
import { CompanyBay, type HoverHandler, type PackVisual } from "./bay";
import { ShoppingCart } from "./cart-model";
import { KeyLight, Warehouse } from "./environment";
import { FlyingBox, HeldPack, newHeldPose, type HeldPose, type Spin } from "./inspect";
import { shelfPackMaterials, type PackLabels } from "./pack-faces";
import { packFor } from "./packs";
import { CameraRig } from "./rig";
import type { Flight, Pick, StoreShelf } from "./types";

export type SceneProps = {
  shelves: StoreShelf[];
  rtl: boolean;
  /** Eased stop position, written by the page on scroll and read every frame. */
  progress: RefObject<number>;
  selected: Pick | null;
  onPick: (pick: Pick) => void;
  onHover: (pick: Pick | null, x?: number, y?: number) => void;
  flights: Flight[];
  onFlightDone: (key: number) => void;
  /** Brand colours of the packs in the cart, one per box shown in the basket. */
  basket: string[];
  reducedMotion: boolean;
  labels: { storeName: string; checkout: string; pack: PackLabels };
  price: (value: number) => string;
  /** Drag rotation of the pack in hand. */
  spinRef: RefObject<Spin>;
};

const FOG = "#0c0b0a";

const isMobile = () => window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 768;

export default function StoreScene(props: SceneProps) {
  const [mobile] = useState(isMobile);
  return (
    // Tuned for smoothness over sheen: no post-processing passes, a capped resolution,
    // and real-time shadows only on larger screens.
    <Canvas
      shadows={mobile ? false : { type: THREE.PCFShadowMap }}
      dpr={1}
      gl={{ antialias: true, powerPreference: "high-performance", stencil: false }}
      camera={{ fov: 52, near: 0.05, far: 60, position: [0, 1.6, 4] }}
      aria-hidden
    >
      <AdaptiveResolution mobile={mobile} />
      <StudioLighting />
      <World {...props} mobile={mobile} />
    </Canvas>
  );
}

/**
 * Starts at a capped sharpness (1.5x, or 1.25x on phones) and steps the render resolution down
 * if the device can't keep a smooth frame rate, then back up once it recovers.
 */
function AdaptiveResolution({ mobile }: { mobile: boolean }) {
  const setDpr = useThree((s) => s.setDpr);
  const levels = useMemo(() => {
    const max = Math.min(mobile ? 1.25 : 1.5, window.devicePixelRatio || 1);
    return [...new Set([max, Math.max(1, max * 0.8), 1, 0.85])];
  }, [mobile]);
  const st = useRef({ level: 0, frames: 0, time: 0, good: 0, raises: 0 });

  useEffect(() => setDpr(levels[0]), [setDpr, levels]);

  useFrame((_, delta) => {
    const s = st.current;
    if (delta > 0.25) return; // tab was hidden or the page stalled; not a real frame time
    s.frames++;
    s.time += delta;
    if (s.time < 1) return;
    const fps = s.frames / s.time;
    s.frames = 0;
    s.time = 0;
    if (fps < 50 && s.level < levels.length - 1) {
      setDpr(levels[++s.level]);
      s.good = 0;
    } else if (fps > 58 && s.level > 0 && s.raises < 2) {
      // only a couple of raises, so a borderline device doesn't keep flipping
      if (++s.good >= 4) {
        setDpr(levels[--s.level]);
        s.good = 0;
        s.raises++;
      }
    } else s.good = 0;
  });
  return null;
}

/** Soft image-based reflections from a generated room, kept low so the store stays moody. */
function StudioLighting() {
  const get = useThree((s) => s.get);
  useEffect(() => {
    const { gl, scene } = get();
    const pmrem = new THREE.PMREMGenerator(gl);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    scene.environmentIntensity = 0.22;
    pmrem.dispose();
    return () => {
      scene.environment = null;
      env.dispose();
    };
  }, [get]);
  return null;
}

function World({ shelves, rtl, progress, selected, onPick, onHover, flights, onFlightDone, basket, reducedMotion, labels, price, spinRef, mobile }: SceneProps & { mobile: boolean }) {
  const cartRef = useRef<THREE.Group>(null);
  const taken = useRef<Pick | null>(null);
  const pose = useRef<HeldPose>(newHeldPose());

  // One pack shape and face set per product, shared by its shelf facings, the hand and the cart flight.
  const built = useMemo(
    () =>
      shelves.map((s) =>
        s.products.slice(0, SLOTS).map((p) => {
          const pack = packFor(p);
          return { pack, ...shelfPackMaterials(p, s, pack, rtl) };
        })
      ),
    [shelves, rtl]
  );
  useEffect(() => () => built.flat().forEach((b) => b.dispose()), [built]);
  const visuals = useMemo<PackVisual[][]>(() => built.map((row) => row.map((b) => ({ pack: b.pack, materials: b.materials }))), [built]);

  const hoverHandlers = useMemo<HoverHandler[]>(
    () => shelves.map((_, i) => (slot, x, y) => onHover(slot === null ? null : { shelf: i, slot }, x, y)),
    [shelves, onHover]
  );

  return (
    <>
      <color attach="background" args={[FOG]} />
      <fog attach="fog" args={[FOG, 9, 28]} />

      <Warehouse bays={shelves.length} rtl={rtl} storeName={labels.storeName} checkout={labels.checkout} />
      <KeyLight bays={shelves.length} rtl={rtl} progress={progress} mobile={mobile} />

      {shelves.map((s, i) => (
        <CompanyBay
          key={s.id}
          shelf={s}
          index={i}
          rtl={rtl}
          visuals={visuals[i]}
          price={price}
          takenRef={taken}
          onPick={(slot) => onPick({ shelf: i, slot })}
          onHover={hoverHandlers[i]}
        />
      ))}

      <ShoppingCart ref={cartRef} items={basket.slice(0, Math.max(0, basket.length - flights.length))} />

      <HeldPack
        selected={selected}
        shelves={shelves}
        rtl={rtl}
        visuals={visuals}
        labels={labels.pack}
        spinRef={spinRef}
        takenRef={taken}
        poseRef={pose}
        flights={flights}
        reducedMotion={reducedMotion}
      />

      {flights.map((f) => (
        <FlyingBox
          key={f.key}
          visual={visuals[f.shelf]?.[f.slot]}
          poseRef={pose}
          fallback={slotWorld(f.shelf, f.slot, rtl, shelves[f.shelf]?.products.length ?? 0)}
          cartRef={cartRef}
          duration={reducedMotion ? 0.01 : 0.85}
          onDone={() => onFlightDone(f.key)}
        />
      ))}

      <Pharmacist position={[-0.05, 0, checkoutZ(shelves.length) - 0.8]} progress={progress} arriveAt={stopCount(shelves.length) - 1.15} reducedMotion={reducedMotion} />

      <CameraRig bays={shelves.length} rtl={rtl} progress={progress} cartRef={cartRef} reducedMotion={reducedMotion} />

    </>
  );
}
