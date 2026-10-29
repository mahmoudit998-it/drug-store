"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { AISLE_HALF, BOX, GONDOLA, ROWS, ROW_Y, SLOTS, TOP_BOARD, checkoutZ, gondolaFrame, sideOf, slotLocal, zoneZ } from "./layout";
import { baseShadow, floorTiles, softShadow, textSign } from "./textures";

const BRAND = "#0b5d34";
const MINT = "#e6f0ea";
const WALL_X = AISLE_HALF + GONDOLA.d + 0.35;
const CEILING = 4.4;

/** Frees a GPU resource when it is replaced or the component unmounts. */
function useDispose(value: { dispose: () => void }) {
  useEffect(() => () => value.dispose(), [value]);
}

/** Shelf unit structure shared by company bays and stock gondolas (front faces local +Z). */
export function GondolaFrame({ color, accent }: { color: string; accent?: string }) {
  const { len, h, d } = GONDOLA;
  return (
    <group>
      <mesh position={[0, h / 2, -d / 2 + 0.03]}>
        <boxGeometry args={[len, h, 0.06]} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>
      {accent && (
        <mesh position={[0, (TOP_BOARD + 0.34) / 2, -d / 2 + 0.065]}>
          <planeGeometry args={[len - 0.12, TOP_BOARD - 0.34]} />
          <meshStandardMaterial color={accent} transparent opacity={0.12} />
        </mesh>
      )}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[(s * len) / 2, h / 2, 0]}>
          <boxGeometry args={[0.06, h, d]} />
          <meshStandardMaterial color="#f4f7f5" roughness={0.6} />
        </mesh>
      ))}
      {/* baked contact shadow on the floor along the front */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.003, d / 2 + 0.2]}>
        <planeGeometry args={[len + 0.3, 0.5]} />
        <meshBasicMaterial map={baseShadow()} transparent depthWrite={false} />
      </mesh>
      {/* kick plate */}
      <mesh position={[0, 0.17, 0.01]}>
        <boxGeometry args={[len - 0.04, 0.34, d - 0.02]} />
        <meshStandardMaterial color={accent ?? "#d5ded9"} roughness={0.6} />
      </mesh>
      {[...ROW_Y.slice(0, ROWS - 1), TOP_BOARD].map((y) => (
        <mesh key={y} position={[0, y - 0.02, 0]}>
          <boxGeometry args={[len - 0.08, 0.04, d - 0.04]} />
          <meshStandardMaterial color="#ffffff" roughness={0.5} />
        </mesh>
      ))}
    </group>
  );
}

