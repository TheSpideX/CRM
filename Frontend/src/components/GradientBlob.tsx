import { useEffect, useRef } from "react";
import { motion } from "framer-motion";

export const GradientBlob = () => {
  const blobRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const blob = blobRef.current;
    if (!blob) return;

    const handleMouseMove = (e: MouseEvent) => {
      const { clientX, clientY } = e;
      const x = clientX / window.innerWidth;
      const y = clientY / window.innerHeight;

      blob.style.setProperty("--x", `${x * 100}%`);
      blob.style.setProperty("--y", `${y * 100}%`);
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <motion.div
      ref={blobRef}
      className="absolute inset-0 overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1 }}
    >
      <div
        className="absolute inset-0 bg-gradient-radial from-primary-500/20 via-background-900/5 to-transparent blur-3xl"
        style={{
          background: `radial-gradient(circle at var(--x, 50%) var(--y, 50%), 
                         rgba(var(--primary-500-rgb), 0.2) 0%,
                         rgba(var(--background-900-rgb), 0.05) 45%,
                         transparent 70%)`,
        }}
      />
    </motion.div>
  );
};
