import { useRef, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import { useMousePosition } from "../hooks/useMousePosition";
import { motion, useScroll, useTransform } from "framer-motion";
import { PricingParticles } from "./PricingParticles";

const FloatingOrbs: React.FC = () => {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {[...Array(3)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-[40vw] h-[40vw] rounded-full"
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
            duration: 20 + i * 5,
            repeat: Infinity,
            ease: "linear",
          }}
          style={{
            background: `radial-gradient(circle at center, 
              ${
                i === 0
                  ? "rgba(99, 102, 241, 0.2)"
                  : i === 1
                    ? "rgba(139, 92, 246, 0.2)"
                    : "rgba(236, 72, 153, 0.2)"
              } 0%, 
              transparent 70%)`,
            filter: "blur(40px)",
          }}
        />
      ))}
    </div>
  );
};

const GridPattern: React.FC = () => {
  return (
    <div className="absolute inset-0 opacity-[0.15]">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `linear-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px), 
                           linear-gradient(90deg, rgba(255, 255, 255, 0.1) 1px, transparent 1px)`,
          backgroundSize: "50px 50px",
          backgroundPosition: "center",
        }}
      />
    </div>
  );
};

const BackgroundAnimation: React.FC = () => {
  const mousePosition = useMousePosition();
  const { scrollYProgress } = useScroll();

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

      {/* Floating Orbs */}
      <FloatingOrbs />

      {/* Three.js Canvas */}
      <Canvas
        camera={{ position: [0, 0, 15], fov: 75, near: 0.1, far: 1000 }}
        dpr={[1, 2]}
      >
        <color attach="background" args={["transparent"]} />
        <ambientLight intensity={0.5} />
        <Suspense fallback={null}>
          <PricingParticles mouse={normalizedMouse} />
        </Suspense>
      </Canvas>

      {/* Gradient Overlay */}
      <motion.div
        className="absolute inset-0"
        animate={{
          background: [
            "radial-gradient(circle at 20% 20%, rgba(99, 102, 241, 0.15) 0%, transparent 50%)",
            "radial-gradient(circle at 80% 80%, rgba(139, 92, 246, 0.15) 0%, transparent 50%)",
            "radial-gradient(circle at 50% 50%, rgba(236, 72, 153, 0.15) 0%, transparent 50%)",
          ],
        }}
        transition={{ duration: 20, repeat: Infinity, repeatType: "mirror" }}
      />

      {/* Noise texture */}
      <div className="absolute inset-0 bg-[url('/noise.png')] opacity-20 mix-blend-overlay" />
    </div>
  );
};

export default BackgroundAnimation;
