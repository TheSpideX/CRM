import React, { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { motion } from "framer-motion";
import { useMousePosition } from "../hooks/useMousePosition";
import { ResourceParticles } from "./ResourceParticles";

const GridPattern: React.FC = () => {
  return (
    <div className="absolute inset-0 opacity-[0.15]">
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
};

const FloatingShapes: React.FC = () => {
  const shapes = [
    { color: "rgba(99, 102, 241, 0.15)", size: "40vw" }, // Indigo
    { color: "rgba(16, 185, 129, 0.15)", size: "35vw" }, // Emerald
    { color: "rgba(236, 72, 153, 0.15)", size: "45vw" }, // Pink
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
            opacity: [0.1, 0.3, 0.1],
            rotate: [0, 180, 360],
          }}
          transition={{
            duration: 25 + i * 5,
            repeat: Infinity,
            ease: "linear",
          }}
        >
          <div
            className="w-full h-full"
            style={{
              background: `radial-gradient(circle at center, ${shape.color} 0%, transparent 70%)`,
              filter: "blur(60px)",
              clipPath:
                i === 0
                  ? "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)"
                  : i === 1
                    ? "circle(50% at 50% 50%)"
                    : "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)",
            }}
          />
        </motion.div>
      ))}
    </div>
  );
};

const ResourceBackgroundAnimation: React.FC = () => {
  const mousePosition = useMousePosition();
  const normalizedMouse = {
    x: (mousePosition.x / window.innerWidth) * 2 - 1,
    y: -(mousePosition.y / window.innerHeight) * 2 + 1,
  };

  return (
    <div className="fixed inset-0 w-full h-full">
      {/* Base background */}
      <div className="absolute inset-0 bg-black" />

      {/* Grid Pattern */}
      <GridPattern />

      {/* Floating Shapes */}
      <FloatingShapes />

      {/* Three.js Canvas */}
      <Canvas
        camera={{ position: [0, 0, 15], fov: 75, near: 0.1, far: 1000 }}
        dpr={[1, 2]}
      >
        <color attach="background" args={["transparent"]} />
        <ambientLight intensity={0.5} />
        <Suspense fallback={null}>
          <ResourceParticles mouse={normalizedMouse} />
        </Suspense>
      </Canvas>

      {/* Gradient Overlay */}
      <motion.div
        className="absolute inset-0"
        animate={{
          background: [
            "radial-gradient(circle at 20% 20%, rgba(99, 102, 241, 0.1) 0%, transparent 50%)",
            "radial-gradient(circle at 80% 80%, rgba(16, 185, 129, 0.1) 0%, transparent 50%)",
            "radial-gradient(circle at 50% 50%, rgba(236, 72, 153, 0.1) 0%, transparent 50%)",
          ],
        }}
        transition={{ duration: 20, repeat: Infinity, repeatType: "mirror" }}
      />

      {/* Noise texture */}
      <div className="absolute inset-0 bg-[url('/noise.png')] opacity-20 mix-blend-overlay" />
    </div>
  );
};

export default ResourceBackgroundAnimation;
