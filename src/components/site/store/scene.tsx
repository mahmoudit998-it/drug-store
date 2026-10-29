"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import * as THREE from "three";
import {
  BOX,
  SHELF_D,
  SHELF_H,
  SHELF_W,
  SLOTS,
  COLS,
  ROWS,
  boardYs,
  checkoutX,
  fitDistance,
  poseFor,
  priceStripY,
  shelfX,
  slotPosition,
  stopCount,
  type Vec3,
} from "./layout";
import { floorTiles, priceStrip, productFace, shelfSign, softShadow, textSign } from "./textures";
import type { Flight, StoreShelf } from "./types";

export type Pick = { shelf: number; slot: number };

export type SceneProps = {
  shelves: StoreShelf[];
  rtl: boolean;
  /** Eased stop position, written by the page on scroll and read every frame. */
  progress: RefObject<number>;
  selected: Pick | null;
  onPick: (pick: Pick) => void;
  flights: Flight[];
  onFlightDone: (key: number) => void;
  /** Brand colours of the items in the cart, one per box shown in the basket. */
  basket: string[];
  reducedMotion: boolean;
  labels: { storeName: string; checkout: string };
  price: (value: number) => string;
};

const BRAND = "#0b5d34";
const WALL = "#e9f3ee";

export default function StoreScene(props: SceneProps) {
  return (
    <Canvas
      dpr={[1, 1.75]}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      camera={{ fov: 45, near: 0.1, far: 60, position: [0, 2.5, 9] }}
      aria-hidden
    >
      <World {...props} />
    </Canvas>
  );
}

function World({ shelves, rtl, progress, selected, onPick, flights, onFlightDone, basket, reducedMotion, labels, price }: SceneProps) {
  const dir = rtl ? -1 : 1;
  const n = shelves.length;
  const cartRef = useRef<THREE.Group>(null);

  // One face texture per product on a shelf, shared by the shelf box and its flying copy.
  const faces = useMemo(
    () => shelves.map((s) => s.products.slice(0, SLOTS).map((p) => productFace(p.image_url, s.brand_color))),
    [shelves]
  );
  useEffect(() => () => faces.flat().forEach((t) => t.dispose()), [faces]);

  return (
    <>
      <color attach="background" args={[WALL]} />
      <fog attach="fog" args={[WALL, 16, 34]} />
      <hemisphereLight args={["#ffffff", "#d7e6dd", 1.5]} />
      <directionalLight position={[4, 9, 7]} intensity={1.6} />
      <directionalLight position={[-6, 4, 5]} intensity={0.45} />

      <Room shelves={n} dir={dir} storeName={labels.storeName} checkout={labels.checkout} />

      {shelves.map((s, i) => (
        <ShelfUnit key={s.id} shelf={s} index={i} dir={dir} rtl={rtl} price={price} />
      ))}

      {shelves.map((s, i) =>
        s.products.slice(0, SLOTS).map((p, slot) => (
          <ProductBox
            key={p.id}
            position={slotPosition(i, slot, dir)}
            color={s.brand_color}
            face={faces[i][slot]}
            inStock={p.in_stock}
            selected={selected?.shelf === i && selected.slot === slot}
            onPick={() => onPick({ shelf: i, slot })}
          />
        ))
      )}

      <Cart ref={cartRef} dir={dir} basket={basket.slice(0, Math.max(0, basket.length - flights.length))} />

      {flights.map((f) => (
        <FlyingBox
          key={f.key}
          from={slotPosition(f.shelf, f.slot, dir)}
          face={faces[f.shelf]?.[f.slot]}
          color={shelves[f.shelf]?.brand_color ?? BRAND}
          cartRef={cartRef}
          duration={reducedMotion ? 0.01 : 0.9}
          onDone={() => onFlightDone(f.key)}
        />
      ))}

      <Rig stops={stopCount(n)} shelves={n} dir={dir} progress={progress} cartRef={cartRef} reducedMotion={reducedMotion} />
    </>
  );
}

