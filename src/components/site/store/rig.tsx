"use client";

import { useFrame } from "@react-three/fiber";
import { useRef, type RefObject } from "react";
import * as THREE from "three";
import { EYE, poseFor, stopCount, type Pose } from "./layout";

type Path = { wide: boolean; poses: Pose[]; curve: THREE.CatmullRomCurve3 };

/**
 * Moves the shopper and camera along the aisle from the scroll position. Everything follows
 * one Catmull-Rom spline through every stop. While walking, the camera follows behind and
 * above the shopper pushing the cart; at each stop the shopper steps aside and the camera
 * looks over their shoulder at the bay.
 */
export function CameraRig({
  bays,
  rtl,
  progress,
  cartRef,
  shopperRef,
  reducedMotion,
}: {
  bays: number;
  rtl: boolean;
  progress: RefObject<number>;
  cartRef: RefObject<THREE.Group | null>;
  shopperRef: RefObject<THREE.Group | null>;
  reducedMotion: boolean;
}) {
  const path = useRef<Path | null>(null);
  // One smoothed walk position drives everything, so position, head turn and cart stay in step.
  const walk = useRef({ p: 0, v: 0, started: false, walked: 0, x: 0, z: 0 });
  const point = useRef(new THREE.Vector3());
  const tangent = useRef(new THREE.Vector3());

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

    // `rest` is 1 standing at a stop and 0 mid-walk.
    const te = t * t * (3 - 2 * t);
    const travel = Math.sin(Math.PI * t);
    const rest = 1 - travel;
    const lerp = (x: number, y: number) => x + (y - x) * te;

    // Heading of the walk (the spline's direction), and the camera's resting view.
    curve.getTangent(Math.min(0.999, Math.max(0.001, pos / (stops - 1))), tangent.current);
    const heading = Math.atan2(-tangent.current.x, -tangent.current.z);
    const viewYaw = lerp(a.yaw, b.yaw) * (1 - 0.8 * travel);
    const viewPitch = lerp(a.pitch, b.pitch);

    // Shopper: ahead of the camera anchor and to the side at a stop, on the path while walking.
    const lat = lerp(a.lateral, b.lateral) * rest;
    const ahead = lerp(a.ahead, b.ahead);
    const sx = point.current.x + lat * Math.cos(viewYaw) - ahead * Math.sin(viewYaw);
    const sz = point.current.z - lat * Math.sin(viewYaw) - ahead * Math.cos(viewYaw);
    // Body faces the walk; standing, it turns part-way to the shelf and the head the rest.
    const bodyYaw = heading * travel + viewYaw * 0.5 * rest;

    const step = Math.hypot(sx - w.x, sz - w.z);
    w.x = sx;
    w.z = sz;
    w.walked += step;
    const speed = Math.min(1, Math.abs(w.v) * 2.2);

    // Camera: over the shoulder when standing, behind and above the shopper while walking.
    const backX = sx + 2.5 * Math.sin(heading);
    const backZ = sz + 2.5 * Math.cos(heading);
    const camX = point.current.x * rest + backX * travel;
    const camZ = point.current.z * rest + backZ * travel;
    const bob = reducedMotion ? 0 : Math.sin(w.walked * 4.8) * speed * 0.008;
    camera.position.set(camX, EYE + 0.62 * travel + bob, camZ);
    camera.rotation.set(viewPitch * rest - 0.24 * travel, viewYaw * rest + heading * travel, 0, "YXZ");

    const shopper = shopperRef.current;
    if (shopper) {
      shopper.position.set(sx, 0, sz);
      shopper.rotation.y = bodyYaw;
      shopper.userData.motion = {
        phase: (w.walked / 1.35) * Math.PI * 2, // one stride per 1.35 m
        amount: reducedMotion ? 0 : speed,
        look: (viewYaw - bodyYaw) * rest,
      };
    }

    const cart = cartRef.current;
    if (cart) {
      // The cart's handle sits in the shopper's hands, 0.55 m ahead of their feet.
      cart.position.set(sx - 0.55 * Math.sin(bodyYaw), 0, sz - 0.55 * Math.cos(bodyYaw));
      cart.rotation.y = bodyYaw;
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
