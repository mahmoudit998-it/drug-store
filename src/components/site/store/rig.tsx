"use client";

import { useFrame } from "@react-three/fiber";
import { useRef, type RefObject } from "react";
import * as THREE from "three";
import { EYE, poseFor, stopCount, type Pose } from "./layout";

type Path = { wide: boolean; poses: Pose[]; curve: THREE.CatmullRomCurve3 };

/**
 * Moves the shopper along the aisle from the scroll position. The body follows one
 * Catmull-Rom spline through every stop; the head turns towards the bay at each stop
 * and back down the aisle while walking. The cart is pushed in front of the shopper.
 */
export function CameraRig({
  bays,
  rtl,
  progress,
  cartRef,
  reducedMotion,
}: {
  bays: number;
  rtl: boolean;
  progress: RefObject<number>;
  cartRef: RefObject<THREE.Group | null>;
  reducedMotion: boolean;
}) {
  const path = useRef<Path | null>(null);
  const body = useRef({ x: 0, z: 0, yaw: 0, pitch: 0, lateral: 0, walked: 0, started: false });
  const point = useRef(new THREE.Vector3());

  useFrame((state, delta) => {
    const camera = state.camera as THREE.PerspectiveCamera;
    const aspect = state.size.width / Math.max(1, state.size.height);
    const wide = aspect >= 1;
    const fov = wide ? 52 : 68;
    if (camera.fov !== fov) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }

    const stops = stopCount(bays);
    if (!path.current || path.current.wide !== wide) {
      const poses = Array.from({ length: stops }, (_, k) => poseFor(k, bays, rtl, wide));
      const curve = new THREE.CatmullRomCurve3(
        poses.map((p) => new THREE.Vector3(p.x, 0, p.z)),
        false,
        "catmullrom",
        0.3
      );
      path.current = { wide, poses, curve };
    }
    const { poses, curve } = path.current;

    const pos = Math.min(stops - 1, Math.max(0, progress.current ?? 0));
    const k = Math.min(Math.floor(pos), stops - 2);
    const t = pos - k;
    const a = poses[k];
    const b = poses[k + 1];
    // getPoint spaces stops evenly in t, so pos / (stops - 1) lands exactly on each stop.
    curve.getPoint(pos / (stops - 1), point.current);

    const travel = Math.sin(Math.PI * t);
    const tYaw = (a.yaw + (b.yaw - a.yaw) * t) * (1 - 0.8 * travel);
    const tPitch = a.pitch + (b.pitch - a.pitch) * t - 0.1 * travel;
    const tLateral = (a.lateral + (b.lateral - a.lateral) * t) * (1 - travel);

    const st = body.current;
    const s = st.started ? 1 - Math.exp(-delta * (reducedMotion ? 30 : 4)) : 1;
    st.started = true;
    const px = st.x;
    const pz = st.z;
    st.x += (point.current.x - st.x) * s;
    st.z += (point.current.z - st.z) * s;
    st.yaw += (tYaw - st.yaw) * s;
    st.pitch += (tPitch - st.pitch) * s;
    st.lateral += (tLateral - st.lateral) * s;
    const step = Math.hypot(st.x - px, st.z - pz);
    st.walked += step;

    // a little head bob while walking
    const bob = reducedMotion ? 0 : Math.sin(st.walked * 6) * Math.min(1, step * 40) * 0.018;
    camera.position.set(st.x, EYE + bob, st.z);
    camera.rotation.set(st.pitch, st.yaw, 0, "YXZ");

    const cart = cartRef.current;
    if (cart) {
      // Pushed 1.25 m ahead, slid sideways when parked, turned less than the head.
      const cos = Math.cos(st.yaw);
      const sin = Math.sin(st.yaw);
      const lx = st.lateral;
      const lz = -1.25;
      cart.position.set(st.x + lx * cos + lz * sin, 0, st.z - lx * sin + lz * cos);
      cart.rotation.y = st.yaw * 0.45;
      cart.userData.spin = (cart.userData.spin ?? 0) - step / 0.07;
    }
  });

  return null;
}
