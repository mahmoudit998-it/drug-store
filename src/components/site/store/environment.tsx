"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
import { AISLE_HALF, BOX, GONDOLA, ROWS, ROW_Y, SLOTS, TOP_BOARD, checkoutZ, gondolaFrame, sideOf, slotLocal, zoneZ } from "./layout";
import { baseShadow, floorTiles, pegboard, softShadow, textSign } from "./textures";

const BRAND = "#0b5d34";
const WALL = "#1b1917";
const METAL = "#1f1f22";
const BOARD = "#8d8780";
const LED = "#fff0d8";
const WALL_X = AISLE_HALF + GONDOLA.d + 0.35;
const CEILING = 4.4;

/** Frees a GPU resource when it is replaced or the component unmounts. */
function useDispose(value: { dispose: () => void }) {
  useEffect(() => () => value.dispose(), [value]);
}

/**
 * Shelf unit shared by company bays and stock gondolas (front faces local +Z): black metal
 * uprights, a perforated back panel, light boards with a warm LED strip under each front edge.
 */
export function GondolaFrame({ accent }: { accent?: string }) {
  const { len, h, d } = GONDOLA;
  const peg = useMemo(() => {
    const t = pegboard().clone();
    t.repeat.set(len / 0.24, h / 0.24);
    t.needsUpdate = true;
    return t;
  }, [len, h]);
  useDispose(peg);
  const boards = [...ROW_Y.slice(0, ROWS - 1), TOP_BOARD];
  return (
    <group>
      <mesh position={[0, h / 2, -d / 2 + 0.03]} receiveShadow>
        <boxGeometry args={[len, h, 0.04]} />
        <meshStandardMaterial map={peg} color="#ffffff" roughness={0.75} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[(s * len) / 2, h / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.05, h, d]} />
          <meshStandardMaterial color={METAL} roughness={0.4} metalness={0.7} />
        </mesh>
      ))}
      {/* baked contact shadow on the floor along the front */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.003, d / 2 + 0.2]}>
        <planeGeometry args={[len + 0.3, 0.5]} />
        <meshBasicMaterial map={baseShadow()} transparent depthWrite={false} />
      </mesh>
      {/* kick plate with the brand colour */}
      <mesh position={[0, 0.17, 0.01]} receiveShadow>
        <boxGeometry args={[len - 0.04, 0.34, d - 0.02]} />
        <meshStandardMaterial color={METAL} roughness={0.5} metalness={0.5} />
      </mesh>
      {accent && (
        <mesh position={[0, 0.17, d / 2 - 0.004]}>
          <planeGeometry args={[len - 0.1, 0.05]} />
          <meshBasicMaterial color={accent} toneMapped={false} />
        </mesh>
      )}
      {boards.map((y) => (
        <group key={y} position={[0, y - 0.02, 0]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[len - 0.06, 0.035, d - 0.04]} />
            <meshStandardMaterial color={BOARD} roughness={0.55} />
          </mesh>
          {/* LED strip under the front edge, lighting the row below */}
          <mesh position={[0, -0.02, d / 2 - 0.06]} rotation-x={Math.PI / 2}>
            <planeGeometry args={[len - 0.12, 0.018]} />
            <meshBasicMaterial color={LED} toneMapped={false} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

const STOCK_COLORS = ["#f2efe9", "#d9d2c7", "#b9cbc0", "#c4cfdc", "#dcc4cb", "#e3d3b8", "#cbc3db", "#8a9a90"];

/** Generic stock gondolas facing each company bay; all their boxes share one instanced mesh. */
function StockGondolas({ bays, rtl }: { bays: number; rtl: boolean }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const frames = useMemo(() => Array.from({ length: bays }, (_, i) => gondolaFrame(zoneZ(i), -sideOf(i, rtl))), [bays, rtl]);
  const count = bays * SLOTS * 2;

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const group = new THREE.Matrix4();
    const local = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const color = new THREE.Color();
    let n = 0;
    let seed = 7;
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    frames.forEach((f) => {
      group.compose(new THREE.Vector3(...f.position), q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), f.rotationY), new THREE.Vector3(1, 1, 1));
      for (let slot = 0; slot < SLOTS; slot++) {
        if (rand() < 0.12) continue; // a few gaps, like a real shelf
        const [x, y, z] = slotLocal(slot, false, SLOTS);
        // two smaller packs per slot
        for (const dx of [-0.11, 0.11]) {
          const h = 0.24 + rand() * 0.14;
          local.compose(
            new THREE.Vector3(x + dx, y - BOX.h / 2 + h / 2, z),
            new THREE.Quaternion(),
            new THREE.Vector3(0.2, h, 0.22)
          );
          mesh.setMatrixAt(n, group.clone().multiply(local));
          mesh.setColorAt(n, color.set(STOCK_COLORS[Math.floor(rand() * STOCK_COLORS.length)]));
          n++;
        }
      }
    });
    mesh.count = n;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [frames]);

  return (
    <>
      {frames.map((f, i) => (
        <group key={i} position={f.position} rotation-y={f.rotationY}>
          <GondolaFrame />
        </group>
      ))}
      <instancedMesh ref={ref} args={[undefined, undefined, count]} castShadow receiveShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial roughness={0.45} />
      </instancedMesh>
    </>
  );
}

