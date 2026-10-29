"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
import { softShadow, wireMesh } from "./textures";

const CHROME = "#cfd8d3";
const BRAND = "#0b5d34";

// Cart local frame: the handle is at z ≈ 0 (next to the shopper) and the basket points to -Z.
const BASKET = { w: 0.62, h: 0.44, l: 0.92, y: 0.78, z: -0.72 };
const WHEELS: [number, number][] = [
  [-0.24, -0.25],
  [0.24, -0.25],
  [-0.24, -1.1],
  [0.24, -1.1],
];

/** Wire panel of the basket; `repeat` keeps the mesh cells about 8 cm wide. */
function WirePanel({ size, position, rotation }: { size: [number, number]; position: [number, number, number]; rotation?: [number, number, number] }) {
  const tex = useMemo(() => {
    const t = wireMesh();
    t.repeat.set(size[0] / 0.08, size[1] / 0.08);
    return t;
  }, [size]);
  useEffect(() => () => tex.dispose(), [tex]);
  return (
    <mesh position={position} rotation={rotation}>
      <planeGeometry args={size} />
      <meshStandardMaterial color={CHROME} alphaMap={tex} transparent alphaTest={0.4} side={THREE.DoubleSide} metalness={0.5} roughness={0.35} />
    </mesh>
  );
}

function Bar({ from, to, r = 0.012, color = CHROME }: { from: [number, number, number]; to: [number, number, number]; r?: number; color?: string }) {
  const { position, quaternion, length } = useMemo(() => {
    const a = new THREE.Vector3(...from);
    const b = new THREE.Vector3(...to);
    const dir = b.clone().sub(a);
    return {
      position: a.clone().add(b).multiplyScalar(0.5),
      quaternion: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize()),
      length: dir.length(),
    };
  }, [from, to]);
  return (
    <mesh position={position} quaternion={quaternion}>
      <cylinderGeometry args={[r, r, length, 10]} />
      <meshStandardMaterial color={color} metalness={0.6} roughness={0.3} />
    </mesh>
  );
}

export function ShoppingCart({ ref, items }: { ref: RefObject<THREE.Group | null>; items: string[] }) {
  const wheels = useRef<THREE.Group>(null);
  const shadow = useMemo(() => softShadow(), []);
  useEffect(() => () => shadow.dispose(), [shadow]);

  useFrame(() => {
    const spin = ref.current?.userData.spin ?? 0;
    wheels.current?.children.forEach((w) => (w.rotation.x = spin));
  });

  const { w, h, l, y, z } = BASKET;
  const bottom = y - h / 2;
  const top = y + h / 2;

  // Boxes in the basket: 3 across x 4 deep per layer.
  const packs = items.slice(0, 24).map((color, i) => {
    const layer = Math.floor(i / 12);
    const j = i % 12;
    return {
      color,
      pos: [-0.18 + (j % 3) * 0.18, bottom + 0.075 + layer * 0.14, z + 0.33 - Math.floor(j / 3) * 0.22] as [number, number, number],
      rot: ((i * 37) % 10) / 30 - 0.15,
    };
  });

  return (
    <group ref={ref}>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.004, z]}>
        <planeGeometry args={[1.0, 1.5]} />
        <meshBasicMaterial map={shadow} transparent depthWrite={false} />
      </mesh>

      {/* basket */}
      <WirePanel size={[w, l]} position={[0, bottom, z]} rotation={[-Math.PI / 2, 0, 0]} />
      <WirePanel size={[l, h]} position={[-w / 2, y, z]} rotation={[0, Math.PI / 2, 0]} />
      <WirePanel size={[l, h]} position={[w / 2, y, z]} rotation={[0, Math.PI / 2, 0]} />
      <WirePanel size={[w, h]} position={[0, y, z - l / 2]} />
      <WirePanel size={[w, h]} position={[0, y, z + l / 2]} />
      {/* rim */}
      <Bar from={[-w / 2, top, z - l / 2]} to={[w / 2, top, z - l / 2]} r={0.014} />
      <Bar from={[-w / 2, top, z + l / 2]} to={[w / 2, top, z + l / 2]} r={0.014} />
      <Bar from={[-w / 2, top, z - l / 2]} to={[-w / 2, top, z + l / 2]} r={0.014} />
      <Bar from={[w / 2, top, z - l / 2]} to={[w / 2, top, z + l / 2]} r={0.014} />
      {/* brand plate on the front */}
      <mesh position={[0, y, z - l / 2 - 0.006]} rotation-y={Math.PI}>
        <planeGeometry args={[0.36, 0.14]} />
        <meshStandardMaterial color={BRAND} side={THREE.DoubleSide} />
      </mesh>

      {/* handle */}
      <Bar from={[-w / 2, top, z + l / 2]} to={[-w / 2 + 0.02, 1.04, -0.08]} />
      <Bar from={[w / 2, top, z + l / 2]} to={[w / 2 - 0.02, 1.04, -0.08]} />
      <Bar from={[-w / 2 - 0.02, 1.04, -0.08]} to={[w / 2 + 0.02, 1.04, -0.08]} r={0.016} />
      <Bar from={[-0.22, 1.04, -0.08]} to={[0.22, 1.04, -0.08]} r={0.026} color={BRAND} />

      {/* legs and chassis */}
      {WHEELS.map(([x, wz], i) => (
        <Bar key={i} from={[x, 0.14, wz]} to={[x * 1.15, bottom, wz > -0.5 ? z + l / 2 - 0.05 : z - l / 2 + 0.05]} />
      ))}
      <Bar from={[-0.24, 0.14, -0.25]} to={[-0.24, 0.14, -1.1]} />
      <Bar from={[0.24, 0.14, -0.25]} to={[0.24, 0.14, -1.1]} />
      <WirePanel size={[0.46, 0.8]} position={[0, 0.2, -0.68]} rotation={[-Math.PI / 2, 0, 0]} />

      <group ref={wheels}>
        {WHEELS.map(([x, wz], i) => (
          <group key={i} position={[x, 0.07, wz]}>
            <mesh rotation-z={Math.PI / 2}>
              <cylinderGeometry args={[0.07, 0.07, 0.04, 20]} />
              <meshStandardMaterial color="#23312a" roughness={0.85} />
            </mesh>
            <mesh position={[0.022, 0.035, 0]}>
              <boxGeometry args={[0.005, 0.03, 0.02]} />
              <meshBasicMaterial color="#e8eeeb" />
            </mesh>
          </group>
        ))}
      </group>

      {packs.map((p, i) => (
        <mesh key={i} position={p.pos} rotation-y={p.rot}>
          <boxGeometry args={[0.15, 0.13, 0.18]} />
          <meshStandardMaterial color={p.color} />
        </mesh>
      ))}
    </group>
  );
}
