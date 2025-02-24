import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { EffectComposer, Bloom } from "@react-three/postprocessing";

interface PricingParticlesProps {
  count?: number;
  mouse: { x: number; y: number };
}

export const PricingParticles: React.FC<PricingParticlesProps> = ({
  count = 150,
  mouse,
}) => {
  const points = useRef<THREE.Points>(null);
  const particleGroup = useRef<THREE.Group>(null);

  // Create particle system data
  const particleData = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const speeds = new Float32Array(count);
    const offsets = new Float32Array(count);

    // Create a gradient of colors
    const colorPalette = [
      new THREE.Color("#6366F1"), // Indigo
      new THREE.Color("#8B5CF6"), // Purple
      new THREE.Color("#EC4899"), // Pink
      new THREE.Color("#3B82F6"), // Blue
    ];

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      
      // Position in a circular pattern
      const radius = Math.random() * 15;
      const theta = Math.random() * Math.PI * 2;
      
      positions[i3] = Math.cos(theta) * radius;
      positions[i3 + 1] = Math.sin(theta) * radius;
      positions[i3 + 2] = (Math.random() - 0.5) * 5;

      // Random color from palette
      const color = colorPalette[Math.floor(Math.random() * colorPalette.length)];
      colors[i3] = color.r;
      colors[i3 + 1] = color.g;
      colors[i3 + 2] = color.b;

      // Random sizes and animation parameters
      sizes[i] = Math.random() * 0.5 + 0.1;
      speeds[i] = Math.random() * 0.02 + 0.01;
      offsets[i] = Math.random() * Math.PI * 2;
    }

    return {
      positions,
      colors,
      sizes,
      speeds,
      offsets,
    };
  }, [count]);

  useFrame((state) => {
    if (!points.current || !particleGroup.current) return;

    const time = state.clock.getElapsedTime();
    const positions = points.current.geometry.attributes.position.array as Float32Array;
    const sizes = points.current.geometry.attributes.size.array as Float32Array;

    // Rotate entire particle system
    particleGroup.current.rotation.z = time * 0.05;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const speed = particleData.speeds[i];
      const offset = particleData.offsets[i];

      // Orbital motion
      const radius = Math.sqrt(
        positions[i3] * positions[i3] + positions[i3 + 1] * positions[i3 + 1]
      );
      const angle = Math.atan2(positions[i3 + 1], positions[i3]) + speed;

      positions[i3] = Math.cos(angle) * radius;
      positions[i3 + 1] = Math.sin(angle) * radius;

      // Vertical floating motion
      positions[i3 + 2] = Math.sin(time * speed + offset) * 2;

      // Pulse size
      sizes[i] = particleData.sizes[i] * (1 + Math.sin(time * 2 + offset) * 0.3);

      // Mouse interaction
      const dx = mouse.x * 10 - positions[i3];
      const dy = mouse.y * 10 - positions[i3 + 1];
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 4) {
        const force = (1 - dist / 4) * 0.2;
        positions[i3] += dx * force;
        positions[i3 + 1] += dy * force;
      }
    }

    points.current.geometry.attributes.position.needsUpdate = true;
    points.current.geometry.attributes.size.needsUpdate = true;
  });

  return (
    <>
      <group ref={particleGroup}>
        <points ref={points}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={particleData.positions.length / 3}
              array={particleData.positions}
              itemSize={3}
            />
            <bufferAttribute
              attach="attributes-color"
              count={particleData.colors.length / 3}
              array={particleData.colors}
              itemSize={3}
            />
            <bufferAttribute
              attach="attributes-size"
              count={particleData.sizes.length}
              array={particleData.sizes}
              itemSize={1}
            />
          </bufferGeometry>
          <pointsMaterial
            size={1}
            sizeAttenuation={true}
            vertexColors
            transparent
            opacity={0.8}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          >
            <texture attach="map" url="/particle-texture.png" />
          </pointsMaterial>
        </points>
      </group>
      <EffectComposer>
        <Bloom
          intensity={1.5}
          luminanceThreshold={0.1}
          luminanceSmoothing={0.9}
          height={300}
        />
      </EffectComposer>
    </>
  );
};
