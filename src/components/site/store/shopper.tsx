"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type ReactNode, type RefObject } from "react";
import * as THREE from "three";
import { softShadow } from "./textures";

const SKIN = "#c58c68";
const HAIR = "#1f1814";
const SHIRT = "#3a6ea5";
const JEANS = "#2b3a52";
const SHOE = "#f2f4f3";

/**
 * Animation inputs written by the camera rig each frame on the shopper group's userData:
 * `phase` (walk cycle, radians), `amount` (0 standing .. 1 walking) and `look` (head yaw).
 */
export type ShopperMotion = { phase: number; amount: number; look: number };

// Shopper local frame faces -Z (the way it pushes the cart). Hands hold the cart handle,
// which sits 0.48 m ahead at 1.04 m high.
const HAND_Y = 1.04;
const HAND_Z = -0.47;

function Limb({ from, to, r, children }: { from: [number, number, number]; to: [number, number, number]; r: number; children: ReactNode }) {
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
      <capsuleGeometry args={[r, Math.max(0.01, length - r * 2), 6, 14]} />
      {children}
    </mesh>
  );
}

const TORSO: [number, number][] = [
  [0.0, 0.86],
  [0.17, 0.88],
  [0.17, 1.0],
  [0.165, 1.08],
  [0.18, 1.22],
  [0.195, 1.34],
  [0.2, 1.4],
  [0.17, 1.45],
  [0.1, 1.48],
  [0.0, 1.49],
];
const HEAD: [number, number][] = [
  [0.0, -0.122],
  [0.03, -0.118],
  [0.055, -0.105],
  [0.072, -0.082],
  [0.083, -0.048],
  [0.09, -0.01],
  [0.094, 0.03],
  [0.091, 0.07],
  [0.079, 0.1],
  [0.054, 0.12],
  [0.0, 0.127],
];