export function Warehouse({ bays, rtl, storeName, checkout }: { bays: number; rtl: boolean; storeName: string; checkout: string }) {
  const cz = checkoutZ(bays);
  const start = 8;
  const end = cz - 4;
  const length = start - end;
  const midZ = (start + end) / 2;
  const width = WALL_X * 2;

  const floor = useMemo(() => floorTiles(), []);
  const shadow = useMemo(() => softShadow(), []);
  const nameSign = useMemo(() => textSign(storeName, BRAND, "#ffffff", 1024, 160, 84), [storeName]);
  const checkoutSign = useMemo(() => textSign(checkout, "#101312", "#ffffff", 1024, 220, 110), [checkout]);
  const backSign = useMemo(() => textSign(storeName, "#101312", "#e9f5ee", 1024, 200, 92), [storeName]);
  useDispose(floor);
  useDispose(shadow);
  useDispose(nameSign);
  useDispose(checkoutSign);
  useDispose(backSign);
  useEffect(() => {
    floor.repeat.set(width / 2.4, length / 2.4);
  }, [floor, width, length]);

  return (
    <group>
      {/* dim fill: the store is lit by pools of warm light, not flat daylight */}
      <hemisphereLight args={["#ffe6c7", "#17110c", 0.32]} />
      {Array.from({ length: bays }, (_, i) => {
        const side = sideOf(i, rtl);
        return <BayLight key={i} position={[-side * 0.4, CEILING - 0.15, zoneZ(i) + 0.6]} target={[side * AISLE_HALF, 1.2, zoneZ(i)]} />;
      })}
      <BayLight position={[0, CEILING - 0.15, cz + 1.6]} target={[0, 1.2, cz - 0.6]} intensity={7} />
      <BayLight position={[0, CEILING - 0.15, 2.2]} target={[0, 0, 0.2]} intensity={9} />

      {/* floor, guide line, ceiling */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0, midZ]} receiveShadow>
        <planeGeometry args={[width, length]} />
        <meshStandardMaterial map={floor} roughness={0.32} metalness={0.1} envMapIntensity={0.6} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.003, (1 + cz + 1.5) / 2]}>
        <planeGeometry args={[0.05, 1 - (cz + 1.5)]} />
        <meshBasicMaterial color="#c9a227" />
      </mesh>
      <mesh rotation-x={Math.PI / 2} position={[0, CEILING, midZ]}>
        <planeGeometry args={[width, length]} />
        <meshStandardMaterial color="#0f0e0d" roughness={0.9} />
      </mesh>
      {/* linear ceiling lights along the aisle */}
      {[-1.25, 1.25].map((x) => (
        <group key={x}>
          <mesh position={[x, CEILING - 0.06, midZ - 2]}>
            <boxGeometry args={[0.16, 0.06, length - 6]} />
            <meshStandardMaterial color="#1a1a1c" metalness={0.6} roughness={0.4} />
          </mesh>
          <mesh position={[x, CEILING - 0.092, midZ - 2]} rotation-x={Math.PI / 2}>
            <planeGeometry args={[0.1, length - 6]} />
            <meshBasicMaterial color="#ffe9cc" toneMapped={false} />
          </mesh>
        </group>
      ))}

      {/* side walls with a dim brand stripe */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh position={[s * WALL_X, CEILING / 2, midZ]} rotation-y={(-s * Math.PI) / 2} receiveShadow>
            <planeGeometry args={[length, CEILING]} />
            <meshStandardMaterial color={WALL} roughness={0.9} />
          </mesh>
          <mesh position={[s * (WALL_X - 0.01), 3.25, midZ]} rotation-y={(-s * Math.PI) / 2}>
            <planeGeometry args={[length, 0.05]} />
            <meshBasicMaterial color="#1f8a55" toneMapped={false} />
          </mesh>
        </group>
      ))}

      {/* entrance arch */}
      <group position={[0, 0, 0.9]}>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * (AISLE_HALF + 0.15), 1.7, 0]} castShadow>
            <boxGeometry args={[0.3, 3.4, 0.3]} />
            <meshStandardMaterial color={METAL} metalness={0.6} roughness={0.45} />
          </mesh>
        ))}
        <mesh position={[0, 3.55, 0]}>
          <boxGeometry args={[AISLE_HALF * 2 + 0.6, 0.5, 0.32]} />
          <meshStandardMaterial color={METAL} metalness={0.6} roughness={0.45} />
        </mesh>
        <mesh position={[0, 3.55, 0.165]}>
          <planeGeometry args={[3.2, 0.5]} />
          <meshBasicMaterial map={nameSign} toneMapped={false} />
        </mesh>
        {/* green cross */}
        <group position={[-(AISLE_HALF + 0.15), 2.7, 0.17]}>
          <mesh>
            <boxGeometry args={[0.36, 0.11, 0.04]} />
            <meshBasicMaterial color="#22c56f" toneMapped={false} />
          </mesh>
          <mesh>
            <boxGeometry args={[0.11, 0.36, 0.04]} />
            <meshBasicMaterial color="#22c56f" toneMapped={false} />
          </mesh>
        </group>
      </group>

      <StockGondolas bays={bays} rtl={rtl} />

      {/* checkout */}
      <group position={[0, 0, cz]}>
        <mesh position={[0, 3.5, 0.6]}>
          <planeGeometry args={[2.0, 0.43]} />
          <meshBasicMaterial map={checkoutSign} toneMapped={false} />
        </mesh>
        {[-0.8, 0.8].map((x) => (
          <mesh key={x} position={[x, 3.9, 0.6]}>
            <cylinderGeometry args={[0.008, 0.008, 0.6, 6]} />
            <meshStandardMaterial color="#3a3a3c" metalness={0.8} roughness={0.4} />
          </mesh>
        ))}
        {/* counter with conveyor */}
        <mesh position={[0.5, 0.48, 0]} castShadow receiveShadow>
          <boxGeometry args={[2.6, 0.96, 0.8]} />
          <meshStandardMaterial color="#5a4030" roughness={0.6} />
        </mesh>
        <mesh position={[0.5, 0.97, 0]} receiveShadow>
          <boxGeometry args={[2.62, 0.04, 0.82]} />
          <meshStandardMaterial color="#e8e4dc" roughness={0.3} />
        </mesh>
        <mesh position={[0.7, 1.0, 0]} receiveShadow>
          <boxGeometry args={[1.8, 0.03, 0.5]} />
          <meshStandardMaterial color="#151515" roughness={0.85} />
        </mesh>
        <mesh position={[0.5, 0.5, 0.41]}>
          <boxGeometry args={[2.3, 0.04, 0.01]} />
          <meshBasicMaterial color="#22c56f" toneMapped={false} />
        </mesh>
        {/* self-checkout kiosk */}
        <group position={[-1.25, 0, 0.1]}>
          <mesh position={[0, 0.6, 0]} castShadow>
            <boxGeometry args={[0.5, 1.2, 0.5]} />
            <meshStandardMaterial color={METAL} metalness={0.5} roughness={0.4} />
          </mesh>
          <mesh position={[0, 1.45, 0.05]} rotation-x={-0.25}>
            <boxGeometry args={[0.56, 0.4, 0.05]} />
            <meshStandardMaterial color="#0d0f0e" />
          </mesh>
          <mesh position={[0, 1.45, 0.08]} rotation-x={-0.25}>
            <planeGeometry args={[0.5, 0.34]} />
            <meshBasicMaterial color="#12a05c" toneMapped={false} />
          </mesh>
        </group>
        <mesh rotation-x={-Math.PI / 2} position={[0.5, 0.004, 0]}>
          <planeGeometry args={[3.4, 1.6]} />
          <meshBasicMaterial map={shadow} transparent depthWrite={false} />
        </mesh>
      </group>

      {/* back wall */}
      <mesh position={[0, CEILING / 2, end]}>
        <planeGeometry args={[width, CEILING]} />
        <meshStandardMaterial color={WALL} roughness={0.9} />
      </mesh>
      <mesh position={[0, 2.6, end + 0.01]}>
        <planeGeometry args={[3.6, 0.7]} />
        <meshBasicMaterial map={backSign} toneMapped={false} />
      </mesh>
    </group>
  );
}

