import { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface FeatureParticlesProps {
  count?: number;
  mouse: { x: number; y: number };
  color?: string;
  size?: number;
  speed?: number;
}

export const FeatureParticles: React.FC<FeatureParticlesProps> = ({
  count = 200,
  mouse,
  color = "#4F46E5",
  size = 0.1, // Reduced from 2.0
  speed = 0.03, // Slightly reduced for smoother movement
}) => {
  const points = useRef<THREE.Points>(null);
  const lines = useRef<THREE.LineSegments>(null);
  const lightningRef = useRef<THREE.PointLight>(null);
  const lastLightningTime = useRef(0);
  const lightningDuration = useRef(0);

  const particleData = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const color1 = new THREE.Color(color);
    const color2 = new THREE.Color().setHSL(
      color1.getHSL({ h: 0, s: 0, l: 0 }).h,
      0.8,
      0.6
    );

    for (let i = 0; i < count; i++) {
      // Position - spread particles across a larger area
      positions[i * 3] = (Math.random() - 0.5) * 40; // x
      positions[i * 3 + 1] = (Math.random() - 0.5) * 40; // y
      positions[i * 3 + 2] = (Math.random() - 0.5) * 40; // z

      // Color
      const mixedColor = color1.clone().lerp(color2, Math.random() * 0.5);
      colors[i * 3] = mixedColor.r;
      colors[i * 3 + 1] = mixedColor.g;
      colors[i * 3 + 2] = mixedColor.b;

      // Size
      sizes[i] = Math.random() * size;
    }

    return { positions, colors, sizes };
  }, [count, color, size]);

  // Add velocity state for each particle
  const velocities = useMemo(() => {
    const vels = new Float32Array(count * 3);
    for (let i = 0; i < count * 3; i += 3) {
      vels[i] = (Math.random() - 0.5) * 0.1; // x velocity
      vels[i + 1] = (Math.random() - 0.5) * 0.1; // y velocity
      vels[i + 2] = (Math.random() - 0.5) * 0.1; // z velocity
    }
    return vels;
  }, [count]);

  // Create line geometry
  const lineGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * count * 3 * 2); // Maximum possible lines
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return geometry;
  }, [count]);

  useFrame((state) => {
    if (!points.current || !lightningRef.current || !lines.current) return;

    const time = state.clock.getElapsedTime();
    const positions = points.current.geometry.attributes.position
      .array as Float32Array;
    const linePositions = lines.current.geometry.attributes.position
      .array as Float32Array;
    let lineIndex = 0;

    // Update particle positions using velocities
    for (let i = 0; i < count * 3; i += 3) {
      // Apply velocity to position
      positions[i] += velocities[i];
      positions[i + 1] += velocities[i + 1];
      positions[i + 2] += velocities[i + 2];

      // Wrap around screen edges
      const boundary = 20;
      for (let j = 0; j < 3; j++) {
        if (positions[i + j] > boundary) {
          positions[i + j] = -boundary;
        } else if (positions[i + j] < -boundary) {
          positions[i + j] = boundary;
        }
      }

      // Occasionally change velocity slightly for more natural movement
      if (Math.random() < 0.01) {
        velocities[i] += (Math.random() - 0.5) * 0.02;
        velocities[i + 1] += (Math.random() - 0.5) * 0.02;
        velocities[i + 2] += (Math.random() - 0.5) * 0.02;

        // Clamp velocities to prevent particles from moving too fast
        const maxVelocity = 0.01;
        velocities[i] = Math.max(
          Math.min(velocities[i], maxVelocity),
          -maxVelocity
        );
        velocities[i + 1] = Math.max(
          Math.min(velocities[i + 1], maxVelocity),
          -maxVelocity
        );
        velocities[i + 2] = Math.max(
          Math.min(velocities[i + 2], maxVelocity),
          -maxVelocity
        );
      }
    }

    // Create lines between nearby particles
    for (let i = 0; i < count; i++) {
      const x1 = positions[i * 3];
      const y1 = positions[i * 3 + 1];
      const z1 = positions[i * 3 + 2];

      for (let j = i + 1; j < count; j++) {
        const x2 = positions[j * 3];
        const y2 = positions[j * 3 + 1];
        const z2 = positions[j * 3 + 2];

        const distance = Math.sqrt(
          Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2) + Math.pow(z2 - z1, 2)
        );

        // Only draw lines between particles that are close enough
        if (distance < 8) {
          // Increased from 5 to 8 for more connections
          // Start point
          linePositions[lineIndex++] = x1;
          linePositions[lineIndex++] = y1;
          linePositions[lineIndex++] = z1;

          // End point
          linePositions[lineIndex++] = x2;
          linePositions[lineIndex++] = y2;
          linePositions[lineIndex++] = z2;
        }
      }
    }

    // Update geometries
    points.current.geometry.attributes.position.needsUpdate = true;
    lines.current.geometry.attributes.position.needsUpdate = true;
    // Set the draw range to only show the lines we've actually created
    lines.current.geometry.setDrawRange(0, lineIndex / 3);

    // Lightning effect
    if (time - lastLightningTime.current > Math.random() * 10 + 5) {
      // Increased delay between lightning
      lastLightningTime.current = time;
      lightningDuration.current = Math.random() * 0.1 + 0.005; // Reduced duration
      lightningRef.current.position.set(
        (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 20
      );
      lightningRef.current.intensity = 100; // Reduced initial intensity
    }

    if (time - lastLightningTime.current < lightningDuration.current) {
      lightningRef.current.intensity *= 0.15; // Faster fade-out
    } else {
      lightningRef.current.intensity = 0;
    }
  });

  return (
    <>
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
          size={size}
          sizeAttenuation={true}
          vertexColors
          transparent
          opacity={0.6}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>

      <lineSegments ref={lines}>
        <bufferGeometry {...lineGeometry}>
          <lineBasicMaterial
            attach="material"
            color={color}
            transparent
            opacity={0.03} // Reduced from 0.1 to 0.03
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            linewidth={0.5} // Added explicit line width (though note that WebGL doesn't support line widths > 1)
          />
        </bufferGeometry>
      </lineSegments>

      <pointLight
        ref={lightningRef}
        color={color}
        intensity={0}
        distance={50}
        decay={2}
      />

      <pointLight
        color={color}
        intensity={0.5}
        position={[0, 0, 0]}
        distance={20}
        decay={2}
      />
    </>
  );
};