/* ---------- camera + cart movement ---------- */

const tmpA = new THREE.Vector3();
const tmpB = new THREE.Vector3();

function Rig({
  stops,
  shelves,
  dir,
  progress,
  cartRef,
  reducedMotion,
}: {
  stops: number;
  shelves: number;
  dir: number;
  progress: RefObject<number>;
  cartRef: RefObject<THREE.Group | null>;
  reducedMotion: boolean;
}) {
  const look = useRef(new THREE.Vector3());
  const camTarget = useRef(new THREE.Vector3());
  const lookTarget = useRef(new THREE.Vector3());
  const cartTarget = useRef(new THREE.Vector3());
  const started = useRef(false);

  useFrame((state, delta) => {
    const camera = state.camera as THREE.PerspectiveCamera;
    const aspect = state.size.width / Math.max(1, state.size.height);
    const fov = aspect < 1 ? 58 : 45;
    if (camera.fov !== fov) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
    const dist = fitDistance(aspect, fov);

    const pos = progress.current ?? 0;
    const k = Math.floor(pos);
    const t = pos - k;
    const a = poseFor(k, shelves, dir, dist, aspect >= 1);
    const b = poseFor(Math.min(k + 1, stops - 1), shelves, dir, dist, aspect >= 1);

    camTarget.current.lerpVectors(tmpA.fromArray(a.cam), tmpB.fromArray(b.cam), t);
    lookTarget.current.lerpVectors(tmpA.fromArray(a.look), tmpB.fromArray(b.look), t);
    cartTarget.current.lerpVectors(tmpA.fromArray(a.cart), tmpB.fromArray(b.cart), t);

    // While travelling, glance down the aisle and step back a little, like walking with a cart.
    const travel = Math.sin(Math.PI * t);
    lookTarget.current.x += dir * travel * 1.6;
    lookTarget.current.z += travel * 0.7;
    camTarget.current.z += travel * 0.5;

    const s = started.current ? 1 - Math.exp(-delta * (reducedMotion ? 30 : 4.5)) : 1;
    started.current = true;
    camera.position.lerp(camTarget.current, s);
    look.current.lerp(lookTarget.current, s);
    camera.lookAt(look.current);

    const cart = cartRef.current;
    if (cart) {
      const prevX = cart.position.x;
      cart.position.lerp(cartTarget.current, s);
      const moved = (cart.position.x - prevX) * dir;
      cart.userData.spin = (cart.userData.spin ?? 0) - moved / 0.08;
      cart.position.y = Math.abs(moved) > 0.002 ? Math.abs(Math.sin(cart.userData.spin * 0.5)) * 0.01 : 0;
    }
  });

  return null;
}

/* ---------- room ---------- */

