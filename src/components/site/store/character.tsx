"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";

const SKIN = "#d29f7e";
const SKIN_SHADE = "#c08a6a";
const HAIR = "#241a15";
const COAT = "#f7faf8";
const COAT_SHADE = "#e3e9e6";
const SCRUBS = "#0f8a52";
const PANTS = "#2f3a35";
const METAL = "#aab4b0";

const tmp = new THREE.Vector3();

/** Lathe (turned) shape from [radius, y] points: used for a natural head and coat silhouette. */
function useLathe(points: [number, number][], segments = 40) {
  return useMemo(() => new THREE.LatheGeometry(points.map(([r, y]) => new THREE.Vector2(r, y)), segments), [points, segments]);
}

// Profiles in metres. The head is turned then narrowed sideways; the coat is flattened front-to-back.
const HEAD_PROFILE: [number, number][] = [
  [0.0, -0.125],
  [0.03, -0.121],
  [0.055, -0.108],
  [0.073, -0.085],
  [0.084, -0.05],
  [0.091, -0.01],
  [0.095, 0.03],
  [0.092, 0.07],
  [0.08, 0.1],
  [0.055, 0.12],
  [0.0, 0.128],
];
const COAT_PROFILE: [number, number][] = [
  [0.0, 0.6],
  [0.215, 0.62],
  [0.205, 0.8],
  [0.19, 0.96],
  [0.178, 1.06],
  [0.188, 1.2],
  [0.205, 1.32],
  [0.212, 1.4],
  [0.19, 1.455],
  [0.12, 1.49],
  [0.06, 1.5],
];

/**
 * Pharmacist behind the checkout counter, modelled from simple turned shapes with realistic
 * adult proportions. Blinks, breathes, shifts weight, follows the shopper with their eyes
 * and head, and waves when the shopper arrives at the checkout.
 */
