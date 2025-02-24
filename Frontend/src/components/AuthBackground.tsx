import { motion } from "framer-motion";
import { useEffect, useRef } from "react";

const NoisePattern = () => (
  <svg
    className="absolute inset-0 w-full h-full opacity-[0.025]"
    xmlns="http://www.w3.org/2000/svg"
  >
    <filter id="noiseFilter">
      <feTurbulence
        type="fractalNoise"
        baseFrequency="0.6"
        stitchTiles="stitch"
        numOctaves="3"
      />
    </filter>
    <rect width="100%" height="100%" filter="url(#noiseFilter)" />
  </svg>
);

const AuthBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // Particle configuration
    const particles: Particle[] = [];
    const particleCount = Math.min(
      50,
      Math.floor((canvas.width * canvas.height) / 25000)
    );

    class Particle {
      x: number;
      y: number;
      size: number;
      speedX: number;
      speedY: number;
      opacity: number;
      hue: number;

      constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 2 + 0.5;
        this.speedX = Math.random() * 0.5 - 0.25;
        this.speedY = Math.random() * 0.5 - 0.25;
        this.opacity = Math.random() * 0.5 + 0.2;
        this.hue = Math.random() * 60 - 30; // Variation in color
      }

      update() {
        this.x += this.speedX;
        this.y += this.speedY;

        if (this.x > canvas.width) this.x = 0;
        if (this.x < 0) this.x = canvas.width;
        if (this.y > canvas.height) this.y = 0;
        if (this.y < 0) this.y = canvas.height;
      }

      draw() {
        if (!ctx) return;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${210 + this.hue}, 100%, 70%, ${this.opacity})`;
        ctx.fill();
      }
    }

    // Create particles
    for (let i = 0; i < particleCount; i++) {
      particles.push(new Particle());
    }

    // Animation loop
    const animate = () => {
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((particle) => {
        particle.update();
        particle.draw();
      });

      particles.forEach((particle1, i) => {
        particles.slice(i + 1).forEach((particle2) => {
          const dx = particle1.x - particle2.x;
          const dy = particle1.y - particle2.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const maxDistance = 150;

          if (distance < maxDistance) {
            const opacity = 0.15 * (1 - distance / maxDistance);
            ctx.beginPath();
            ctx.strokeStyle = `hsla(210, 100%, 70%, ${opacity})`;
            ctx.lineWidth = 0.5;
            ctx.moveTo(particle1.x, particle1.y);
            ctx.lineTo(particle2.x, particle2.y);
            ctx.stroke();
          }
        });
      });

      requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
    };
  }, []);

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {/* Black base background */}
      <div className="absolute inset-0 bg-black" />

      {/* Animated gradient overlay with whiter colors */}
      <motion.div
        animate={{
          background: [
            "radial-gradient(circle at 0% 0%, rgba(255, 255, 255, 0.07) 0%, transparent 50%)",
            "radial-gradient(circle at 100% 0%, rgba(255, 255, 255, 0.07) 0%, transparent 50%)",
            "radial-gradient(circle at 100% 100%, rgba(255, 255, 255, 0.07) 0%, transparent 50%)",
            "radial-gradient(circle at 0% 100%, rgba(255, 255, 255, 0.07) 0%, transparent 50%)",
            "radial-gradient(circle at 0% 0%, rgba(255, 255, 255, 0.07) 0%, transparent 50%)",
          ],
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        className="absolute inset-0"
      />

      {/* Geometric pattern using CSS - brighter dots */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `radial-gradient(circle at center, rgba(255, 255, 255, 0.8) 1px, transparent 1px)`,
          backgroundSize: "24px 24px",
        }}
      />

      {/* SVG Noise Filter - adjusted for more visibility */}
      <svg
        className="absolute inset-0 w-full h-full opacity-[0.025]"
        xmlns="http://www.w3.org/2000/svg"
      >
        <filter id="noiseFilter">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.6"
            stitchTiles="stitch"
            numOctaves="3"
          />
        </filter>
        <rect width="100%" height="100%" filter="url(#noiseFilter)" />
      </svg>

      {/* Particles canvas - brighter particles */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        style={{ opacity: 0.7 }}
      />

      {/* Subtle glass reflection effect */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent" />
    </div>
  );
};

export default AuthBackground;
