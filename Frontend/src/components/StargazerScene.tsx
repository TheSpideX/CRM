import React, { useEffect, useState, useRef, useMemo } from 'react';
import { motion, useScroll, useTransform, useSpring, useMotionValue, AnimatePresence } from 'framer-motion';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Points, PointMaterial, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { create } from 'zustand';
import RobotSilhouette from './RobotSilhouette';

// Enhanced state management
interface SceneState {
  interactionCount: number;
  lastInteraction: Date | null;
  mousePosition: { x: number; y: number };
  incrementInteraction: () => void;
  updateMousePosition: (x: number, y: number) => void;
}

const useSceneStore = create<SceneState>((set) => ({
  interactionCount: 0,
  lastInteraction: null,
  mousePosition: { x: 0, y: 0 },
  incrementInteraction: () => set((state) => ({
    interactionCount: state.interactionCount + 1,
    lastInteraction: new Date()
  })),
  updateMousePosition: (x, y) => set({ mousePosition: { x, y } })
}));

// Enhanced child silhouette component
const ChildSilhouette: React.FC<{ isHovered: boolean }> = ({ isHovered }) => {
  return (
    <motion.div
      className="relative w-[300px] h-[400px]"
      animate={isHovered ? {
        filter: ['brightness(1.2)', 'brightness(1)', 'brightness(1.2)'],
      } : {}}
      transition={{ duration: 2, repeat: Infinity }}
    >
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-primary-500/20 to-primary-500/40"
        animate={{
          opacity: isHovered ? [0.3, 0.6, 0.3] : 0.3,
        }}
        transition={{ duration: 2, repeat: Infinity }}
      />
      
      {/* Enhanced glow effect */}
      <motion.div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(circle at 50% 50%, rgba(var(--primary-500), 0.3) 0%, transparent 70%)',
          filter: 'blur(20px)',
        }}
        animate={{
          scale: isHovered ? [1, 1.1, 1] : 1,
          opacity: isHovered ? [0.5, 0.8, 0.5] : 0.5,
        }}
        transition={{ duration: 2, repeat: Infinity }}
      />

      {/* Child figure - replace path with your actual silhouette SVG */}
      <svg
        viewBox="0 0 100 150"
        className="w-full h-full"
        style={{ filter: 'drop-shadow(0 0 10px rgba(var(--primary-500), 0.3))' }}
      >
        {/* Add your child silhouette path here */}
        <path
          d="M50 0C60 20 70 40 50 60C30 80 20 100 50 120C80 140 90 150 50 150"
          fill="none"
          stroke="rgba(var(--primary-500), 0.8)"
          strokeWidth="2"
        />
      </svg>
    </motion.div>
  );
};

// Enhanced star field with depth and color variation
const StarField: React.FC = () => {
  const points = useRef<THREE.Points>(null!);
  const { viewport } = useThree();

  const starCount = 5000;
  const positions = useMemo(() => {
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);
    
    for (let i = 0; i < starCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * viewport.width * 2;
      positions[i * 3 + 1] = (Math.random() - 0.5) * viewport.height * 2;
      positions[i * 3 + 2] = -Math.random() * 500;

      // Vary star colors
      const color = new THREE.Color();
      color.setHSL(Math.random() * 0.2 + 0.5, 0.8, 0.8);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }
    
    return { positions, colors };
  }, [viewport]);

  useFrame((state) => {
    points.current.rotation.x = state.clock.getElapsedTime() * 0.05;
    points.current.rotation.y = state.clock.getElapsedTime() * 0.03;
  });

  return (
    <Points ref={points}>
      <PointMaterial
        transparent
        size={2}
        sizeAttenuation={true}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        vertexColors
      />
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.positions.length / 3}
          array={positions.positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={positions.colors.length / 3}
          array={positions.colors}
          itemSize={3}
        />
      </bufferGeometry>
    </Points>
  );
};

// Main component
const StargazerScene: React.FC = () => {
  const { scrollY } = useScroll();
  const [isHovered, setIsHovered] = useState(false);
  const sceneRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Enhanced parallax effects
  const childX = useSpring(
    useTransform(mouseX, [-1000, 1000], [-30, 30]),
    { stiffness: 100, damping: 30 }
  );
  
  const childY = useSpring(
    useTransform(scrollY, [0, 1000], [0, 200]),
    { stiffness: 100, damping: 30 }
  );

  // Enhanced mouse tracking
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const rect = sceneRef.current?.getBoundingClientRect();
      if (rect) {
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;
        mouseX.set(x * 2 - 1);
        mouseY.set(y * 2 - 1);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div 
      ref={sceneRef}
      className="fixed right-0 top-0 bottom-0 w-[600px] overflow-hidden"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Background effects */}
      <motion.div
        className="absolute inset-0"
        animate={{
          background: [
            'radial-gradient(circle at 70% 50%, rgba(var(--primary-500), 0.15) 0%, transparent 70%)',
            'radial-gradient(circle at 70% 50%, rgba(var(--primary-500), 0.25) 0%, transparent 70%)',
          ],
        }}
        transition={{ duration: 4, repeat: Infinity, repeatType: "reverse" }}
      />

      {/* Star field canvas */}
      <Canvas
        camera={{ position: [0, 0, 50], fov: 75 }}
        className="absolute inset-0"
      >
        <StarField />
      </Canvas>

      {/* Robot container */}
      <motion.div
        className="absolute right-[50px] top-1/2 transform -translate-y-1/2" // Changed from right-[100px]
        style={{
          x: childX,
          y: childY,
        }}
      >
        <RobotSilhouette isHovered={isHovered} />
      </motion.div>

      {/* Energy streams */}
      <motion.div className="absolute inset-0">
        {Array.from({ length: 5 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute h-[2px] right-0 bg-gradient-to-l from-primary-500/40 to-transparent"
            style={{
              top: `${20 + i * 15}%`,
              width: '200px',
            }}
            animate={{
              scaleX: [1, 1.5, 1],
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: 2 + i,
              repeat: Infinity,
              repeatType: "reverse",
            }}
          />
        ))}
      </motion.div>
    </div>
  );
};

export default StargazerScene;
