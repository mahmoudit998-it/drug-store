"use client";

import { useFrame } from "@react-three/fiber";
import { useRef, type RefObject } from "react";
import * as THREE from "three";

const SKIN = "#c68a64";
const HAIR = "#2b1d16";
const COAT = "#fbfdfc";
const SCRUBS = "#12a05c";
const PANTS = "#34423b";

const tmp = new THREE.Vector3();

/**
 * Pharmacist behind the checkout counter, built from simple shapes. Breathes, follows the
 * shopper with their head, and waves when the shopper arrives at the checkout.
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
  const rightArm = useRef<THREE.Group>(null);
  const leftArm = useRef<THREE.Group>(null);
  const waveStart = useRef<number | null>(null);
  const near = useRef(false);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    const s = 1 - Math.exp(-delta * 6);

    // Wave once on arrival (and again if the shopper leaves and comes back).
    const isNear = (progress.current ?? 0) >= arriveAt;
    if (isNear && !near.current) waveStart.current = t;
    near.current = isNear;
    const waving = !reducedMotion && waveStart.current !== null && t - waveStart.current < 2.6;

    if (chest.current && !reducedMotion) chest.current.scale.y = 1 + Math.sin(t * 1.8) * 0.012;

    // Head (and a little of the body) turns towards the camera.
    if (head.current && body.current) {
      body.current.getWorldPosition(tmp);
      const dx = state.camera.position.x - tmp.x;
      const dz = state.camera.position.z - tmp.z;
      const yaw = THREE.MathUtils.clamp(Math.atan2(dx, dz), -0.7, 0.7);
      head.current.rotation.y += (yaw * 0.7 - head.current.rotation.y) * s;
      body.current.rotation.y += (yaw * 0.3 - body.current.rotation.y) * s;
      const nod = reducedMotion ? 0 : Math.sin(t * 0.9) * 0.03;
      head.current.rotation.x += ((waving ? -0.08 : nod) - head.current.rotation.x) * s;
      head.current.rotation.z += ((waving ? 0.1 : 0) - head.current.rotation.z) * s;
    }

    if (rightArm.current) {
      // Raised and waving, or resting slightly forward on the counter.
      const z = waving ? 2.5 + Math.sin(t * 9) * 0.35 : 0.12;
      const x = waving ? 0 : -0.55;
      rightArm.current.rotation.z += (z - rightArm.current.rotation.z) * s;
      rightArm.current.rotation.x += (x - rightArm.current.rotation.x) * s;
    }
    if (leftArm.current) {
      leftArm.current.rotation.x += (-0.55 - leftArm.current.rotation.x) * s;
      leftArm.current.rotation.z += (-0.12 - leftArm.current.rotation.z) * s;
    }
  });

  return (
    <group position={position}>
      <group ref={body}>
        {/* legs (mostly hidden by the counter) */}
        {[-0.09, 0.09].map((x) => (
          <mesh key={x} position={[x, 0.42, 0]}>
            <capsuleGeometry args={[0.075, 0.7, 6, 14]} />
            <meshStandardMaterial color={PANTS} roughness={0.8} />
          </mesh>
        ))}
        {/* lower lab coat */}
        <mesh position={[0, 0.98, 0]}>
          <cylinderGeometry args={[0.2, 0.25, 0.5, 28]} />
          <meshStandardMaterial color={COAT} roughness={0.7} />
        </mesh>

        <group ref={chest} position={[0, 1.08, 0]}>
          {/* torso in the coat */}
          <mesh position={[0, 0.2, 0]}>
            <capsuleGeometry args={[0.19, 0.3, 8, 24]} />
            <meshStandardMaterial color={COAT} roughness={0.7} />
          </mesh>
          {/* scrubs showing at the open collar */}
          <mesh position={[0, 0.33, 0.165]} rotation-x={-0.25}>
            <circleGeometry args={[0.075, 3, -Math.PI / 2]} />
            <meshStandardMaterial color={SCRUBS} side={THREE.DoubleSide} />
          </mesh>
          {/* lapels */}
          {[-1, 1].map((sd) => (
            <mesh key={sd} position={[sd * 0.06, 0.3, 0.172]} rotation={[-0.2, 0, sd * 0.45]}>
              <boxGeometry args={[0.035, 0.2, 0.01]} />
              <meshStandardMaterial color="#e9efec" />
            </mesh>
          ))}
          {/* name badge and pen */}
          <mesh position={[0.1, 0.2, 0.18]} rotation-x={-0.1}>
            <boxGeometry args={[0.07, 0.035, 0.006]} />
            <meshStandardMaterial color={SCRUBS} />
          </mesh>
          <mesh position={[-0.1, 0.24, 0.18]}>
            <cylinderGeometry args={[0.006, 0.006, 0.08, 8]} />
            <meshStandardMaterial color="#1d5fa8" />
          </mesh>

          {/* arms, pivoting at the shoulders */}
          {[
            { ref: rightArm, x: 0.23 },
            { ref: leftArm, x: -0.23 },
          ].map(({ ref, x }) => (
            <group key={x} ref={ref} position={[x, 0.38, 0]}>
              <mesh position={[0, -0.17, 0]}>
                <capsuleGeometry args={[0.06, 0.24, 6, 14]} />
                <meshStandardMaterial color={COAT} roughness={0.7} />
              </mesh>
              <mesh position={[0, -0.42, 0]}>
                <capsuleGeometry args={[0.05, 0.2, 6, 14]} />
                <meshStandardMaterial color={COAT} roughness={0.7} />
              </mesh>
              <mesh position={[0, -0.58, 0]}>
                <sphereGeometry args={[0.048, 16, 12]} />
                <meshStandardMaterial color={SKIN} roughness={0.6} />
              </mesh>
            </group>
          ))}

          {/* neck and head */}
          <mesh position={[0, 0.45, 0]}>
            <cylinderGeometry args={[0.05, 0.055, 0.1, 16]} />
            <meshStandardMaterial color={SKIN} roughness={0.6} />
          </mesh>
          <group ref={head} position={[0, 0.6, 0]}>
            <mesh scale={[1, 1.12, 1]}>
              <sphereGeometry args={[0.13, 32, 24]} />
              <meshStandardMaterial color={SKIN} roughness={0.55} />
            </mesh>
            {/* hair: a cap over the top and back of the head */}
            <mesh position={[0, 0.03, -0.01]} scale={[1.06, 1.08, 1.06]} rotation-x={-0.35}>
              <sphereGeometry args={[0.13, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.52]} />
              <meshStandardMaterial color={HAIR} roughness={0.9} />
            </mesh>
            {/* ears */}
            {[-1, 1].map((sd) => (
              <mesh key={sd} position={[sd * 0.128, 0, 0]} scale={[0.5, 1, 0.8]}>
                <sphereGeometry args={[0.03, 12, 10]} />
                <meshStandardMaterial color={SKIN} roughness={0.6} />
              </mesh>
            ))}
            {/* eyes, brows, smile */}
            {[-1, 1].map((sd) => (
              <group key={sd}>
                <mesh position={[sd * 0.045, 0.015, 0.118]}>
                  <sphereGeometry args={[0.014, 12, 10]} />
                  <meshStandardMaterial color="#1b1410" roughness={0.3} />
                </mesh>
                <mesh position={[sd * 0.048, 0.055, 0.118]} rotation-z={sd * -0.12}>
                  <boxGeometry args={[0.04, 0.009, 0.01]} />
                  <meshStandardMaterial color={HAIR} />
                </mesh>
              </group>
            ))}
            <mesh position={[0, -0.05, 0.116]} rotation-z={Math.PI}>
              <torusGeometry args={[0.035, 0.007, 8, 20, Math.PI]} />
              <meshStandardMaterial color="#8a3f35" />
            </mesh>
            <mesh position={[0, -0.01, 0.13]}>
              <sphereGeometry args={[0.014, 10, 8]} />
              <meshStandardMaterial color={SKIN} roughness={0.6} />
            </mesh>
          </group>
        </group>
      </group>
    </group>
  );
}
