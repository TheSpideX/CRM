import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export const Particles = ({ mouse, count = 2000 }) => {
  const mesh = useRef();
  const light = useRef();

  // Generate random particles
  const particles = useMemo(() => {
    const temp = [];
    for (let i = 0; i < count; i++) {
      const time = Math.random() * 100;
      const factor = Math.random() * 20 + 10;
      const speed = Math.random() * 0.01;
      const x = Math.random() * 2000 - 1000;
      const y = Math.random() * 2000 - 1000;
      const z = Math.random() * 2000 - 1000;

      temp.push({ time, factor, speed, x, y, z });
    }
    return temp;
  }, [count]);

  // Create positions and colors
  const [positions, colors] = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    particles.forEach((particle, i) => {
      const i3 = i * 3;
      positions[i3] = particle.x;
      positions[i3 + 1] = particle.y;
      positions[i3 + 2] = particle.z;

      const color = new THREE.Color();
      color.setHSL(particle.x / 1000 + 0.5, 0.75, 0.75);
      colors[i3] = color.r;
      colors[i3 + 1] = color.g;
      colors[i3 + 2] = color.b;
    });

    return [positions, colors];
  }, [particles, count]);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();

    particles.forEach((particle, i) => {
      const i3 = i * 3;
      mesh.current.geometry.attributes.position.array[i3] = 
        particle.x + Math.sin(time * particle.speed + particle.factor) * 50;
      mesh.current.geometry.attributes.position.array[i3 + 1] = 
        particle.y + Math.cos(time * particle.speed + particle.factor) * 50;
      mesh.current.geometry.attributes.position.array[i3 + 2] = 
        particle.z + Math.cos(time * particle.speed + particle.factor) * 50;
    });

    mesh.current.geometry.attributes.position.needsUpdate = true;

    // Update light position based on mouse
    if (light.current) {
      light.current.position.x = mouse.x * 100;
      light.current.position.y = mouse.y * 100;
    }
  });

  return (
    <group>
      <pointLight ref={light} distance={200} intensity={2} color="white" />
      <points ref={mesh}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={positions.length / 3}
            array={positions}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-color"
            count={colors.length / 3}
            array={colors}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          size={2}
          vertexColors
          blending={THREE.AdditiveBlending}
          transparent
          sizeAttenuation
          depthWrite={false}
        />
      </points>
    </group>
  );
};
