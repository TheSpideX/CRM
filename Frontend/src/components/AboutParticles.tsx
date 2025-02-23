import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface AboutParticlesProps {
  mouse: { x: number; y: number };
}

const getRandomVelocity = () => {
  const angle = Math.random() * Math.PI * 2;
  return {
    x: Math.cos(angle),
    y: Math.sin(angle)
  };
};

export const AboutParticles: React.FC<AboutParticlesProps> = ({ mouse }) => {
  const starsRef = useRef<THREE.Points>(null!);
  const cometsRef = useRef<THREE.Points>(null!);

  // Star configuration
  const starCount = 3000;
  const {
    starPositions,
    starColors,
    starScales,
    starTwinkleOffsets,
    starSpeeds,
    starTwinkleSpeeds,
  } = useMemo(() => {
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);
    const scales = new Float32Array(starCount);
    const twinkleOffsets = new Float32Array(starCount);
    const speeds = new Float32Array(starCount);
    const twinkleSpeeds = new Float32Array(starCount); // New array for individual twinkle speeds

    // Enhanced star color palette with brighter colors
    const colorPalette = [
      { r: 1.0, g: 1.0, b: 1.0 }, // Pure white
      { r: 1.0, g: 1.0, b: 1.2 }, // Bright blue-white
      { r: 1.2, g: 1.0, b: 0.9 }, // Bright warm white
      { r: 0.95, g: 0.95, b: 1.2 }, // Bright blue
      { r: 1.2, g: 0.9, b: 0.8 }, // Bright orange-white
    ];

    for (let i = 0; i < starCount; i++) {
      const i3 = i * 3;
      const layer = Math.floor(Math.random() * 3);

      // Position distribution in a circular pattern
      const radius = 50 + Math.random() * 150;
      const angle = Math.random() * Math.PI * 2;

      positions[i3] = Math.cos(angle) * radius;
      positions[i3 + 1] = Math.sin(angle) * radius;
      positions[i3 + 2] = -20 - layer * 30;

      speeds[i] =
        (0.00005 + Math.random() * 0.00015) * (Math.random() > 0.5 ? 1 : -1);

      // Enhanced brightness distribution
      const colorChoice = Math.random();
      const selectedColor =
        colorPalette[Math.floor(Math.random() * colorPalette.length)];

      if (colorChoice > 0.98) {
        // 2% chance for extra bright stars
        colors[i3] = selectedColor.r * 1.5; // Increased brightness
        colors[i3 + 1] = selectedColor.g * 1.5;
        colors[i3 + 2] = selectedColor.b * 1.5;
        scales[i] = 3.0; // Larger size
      } else if (colorChoice > 0.9) {
        // 8% chance for bright stars
        colors[i3] = selectedColor.r * 1.2;
        colors[i3 + 1] = selectedColor.g * 1.2;
        colors[i3 + 2] = selectedColor.b * 1.2;
        scales[i] = 2.0;
      } else if (colorChoice > 0.7) {
        // 20% chance for medium bright stars
        colors[i3] = selectedColor.r * 1.0;
        colors[i3 + 1] = selectedColor.g * 1.0;
        colors[i3 + 2] = selectedColor.b * 1.0;
        scales[i] = 1.5;
      } else {
        // 70% normal stars with increased base brightness
        colors[i3] = selectedColor.r * 0.8;
        colors[i3 + 1] = selectedColor.g * 0.8;
        colors[i3 + 2] = selectedColor.b * 0.8;
        scales[i] = 1.2;
      }

      twinkleOffsets[i] = Math.random() * Math.PI * 2;
      twinkleSpeeds[i] = 1.5 + Math.random() * 2; // Random speed between 1.5 and 3.5
    }

    return {
      starPositions: positions,
      starColors: colors,
      starScales: scales,
      starTwinkleOffsets: twinkleOffsets,
      starSpeeds: speeds,
      starTwinkleSpeeds: twinkleSpeeds, // Add to return object
    };
  }, []);

  // Improved comet/asteroid system configuration
  const cometCount = 12; // Increased for more asteroids
  const pointsPerComet = 30; // Increased for longer trails
  const { cometPositions, cometColors, cometScales, cometDirections } =
    useMemo(() => {
      const positions = new Float32Array(cometCount * pointsPerComet * 3);
      const colors = new Float32Array(cometCount * pointsPerComet * 3);
      const scales = new Float32Array(cometCount * pointsPerComet);
      const directions = Array(cometCount)
        .fill(0)
        .map(() => {
          const velocity = getRandomVelocity();
          return {
            velocityX: velocity.x,
            velocityY: velocity.y,
            speed: 0.3 + Math.random() * 0.2,
            size: 0.5 + Math.random() * 1.5,
          };
        });

      // Ensure asteroids are well-spaced initially
      const spacing = (Math.PI * 2) / cometCount;
      directions.forEach((dir, index) => {
        // Distribute initial angles evenly around the circle with some randomness
        dir.angle = spacing * index + Math.random() * spacing * 0.5;
        dir.dx = Math.cos(dir.angle) * dir.speed;
        dir.dy = Math.sin(dir.angle) * dir.speed;
      });

      for (let i = 0; i < cometCount; i++) {
        const baseIndex = i * pointsPerComet * 3;
        const dir = directions[i];

        // Distribute starting positions evenly around the edge
        const startAngle = (Math.PI * 2 * i) / cometCount + Math.random() * 0.5;
        const radius = 150 + Math.random() * 30; // Varied starting distances
        const startX = Math.cos(startAngle) * radius;
        const startY = Math.sin(startAngle) * radius;
        const startZ = (Math.random() - 0.5) * 30; // Reduced Z variation

        for (let j = 0; j < pointsPerComet; j++) {
          const j3 = baseIndex + j * 3;

          // Create more natural-looking trails
          const trailSpacing = j * (1 + Math.random() * 0.2); // Slightly randomized spacing
          positions[j3] = startX - trailSpacing * dir.dx * 2;
          positions[j3 + 1] = startY - trailSpacing * dir.dy * 2;
          positions[j3 + 2] = startZ + (Math.random() - 0.5) * 2; // Slight Z variation in trail

          // Enhanced trail fade effect
          const fade = Math.pow(1 - j / pointsPerComet, 1.5); // Adjusted power for sharper fade
          colors[j3] = fade * 0.8; // Slightly dimmer
          colors[j3 + 1] = fade * 0.85; // Slight color variation
          colors[j3 + 2] = fade * 0.9; // Slight blue tint

          // Varied scales along the trail
          scales[i * pointsPerComet + j] =
            dir.size * fade * (j === 0 ? 1 : 0.5);
        }
      }

      return {
        cometPositions: positions,
        cometColors: colors,
        cometScales: scales,
        cometDirections: directions,
      };
    }, []);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();

    if (starsRef.current) {
      const positions = starsRef.current.geometry.attributes.position
        .array as Float32Array;
      const colors = starsRef.current.geometry.attributes.color
        .array as Float32Array;
      const scales = starsRef.current.geometry.attributes.size
        .array as Float32Array;
      const originalColors = starColors;
      const originalScales = starScales;

      for (let i = 0; i < starCount; i++) {
        const i3 = i * 3;

        // Orbital motion
        const x = positions[i3];
        const y = positions[i3 + 1];
        const radius = Math.sqrt(x * x + y * y);
        const currentAngle = Math.atan2(y, x);
        const newAngle = currentAngle + starSpeeds[i];

        // Update positions with orbital motion
        positions[i3] = Math.cos(newAngle) * radius;
        positions[i3 + 1] = Math.sin(newAngle) * radius;

        // Mouse interaction effect
        const dx = positions[i3] - mouse.x * 100;
        const dy = positions[i3 + 1] - mouse.y * 100;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const maxDist = 50;

        if (dist < maxDist) {
          const force = (1 - dist / maxDist) * 0.2;
          positions[i3] += (dx / dist) * force;
          positions[i3 + 1] += (dy / dist) * force;
        }

        // Normalized twinkling effect that won't accumulate
        const twinkleAmount = 0.25;
        // Using a normalized sine wave that will always oscillate between 0.75 and 1.25
        const twinkleFactor =
          Math.sin(time * starTwinkleSpeeds[i] + starTwinkleOffsets[i]) *
            twinkleAmount +
          1;

        // Ensure colors never go below their original values
        colors[i3] = originalColors[i3] * twinkleFactor;
        colors[i3 + 1] = originalColors[i3 + 1] * twinkleFactor;
        colors[i3 + 2] = originalColors[i3 + 2] * twinkleFactor;

        // Keep scales proportional to original values
        scales[i] = originalScales[i] * (0.8 + twinkleFactor * 0.2);
      }

      starsRef.current.geometry.attributes.position.needsUpdate = true;
      starsRef.current.geometry.attributes.color.needsUpdate = true;
      starsRef.current.geometry.attributes.size.needsUpdate = true;
    }

    if (cometsRef.current) {
      const positions = cometsRef.current.geometry.attributes.position
        .array as Float32Array;

      // Update asteroids
      for (let i = 0; i < cometCount; i++) {
        const baseIndex = i * pointsPerComet * 3;
        const dir = cometDirections[i];

        // Move asteroid head
        positions[baseIndex] += dir.velocityX * dir.speed;
        positions[baseIndex + 1] += dir.velocityY * dir.speed;

        // Update trail
        for (let j = 1; j < pointsPerComet; j++) {
          const currentIndex = baseIndex + j * 3;
          const prevIndex = baseIndex + (j - 1) * 3;

          // Simple trail following
          const spacing = 2;
          positions[currentIndex] = positions[prevIndex] - dir.velocityX * spacing;
          positions[currentIndex + 1] = positions[prevIndex] - dir.velocityY * spacing;
          positions[currentIndex + 2] = positions[prevIndex + 2];
        }

        // Check boundaries and reset if needed
        const BOUNDARY = 200;
        if (
          Math.abs(positions[baseIndex]) > BOUNDARY ||
          Math.abs(positions[baseIndex + 1]) > BOUNDARY
        ) {
          // Reset position to a random edge of the screen
          const side = Math.floor(Math.random() * 4); // 0: top, 1: right, 2: bottom, 3: left
          
          switch (side) {
            case 0: // top
              positions[baseIndex] = (Math.random() - 0.5) * BOUNDARY * 2;
              positions[baseIndex + 1] = -BOUNDARY;
              break;
            case 1: // right
              positions[baseIndex] = BOUNDARY;
              positions[baseIndex + 1] = (Math.random() - 0.5) * BOUNDARY * 2;
              break;
            case 2: // bottom
              positions[baseIndex] = (Math.random() - 0.5) * BOUNDARY * 2;
              positions[baseIndex + 1] = BOUNDARY;
              break;
            case 3: // left
              positions[baseIndex] = -BOUNDARY;
              positions[baseIndex + 1] = (Math.random() - 0.5) * BOUNDARY * 2;
              break;
          }

          // Get new random velocity that points roughly toward the center
          const towardCenter = {
            x: -positions[baseIndex],
            y: -positions[baseIndex + 1]
          };
          
          // Normalize the toward-center vector
          const length = Math.sqrt(towardCenter.x * towardCenter.x + towardCenter.y * towardCenter.y);
          towardCenter.x /= length;
          towardCenter.y /= length;
          
          // Add randomness to the direction (±45 degrees)
          const randomAngle = (Math.random() - 0.5) * Math.PI / 2;
          const cos = Math.cos(randomAngle);
          const sin = Math.sin(randomAngle);
          
          dir.velocityX = towardCenter.x * cos - towardCenter.y * sin;
          dir.velocityY = towardCenter.x * sin + towardCenter.y * cos;
          
          // Randomize speed slightly
          dir.speed = 0.3 + Math.random() * 0.2;

          // Reset trail positions
          for (let j = 1; j < pointsPerComet; j++) {
            const j3 = baseIndex + j * 3;
            positions[j3] = positions[baseIndex];
            positions[j3 + 1] = positions[baseIndex + 1];
            positions[j3 + 2] = positions[baseIndex + 2];
          }
        }
      }

      cometsRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <>
      <points ref={starsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={starPositions.length / 3}
            array={starPositions}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-color"
            count={starColors.length / 3}
            array={starColors}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-size"
            count={starScales.length}
            array={starScales}
            itemSize={1}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.3} // Increased from 0.2
          vertexColors
          transparent
          opacity={1}
          sizeAttenuation={true}
          blending={THREE.AdditiveBlending}
        />
      </points>

      <points ref={cometsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={cometPositions.length / 3}
            array={cometPositions}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-color"
            count={cometColors.length / 3}
            array={cometColors}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-size"
            count={cometScales.length}
            array={cometScales}
            itemSize={1}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.5}
          vertexColors
          transparent
          opacity={0.8}
          sizeAttenuation={true}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </>
  );
};