/** A warm ceiling spotlight (no shadow) aimed at a bay or the counter. */
function BayLight({ position, target, intensity = 11 }: { position: [number, number, number]; target: [number, number, number]; intensity?: number }) {
  const light = useRef<THREE.SpotLight>(null);
  useLayoutEffect(() => {
    const l = light.current;
    if (!l) return;
    l.target.position.set(...target);
    l.target.updateMatrixWorld();
  }, [target]);
  return <spotLight ref={light} position={position} color="#ffd2a1" intensity={intensity} angle={0.62} penumbra={0.85} decay={1.4} distance={9} />;
}

/**
 * The one light that casts real shadows: it hangs over the aisle and glides to the bay the
 * shopper walks up to, so packs, hand and shelves throw soft shadows where you look.
 */
export function KeyLight({ bays, rtl, progress, mobile }: { bays: number; rtl: boolean; progress: RefObject<number>; mobile: boolean }) {
  const light = useRef<THREE.SpotLight>(null);
  const tmp = useMemo(() => ({ pos: new THREE.Vector3(), aim: new THREE.Vector3() }), []);
  useFrame((_, delta) => {
    const l = light.current;
    if (!l) return;
    const p = Math.min(bays + 1, Math.max(0, progress.current ?? 0));
    const k = Math.round(p);
    if (k >= 1 && k <= bays) {
      const i = k - 1;
      const side = sideOf(i, rtl);
      tmp.pos.set(-side * 0.2, CEILING - 0.3, zoneZ(i) + 1.3);
      tmp.aim.set(side * AISLE_HALF, 1.25, zoneZ(i));
    } else if (k > bays) {
      // from the side and lower, so the white coat isn't blown out
      tmp.pos.set(1.6, CEILING - 0.6, checkoutZ(bays) + 1.4);
      tmp.aim.set(0, 0.9, checkoutZ(bays) - 0.4);
    } else {
      tmp.pos.set(0.5, CEILING - 0.3, 2.4);
      tmp.aim.set(0, 0.6, 0);
    }
    const s = 1 - Math.exp(-Math.min(delta, 0.1) * 3);
    l.position.lerp(tmp.pos, s);
    l.target.position.lerp(tmp.aim, s);
    l.target.updateMatrixWorld();
  });
  return (
    <spotLight
      ref={light}
      position={[0, CEILING - 0.3, 2.4]}
      color="#ffe0bb"
      intensity={24}
      angle={0.7}
      penumbra={0.7}
      decay={1.3}
      distance={10}
      castShadow
      shadow-mapSize-width={mobile ? 1024 : 2048}
      shadow-mapSize-height={mobile ? 1024 : 2048}
      shadow-bias={-0.0004}
      shadow-normalBias={0.02}
      shadow-radius={4}
      shadow-camera-near={0.5}
      shadow-camera-far={9}
    />
  );
}