function Room({ shelves, dir, storeName, checkout }: { shelves: number; dir: number; storeName: string; checkout: string }) {
  const start = shelfX(0, dir) - dir * 12;
  const end = checkoutX(shelves, dir) + dir * 12;
  const length = Math.abs(end - start);
  const midX = (start + end) / 2;
  const entranceX = shelfX(0, dir) - dir * 2.9;
  const cx = checkoutX(shelves, dir);

  const floor = useMemo(() => floorTiles(), []);
  const nameSign = useMemo(() => textSign(storeName, "#ffffff", BRAND, 1024, 200, 92), [storeName]);
  const checkoutSign = useMemo(() => textSign(checkout, BRAND, "#ffffff", 1024, 200, 100), [checkout]);
  useEffect(() => {
    floor.repeat.set(length / 1.2, 30 / 1.2);
    return () => {
      floor.dispose();
    };
  }, [floor, length]);
  useEffect(() => () => nameSign.dispose(), [nameSign]);
  useEffect(() => () => checkoutSign.dispose(), [checkoutSign]);

  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[midX, 0, 10]}>
        <planeGeometry args={[length, 30]} />
        <meshStandardMaterial map={floor} roughness={0.85} />
      </mesh>
      <mesh position={[midX, 2.6, -SHELF_D / 2 - 0.08]}>
        <planeGeometry args={[length, 5.2]} />
        <meshStandardMaterial color={WALL} roughness={1} />
      </mesh>
      {/* skirting and brand stripe along the wall */}
      <mesh position={[midX, 0.06, -SHELF_D / 2 - 0.06]}>
        <boxGeometry args={[length, 0.12, 0.04]} />
        <meshStandardMaterial color="#d3e3d9" />
      </mesh>
      <mesh position={[midX, 3.55, -SHELF_D / 2 - 0.06]}>
        <boxGeometry args={[length, 0.1, 0.03]} />
        <meshStandardMaterial color={BRAND} />
      </mesh>

      {/* entrance: pharmacy cross and store name */}
      <group position={[entranceX, 0, -SHELF_D / 2 - 0.02]}>
        <mesh position={[0, 2.95, 0]}>
          <planeGeometry args={[3.4, 0.66]} />
          <meshStandardMaterial map={nameSign} />
        </mesh>
        <mesh position={[0, 1.75, 0.04]}>
          <boxGeometry args={[0.9, 0.9, 0.06]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
        <mesh position={[0, 1.75, 0.09]}>
          <boxGeometry args={[0.62, 0.2, 0.06]} />
          <meshStandardMaterial color="#12a05c" emissive="#12a05c" emissiveIntensity={0.6} />
        </mesh>
        <mesh position={[0, 1.75, 0.09]}>
          <boxGeometry args={[0.2, 0.62, 0.06]} />
          <meshStandardMaterial color="#12a05c" emissive="#12a05c" emissiveIntensity={0.6} />
        </mesh>
        {/* a small plant beside the entrance */}
        <mesh position={[dir * -1.3, 0.3, 0.5]}>
          <cylinderGeometry args={[0.22, 0.17, 0.6, 24]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
        <mesh position={[dir * -1.3, 0.92, 0.5]}>
          <sphereGeometry args={[0.42, 24, 16]} />
          <meshStandardMaterial color="#3f9d6b" roughness={0.9} />
        </mesh>
      </group>

      {/* checkout counter */}
      <group position={[cx, 0, 0]}>
        <mesh position={[0, 3.0, -SHELF_D / 2 - 0.02]}>
          <planeGeometry args={[3.0, 0.6]} />
          <meshStandardMaterial map={checkoutSign} />
        </mesh>
        <mesh position={[0, 0.5, 0.1]}>
          <boxGeometry args={[2.8, 1.0, 0.9]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
        <mesh position={[0, 1.03, 0.1]}>
          <boxGeometry args={[2.9, 0.06, 1.0]} />
          <meshStandardMaterial color={BRAND} />
        </mesh>
        <mesh position={[0, 0.5, 0.56]}>
          <boxGeometry args={[2.4, 0.12, 0.02]} />
          <meshStandardMaterial color="#12a05c" />
        </mesh>
        {/* card terminal */}
        <mesh position={[dir * 0.7, 1.12, 0.2]} rotation-x={-0.5}>
          <boxGeometry args={[0.32, 0.06, 0.42]} />
          <meshStandardMaterial color="#23312a" />
        </mesh>
        <mesh position={[dir * -0.5, 1.28, -0.05]}>
          <boxGeometry args={[0.6, 0.4, 0.04]} />
          <meshStandardMaterial color="#23312a" />
        </mesh>
      </group>
    </group>
  );
}

/* ---------- shelf unit ---------- */

function ShelfUnit({ shelf, index, dir, rtl, price }: { shelf: StoreShelf; index: number; dir: number; rtl: boolean; price: (v: number) => string }) {
  const x = shelfX(index, dir);
  const name = rtl ? shelf.name_ar || shelf.name_en : shelf.name_en;
  const sign = useMemo(() => shelfSign(name, shelf.logo_url, shelf.brand_color, rtl), [name, shelf.logo_url, shelf.brand_color, rtl]);
  const strips = useMemo(
    () =>
      Array.from({ length: ROWS }, (_, row) =>
        priceStrip(
          Array.from({ length: COLS }, (_, col) => {
            const p = shelf.products[row * COLS + col];
            return p ? price(p.price) : null;
          }),
          COLS,
          rtl
        )
      ),
    [shelf.products, price, rtl]
  );
  useEffect(() => () => sign.dispose(), [sign]);
  useEffect(() => () => strips.forEach((s) => s.dispose()), [strips]);

  return (
    <group position={[x, 0, 0]}>
      {/* back and sides */}
      <mesh position={[0, SHELF_H / 2, -SHELF_D / 2 + 0.02]}>
        <boxGeometry args={[SHELF_W, SHELF_H, 0.04]} />
        <meshStandardMaterial color="#fbfdfc" />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[(side * SHELF_W) / 2, SHELF_H / 2, 0]}>
          <boxGeometry args={[0.07, SHELF_H, SHELF_D]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
      ))}
      {/* coloured accent strip on the back panel */}
      <mesh position={[0, SHELF_H / 2, -SHELF_D / 2 + 0.045]}>
        <planeGeometry args={[SHELF_W - 0.1, SHELF_H - 0.4]} />
        <meshStandardMaterial color={shelf.brand_color} transparent opacity={0.08} />
      </mesh>
      {/* base */}
      <mesh position={[0, 0.17, 0]}>
        <boxGeometry args={[SHELF_W, 0.34, SHELF_D]} />
        <meshStandardMaterial color={shelf.brand_color} />
      </mesh>
      {/* boards */}
      {boardYs().map((y) => (
        <mesh key={y} position={[0, y - 0.025, 0]}>
          <boxGeometry args={[SHELF_W - 0.06, 0.05, SHELF_D]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
      ))}
      {/* price labels on the board edges */}
      {strips.map((tex, row) => (
        <mesh key={row} position={[0, priceStripY(row), SHELF_D / 2 + 0.005]}>
          <planeGeometry args={[SHELF_W - 0.1, 0.1]} />
          <meshBasicMaterial map={tex} toneMapped={false} />
        </mesh>
      ))}
      {/* company sign */}
      <mesh position={[0, SHELF_H + 0.25, 0.05]}>
        <boxGeometry args={[SHELF_W + 0.08, 0.54, 0.1]} />
        <meshStandardMaterial color={shelf.brand_color} />
      </mesh>
      <mesh position={[0, SHELF_H + 0.25, 0.101]}>
        {/* sign texture is 1024x160, so keep the same 6.4:1 ratio */}
        <planeGeometry args={[SHELF_W, SHELF_W / 6.4]} />
        <meshBasicMaterial map={sign} toneMapped={false} />
      </mesh>
    </group>
  );
}

