import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { motion } from "framer-motion";
import { Suspense } from "react";
import { useMousePosition } from "../hooks/useMousePosition";
import * as THREE from "three";

const PricingParticles: React.FC<{ mouse: { x: number; y: number } }> = ({
  mouse,
}) => {
  const points = useRef<THREE.Points>(null);

  // Create particles data
  const particlesData = useMemo(() => {
    const positions = new Float32Array(1000 * 3);
    for (let i = 0; i < 1000; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 10;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 10;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 10;
    }
    return positions;
  }, []);

  useFrame((state) => {
    if (points.current) {
      points.current.rotation.x += 0.001;
      points.current.rotation.y += 0.001;
    }
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particlesData.length / 3}
          array={particlesData}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.02}
        color={new THREE.Color("#8B5CF6")}
        transparent
        opacity={0.6}
        sizeAttenuation={true}
      />
    </points>
  );
};

const FloatingGradients: React.FC = () => {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {[...Array(4)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-[45vw] h-[45vw] rounded-full"
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
            duration: 25 + i * 5,
            repeat: Infinity,
            ease: "linear",
          }}
          style={{
            background: `radial-gradient(circle at center, 
              ${
                i === 0
                  ? "rgba(139, 92, 246, 0.15)"
                  : i === 1
                    ? "rgba(99, 102, 241, 0.15)"
                    : i === 2
                      ? "rgba(236, 72, 153, 0.15)"
                      : "rgba(16, 185, 129, 0.15)"
              } 0%, 
              transparent 70%)`,
            filter: "blur(50px)",
          }}
        />
      ))}
    </div>
  );
};

const PricingBackgroundAnimation: React.FC = () => {
  const mousePosition = useMousePosition();
  const normalizedMouse = {
    x: (mousePosition.x / window.innerWidth) * 2 - 1,
    y: -(mousePosition.y / window.innerHeight) * 2 + 1,
  };

  return (
    <div className="absolute inset-0">
      {/* Black base background */}
      <div className="absolute inset-0 bg-black" />

      {/* Floating gradients */}
      <FloatingGradients />

      {/* Particles */}
      <Canvas
        camera={{ position: [0, 0, 5], fov: 50 }}
        style={{ position: "absolute" }}
      >
        <color attach="background" args={["black"]} />
        <ambientLight intensity={0.5} />
        <Suspense fallback={null}>
          <PricingParticles mouse={normalizedMouse} />
        </Suspense>
      </Canvas>

      {/* Animated gradient overlay */}
      <motion.div
        className="absolute inset-0"
        animate={{
          background: [
            "radial-gradient(circle at 20% 20%, rgba(139, 92, 246, 0.15) 0%, transparent 50%)",
            "radial-gradient(circle at 80% 80%, rgba(99, 102, 241, 0.15) 0%, transparent 50%)",
            "radial-gradient(circle at 50% 50%, rgba(16, 185, 129, 0.15) 0%, transparent 50%)",
          ],
        }}
        transition={{ duration: 20, repeat: Infinity, repeatType: "mirror" }}
      />

      {/* Noise texture */}
      <div className="absolute inset-0 bg-[url('/noise.png')] opacity-20 mix-blend-overlay" />
    </div>
  );
};

export default PricingBackgroundAnimation;