const STOCK_COLORS = ["#ffffff", "#f3f6f4", "#dbeee4", "#e4ecf7", "#f6e6ec", "#fbefdc", "#e9e4f5"];

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
          <GondolaFrame color="#fafcfb" />
        </group>
      ))}
      <instancedMesh ref={ref} args={[undefined, undefined, count]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial roughness={0.7} />
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
  const checkoutSign = useMemo(() => textSign(checkout, "#13241b", "#ffffff", 1024, 220, 110), [checkout]);
  const backSign = useMemo(() => textSign(storeName, "#ffffff", BRAND, 1024, 200, 92), [storeName]);
  useDispose(floor);
  useDispose(shadow);
  useDispose(nameSign);
  useDispose(checkoutSign);
  useDispose(backSign);
  useEffect(() => {
    floor.repeat.set(width / 1.4, length / 1.4);
  }, [floor, width, length]);

  return (
    <group>
      <hemisphereLight args={["#ffffff", "#d9e4dd", 1.0]} />
      <directionalLight position={[3, 8, 4]} intensity={1.15} />
      <directionalLight position={[-4, 6, -8]} intensity={0.5} />

      {/* floor, guide line, ceiling */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0, midZ]}>
        <planeGeometry args={[width, length]} />
        <meshStandardMaterial map={floor} roughness={0.22} metalness={0.05} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.003, (1 + cz + 1.5) / 2]}>
        <planeGeometry args={[0.07, 1 - (cz + 1.5)]} />
        <meshBasicMaterial color="#12a05c" />
      </mesh>
      <mesh rotation-x={Math.PI / 2} position={[0, CEILING, midZ]}>
        <planeGeometry args={[width, length]} />
        <meshStandardMaterial color="#f7f9f8" />
      </mesh>
      {[-1.25, 1.25].map((x) => (
        <mesh key={x} position={[x, CEILING - 0.04, midZ - 2]}>
          <boxGeometry args={[0.12, 0.04, length - 6]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      ))}

      {/* side walls with a brand stripe */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh position={[s * WALL_X, CEILING / 2, midZ]} rotation-y={(-s * Math.PI) / 2}>
            <planeGeometry args={[length, CEILING]} />
            <meshStandardMaterial color={MINT} />
          </mesh>
          <mesh position={[s * (WALL_X - 0.01), 3.25, midZ]} rotation-y={(-s * Math.PI) / 2}>
            <planeGeometry args={[length, 0.1]} />
            <meshBasicMaterial color={BRAND} />
          </mesh>
        </group>
      ))}

      {/* entrance arch */}
      <group position={[0, 0, 0.9]}>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * (AISLE_HALF + 0.15), 1.7, 0]}>
            <boxGeometry args={[0.3, 3.4, 0.3]} />
            <meshStandardMaterial color="#ffffff" />
          </mesh>
        ))}
        <mesh position={[0, 3.55, 0]}>
          <boxGeometry args={[AISLE_HALF * 2 + 0.6, 0.5, 0.32]} />
          <meshStandardMaterial color={BRAND} />
        </mesh>
        <mesh position={[0, 3.55, 0.165]}>
          <planeGeometry args={[3.2, 0.5]} />
          <meshBasicMaterial map={nameSign} toneMapped={false} />
        </mesh>
        {/* green cross */}
        <group position={[-(AISLE_HALF + 0.15), 2.7, 0.17]}>
          <mesh>
            <boxGeometry args={[0.36, 0.11, 0.04]} />
            <meshBasicMaterial color="#22c56f" />
          </mesh>
          <mesh>
            <boxGeometry args={[0.11, 0.36, 0.04]} />
            <meshBasicMaterial color="#22c56f" />
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
            <meshBasicMaterial color="#9aa6a0" />
          </mesh>
        ))}
        {/* counter with conveyor */}
        <mesh position={[0.5, 0.48, 0]}>
          <boxGeometry args={[2.6, 0.96, 0.8]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
        <mesh position={[0.5, 0.97, 0]}>
          <boxGeometry args={[2.62, 0.04, 0.82]} />
          <meshStandardMaterial color={BRAND} />
        </mesh>
        <mesh position={[0.7, 1.0, 0]}>
          <boxGeometry args={[1.8, 0.03, 0.5]} />
          <meshStandardMaterial color="#23312a" roughness={0.9} />
        </mesh>
        <mesh position={[0.5, 0.5, 0.41]}>
          <boxGeometry args={[2.3, 0.08, 0.01]} />
          <meshBasicMaterial color="#22c56f" />
        </mesh>
        {/* self-checkout kiosk */}
        <group position={[-1.25, 0, 0.1]}>
          <mesh position={[0, 0.6, 0]}>
            <boxGeometry args={[0.5, 1.2, 0.5]} />
            <meshStandardMaterial color="#f4f7f5" />
          </mesh>
          <mesh position={[0, 1.45, 0.05]} rotation-x={-0.25}>
            <boxGeometry args={[0.56, 0.4, 0.05]} />
            <meshStandardMaterial color="#13241b" />
          </mesh>
          <mesh position={[0, 1.45, 0.08]} rotation-x={-0.25}>
            <planeGeometry args={[0.5, 0.34]} />
            <meshBasicMaterial color="#12a05c" />
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
        <meshStandardMaterial color={MINT} />
      </mesh>
      <mesh position={[0, 2.6, end + 0.01]}>
        <planeGeometry args={[3.6, 0.7]} />
        <meshBasicMaterial map={backSign} toneMapped={false} />
      </mesh>
    </group>
  );
}
