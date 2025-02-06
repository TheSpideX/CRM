import { useRef, useMemo } from "react";
import { Points, PointMaterial } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface ParticlesProps {
  count?: number;
  mouse: { x: number; y: number };
}

export const Particles: React.FC<ParticlesProps> = ({
  count = 4000, // Increased for richer visual effect
  mouse,
}) => {
  const points = useRef<any>();
  const rotationSpeed = useRef({ x: 0, y: 0 });
  const hover = useRef({ x: 0, y: 0 });

  // Create particles data
  const particles = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const scales = new Float32Array(count);

    // Create multiple shells of particles with optimized distribution
    const numberOfShells = 7; // Increased number of shells for more depth
    const baseRadius = 15; // Increased base radius for larger effect
    const radiusIncrement = 8; // Adjusted spacing between shells

    for (let i = 0; i < count; i++) {
      const shellIndex = Math.floor(i / (count / numberOfShells));
      const shellRadius = baseRadius + shellIndex * radiusIncrement;

      // Enhanced Fibonacci sphere distribution
      const phi = Math.acos(1 - (2 * (i % (count / numberOfShells))) / (count / numberOfShells));
      const theta = Math.PI * (1 + Math.sqrt(5)) * (i % (count / numberOfShells));

      // Add subtle randomness to positions for more natural look
      const randomOffset = Math.random() * 0.5;
      positions[i * 3] = (shellRadius + randomOffset) * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = (shellRadius + randomOffset) * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = (shellRadius + randomOffset) * Math.cos(phi);

      // Enhanced color distribution with more variety
      const colorChoice = Math.random();
      if (colorChoice > 0.995) {
        // 0.5% super bright white stars
        colors[i * 3] = 1;
        colors[i * 3 + 1] = 1;
        colors[i * 3 + 2] = 1;
        scales[i] = 2.5; // Much larger for emphasis
      } else if (colorChoice > 0.98) {
        // 1.5% bright golden stars
        colors[i * 3] = 1;
        colors[i * 3 + 1] = 0.9;
        colors[i * 3 + 2] = 0.7;
        scales[i] = 1.8;
      } else if (colorChoice > 0.95) {
        // 3% bright blue-white stars
        colors[i * 3] = 0.95;
        colors[i * 3 + 1] = 0.97;
        colors[i * 3 + 2] = 1;
        scales[i] = 1.4;
      } else if (colorChoice > 0.8) {
        // 15% medium brightness cyan-tinted stars
        colors[i * 3] = 0.8;
        colors[i * 3 + 1] = 0.95;
        colors[i * 3 + 2] = 1;
        scales[i] = 1.0;
      } else {
        // 80% background stars with color variation
        const intensity = 0.6 + Math.random() * 0.3;
        const blueShift = Math.random() * 0.2; // Adds subtle color variation
        colors[i * 3] = intensity * 0.7;
        colors[i * 3 + 1] = intensity * (0.85 + blueShift);
        colors[i * 3 + 2] = intensity * (0.95 + blueShift);
        scales[i] = 0.6 + Math.random() * 0.4;
      }

      // Scale adjustment based on shell position
      scales[i] *= 1 + shellIndex * 0.1;
    }

    return {
      positions,
      colors,
      scales,
    };
  }, [count]);

  useFrame((state) => {
    if (!points.current) return;

    const time = state.clock.getElapsedTime();

    // Minimal rotation speeds
    points.current.rotation.x += 0.00005; // Drastically reduced
    points.current.rotation.y += 0.00005; // Drastically reduced
    points.current.rotation.z += 0.00002; // Drastically reduced

    // Minimal mouse influence
    rotationSpeed.current.x = THREE.MathUtils.lerp(
      rotationSpeed.current.x,
      mouse.y * 0.0002, // Drastically reduced
      0.005
    );
    rotationSpeed.current.y = THREE.MathUtils.lerp(
      rotationSpeed.current.y,
      mouse.x * 0.0002, // Drastically reduced
      0.005
    );

    // Minimal floating motion
    points.current.position.y = Math.sin(time * 0.1) * 0.3; // Reduced amplitude and frequency
    points.current.position.x = Math.cos(time * 0.1) * 0.3;
    points.current.position.z = Math.sin(time * 0.05) * 0.2;

    // Enhanced breathing effect with varying intensity
    const primaryBreathing = Math.sin(time * 0.3) * 0.03;
    const secondaryBreathing = Math.sin(time * 0.7) * 0.02;
    const breathingScale = 1 + primaryBreathing + secondaryBreathing;
    points.current.scale.set(breathingScale, breathingScale, breathingScale);
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particles.positions.length / 3}
          array={particles.positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={particles.colors.length / 3}
          array={particles.colors}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-size"
          count={particles.scales.length}
          array={particles.scales}
          itemSize={1}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.12}
        sizeAttenuation={true}
        vertexColors
        transparent
        opacity={0.8}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
};
