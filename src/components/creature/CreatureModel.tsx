import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { hslToHex, type Dna } from "@shared/dna";
import type { Mood } from "@shared/lifecycle";
import { patternTexture } from "./patternTexture";

export type CreatureModelProps = {
  dna: Dna;
  mood?: Mood;
  cosmetics?: string[];
  /** Animates the mouth. */
  speaking?: boolean;
  /** Scale multiplier. */
  scale?: number;
  /** Reduce animation work (lists, thumbnails). */
  lowPower?: boolean;
};

const BODY_SHAPE: Record<Dna["body"], { body: [number, number, number]; head: [number, number, number]; headY: number; transparent?: boolean }> = {
  blob: { body: [1, 0.85, 1], head: [0.001, 0.001, 0.001], headY: 0, },
  feline: { body: [0.78, 0.9, 0.78], head: [0.72, 0.68, 0.72], headY: 0.95 },
  dragonling: { body: [0.85, 0.95, 0.9], head: [0.66, 0.6, 0.78], headY: 1.0 },
  mech: { body: [0.9, 0.9, 0.9], head: [0.75, 0.6, 0.75], headY: 1.0 },
  spirit: { body: [0.85, 1.05, 0.85], head: [0.001, 0.001, 0.001], headY: 0, transparent: true },
  slime: { body: [1.05, 0.75, 1.05], head: [0.001, 0.001, 0.001], headY: 0, transparent: true },
  owl: { body: [0.85, 1.1, 0.85], head: [0.001, 0.001, 0.001], headY: 0 },
  axolotl: { body: [0.8, 0.8, 0.95], head: [0.7, 0.6, 0.7], headY: 0.9 },
};

