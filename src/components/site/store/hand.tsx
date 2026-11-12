"use client";

import { forwardRef, useEffect, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

// Rigged hand: the WebXR "generic-hand" model from @webxr-input-profiles/assets
// (MIT licence, see /public/models/hand-right.LICENSE.md). Its 25 joints come as flat
// siblings, set each frame by an XR runtime; here they are chained into fingers once and
// posed by hand into a relaxed open palm that a pack rests on.

const FINGERS = ["index-finger", "middle-finger", "ring-finger", "pinky-finger"] as const;
const SEGMENTS = ["metacarpal", "phalanx-proximal", "phalanx-intermediate", "phalanx-distal"] as const;
// Flexion per segment (radians, around each joint's x axis), little finger curls the most.
const CURL: Record<(typeof FINGERS)[number], number[]> = {
  "index-finger": [0.15, 0.35, 0.3, 0.2],
  "middle-finger": [0.1, 0.4, 0.35, 0.2],
  "ring-finger": [0.1, 0.45, 0.4, 0.25],
  "pinky-finger": [0.12, 0.5, 0.45, 0.3],
};
const THUMB: [string, number][] = [
  ["thumb-phalanx-proximal", 0.1],
  ["thumb-phalanx-distal", 0.15],
];

export type PosedHand = {
  object: THREE.Group;
  /** Point on the palm (in `object` space) where a pack's bottom rests. */
  palm: THREE.Vector3;
};

let cache: Promise<PosedHand> | null = null;

function loadHand(): Promise<PosedHand> {
  cache ??= new GLTFLoader().loadAsync("/models/hand-right.glb").then((gltf) => {
    const scene = gltf.scene;
    let mesh: THREE.SkinnedMesh | null = null;
    scene.traverse((o) => {
      if ((o as THREE.SkinnedMesh).isSkinnedMesh) mesh = o as THREE.SkinnedMesh;
    });
    if (!mesh) throw new Error("hand mesh missing");
    const skinned: THREE.SkinnedMesh = mesh;
    const bones: Record<string, THREE.Bone> = {};
    skinned.skeleton.bones.forEach((b) => (bones[b.name] = b));

    // chain the joints so bending one moves the rest of its finger
    scene.updateMatrixWorld(true);
    const chain = (names: string[]) => names.slice(1).forEach((n, i) => bones[names[i]].attach(bones[n]));
    chain(["wrist", "thumb-metacarpal", "thumb-phalanx-proximal", "thumb-phalanx-distal", "thumb-tip"]);
    for (const f of FINGERS) chain(["wrist", ...SEGMENTS.map((s) => `${f}-${s}`), `${f}-tip`]);

    const X = new THREE.Vector3(1, 0, 0);
    const bend = (name: string, a: number) => bones[name].quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(X, -a));
    for (const f of FINGERS) SEGMENTS.forEach((s, i) => bend(`${f}-${s}`, CURL[f][i]));
    THUMB.forEach(([n, a]) => bend(n, a));

    skinned.material = new THREE.MeshPhysicalMaterial({
      color: "#c98f72",
      roughness: 0.55,
      sheen: 0.6,
      sheenColor: new THREE.Color("#ffb8a0"),
      sheenRoughness: 0.6,
    });
    skinned.frustumCulled = false;
    skinned.castShadow = true;

    // Turn the wrist so the fingers point forward-left, palm up and slightly towards the viewer.
    // WebXR joints look down -Z towards the fingertips with +Y on the back of the hand.
    const wristQ = bones.wrist.getWorldQuaternion(new THREE.Quaternion());
    const fingers = new THREE.Vector3(-0.7, 0.18, -1).normalize();
    const back = new THREE.Vector3(0.3, -1, 0.6).normalize();
    const z = fingers.clone().negate();
    const x = new THREE.Vector3().crossVectors(back, z).normalize();
    const y = new THREE.Vector3().crossVectors(z, x);
    const want = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
    const object = new THREE.Group();
    object.add(scene);
    scene.quaternion.copy(want.multiply(wristQ.invert()));
    object.updateMatrixWorld(true);

    // sleeve over the wrist so the cut-off end of the hand model never shows
    const sleeve = new THREE.Mesh(
      new THREE.CylinderGeometry(0.034, 0.044, 0.32, 24, 1, true).rotateX(Math.PI / 2).translate(0, 0.005, 0.18),
      new THREE.MeshStandardMaterial({ color: "#26313a", roughness: 0.92, side: THREE.DoubleSide })
    );
    sleeve.castShadow = true;
    bones.wrist.add(sleeve);

    const a = bones["middle-finger-metacarpal"].getWorldPosition(new THREE.Vector3());
    const b = bones["middle-finger-phalanx-proximal"].getWorldPosition(new THREE.Vector3());
    const palm = a.lerp(b, 0.75).addScaledVector(y, -0.02);
    return { object, palm };
  });
  return cache;
}

/** The posed hand, loaded once and shared; renders nothing until the model has loaded. */
export const Hand = forwardRef<THREE.Group, { onReady?: (hand: PosedHand) => void }>(function Hand({ onReady }, ref) {
  const [hand, setHand] = useState<PosedHand | null>(null);
  useEffect(() => {
    let live = true;
    loadHand()
      .then((h) => {
        if (!live) return;
        setHand(h);
        onReady?.(h);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [onReady]);
  return <group ref={ref}>{hand && <primitive object={hand.object} />}</group>;
});
