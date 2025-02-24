import React, { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { motion } from "framer-motion";
import { useMousePosition } from "../hooks/useMousePosition";
import { AboutParticles } from "./AboutParticles";

const GeometricShapes: React.FC = () => {
  const shapes = [
    {
      type: "triangle",
      color: "rgba(99, 102, 241, 0.08)",
      size: "35vw",
      clipPath: "polygon(50% 0%, 100% 100%, 0% 100%)",
    },
    {
      type: "square",
      color: "rgba(16, 185, 129, 0.08)",
      size: "30vw",
      clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",
    },
    {
      type: "pentagon",
      color: "rgba(236, 72, 153, 0.08)",
      size: "40vw",
      clipPath: "polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)",
    },
    {
      type: "hexagon",
      color: "rgba(139, 92, 246, 0.08)",
      size: "45vw",
      clipPath: "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)",
    },
  ];

  return (
    <div className="absolute inset-0 overflow-hidden">
      {shapes.map((shape, i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{
            width: shape.size,
            height: shape.size,
          }}
          initial={{
            x: `${Math.random() * 100}%`,
            y: `${Math.random() * 100}%`,
            scale: 0.8,
            opacity: 0.1,
            rotate: 0,
          }}
          animate={{
            x: [`${Math.random() * 100}%`, `${Math.random() * 100}%`],
            y: [`${Math.random() * 100}%`, `${Math.random() * 100}%`],
            scale: [0.8, 1.2, 0.8],
            opacity: [0.1, 0.2, 0.1],
            rotate: [0, 180, 360],
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
              background: `radial-gradient(circle at center, ${shape.color} 0%, transparent 70%)`,
              filter: "blur(60px)",
              clipPath: shape.clipPath,
            }}
          />
        </motion.div>
      ))}
    </div>
  );
};

const ConnectedDots: React.FC = () => (
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

const AboutBackgroundAnimation: React.FC = () => {
  const mousePosition = useMousePosition();
  const normalizedMouse = {
    x: (mousePosition.x / window.innerWidth) * 2 - 1,
    y: -(mousePosition.y / window.innerHeight) * 2 + 1,
  };

  return (
    <div className="fixed inset-0 w-full h-full bg-background-950">
      {/* Base layer with grid */}
      <ConnectedDots />

      {/* Geometric Shapes */}
      <GeometricShapes />

      {/* Three.js Canvas */}
      <div className="absolute inset-0">
        <Canvas
          camera={{ position: [0, 0, 50], fov: 75, near: 0.1, far: 1000 }}
          dpr={[1, 2]}
        >
          <color attach="background" args={["#030303"]} />
          <Suspense fallback={null}>
            <AboutParticles mouse={normalizedMouse} />
          </Suspense>
        </Canvas>
      </div>

      {/* Dynamic gradient overlays */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        animate={{
          background: [
            "radial-gradient(circle at 20% 20%, rgba(99, 102, 241, 0.08) 0%, transparent 50%)",
            "radial-gradient(circle at 80% 80%, rgba(16, 185, 129, 0.08) 0%, transparent 50%)",
            "radial-gradient(circle at 50% 50%, rgba(236, 72, 153, 0.08) 0%, transparent 50%)",
            "radial-gradient(circle at 30% 70%, rgba(139, 92, 246, 0.08) 0%, transparent 50%)",
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

export default AboutBackgroundAnimation;
