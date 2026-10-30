"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { SLOTS, checkoutZ, slotWorld, stopCount } from "./layout";
import { Pharmacist } from "./character";
import { productFace } from "./textures";
import { CompanyBay, FlyingBox, type HoverHandler } from "./bay";
import { ShoppingCart } from "./cart-model";
import { Warehouse } from "./environment";
import { CameraRig } from "./rig";
import { Shopper } from "./shopper";
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
  labels: { storeName: string; checkout: string };
  price: (value: number) => string;
};

const FOG = "#edf3ef";

export default function StoreScene(props: SceneProps) {
  return (
    <Canvas dpr={[1, 2]} gl={{ antialias: true, powerPreference: "high-performance" }} camera={{ fov: 52, near: 0.05, far: 60, position: [0, 1.6, 4] }} aria-hidden>
      <AdaptiveResolution />
      <StudioLighting />
      <World {...props} />
    </Canvas>
  );
}

/**
 * Starts at the screen's full sharpness (up to 2x) and steps the render resolution down
 * if the device can't keep a smooth frame rate, then back up once it recovers.
 */
function AdaptiveResolution() {
  const setDpr = useThree((s) => s.setDpr);
  const levels = useMemo(() => {
    const max = Math.min(2, window.devicePixelRatio || 1);
    return [...new Set([max, Math.max(1, max * 0.8), Math.max(1, max * 0.65), 1])];
  }, []);
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
    if (fps < 48 && s.level < levels.length - 1) {
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

/** Soft image-based lighting from a generated room, computed once; gives materials realistic sheen. */
function StudioLighting() {
  const get = useThree((s) => s.get);
  useEffect(() => {
    const { gl, scene } = get();
    const pmrem = new THREE.PMREMGenerator(gl);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    scene.environmentIntensity = 0.55;
    pmrem.dispose();
    return () => {
      scene.environment = null;
      env.dispose();
    };
  }, [get]);
  return null;
}

function World({ shelves, rtl, progress, selected, onPick, onHover, flights, onFlightDone, basket, reducedMotion, labels, price }: SceneProps) {
  const cartRef = useRef<THREE.Group>(null);
  const shopperRef = useRef<THREE.Group>(null);

  // One face texture per product, shared by its shelf box and any flying copy.
  const faces = useMemo(
    () => shelves.map((s) => s.products.slice(0, SLOTS).map((p) => productFace(p.image_url, s.brand_color))),
    [shelves]
  );
  useEffect(() => () => faces.flat().forEach((t) => t.dispose()), [faces]);

  const hoverHandlers = useMemo<HoverHandler[]>(
    () => shelves.map((_, i) => (slot, x, y) => onHover(slot === null ? null : { shelf: i, slot }, x, y)),
    [shelves, onHover]
  );

  return (
    <>
      <color attach="background" args={[FOG]} />
      <fog attach="fog" args={[FOG, 12, 34]} />

      <Warehouse bays={shelves.length} rtl={rtl} storeName={labels.storeName} checkout={labels.checkout} />

      {shelves.map((s, i) => (
        <CompanyBay
          key={s.id}
          shelf={s}
          index={i}
          rtl={rtl}
          faces={faces[i]}
          price={price}
          selectedSlot={selected?.shelf === i ? selected.slot : null}
          onPick={(slot) => onPick({ shelf: i, slot })}
          onHover={hoverHandlers[i]}
        />
      ))}

      <Shopper ref={shopperRef} />
      <ShoppingCart ref={cartRef} items={basket.slice(0, Math.max(0, basket.length - flights.length))} />

      {flights.map((f) => (
        <FlyingBox
          key={f.key}
          from={slotWorld(f.shelf, f.slot, rtl, shelves[f.shelf]?.products.length ?? 0)}
          face={faces[f.shelf]?.[f.slot]}
          color={shelves[f.shelf]?.brand_color ?? "#0b5d34"}
          cartRef={cartRef}
          duration={reducedMotion ? 0.01 : 0.85}
          onDone={() => onFlightDone(f.key)}
        />
      ))}

      <Pharmacist position={[-0.05, 0, checkoutZ(shelves.length) - 0.8]} progress={progress} arriveAt={stopCount(shelves.length) - 1.15} reducedMotion={reducedMotion} />

      <CameraRig bays={shelves.length} rtl={rtl} progress={progress} cartRef={cartRef} shopperRef={shopperRef} reducedMotion={reducedMotion} />
    </>
  );
}
