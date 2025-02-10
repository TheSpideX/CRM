import React, { Suspense, useRef, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { motion } from "framer-motion";
import { useMousePosition } from "../hooks/useMousePosition";
import { ResourceParticles } from "./ResourceParticles";
import { EffectComposer, Bloom } from "@react-three/postprocessing";

const FloatingOrbs: React.FC = () => {
  const orbs = useMemo(() => [
    { color: "#4F46E5", size: "30vw" }, // Indigo
    { color: "#10B981", size: "25vw" }, // Emerald
    { color: "#8B5CF6", size: "35vw" }, // Purple
    { color: "#EC4899", size: "28vw" }, // Pink
  ], []);

  return (
    <div className="absolute inset-0 overflow-hidden">
      {orbs.map((orb, i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{
            width: orb.size,
            height: orb.size,
          }}
          initial={{
            x: `${Math.random() * 100}%`,
            y: `${Math.random() * 100}%`,
            scale: 0.8,
            opacity: 0.1,
          }}
          animate={{
            x: [`${Math.random() * 100}%`, `${Math.random() * 100}%`],
            y: [`${Math.random() * 100}%`, `${Math.random() * 100}%`],
            scale: [0.8, 1.2, 0.8],
            opacity: [0.1, 0.3, 0.1],
          }}
          transition={{
            duration: 30 + i * 5,
            repeat: Infinity,
            ease: "linear",
          }}
        >
          <div
            className="w-full h-full"
            style={{
              background: `radial-gradient(circle at center, ${orb.color}20 0%, transparent 70%)`,
              filter: "blur(60px)",
            }}
          />
        </motion.div>
      ))}
    </div>
  );
};

const GridPattern: React.FC = () => (
  <div className="absolute inset-0 opacity-[0.07]">
    <div
      className="absolute inset-0"
      style={{
        backgroundImage: `linear-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px),
                         linear-gradient(90deg, rgba(255, 255, 255, 0.1) 1px, transparent 1px)`,
        backgroundSize: "40px 40px",
        backgroundPosition: "center",
      }}
    />
  </div>
);

const ResourceBackground: React.FC = () => {
  const mousePosition = useMousePosition();
  const normalizedMouse = {
    x: (mousePosition.x / window.innerWidth) * 2 - 1,
    y: -(mousePosition.y / window.innerHeight) * 2 + 1,
  };

  return (
    <div className="fixed inset-0 w-full h-full bg-background-950">
      {/* Base layer with grid */}
      <GridPattern />

      {/* Floating orbs layer */}
      <FloatingOrbs />

      {/* Three.js Canvas with particles */}
      <div className="absolute inset-0">
        <Canvas
          camera={{ position: [0, 0, 50], fov: 75, near: 0.1, far: 1000 }}
          dpr={[1, 2]}
        >
          <color attach="background" args={["#030303"]} />
          <ResourceParticles count={300} color="#4F46E5" />
          <EffectComposer>
            <Bloom
              intensity={2} // Increased from 1.5
              luminanceThreshold={0.1}
              luminanceSmoothing={0.9}
              radius={0.8}
            />
          </EffectComposer>
        </Canvas>
      </div>

      {/* Dynamic gradient overlays */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        animate={{
          background: [
            "radial-gradient(circle at 20% 20%, rgba(79, 70, 229, 0.15) 0%, transparent 50%)",
            "radial-gradient(circle at 80% 80%, rgba(16, 185, 129, 0.15) 0%, transparent 50%)",
            "radial-gradient(circle at 50% 50%, rgba(139, 92, 246, 0.15) 0%, transparent 50%)",
            "radial-gradient(circle at 30% 70%, rgba(236, 72, 153, 0.15) 0%, transparent 50%)",
          ],
        }}
        transition={{ duration: 20, repeat: Infinity, repeatType: "mirror" }}
      />

      {/* Noise texture and vignette */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-20 mix-blend-overlay pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/10 to-black/20" />
        <div className="absolute inset-0 bg-radial-gradient from-transparent to-black opacity-50" />
      </div>
    </div>
  );
};

export default ResourceBackground;
