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
  const particleCount = 2000; // Increased particle count

  const particlesData = useMemo(() => {
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 15;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 15;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 15;

      // Random colors between purple and emerald
      colors[i * 3] = Math.random() * 0.5 + 0.5; // R
      colors[i * 3 + 1] = Math.random() * 0.3; // G
      colors[i * 3 + 2] = Math.random() * 0.8; // B

      sizes[i] = Math.random() * 2;
    }
    return { positions, colors, sizes };
  }, []);

  useFrame((state) => {
    if (points.current) {
      points.current.rotation.x += 0.0005;
      points.current.rotation.y += 0.0005;

      // Mouse interaction
      points.current.rotation.x += mouse.y * 0.00005;
      points.current.rotation.y += mouse.x * 0.00005;
    }
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particleCount}
          array={particlesData.positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={particleCount}
          array={particlesData.colors}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-size"
          count={particleCount}
          array={particlesData.sizes}
          itemSize={1}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.03}
        vertexColors
        transparent
        opacity={0.6}
        sizeAttenuation={true}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};

const FloatingGradients: React.FC = () => {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {[...Array(6)].map((_, i) => (
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
            duration: 20 + i * 5,
            repeat: Infinity,
            ease: "linear",
          }}
          style={{
            background: `radial-gradient(circle at center, 
              ${
                [
                  "rgba(139, 92, 246, 0.15)",
                  "rgba(99, 102, 241, 0.15)",
                  "rgba(236, 72, 153, 0.15)",
                  "rgba(16, 185, 129, 0.15)",
                  "rgba(124, 58, 237, 0.15)",
                  "rgba(52, 211, 153, 0.15)",
                ][i]
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
      <div className="absolute inset-0 bg-black" />
      <FloatingGradients />

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

      <div className="absolute inset-0 bg-[url('/noise.png')] opacity-20 mix-blend-overlay" />
    </div>
  );
};

export default PricingBackgroundAnimation;