/** A shopper in casual clothes, pushing the cart. Legs swing with walking speed; the head turns to the shelf. */
export function Shopper({ ref }: { ref: RefObject<THREE.Group | null> }) {
  const legs = useRef<(THREE.Group | null)[]>([]);
  const knees = useRef<(THREE.Group | null)[]>([]);
  const body = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const torsoGeo = useMemo(() => new THREE.LatheGeometry(TORSO.map(([r, y]) => new THREE.Vector2(r, y)), 36), []);
  const headGeo = useMemo(() => new THREE.LatheGeometry(HEAD.map(([r, y]) => new THREE.Vector2(r, y)), 36), []);
  const shadow = useMemo(() => softShadow(), []);
  useEffect(() => () => shadow.dispose(), [shadow]);

  useFrame((_, delta) => {
    const m = (ref.current?.userData.motion as ShopperMotion | undefined) ?? { phase: 0, amount: 0, look: 0 };
    const s = 1 - Math.exp(-delta * 8);
    [0, 1].forEach((i) => {
      const ph = m.phase + i * Math.PI;
      const hip = legs.current[i];
      const knee = knees.current[i];
      if (hip) hip.rotation.x += (Math.sin(ph) * 0.42 * m.amount - hip.rotation.x) * s;
      // knees bend backwards (+Z) while the leg swings through
      if (knee) knee.rotation.x += (-Math.max(0, Math.cos(ph)) * 0.7 * m.amount - knee.rotation.x) * s;
    });
    if (body.current) {
      body.current.position.y = Math.abs(Math.sin(m.phase)) * 0.025 * m.amount;
      body.current.rotation.x = -0.02 - 0.03 * m.amount; // lean forward into the push
    }
    if (head.current) head.current.rotation.y += (THREE.MathUtils.clamp(m.look, -0.9, 0.9) - head.current.rotation.y) * s;
  });

  const skin = <meshPhysicalMaterial color={SKIN} roughness={0.55} sheen={0.4} sheenColor="#ffd9c4" />;
  const shirt = <meshStandardMaterial color={SHIRT} roughness={0.85} />;
  const jeans = <meshStandardMaterial color={JEANS} roughness={0.9} />;

  return (
    <group ref={ref}>
      {/* contact shadow */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.004, -0.05]}>
        <planeGeometry args={[0.8, 0.8]} />
        <meshBasicMaterial map={shadow} transparent depthWrite={false} />
      </mesh>

      {/* legs pivot at the hips */}
      {[-1, 1].map((sd, i) => (
        <group key={sd} ref={(g) => void (legs.current[i] = g)} position={[sd * 0.09, 0.9, 0]}>
          <mesh position={[0, -0.21, 0]}>
            <capsuleGeometry args={[0.068, 0.3, 6, 14]} />
            {jeans}
          </mesh>
          <group ref={(g) => void (knees.current[i] = g)} position={[0, -0.44, 0]}>
            <mesh position={[0, -0.2, 0]}>
              <capsuleGeometry args={[0.055, 0.3, 6, 14]} />
              {jeans}
            </mesh>
            <mesh position={[0, -0.43, -0.04]}>
              <boxGeometry args={[0.1, 0.07, 0.27]} />
              <meshStandardMaterial color={SHOE} roughness={0.6} />
            </mesh>
            <mesh position={[0, -0.462, -0.04]}>
              <boxGeometry args={[0.104, 0.02, 0.275]} />
              <meshStandardMaterial color="#9aa5a0" roughness={0.8} />
            </mesh>
          </group>
        </group>
      ))}

      <group ref={body}>
        {/* hips and torso */}
        <mesh position={[0, 0.9, 0]} scale={[1, 1, 0.7]}>
          <cylinderGeometry args={[0.165, 0.17, 0.12, 24]} />
          {jeans}
        </mesh>
        <mesh geometry={torsoGeo} scale={[1, 1, 0.62]}>
          {shirt}
        </mesh>
        {/* collar */}
        <mesh position={[0, 1.465, 0]} rotation-x={Math.PI / 2} scale={[1, 0.8, 1]}>
          <torusGeometry args={[0.062, 0.012, 8, 24]} />
          {shirt}
        </mesh>

        {/* arms reach forward to the cart handle */}
        {[-1, 1].map((sd) => {
          const shoulder: [number, number, number] = [sd * 0.19, 1.4, 0];
          const elbow: [number, number, number] = [sd * 0.235, 1.15, -0.2];
          const hand: [number, number, number] = [sd * 0.2, HAND_Y, HAND_Z];
          return (
            <group key={sd}>
              <mesh position={shoulder}>
                <sphereGeometry args={[0.05, 16, 12]} />
                {shirt}
              </mesh>
              <Limb from={shoulder} to={elbow} r={0.05}>
                {shirt}
              </Limb>
              <Limb from={elbow} to={[hand[0], hand[1] + 0.01, hand[2] + 0.06]} r={0.038}>
                {skin}
              </Limb>
              <mesh position={hand} scale={[0.8, 0.6, 1]}>
                <sphereGeometry args={[0.042, 14, 10]} />
                {skin}
              </mesh>
            </group>
          );
        })}

        {/* neck and head */}
        <mesh position={[0, 1.52, 0]}>
          <cylinderGeometry args={[0.05, 0.056, 0.1, 18]} />
          {skin}
        </mesh>
        <group ref={head} position={[0, 1.655, 0]}>
          {/* built facing +Z like the pharmacist, so turn it to face forward (-Z) */}
          <group rotation-y={Math.PI}>
            <mesh geometry={headGeo} scale={[0.82, 1, 1]}>
              {skin}
            </mesh>
            <mesh position={[0, 0.008, -0.002]} scale={[0.88, 1.22, 1.04]}>
              <sphereGeometry args={[0.112, 36, 14, 0, Math.PI * 2, 0, Math.PI * 0.3]} />
              <meshStandardMaterial color={HAIR} roughness={0.95} />
            </mesh>
            <mesh position={[0, 0.008, -0.002]} scale={[0.88, 1.22, 1.04]}>
              <sphereGeometry args={[0.112, 36, 10, Math.PI * 0.9, Math.PI * 1.2, Math.PI * 0.27, Math.PI * 0.33]} />
              <meshStandardMaterial color={HAIR} roughness={0.95} side={THREE.DoubleSide} />
            </mesh>
            {[-1, 1].map((sd) => (
              <mesh key={sd} position={[sd * 0.078, -0.005, 0]} scale={[0.35, 1, 0.65]}>
                <sphereGeometry args={[0.026, 14, 10]} />
                {skin}
              </mesh>
            ))}
            {[-1, 1].map((sd) => (
              <mesh key={sd} position={[sd * 0.031, 0.018, 0.076]}>
                <sphereGeometry args={[0.012, 14, 10]} />
                <meshStandardMaterial color="#2a1d14" roughness={0.3} />
              </mesh>
            ))}
            <mesh position={[0, -0.008, 0.087]} rotation-x={0.25} scale={[0.75, 1.3, 0.9]}>
              <sphereGeometry args={[0.014, 14, 10]} />
              {skin}
            </mesh>
          </group>
        </group>
      </group>
    </group>
  );
}
