import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface ResourceParticlesProps {
  count?: number;
  color?: string;
}

export const ResourceParticles: React.FC<ResourceParticlesProps> = ({
  count = 150,
  color = "#4F46E5",
}) => {
  const points = useRef<THREE.Points>(null);
  const lines = useRef<THREE.LineSegments>(null);
  const frameCount = useRef(0);

  const BOUNDARY = 100;
  const VELOCITY = 0.8;
  const MAX_DISTANCE = 10; // Maximum distance for line connections
  
  const particleData = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      
      positions[i3] = (Math.random() - 0.5) * BOUNDARY * 2;
      positions[i3 + 1] = (Math.random() - 0.5) * BOUNDARY * 2;
      positions[i3 + 2] = 0;

      velocities[i3] = (Math.random() - 0.5) * VELOCITY;
      velocities[i3 + 1] = (Math.random() - 0.5) * VELOCITY;
      velocities[i3 + 2] = 0;

      sizes[i] = Math.random() * 3 + 2;
    }

    return { positions, velocities, sizes };
  }, [count]);

  useFrame(() => {
    if (!points.current || !lines.current) return;

    frameCount.current += 1;

    const positions = points.current.geometry.attributes.position.array as Float32Array;
    const linePositions = lines.current.geometry.attributes.position.array as Float32Array;
    let lineIndex = 0;

    // Update particle positions and handle wrapping
    for (let i = 0; i < positions.length; i += 3) {
      // Update positions
      positions[i] += particleData.velocities[i];
      positions[i + 1] += particleData.velocities[i + 1];

      // Wrap around screen edges
      if (positions[i] > BOUNDARY) positions[i] = -BOUNDARY;
      else if (positions[i] < -BOUNDARY) positions[i] = BOUNDARY;
      
      if (positions[i + 1] > BOUNDARY) positions[i + 1] = -BOUNDARY;
      else if (positions[i + 1] < -BOUNDARY) positions[i + 1] = BOUNDARY;

      // Occasionally change velocity for more natural movement
      if (Math.random() < 0.001) {
        particleData.velocities[i] = (Math.random() - 0.5) * VELOCITY;
        particleData.velocities[i + 1] = (Math.random() - 0.5) * VELOCITY;
      }
    }

    // Clear previous lines
    linePositions.fill(0);
    
    // Create lines between nearby points
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const x1 = positions[i3];
      const y1 = positions[i3 + 1];

      for (let j = i + 1; j < count; j++) {
        const j3 = j * 3;
        const x2 = positions[j3];
        const y2 = positions[j3 + 1];

        const dx = x2 - x1;
        const dy = y2 - y1;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < MAX_DISTANCE && lineIndex < linePositions.length - 5) {
          // Start point
          linePositions[lineIndex++] = x1;
          linePositions[lineIndex++] = y1;
          linePositions[lineIndex++] = 0;

          // End point
          linePositions[lineIndex++] = x2;
          linePositions[lineIndex++] = y2;
          linePositions[lineIndex++] = 0;
        }
      }
    }

    points.current.geometry.attributes.position.needsUpdate = true;
    lines.current.geometry.attributes.position.needsUpdate = true;
    lines.current.geometry.setDrawRange(0, lineIndex / 3);
  });

  return (
    <group>
      <points ref={points}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={count}
            array={particleData.positions}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-size"
            count={count}
            array={particleData.sizes}
            itemSize={1}
          />
        </bufferGeometry>
        <pointsMaterial
          size={3.5}
          color={color}
          transparent
          opacity={1}
          sizeAttenuation={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
      <lineSegments ref={lines}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={count * count * 2}
            array={new Float32Array(count * count * 6)}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial
          color={color}
          transparent
          opacity={0.4}
          blending={THREE.AdditiveBlending}
        />
      </lineSegments>
    </group>
  );
};
