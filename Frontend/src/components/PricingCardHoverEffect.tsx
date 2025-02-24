import { motion } from "framer-motion";
import React from "react";

interface PricingCardHoverEffectProps {
  isHovered: boolean;
  gradient: string;
}

export const PricingCardHoverEffect: React.FC<PricingCardHoverEffectProps> = ({
  isHovered,
  gradient,
}) => {
  return (
    <>
      {/* Gradient border effect */}
      <motion.div
        className="absolute -inset-[1px] rounded-3xl opacity-0"
        animate={{
          opacity: isHovered ? 1 : 0,
          background: gradient,
        }}
        transition={{ duration: 0.3 }}
      />

      {/* Radial glow effect */}
      <motion.div
        className="absolute inset-0 rounded-3xl"
        animate={{
          opacity: isHovered ? 1 : 0,
          scale: isHovered ? 1.05 : 1,
        }}
        transition={{ duration: 0.4 }}
        style={{
          background:
            "radial-gradient(circle at center, rgba(255,255,255,0.15) 0%, transparent 70%)",
          filter: "blur(20px)",
        }}
      />

      {/* Shimmer effect */}
      <motion.div
        className="absolute inset-0"
        animate={{
          opacity: isHovered ? 0.15 : 0,
        }}
        transition={{ duration: 0.3 }}
        style={{
          background:
            "linear-gradient(45deg, transparent, rgba(255,255,255,0.3), transparent)",
          backgroundSize: "200% 200%",
          animation: isHovered ? "shimmer 2s infinite" : "none",
        }}
      />

      {/* Sparkle effect */}
      <motion.div
        className="absolute inset-0 rounded-3xl overflow-hidden"
        animate={{
          opacity: isHovered ? 0.1 : 0,
        }}
        transition={{ duration: 0.3 }}
      >
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-16 h-16 rounded-full bg-white"
            initial={false}
            animate={{
              x: ['-100%', '200%'],
              y: [Math.random() * 100 + '%', Math.random() * 100 + '%'],
              scale: [0, 1, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: i * 0.8,
              ease: "easeInOut",
            }}
            style={{
              filter: "blur(20px)",
            }}
          />
        ))}
      </motion.div>

      {/* Inner shadow effect */}
      <motion.div
        className="absolute inset-0 rounded-3xl"
        animate={{
          opacity: isHovered ? 0.1 : 0,
        }}
        transition={{ duration: 0.3 }}
        style={{
          boxShadow: "inset 0 0 50px rgba(255,255,255,0.2)",
        }}
      />
    </>
  );
};
