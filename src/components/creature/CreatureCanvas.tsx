import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { ContactShadows, Float, OrbitControls, Sparkles } from "@react-three/drei";
import { hslToHex, type Dna } from "@shared/dna";
import type { Mood } from "@shared/lifecycle";
import { CreatureModel } from "./CreatureModel";
import { cn } from "@/lib/utils";

type Props = {
  dna: Dna;
  mood?: Mood;
  cosmetics?: string[];
  speaking?: boolean;
  className?: string;
  interactive?: boolean;
  autoRotate?: boolean;
  lowPower?: boolean;
  onClick?: () => void;
};

export function CreatureCanvas({ dna, mood = "content", cosmetics, speaking, className, interactive = true, autoRotate = false, lowPower = false, onClick }: Props) {
  const accent = hslToHex(dna.accent);
  const primary = hslToHex(dna.primary);
  const dead = mood === "dead";
  return (
    <div
      className={cn("relative h-full w-full overflow-hidden rounded-3xl", className)}
      style={{ background: `radial-gradient(ellipse at 50% 70%, ${primary}33, transparent 65%), radial-gradient(ellipse at 50% 0%, ${accent}22, transparent 60%)` }}
      onClick={onClick}
    >
      <Canvas shadows={!lowPower} dpr={lowPower ? [1, 1.25] : [1, 2]} camera={{ position: [0, 0.9, 4.3], fov: 38 }} gl={{ antialias: true, alpha: true }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[3, 5, 4]} intensity={1.6} castShadow={!lowPower} shadow-mapSize={[1024, 1024]} />
        <pointLight position={[-3, 2, -2]} intensity={dead ? 0.3 : 1.8 * (0.5 + dna.glow)} color={accent} />
        <pointLight position={[2, -1, 3]} intensity={0.8} color={primary} />
        <Suspense fallback={null}>
          <Float speed={dead ? 0 : 1.4} rotationIntensity={dead ? 0 : 0.15} floatIntensity={dead || mood === "sleeping" ? 0 : 0.5}>
            <group position={[0, -0.25, 0]}>
              <CreatureModel dna={dna} mood={mood} cosmetics={cosmetics} speaking={speaking} lowPower={lowPower} />
            </group>
          </Float>
          {!lowPower && !dead && <Sparkles count={Math.round(20 + dna.glow * 40)} scale={[4, 3, 3]} size={2.5} speed={0.4} color={accent} opacity={0.6} />}
          <ContactShadows position={[0, -1.25, 0]} opacity={0.55} scale={6} blur={2.4} far={2.5} color="#000" />
        </Suspense>
        {interactive && <OrbitControls enablePan={false} enableZoom={false} minPolarAngle={0.9} maxPolarAngle={1.9} autoRotate={autoRotate} autoRotateSpeed={0.8} />}
      </Canvas>
    </div>
  );
}
