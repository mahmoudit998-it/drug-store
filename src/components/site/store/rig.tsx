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
  // One smoothed walk position drives everything, so position, head turn and cart stay in step.
  const walk = useRef({ p: 0, v: 0, started: false, walked: 0, x: 0, z: 0 });
  const point = useRef(new THREE.Vector3());

  useFrame((state, rawDelta) => {
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

    const w = walk.current;
    const target = Math.min(stops - 1, Math.max(0, progress.current ?? 0));
    // The spring is stable at any frame time; only cap the long gap after a hidden tab.
    const delta = Math.min(rawDelta, 0.25);
    if (!w.started) {
      w.p = target;
      w.started = true;
    } else {
      w.p = smoothDamp(w.p, target, w, reducedMotion ? 0.04 : 0.55, delta);
    }

    const pos = Math.min(stops - 1, Math.max(0, w.p));
    const k = Math.min(Math.floor(pos), stops - 2);
    const t = pos - k;
    const a = poses[k];
    const b = poses[k + 1];
    // getPoint spaces stops evenly in t, so pos / (stops - 1) lands exactly on each stop.
    curve.getPoint(pos / (stops - 1), point.current);

    // Ease the head turn: look down the aisle while walking, at the bay when standing.
    const te = t * t * (3 - 2 * t);
    const travel = Math.sin(Math.PI * t);
    const yaw = (a.yaw + (b.yaw - a.yaw) * te) * (1 - 0.8 * travel);
    const pitch = a.pitch + (b.pitch - a.pitch) * te - 0.1 * travel;
    const lateral = (a.lateral + (b.lateral - a.lateral) * te) * (1 - travel);

    const step = Math.hypot(point.current.x - w.x, point.current.z - w.z);
    w.x = point.current.x;
    w.z = point.current.z;
    w.walked += step;

    // gentle head bob, scaled by walking speed
    const speed = Math.min(1, Math.abs(w.v) * 1.5);
    const bob = reducedMotion ? 0 : Math.sin(w.walked * 5.2) * speed * 0.012;
    camera.position.set(w.x, EYE + bob, w.z);
    camera.rotation.set(pitch, yaw, 0, "YXZ");

    const cart = cartRef.current;
    if (cart) {
      // Pushed 1.25 m ahead, slid sideways when parked, turned less than the head.
      const cos = Math.cos(yaw);
      const sin = Math.sin(yaw);
      const lz = -1.25;
      cart.position.set(w.x + lateral * cos + lz * sin, 0, w.z - lateral * sin + lz * cos);
      cart.rotation.y = yaw * 0.45;
      cart.userData.spin = (cart.userData.spin ?? 0) - step / 0.07;
    }
  });

  return null;
}

/**
 * Critically damped spring towards `target` (Unity's SmoothDamp): starts and stops
 * gently with no overshoot. `state.v` carries the velocity between frames.
 */
function smoothDamp(current: number, target: number, state: { v: number }, smoothTime: number, dt: number) {
  const omega = 2 / smoothTime;
  const x = omega * dt;
  const exp = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
  const change = current - target;
  const temp = (state.v + omega * change) * dt;
  state.v = (state.v - omega * temp) * exp;
  let out = target + (change + temp) * exp;
  // don't overshoot
  if (target - current > 0 === out > target) {
    out = target;
    state.v = 0;
  }
  return out;
}
