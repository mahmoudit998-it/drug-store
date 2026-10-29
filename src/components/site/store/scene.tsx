"use client";

import { Canvas } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
import { SLOTS, slotWorld } from "./layout";
import { productFace } from "./textures";
import { CompanyBay, FlyingBox, type HoverHandler } from "./bay";
import { ShoppingCart } from "./cart-model";
import { Warehouse } from "./environment";
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
  labels: { storeName: string; checkout: string };
  price: (value: number) => string;
};

const FOG = "#edf3ef";

export default function StoreScene(props: SceneProps) {
  return (
    <Canvas dpr={[1, 1.5]} gl={{ antialias: true, powerPreference: "high-performance" }} camera={{ fov: 52, near: 0.05, far: 60, position: [0, 1.6, 4] }} aria-hidden>
      <World {...props} />
    </Canvas>
  );
}

function World({ shelves, rtl, progress, selected, onPick, onHover, flights, onFlightDone, basket, reducedMotion, labels, price }: SceneProps) {
  const cartRef = useRef<THREE.Group>(null);

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

      <CameraRig bays={shelves.length} rtl={rtl} progress={progress} cartRef={cartRef} reducedMotion={reducedMotion} />
    </>
  );
}