export function Pharmacist({
  position,
  progress,
  arriveAt,
  reducedMotion,
}: {
  position: [number, number, number];
  progress: RefObject<number>;
  /** Stop position from which the shopper counts as having arrived. */
  arriveAt: number;
  reducedMotion: boolean;
}) {
  const body = useRef<THREE.Group>(null);
  const chest = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const lids = useRef<THREE.Group>(null);
  const rightArm = useRef<THREE.Group>(null);
  const rightFore = useRef<THREE.Group>(null);
  const leftArm = useRef<THREE.Group>(null);
  const waveStart = useRef<number | null>(null);
  const near = useRef(false);
  const nextBlink = useRef(2);

  const headGeo = useLathe(HEAD_PROFILE);
  const coatGeo = useLathe(COAT_PROFILE);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    const s = 1 - Math.exp(-delta * 6);

    const isNear = (progress.current ?? 0) >= arriveAt;
    if (isNear && !near.current) waveStart.current = t;
    near.current = isNear;
    const waving = !reducedMotion && waveStart.current !== null && t - waveStart.current < 2.8;

    if (!reducedMotion) {
      if (chest.current) chest.current.scale.set(1 + Math.sin(t * 1.7) * 0.006, 1 + Math.sin(t * 1.7) * 0.01, 1);
      if (body.current) body.current.rotation.z = Math.sin(t * 0.35) * 0.012; // slow weight shift
      // blink every few seconds (eyelids close for ~120 ms)
      if (lids.current) {
        if (t > nextBlink.current + 0.12) nextBlink.current = t + 2.5 + Math.random() * 3;
        const closed = t > nextBlink.current && t < nextBlink.current + 0.12;
        lids.current.children.forEach((l) => (l.scale.y = closed ? 1 : 0.42));
      }
    }

    if (head.current && body.current) {
      body.current.getWorldPosition(tmp);
      const dx = state.camera.position.x - tmp.x;
      const dz = state.camera.position.z - tmp.z;
      const yaw = THREE.MathUtils.clamp(Math.atan2(dx, dz), -0.7, 0.7);
      const pitch = THREE.MathUtils.clamp(Math.atan2(state.camera.position.y - 1.66, Math.hypot(dx, dz)), -0.3, 0.3);
      head.current.rotation.y += (yaw * 0.75 - head.current.rotation.y) * s;
      head.current.rotation.x += (-pitch * 0.6 + (waving ? -0.05 : 0) - head.current.rotation.x) * s;
      head.current.rotation.z += ((waving ? 0.08 : Math.sin(t * 0.5) * 0.02) - head.current.rotation.z) * s;
      body.current.rotation.y += (yaw * 0.25 - body.current.rotation.y) * s;
    }

    if (rightArm.current && rightFore.current) {
      // Raised with the forearm waving, or resting forward on the counter.
      rightArm.current.rotation.z += ((waving ? 2.2 : 0.1) - rightArm.current.rotation.z) * s;
      rightArm.current.rotation.x += ((waving ? -0.2 : -0.5) - rightArm.current.rotation.x) * s;
      const fore = waving ? 0.5 + Math.sin(t * 8) * 0.35 : 0;
      rightFore.current.rotation.z += (fore - rightFore.current.rotation.z) * s;
      rightFore.current.rotation.x += ((waving ? 0 : -0.7) - rightFore.current.rotation.x) * s;
    }
    if (leftArm.current) {
      leftArm.current.rotation.x += (-0.5 - leftArm.current.rotation.x) * s;
      leftArm.current.rotation.z += (-0.1 - leftArm.current.rotation.z) * s;
      const lf = leftArm.current.children.find((c) => c.name === "fore");
      if (lf) lf.rotation.x += (-0.7 - lf.rotation.x) * s;
    }
  });

  const skin = <meshPhysicalMaterial color={SKIN} roughness={0.55} sheen={0.4} sheenColor="#ffd9c4" />;
  const coat = <meshStandardMaterial color={COAT} roughness={0.85} />;

  return (
    <group position={position}>
      <group ref={body}>
        {/* legs and shoes (mostly behind the counter) */}
        {[-0.09, 0.09].map((x) => (
          <group key={x}>
            <mesh position={[x, 0.36, 0]}>
              <cylinderGeometry args={[0.065, 0.055, 0.66, 18]} />
              <meshStandardMaterial color={PANTS} roughness={0.85} />
            </mesh>
            <mesh position={[x, 0.035, 0.04]}>
              <boxGeometry args={[0.1, 0.07, 0.26]} />
              <meshStandardMaterial color="#1c1f1e" roughness={0.5} />
            </mesh>
          </group>
        ))}

        <group ref={chest}>
          {/* lab coat */}
          <mesh geometry={coatGeo} scale={[1, 1, 0.62]}>
            {coat}
          </mesh>
          {/* front opening, buttons, pockets */}
          <mesh position={[0, 1.0, 0.1335]}>
            <boxGeometry args={[0.006, 0.76, 0.002]} />
            <meshStandardMaterial color={COAT_SHADE} />
          </mesh>
          {[1.22, 1.07, 0.92].map((y) => (
            <mesh key={y} position={[0.02, y, 0.122]} rotation-x={Math.PI / 2}>
              <cylinderGeometry args={[0.008, 0.008, 0.004, 12]} />
              <meshStandardMaterial color="#dfe5e2" />
            </mesh>
          ))}
          {[-1, 1].map((sd) => (
            <mesh key={sd} position={[sd * 0.105, 0.8, 0.128]} rotation-y={sd * 0.35}>
              <planeGeometry args={[0.1, 0.11]} />
              <meshStandardMaterial color={COAT_SHADE} side={THREE.DoubleSide} />
            </mesh>
          ))}
          {/* scrubs at the V of the collar, and lapels */}
          <mesh position={[0, 1.415, 0.123]} rotation-x={-0.35}>
            <circleGeometry args={[0.06, 3, -Math.PI / 2]} />
            <meshStandardMaterial color={SCRUBS} side={THREE.DoubleSide} roughness={0.8} />
          </mesh>
          {[-1, 1].map((sd) => (
            <mesh key={sd} position={[sd * 0.055, 1.37, 0.13]} rotation={[-0.25, 0, sd * 0.42]}>
              <boxGeometry args={[0.04, 0.2, 0.008]} />
              <meshStandardMaterial color={COAT_SHADE} roughness={0.85} />
            </mesh>
          ))}
          {/* name badge and pens */}
          <mesh position={[-0.125, 1.2, 0.127]} rotation-y={-0.25}>
            <boxGeometry args={[0.07, 0.028, 0.004]} />
            <meshStandardMaterial color={SCRUBS} />
          </mesh>
          {[0.09, 0.105].map((x, i) => (
            <mesh key={x} position={[x, 1.29, 0.125]}>
              <cylinderGeometry args={[0.005, 0.005, 0.085, 8]} />
              <meshStandardMaterial color={i ? "#1d5fa8" : "#23312a"} />
            </mesh>
          ))}

          {/* stethoscope around the neck */}
          <mesh position={[0, 1.47, 0.0]} rotation-x={Math.PI / 2 - 0.25} scale={[1, 0.75, 1]}>
            <torusGeometry args={[0.085, 0.006, 8, 32]} />
            <meshStandardMaterial color="#2a3330" roughness={0.4} />
          </mesh>
          {/* tubes hang from the collar; one ends in the chest piece */}
          {[-1, 1].map((sd) => (
            <mesh key={sd} position={[sd * 0.07, 1.36, 0.128]} rotation={[0.12, 0, sd * -0.08]}>
              <cylinderGeometry args={[0.0075, 0.0075, sd > 0 ? 0.25 : 0.2, 10]} />
              <meshStandardMaterial color="#2a3330" roughness={0.4} />
            </mesh>
          ))}
          <mesh position={[0.08, 1.225, 0.14]} rotation-x={Math.PI / 2}>
            <cylinderGeometry args={[0.022, 0.022, 0.012, 24]} />
            <meshStandardMaterial color={METAL} metalness={0.8} roughness={0.25} />
          </mesh>

          {/* arms: shoulder pivot, upper arm, elbow pivot, forearm, hand */}
          {[
            { ref: rightArm, foreRef: rightFore, x: 0.215 },
            { ref: leftArm, foreRef: null, x: -0.215 },
          ].map(({ ref, foreRef, x }) => (
            <group key={x} ref={ref} position={[x, 1.42, 0]}>
              <mesh position={[0, -0.14, 0]}>
                <capsuleGeometry args={[0.05, 0.2, 8, 16]} />
                {coat}
              </mesh>
              <group ref={foreRef ?? undefined} name="fore" position={[0, -0.29, 0]}>
                <mesh position={[0, -0.12, 0]}>
                  <capsuleGeometry args={[0.043, 0.18, 8, 16]} />
                  {coat}
                </mesh>
                <mesh position={[0, -0.24, 0]}>
                  <cylinderGeometry args={[0.032, 0.03, 0.03, 16]} />
                  {skin}
                </mesh>
                {/* hand: palm and thumb */}
                <mesh position={[0, -0.295, 0]} scale={[1, 1, 0.45]}>
                  <capsuleGeometry args={[0.035, 0.05, 6, 12]} />
                  {skin}
                </mesh>
                <mesh position={[x > 0 ? -0.03 : 0.03, -0.275, 0.012]} rotation-z={x > 0 ? 0.5 : -0.5}>
                  <capsuleGeometry args={[0.012, 0.035, 4, 8]} />
                  {skin}
                </mesh>
              </group>
            </group>
          ))}

          {/* neck */}
          <mesh position={[0, 1.53, -0.005]}>
            <cylinderGeometry args={[0.054, 0.06, 0.12, 20]} />
            {skin}
          </mesh>

          <group ref={head} position={[0, 1.665, 0]}>
            <mesh geometry={headGeo} scale={[0.82, 1, 1]}>
              {skin}
            </mesh>
            {/* jaw shading */}
            <mesh position={[0, -0.075, 0.01]} scale={[0.82, 0.55, 0.95]}>
              <sphereGeometry args={[0.07, 24, 16]} />
              <meshStandardMaterial color={SKIN_SHADE} roughness={0.6} transparent opacity={0.35} />
            </mesh>
            {/* hair (sphere angles: phi 0.5π faces front, theta from the top down) */}
            {/* crown, ending at the hairline above the forehead */}
            <mesh position={[0, 0.008, -0.002]} scale={[0.88, 1.22, 1.04]}>
              <sphereGeometry args={[0.112, 40, 14, 0, Math.PI * 2, 0, Math.PI * 0.3]} />
              <meshStandardMaterial color={HAIR} roughness={0.95} />
            </mesh>
            {/* sides and back down to ear level, open at the face */}
            <mesh position={[0, 0.008, -0.002]} scale={[0.88, 1.0, 1.04]}>
              <sphereGeometry args={[0.112, 40, 10, Math.PI * 0.9, Math.PI * 1.2, Math.PI * 0.26, Math.PI * 0.26]} />
              <meshStandardMaterial color={HAIR} roughness={0.95} side={THREE.DoubleSide} />
            </mesh>
            {/* nape */}
            <mesh position={[0, 0.008, -0.002]} scale={[0.86, 1.0, 1.02]}>
              <sphereGeometry args={[0.112, 24, 6, Math.PI * 1.2, Math.PI * 0.6, Math.PI * 0.5, Math.PI * 0.16]} />
              <meshStandardMaterial color={HAIR} roughness={0.95} side={THREE.DoubleSide} />
            </mesh>
            {/* ears */}
            {[-1, 1].map((sd) => (
              <mesh key={sd} position={[sd * 0.078, -0.005, 0.0]} scale={[0.35, 1, 0.65]}>
                <sphereGeometry args={[0.026, 16, 12]} />
                {skin}
              </mesh>
            ))}
            {/* eyes: sclera, iris, pupil; lids close when blinking */}
            {[-1, 1].map((sd) => (
              <group key={sd} position={[sd * 0.031, 0.018, 0.074]}>
                <mesh>
                  <sphereGeometry args={[0.0135, 20, 16]} />
                  <meshStandardMaterial color="#f3efe8" roughness={0.25} />
                </mesh>
                <mesh position={[0, 0, 0.0105]} scale={[1, 1, 0.4]}>
                  <sphereGeometry args={[0.0075, 16, 12]} />
                  <meshStandardMaterial color="#4a2f1d" roughness={0.3} />
                </mesh>
                <mesh position={[0, 0, 0.0128]} scale={[1, 1, 0.3]}>
                  <sphereGeometry args={[0.0036, 12, 8]} />
                  <meshStandardMaterial color="#0d0907" roughness={0.1} />
                </mesh>
              </group>
            ))}
            <group ref={lids}>
              {[-1, 1].map((sd) => (
                <mesh key={sd} position={[sd * 0.031, 0.018, 0.074]} scale={[1, 0.42, 1]}>
                  <sphereGeometry args={[0.0145, 20, 10, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
                  {skin}
                </mesh>
              ))}
            </group>
            {/* brows */}
            {[-1, 1].map((sd) => (
              <mesh key={sd} position={[sd * 0.032, 0.041, 0.083]} rotation={[0, sd * 0.2, sd * -0.1]}>
                <boxGeometry args={[0.032, 0.0065, 0.008]} />
                <meshStandardMaterial color={HAIR} roughness={0.9} />
              </mesh>
            ))}
            {/* nose */}
            <mesh position={[0, -0.008, 0.087]} rotation-x={0.25} scale={[0.75, 1.3, 0.9]}>
              <sphereGeometry args={[0.014, 16, 12]} />
              {skin}
            </mesh>
            <mesh position={[0, 0.012, 0.085]} scale={[0.6, 1.8, 0.7]}>
              <sphereGeometry args={[0.009, 12, 10]} />
              {skin}
            </mesh>
            {/* trimmed beard and moustache */}
            <mesh position={[0, -0.062, 0.035]} scale={[0.82, 0.68, 0.98]}>
              <sphereGeometry args={[0.086, 32, 16, 0, Math.PI * 2, Math.PI * 0.45, Math.PI * 0.55]} />
              <meshStandardMaterial color={HAIR} roughness={1} />
            </mesh>
            <mesh position={[0, -0.031, 0.083]} scale={[2.3, 0.55, 0.7]}>
              <sphereGeometry args={[0.01, 12, 8]} />
              <meshStandardMaterial color={HAIR} roughness={1} />
            </mesh>
            {/* lips */}
            <mesh position={[0, -0.046, 0.083]} scale={[1.9, 0.5, 0.7]}>
              <sphereGeometry args={[0.01, 12, 8]} />
              <meshStandardMaterial color="#9c5b52" roughness={0.45} />
            </mesh>
            {/* glasses */}
            {[-1, 1].map((sd) => (
              <group key={sd}>
                <mesh position={[sd * 0.031, 0.018, 0.092]}>
                  <torusGeometry args={[0.017, 0.0016, 8, 28]} />
                  <meshStandardMaterial color="#1e2421" metalness={0.4} roughness={0.35} />
                </mesh>
                <mesh position={[sd * 0.031, 0.018, 0.0915]}>
                  <circleGeometry args={[0.0165, 24]} />
                  <meshPhysicalMaterial color="#ffffff" transparent opacity={0.12} roughness={0.05} />
                </mesh>
                <mesh position={[sd * 0.064, 0.02, 0.045]} rotation-y={Math.PI / 2}>
                  <boxGeometry args={[0.09, 0.003, 0.002]} />
                  <meshStandardMaterial color="#1e2421" />
                </mesh>
              </group>
            ))}
            <mesh position={[0, 0.021, 0.093]} rotation-z={Math.PI / 2}>
              <cylinderGeometry args={[0.0014, 0.0014, 0.028, 6]} />
              <meshStandardMaterial color="#1e2421" />
            </mesh>
          </group>
        </group>
      </group>
    </group>
  );
}