export function CreatureModel({ dna, mood = "content", cosmetics = [], speaking = false, scale = 1, lowPower = false }: CreatureModelProps) {
  const root = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const mouth = useRef<THREE.Mesh>(null);
  const leftEye = useRef<THREE.Group>(null);
  const rightEye = useRef<THREE.Group>(null);
  const leftArm = useRef<THREE.Mesh>(null);
  const rightArm = useRef<THREE.Mesh>(null);
  const tail = useRef<THREE.Group>(null);
  const wingsL = useRef<THREE.Group>(null);
  const wingsR = useRef<THREE.Group>(null);
  const behaviour = useRef({ name: "idle", until: 0, start: 0 });

  const texture = useMemo(() => patternTexture(dna), [dna]);
  const shape = BODY_SHAPE[dna.body];
  const primary = hslToHex(dna.primary);
  const secondary = hslToHex(dna.secondary);
  const accent = hslToHex(dna.accent);
  const eyeColor = hslToHex(dna.eyeColor);
  const dead = mood === "dead";
  const sick = mood === "sick";
  const sleeping = mood === "sleeping";
  const bodyRadius = 0.75 * dna.size;
  const headless = shape.head[0] < 0.01;
  const eyeY = headless ? bodyRadius * shape.body[1] * 0.3 : shape.headY * dna.size * dna.headRatio;
  // Eyes must sit on the surface: for headless bodies the face lives on the body sphere itself.
  const faceRadius = headless ? bodyRadius * shape.body[2] : 0.72 * dna.size * dna.headRatio * shape.head[2];
  const eyeZ = faceRadius * 0.93;
  // The mouth is a thin arc: keep it just outside the surface so it never sinks into the body.
  const mouthZ = faceRadius + 0.03;
  const eyeSpread = headless ? bodyRadius * 0.38 : 0.26 * dna.size;
  const hornY = headless ? bodyRadius * shape.body[1] * 0.95 : eyeY + shape.head[1] * dna.size * dna.headRatio * 0.9;
  const earY = hornY - 0.05;

  const materialProps = useMemo(() => {
    const matCommon = {
      metalness: dna.metalness,
      roughness: dna.roughness,
      emissive: new THREE.Color(accent),
      emissiveIntensity: dead ? 0 : dna.glow * 0.25,
      transparent: Boolean(shape.transparent),
      opacity: shape.transparent ? 0.82 : 1,
      color: new THREE.Color(dead ? "#777" : sick ? "#9a9a9a" : "#ffffff"),
    };
    return matCommon;
  }, [dna, accent, dead, sick, shape.transparent]);

  useFrame(({ clock }, delta) => {
    const t = clock.getElapsedTime();
    const r = root.current;
    const b = body.current;
    if (!r || !b) return;

    // Dead: lie down, no animation.
    if (dead) {
      r.rotation.x = THREE.MathUtils.damp(r.rotation.x, Math.PI / 2.2, 2, delta);
      r.position.y = THREE.MathUtils.damp(r.position.y, -0.25, 2, delta);
      return;
    }
    r.rotation.x = THREE.MathUtils.damp(r.rotation.x, 0, 3, delta);

    // Pick an idle behaviour now and then.
    const beh = behaviour.current;
    if (!lowPower && t > beh.until) {
      const options = dna.idleBehaviours;
      beh.name = Math.random() < 0.55 ? "idle" : options[Math.floor(Math.random() * options.length)];
      beh.start = t;
      beh.until = t + (beh.name === "idle" ? 3 + Math.random() * 3 : 1.6 + Math.random() * 1.2);
    }
    const p = Math.min(1, (t - beh.start) / Math.max(0.01, beh.until - beh.start));
    const bump = Math.sin(p * Math.PI);

    // Breathing + mood bounce
    const energetic = mood === "ecstatic" || mood === "happy";
    const breathe = 1 + Math.sin(t * (sleeping ? 1.2 : 2.6) * dna.bounceFreq) * (sleeping ? 0.025 : 0.035);
    let bounce = energetic ? Math.abs(Math.sin(t * 3.2 * dna.bounceFreq)) * 0.12 : 0;
    if (mood === "sad" || mood === "tired" || sleeping) bounce = 0;
    let rotY = Math.sin(t * 0.6) * 0.12 * dna.wiggle;
    let rotZ = sick ? Math.sin(t * 7) * 0.04 : 0;
    let scaleX = breathe;
    let scaleY = 1 / breathe;
    let posY = bounce;
    let tilt = mood === "sad" ? 0.18 : sleeping ? 0.25 : mood === "bored" ? 0.08 : 0;

    switch (beh.name) {
      case "spin": rotY += p * Math.PI * 2; break;
      case "dance": rotZ += Math.sin(t * 9) * 0.18; posY += Math.abs(Math.sin(t * 9)) * 0.1; break;
      case "stretch": scaleY *= 1 + bump * 0.18; scaleX *= 1 - bump * 0.08; break;
      case "giggle": scaleX *= 1 + Math.sin(t * 24) * 0.04 * bump; posY += Math.abs(Math.sin(t * 24)) * 0.03 * bump; break;
      case "float": posY += bump * 0.35; break;
      case "sneeze": rotZ += (p > 0.8 ? Math.sin(t * 60) * 0.1 : 0) * bump; scaleX *= 1 + (p < 0.8 ? p * 0.08 : 0); break;
      case "peek": tilt -= bump * 0.25; rotY += bump * 0.5; break;
      case "stargaze": tilt -= bump * 0.5; break;
      case "nap-wobble": rotZ += Math.sin(t * 2) * 0.08 * bump; break;
      case "flex": scaleX *= 1 + bump * 0.08; break;
      case "yawn": break;
    }
    b.scale.set(scaleX, scaleY, scaleX);
    r.position.y = THREE.MathUtils.damp(r.position.y, posY, 8, delta);
    r.rotation.y = rotY;
    r.rotation.z = THREE.MathUtils.damp(r.rotation.z, rotZ, 8, delta);
    if (head.current) head.current.rotation.x = THREE.MathUtils.damp(head.current.rotation.x, tilt, 5, delta);

    // Arms
    const armSwing = beh.name === "wave" ? Math.sin(t * 10) * 0.9 : beh.name === "flex" ? -1.6 * bump : beh.name === "dance" ? Math.sin(t * 9) * 0.8 : Math.sin(t * 2) * 0.08;
    if (leftArm.current) leftArm.current.rotation.z = 0.5 + (beh.name === "flex" || beh.name === "dance" ? armSwing : armSwing * 0.3);
    if (rightArm.current) rightArm.current.rotation.z = -0.5 - (beh.name === "wave" || beh.name === "flex" || beh.name === "dance" ? armSwing : armSwing * 0.3);

    // Tail & wings
    if (tail.current) tail.current.rotation.y = Math.sin(t * (energetic ? 6 : 2.5)) * 0.45;
    const flap = Math.sin(t * (beh.name === "float" ? 14 : 4)) * (beh.name === "float" ? 0.9 : 0.25);
    if (wingsL.current) wingsL.current.rotation.y = -0.6 + flap;
    if (wingsR.current) wingsR.current.rotation.y = 0.6 - flap;

    // Blink
    const blinkPhase = (t * dna.blinkRate * 2) % 1;
    const blink = sleeping ? 0.08 : blinkPhase > 0.94 ? 0.12 : mood === "tired" ? 0.55 : 1;
    if (leftEye.current) leftEye.current.scale.y = THREE.MathUtils.damp(leftEye.current.scale.y, blink, 30, delta);
    if (rightEye.current) rightEye.current.scale.y = THREE.MathUtils.damp(rightEye.current.scale.y, blink, 30, delta);

    // Mouth
    if (mouth.current) {
      const open = speaking ? 0.5 + Math.abs(Math.sin(t * 16)) * 0.8 : beh.name === "yawn" ? 1 + bump * 1.5 : 1;
      const smile = mood === "sad" || sick || mood === "hungry" ? -1 : 1;
      // The half-torus arc spans the upper semicircle, so a smile (∪) needs a 180° turn.
      mouth.current.scale.set(1, open * 0.6, 1);
      mouth.current.rotation.z = smile > 0 ? Math.PI : 0;
      mouth.current.position.y = eyeY - (smile > 0 ? 0.16 : 0.26) * dna.size;
    }
  });

  const skin = (
    <meshStandardMaterial map={texture} {...materialProps} />
  );
  const accentMat = <meshStandardMaterial color={dead ? "#666" : secondary} metalness={dna.metalness} roughness={dna.roughness} emissive={accent} emissiveIntensity={dead ? 0 : dna.glow * 0.35} />;
  const hornMat = <meshStandardMaterial color={dead ? "#555" : accent} metalness={Math.max(0.3, dna.metalness)} roughness={0.35} emissive={accent} emissiveIntensity={dead ? 0 : dna.glow * 0.6} />;

  const eyes = (() => {
    const pupil = (
      <mesh position={[0, 0, 0.09]}>
        <sphereGeometry args={[0.055 * dna.size, 16, 16]} />
        <meshStandardMaterial color="#0b0b14" />
      </mesh>
    );
    const highlight = (
      <mesh position={[0.03, 0.04, 0.12]}>
        <sphereGeometry args={[0.02 * dna.size, 8, 8]} />
        <meshBasicMaterial color="#fff" />
      </mesh>
    );
    const ball = (sx = 1) => (
      <mesh scale={[sx, 1, 1]}>
        <sphereGeometry args={[0.12 * dna.size, 24, 24]} />
        <meshStandardMaterial color={dead ? "#555" : "#f7f7ff"} emissive={eyeColor} emissiveIntensity={dead ? 0 : 0.35} roughness={0.2} />
      </mesh>
    );
    if (dna.eyes === "visor") {
      return (
        <group ref={leftEye} position={[0, eyeY, eyeZ]}>
          <mesh>
            <boxGeometry args={[0.62 * dna.size, 0.14 * dna.size, 0.08]} />
            <meshStandardMaterial color="#05050a" metalness={0.9} roughness={0.15} emissive={eyeColor} emissiveIntensity={dead ? 0 : 0.9 + dna.glow} />
          </mesh>
        </group>
      );
    }
    if (dna.eyes === "cyclops") {
      return (
        <group ref={leftEye} position={[0, eyeY + 0.05, eyeZ]} scale={1.6}>
          {ball()}{pupil}{highlight}
        </group>
      );
    }
    const sx = dna.eyes === "almond" ? 1.35 : 1;
    const sy = dna.eyes === "sleepy" ? 0.45 : 1;
    return (
      <>
        <group ref={leftEye} position={[-eyeSpread, eyeY, eyeZ]} scale={[1, sy, 1]}>{ball(sx)}{pupil}{dna.eyes === "sparkle" && highlight}</group>
        <group ref={rightEye} position={[eyeSpread, eyeY, eyeZ]} scale={[1, sy, 1]}>{ball(sx)}{pupil}{dna.eyes === "sparkle" && highlight}</group>
      </>
    );
  })();

  const horns = (() => {
    const y = hornY;
    switch (dna.horns) {
      case "nub":
        return [-1, 1].map((s) => (
          <mesh key={s} position={[s * 0.22 * dna.size, y, 0]} rotation={[0, 0, -s * 0.4]}>
            <coneGeometry args={[0.08 * dna.size, 0.22 * dna.size, 12]} />{hornMat}
          </mesh>
        ));
      case "antler":
        return [-1, 1].map((s) => (
          <group key={s} position={[s * 0.25 * dna.size, y, 0]} rotation={[0, 0, -s * 0.5]}>
            <mesh><cylinderGeometry args={[0.03, 0.045, 0.45 * dna.size, 8]} />{hornMat}</mesh>
            <mesh position={[s * 0.1, 0.12, 0]} rotation={[0, 0, -s * 0.9]}><cylinderGeometry args={[0.02, 0.035, 0.25 * dna.size, 8]} />{hornMat}</mesh>
          </group>
        ));
      case "unicorn":
        return (
          <mesh position={[0, y + 0.05, 0.05]} rotation={[0.3, 0, 0]}>
            <coneGeometry args={[0.07 * dna.size, 0.5 * dna.size, 16]} />{hornMat}
          </mesh>
        );
      case "antenna":
        return [-1, 1].map((s) => (
          <group key={s} position={[s * 0.18 * dna.size, y, 0]}>
            <mesh><cylinderGeometry args={[0.02, 0.02, 0.4 * dna.size, 8]} /><meshStandardMaterial color="#333" metalness={0.9} roughness={0.3} /></mesh>
            <mesh position={[0, 0.22 * dna.size, 0]}><sphereGeometry args={[0.06 * dna.size, 12, 12]} /><meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={dead ? 0 : 1.5} /></mesh>
          </group>
        ));
      case "crystal":
        return [-1, 0, 1].map((s) => (
          <mesh key={s} position={[s * 0.2 * dna.size, y + (s === 0 ? 0.1 : 0), 0]} rotation={[0, 0.3 * s, -s * 0.35]}>
            <octahedronGeometry args={[0.12 * dna.size + (s === 0 ? 0.04 : 0), 0]} />
            <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={dead ? 0 : 0.8} transparent opacity={0.9} metalness={0.2} roughness={0.1} />
          </mesh>
        ));
      default:
        return null;
    }
  })();

  const ears = (() => {
    const y = earY;
    const x = (headless ? bodyRadius * shape.body[0] * 0.75 : 0.36 * dna.size);
    switch (dna.ears) {
      case "pointy":
        return [-1, 1].map((s) => (
          <mesh key={s} position={[s * x, y, 0]} rotation={[0, 0, -s * 0.5]}>
            <coneGeometry args={[0.13 * dna.size, 0.32 * dna.size, 4]} />{accentMat}
          </mesh>
        ));
      case "round":
        return [-1, 1].map((s) => (
          <mesh key={s} position={[s * x, y, 0]}>
            <sphereGeometry args={[0.16 * dna.size, 16, 16]} />{accentMat}
          </mesh>
        ));
      case "floppy":
        return [-1, 1].map((s) => (
          <mesh key={s} position={[s * (x + 0.05), y - 0.2, 0]} rotation={[0, 0, s * 0.3]}>
            <capsuleGeometry args={[0.09 * dna.size, 0.35 * dna.size, 4, 8]} />{accentMat}
          </mesh>
        ));
      case "fin":
        return [-1, 1].map((s) => (
          <mesh key={s} position={[s * x, y - 0.05, -0.05]} rotation={[0, s * 0.8, -s * 0.6]} scale={[0.5, 1, 1]}>
            <coneGeometry args={[0.2 * dna.size, 0.3 * dna.size, 3]} />{accentMat}
          </mesh>
        ));
      default:
        return null;
    }
  })();

  const tailNode = (() => {
    const z = -bodyRadius * shape.body[2] * 0.9;
    switch (dna.tail) {
      case "stub":
        return <mesh position={[0, -0.1, z]}><sphereGeometry args={[0.14 * dna.size, 12, 12]} />{accentMat}</mesh>;
      case "whip":
      case "cable": {
        const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, -0.1, 0), new THREE.Vector3(0, -0.2, -0.35), new THREE.Vector3(0.15, 0.1, -0.7), new THREE.Vector3(0.1, 0.5, -0.85)]);
        return (
          <group position={[0, 0, z]}>
            <mesh><tubeGeometry args={[curve, 24, 0.06 * dna.size, 10, false]} />{dna.tail === "cable" ? <meshStandardMaterial color="#222" metalness={0.95} roughness={0.25} /> : accentMat}</mesh>
            <mesh position={[0.1, 0.5, -0.85]}><sphereGeometry args={[0.09 * dna.size, 12, 12]} />{hornMat}</mesh>
          </group>
        );
      }
      case "fluffy":
        return (
          <group position={[0, -0.05, z]}>
            {[0, 1, 2, 3].map((i) => (
              <mesh key={i} position={[0, i * 0.12, -i * 0.2]}><sphereGeometry args={[(0.2 - i * 0.03) * dna.size, 12, 12]} />{accentMat}</mesh>
            ))}
          </group>
        );
      case "flame":
        return (
          <group position={[0, 0, z]}>
            <mesh rotation={[-0.8, 0, 0]} position={[0, 0.1, -0.2]}>
              <coneGeometry args={[0.14 * dna.size, 0.6 * dna.size, 12]} />
              <meshStandardMaterial color="#ff7a18" emissive="#ff4d00" emissiveIntensity={dead ? 0 : 2} transparent opacity={0.9} />
            </mesh>
          </group>
        );
      default:
        return null;
    }
  })();

  const wing = (side: number) => {
    const ref = side < 0 ? wingsL : wingsR;
    const x = side * bodyRadius * shape.body[0] * 0.75;
    const common = { position: [x, 0.2, -0.2] as [number, number, number] };
    switch (dna.wings) {
      case "bat":
        return (
          <group ref={ref} {...common}>
            <mesh position={[side * 0.4, 0.1, 0]} rotation={[0, 0, side * 0.3]} scale={[1, 0.8, 1]}>
              <coneGeometry args={[0.45 * dna.size, 0.08, 3]} />
              <meshStandardMaterial color={secondary} side={THREE.DoubleSide} transparent opacity={0.95} />
            </mesh>
          </group>
        );
      case "feather":
        return (
          <group ref={ref} {...common}>
            <mesh position={[side * 0.42, 0.15, 0]} rotation={[0.2, 0, side * 0.5]} scale={[1.6, 0.5, 0.2]}>
              <sphereGeometry args={[0.32 * dna.size, 16, 12]} />
              <meshStandardMaterial color="#f8f8ff" emissive={secondary} emissiveIntensity={0.15} />
            </mesh>
          </group>
        );
      case "fairy":
        return (
          <group ref={ref} {...common}>
            <mesh position={[side * 0.38, 0.25, 0]} rotation={[0, 0, side * 0.4]} scale={[1.1, 1.6, 0.05]}>
              <sphereGeometry args={[0.3 * dna.size, 16, 12]} />
              <meshStandardMaterial color={accent} transparent opacity={0.45} emissive={accent} emissiveIntensity={dead ? 0 : 0.8} side={THREE.DoubleSide} />
            </mesh>
          </group>
        );
      case "jet":
        return (
          <group ref={ref} {...common}>
            <mesh position={[side * 0.3, 0, -0.1]} rotation={[0, 0, side * 0.1]}>
              <boxGeometry args={[0.5 * dna.size, 0.12, 0.25]} />
              <meshStandardMaterial color="#2a2a33" metalness={0.95} roughness={0.2} />
            </mesh>
            <mesh position={[side * 0.3, 0, -0.26]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.06, 0.08, 0.1, 12]} />
              <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={dead ? 0 : 2.5} />
            </mesh>
          </group>
        );
      default:
        return null;
    }
  };

  const limbLen = 0.22 * dna.limbLength * dna.size;
  const limbMat = <meshStandardMaterial color={dead ? "#666" : secondary} metalness={dna.metalness} roughness={dna.roughness} />;

  const cosmeticNodes = (
    <>
      {cosmetics.includes("crown") && (
        <group position={[0, hornY + 0.12, 0]}>
          <mesh><torusGeometry args={[0.24 * dna.size, 0.045, 12, 32]} /><meshStandardMaterial color="#ffd54a" metalness={1} roughness={0.25} /></mesh>
          {[0, 1, 2, 3, 4].map((i) => (
            <mesh key={i} position={[Math.cos((i / 5) * Math.PI * 2) * 0.24 * dna.size, 0.1, Math.sin((i / 5) * Math.PI * 2) * 0.24 * dna.size]}>
              <coneGeometry args={[0.05, 0.16, 6]} /><meshStandardMaterial color="#ffd54a" metalness={1} roughness={0.25} />
            </mesh>
          ))}
        </group>
      )}
      {cosmetics.includes("shades") && dna.eyes !== "visor" && (
        <group position={[0, eyeY, eyeZ + 0.08]}>
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * eyeSpread, 0, 0]}><boxGeometry args={[0.28 * dna.size, 0.16 * dna.size, 0.05]} /><meshStandardMaterial color="#050508" metalness={0.8} roughness={0.1} /></mesh>
          ))}
          <mesh><boxGeometry args={[eyeSpread * 2, 0.03, 0.03]} /><meshStandardMaterial color="#050508" /></mesh>
        </group>
      )}
      {cosmetics.includes("halo") && (
        <mesh position={[0, hornY + 0.45, 0]} rotation={[Math.PI / 2.3, 0, 0]}>
          <torusGeometry args={[0.3 * dna.size, 0.03, 12, 40]} />
          <meshStandardMaterial color="#fff6c2" emissive="#ffe27a" emissiveIntensity={2.5} />
        </mesh>
      )}
    </>
  );

  return (
    <group ref={root} scale={scale}>
      <group ref={body}>
        {/* Body */}
        <mesh castShadow receiveShadow scale={shape.body} position={[0, 0, 0]}>
          {dna.body === "mech" ? <boxGeometry args={[bodyRadius * 1.6, bodyRadius * 1.6, bodyRadius * 1.6, 2, 2, 2]} /> : <sphereGeometry args={[bodyRadius, 48, 48]} />}
          {skin}
        </mesh>
        {/* Belly */}
        {!shape.transparent && dna.body !== "mech" && (
          <mesh position={[0, -0.1 * dna.size, bodyRadius * shape.body[2] * 0.55]} scale={[0.6, 0.7, 0.35]}>
            <sphereGeometry args={[bodyRadius, 24, 24]} />
            <meshStandardMaterial color={dead ? "#777" : "#fff5f0"} roughness={0.8} />
          </mesh>
        )}
        {/* Head */}
        {!headless && (
          <group ref={head} position={[0, shape.headY * dna.size * dna.headRatio, 0.05]}>
            <mesh castShadow scale={[shape.head[0] * dna.headRatio, shape.head[1] * dna.headRatio, shape.head[2] * dna.headRatio]}>
              {dna.body === "mech" ? <boxGeometry args={[1.1 * dna.size, 1.1 * dna.size, 1.1 * dna.size]} /> : <sphereGeometry args={[0.72 * dna.size, 40, 40]} />}
              {skin}
            </mesh>
            {dna.body === "dragonling" && (
              <mesh position={[0, -0.12 * dna.size, 0.5 * dna.size]} scale={[0.8, 0.5, 0.8]}>
                <sphereGeometry args={[0.32 * dna.size, 20, 20]} />{accentMat}
              </mesh>
            )}
            {dna.body === "axolotl" && [-1, 1].map((s) => (
              <group key={s} position={[s * 0.5 * dna.size, 0.05, -0.1]}>
                {[0, 1, 2].map((i) => (
                  <mesh key={i} position={[s * i * 0.07, (i - 1) * 0.12, -i * 0.05]} rotation={[0, 0, s * (0.9 + i * 0.3)]}>
                    <capsuleGeometry args={[0.04 * dna.size, 0.26 * dna.size, 4, 8]} />
                    <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={dead ? 0 : 0.6} />
                  </mesh>
                ))}
              </group>
            ))}
          </group>
        )}
        {/* Face (on head or body) */}
        <group position={headless ? [0, 0, 0] : [0, 0, 0.05]}>
          {eyes}
          <mesh ref={mouth} position={[0, eyeY - 0.22 * dna.size, mouthZ]} rotation={[0, 0, Math.PI]}>
            <torusGeometry args={[0.1 * dna.size, 0.025, 8, 16, Math.PI]} />
            <meshStandardMaterial color="#1a0a14" />
          </mesh>
          {dna.body === "owl" && (
            <mesh position={[0, eyeY - 0.12 * dna.size, eyeZ + 0.05]} rotation={[Math.PI / 2, 0, 0]}>
              <coneGeometry args={[0.07 * dna.size, 0.18 * dna.size, 8]} />{hornMat}
            </mesh>
          )}
          {sick && !dead && (
            <mesh position={[0.2, eyeY + 0.1, eyeZ]}>
              <sphereGeometry args={[0.04, 8, 8]} /><meshBasicMaterial color="#7fe3a0" />
            </mesh>
          )}
        </group>
        {horns}
        {ears}
        {/* Arms */}
        <mesh ref={leftArm} position={[-bodyRadius * shape.body[0] * 0.85, 0.05, 0.1]} rotation={[0, 0, 0.5]}>
          <capsuleGeometry args={[0.09 * dna.size, limbLen, 4, 10]} />{limbMat}
        </mesh>
        <mesh ref={rightArm} position={[bodyRadius * shape.body[0] * 0.85, 0.05, 0.1]} rotation={[0, 0, -0.5]}>
          <capsuleGeometry args={[0.09 * dna.size, limbLen, 4, 10]} />{limbMat}
        </mesh>
        {/* Legs */}
        {dna.body !== "spirit" && dna.body !== "slime" && [-1, 1].map((s) => (
          <mesh key={s} position={[s * 0.3 * dna.size, -bodyRadius * shape.body[1] * 0.85, 0.05]}>
            <capsuleGeometry args={[0.11 * dna.size, limbLen * 0.6, 4, 10]} />{limbMat}
          </mesh>
        ))}
        {/* Wings, tail, cosmetics */}
        <group ref={tail}>{tailNode}</group>
        {wing(-1)}
        {wing(1)}
        {cosmeticNodes}
        {/* Sleep / status overlays */}
        {sleeping && (
          <Html position={[0.6, hornY + 0.3, 0]} center className="pointer-events-none select-none">
            <div className="animate-float text-2xl font-black text-white/80 drop-shadow">z z z</div>
          </Html>
        )}
      </group>
    </group>
  );
}