/* ---------- product box ---------- */

function ProductBox({
  position,
  color,
  face,
  inStock,
  selected,
  onPick,
}: {
  position: Vec3;
  color: string;
  face: THREE.Texture;
  inStock: boolean;
  selected: boolean;
  onPick: () => void;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const side = useMemo(() => new THREE.Color(color).lerp(new THREE.Color("#ffffff"), 0.35), [color]);

  useEffect(() => {
    if (!hovered) return;
    document.body.style.cursor = "pointer";
    return () => {
      document.body.style.cursor = "";
    };
  }, [hovered]);

  useFrame((state, delta) => {
    const m = ref.current;
    if (!m) return;
    const s = 1 - Math.exp(-delta * 10);
    const z = position[2] + (selected ? 0.42 : hovered ? 0.12 : 0);
    const y = position[1] + (selected ? 0.06 + Math.sin(state.clock.elapsedTime * 2.4) * 0.025 : 0);
    m.position.z += (z - m.position.z) * s;
    m.position.y += (y - m.position.y) * s;
    const scale = selected ? 1.12 : hovered ? 1.04 : 1;
    m.scale.setScalar(m.scale.x + (scale - m.scale.x) * s);
    m.rotation.y += ((selected ? Math.sin(state.clock.elapsedTime * 1.2) * 0.18 : 0) - m.rotation.y) * s;
  });

  const tint = inStock ? "#ffffff" : "#b9c2bd";
  return (
    <mesh
      ref={ref}
      position={position}
      onClick={(e) => {
        e.stopPropagation();
        onPick();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={() => setHovered(false)}
    >
      <boxGeometry args={[BOX.w, BOX.h, BOX.d]} />
      <meshStandardMaterial attach="material-0" color={side} />
      <meshStandardMaterial attach="material-1" color={side} />
      <meshStandardMaterial attach="material-2" color={side} />
      <meshStandardMaterial attach="material-3" color={side} />
      <meshStandardMaterial attach="material-4" map={face} color={tint} roughness={0.6} emissive={selected ? "#ffffff" : "#000000"} emissiveIntensity={selected ? 0.08 : 0} />
      <meshStandardMaterial attach="material-5" color={side} />
    </mesh>
  );
}

function FlyingBox({
  from,
  face,
  color,
  cartRef,
  duration,
  onDone,
}: {
  from: Vec3;
  face: THREE.Texture | undefined;
  color: string;
  cartRef: RefObject<THREE.Group | null>;
  duration: number;
  onDone: () => void;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const start = useRef<number | null>(null);
  const done = useRef(false);
  const origin = useMemo(() => new THREE.Vector3(from[0], from[1], from[2] + 0.42), [from]);
  const to = useMemo(() => new THREE.Vector3(), []);

  useFrame((state) => {
    const m = ref.current;
    const cart = cartRef.current;
    if (!m || !cart || done.current) return;
    if (start.current === null) start.current = state.clock.elapsedTime;
    const t = Math.min(1, (state.clock.elapsedTime - start.current) / duration);
    const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    cart.localToWorld(to.set(0, 0.85, 0));
    m.position.lerpVectors(origin, to, e);
    m.position.y += Math.sin(Math.PI * t) * 0.6;
    m.rotation.set(t * Math.PI * 0.6, t * Math.PI * 2, 0);
    m.scale.setScalar(1.1 - 0.75 * e);
    if (t >= 1) {
      done.current = true;
      onDone();
    }
  });

  return (
    <mesh ref={ref} position={origin}>
      <boxGeometry args={[BOX.w, BOX.h, BOX.d]} />
      <meshStandardMaterial attach="material-0" color={color} />
      <meshStandardMaterial attach="material-1" color={color} />
      <meshStandardMaterial attach="material-2" color={color} />
      <meshStandardMaterial attach="material-3" color={color} />
      <meshStandardMaterial attach="material-4" map={face ?? null} />
      <meshStandardMaterial attach="material-5" color={color} />
    </mesh>
  );
}

/* ---------- shopping cart ---------- */

const CHROME = "#c7d1cc";

function Cart({ ref, dir, basket }: { ref: RefObject<THREE.Group | null>; dir: number; basket: string[] }) {
  const wheels = useRef<THREE.Group>(null);
  const shadow = useMemo(() => softShadow(), []);
  useEffect(() => () => shadow.dispose(), [shadow]);

  useFrame(() => {
    const spin = ref.current?.userData.spin ?? 0;
    wheels.current?.children.forEach((w) => (w.rotation.z = spin));
  });

  // Basket interior: 4 x 2 boxes per layer, stacked.
  const items = basket.slice(0, 16).map((color, i) => {
    const layer = Math.floor(i / 8);
    const j = i % 8;
    return { color, pos: [-0.3 + (j % 4) * 0.2, 0.66 + layer * 0.17, -0.11 + Math.floor(j / 4) * 0.22] as Vec3, rot: ((i * 37) % 10) / 40 };
  });

  return (
    <group ref={ref} rotation-y={dir > 0 ? 0 : Math.PI}>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.005, 0]}>
        <planeGeometry args={[1.5, 0.95]} />
        <meshBasicMaterial map={shadow} transparent depthWrite={false} />
      </mesh>

      {/* basket: open-top box in brand green */}
      <group position={[0, 0.78, 0]}>
        <mesh position={[0, -0.2, 0]}>
          <boxGeometry args={[0.92, 0.03, 0.56]} />
          <meshStandardMaterial color={BRAND} />
        </mesh>
        {[
          { p: [0, 0, 0.28], s: [0.92, 0.42, 0.03] },
          { p: [0, 0, -0.28], s: [0.92, 0.42, 0.03] },
          { p: [0.46, 0, 0], s: [0.03, 0.42, 0.56] },
          { p: [-0.46, 0, 0], s: [0.03, 0.42, 0.56] },
        ].map((w, i) => (
          <mesh key={i} position={w.p as Vec3}>
            <boxGeometry args={w.s as Vec3} />
            <meshStandardMaterial color="#12a05c" transparent opacity={0.55} roughness={0.4} />
          </mesh>
        ))}
        {/* rim */}
        {[
          { p: [0, 0.22, 0.28], s: [0.96, 0.03, 0.04] },
          { p: [0, 0.22, -0.28], s: [0.96, 0.03, 0.04] },
          { p: [0.47, 0.22, 0], s: [0.04, 0.03, 0.6] },
          { p: [-0.47, 0.22, 0], s: [0.04, 0.03, 0.6] },
        ].map((w, i) => (
          <mesh key={i} position={w.p as Vec3}>
            <boxGeometry args={w.s as Vec3} />
            <meshStandardMaterial color={CHROME} metalness={0.6} roughness={0.3} />
          </mesh>
        ))}
      </group>

      {items.map((it, i) => (
        <mesh key={i} position={it.pos} rotation-y={it.rot}>
          <boxGeometry args={[0.17, 0.15, 0.19]} />
          <meshStandardMaterial color={it.color} />
        </mesh>
      ))}

      {/* handle at the back */}
      {[-0.22, 0.22].map((z) => (
        <mesh key={z} position={[-0.56, 1.02, z]} rotation-z={0.35}>
          <cylinderGeometry args={[0.015, 0.015, 0.36, 10]} />
          <meshStandardMaterial color={CHROME} metalness={0.6} roughness={0.3} />
        </mesh>
      ))}
      <mesh position={[-0.62, 1.18, 0]} rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[0.03, 0.03, 0.56, 14]} />
        <meshStandardMaterial color={BRAND} roughness={0.5} />
      </mesh>

      {/* chassis */}
      {[-0.2, 0.2].map((z) => (
        <mesh key={z} position={[0, 0.2, z]}>
          <boxGeometry args={[0.9, 0.025, 0.025]} />
          <meshStandardMaterial color={CHROME} metalness={0.6} roughness={0.3} />
        </mesh>
      ))}
      {[
        [0.38, 0.2],
        [-0.38, 0.2],
        [0.38, -0.2],
        [-0.38, -0.2],
      ].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.4, z]}>
          <cylinderGeometry args={[0.012, 0.012, 0.4, 8]} />
          <meshStandardMaterial color={CHROME} metalness={0.6} roughness={0.3} />
        </mesh>
      ))}
      <group ref={wheels}>
        {[
          [0.38, 0.22],
          [-0.38, 0.22],
          [0.38, -0.22],
          [-0.38, -0.22],
        ].map(([x, z], i) => (
          <group key={i} position={[x, 0.08, z]}>
            <mesh rotation-x={Math.PI / 2}>
              <cylinderGeometry args={[0.08, 0.08, 0.05, 20]} />
              <meshStandardMaterial color="#23312a" roughness={0.8} />
            </mesh>
            <mesh rotation-x={Math.PI / 2} position={[0.03, 0, 0]}>
              <boxGeometry args={[0.02, 0.07, 0.02]} />
              <meshStandardMaterial color="#e8eeeb" />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  );
}
