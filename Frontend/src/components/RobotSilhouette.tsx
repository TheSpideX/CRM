import React from 'react';
import { motion } from 'framer-motion';

const RobotSilhouette: React.FC<{ isHovered: boolean }> = ({ isHovered }) => {
  return (
    <motion.div
      className="relative w-[200px] h-[300px]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <svg
        viewBox="0 0 200 300"
        className="w-full h-full"
        style={{ filter: 'drop-shadow(0 0 8px rgba(var(--primary-500), 0.3))' }}
      >
        {/* Head */}
        <motion.path
          d="M80 40 L120 40 L130 60 L70 60 Z"
          fill="rgba(var(--primary-500), 0.8)"
          initial={{ y: 0 }}
          animate={{ y: isHovered ? -3 : 0 }}
          transition={{ duration: 1, repeat: Infinity, repeatType: "reverse" }}
        />
        
        {/* Antenna */}
        <motion.path
          d="M100 30 L100 10"
          stroke="rgba(var(--primary-500), 0.8)"
          strokeWidth="2"
          initial={{ scaleY: 1 }}
          animate={{ scaleY: isHovered ? 1.2 : 1 }}
          transition={{ duration: 0.5, repeat: Infinity, repeatType: "reverse" }}
        />
        
        {/* Eyes */}
        <motion.circle
          cx="85"
          cy="50"
          r="4"
          fill="rgba(var(--primary-500), 1)"
          initial={{ opacity: 0.5 }}
          animate={{ opacity: isHovered ? 1 : 0.5 }}
          transition={{ duration: 0.3, repeat: Infinity, repeatType: "reverse" }}
        />
        <motion.circle
          cx="115"
          cy="50"
          r="4"
          fill="rgba(var(--primary-500), 1)"
          initial={{ opacity: 0.5 }}
          animate={{ opacity: isHovered ? 1 : 0.5 }}
          transition={{ duration: 0.3, repeat: Infinity, repeatType: "reverse" }}
        />

        {/* Body */}
        <motion.path
          d="M70 60 L130 60 L140 200 L60 200 Z"
          fill="rgba(var(--primary-500), 0.6)"
          initial={{ scaleY: 1 }}
          animate={{ scaleY: isHovered ? 1.02 : 1 }}
          transition={{ duration: 1.5, repeat: Infinity, repeatType: "reverse" }}
        />

        {/* Chest Light */}
        <motion.circle
          cx="100"
          cy="100"
          r="12"
          fill="rgba(var(--primary-500), 0.8)"
          initial={{ opacity: 0.5 }}
          animate={{ 
            opacity: isHovered ? [0.8, 0.2] : 0.5,
            r: isHovered ? [12, 14] : 12
          }}
          transition={{ duration: 1, repeat: Infinity, repeatType: "reverse" }}
        />

        {/* Arms */}
        <motion.path
          d="M60 80 L40 150 L45 180 L55 160 L60 120"
          stroke="rgba(var(--primary-500), 0.8)"
          strokeWidth="8"
          fill="none"
          initial={{ rotate: 0 }}
          animate={{ rotate: isHovered ? [-3, 3] : 0 }}
          transition={{ duration: 2, repeat: Infinity, repeatType: "reverse" }}
        />
        <motion.path
          d="M140 80 L160 150 L155 180 L145 160 L140 120"
          stroke="rgba(var(--primary-500), 0.8)"
          strokeWidth="8"
          fill="none"
          initial={{ rotate: 0 }}
          animate={{ rotate: isHovered ? [3, -3] : 0 }}
          transition={{ duration: 2, repeat: Infinity, repeatType: "reverse" }}
        />

        {/* Legs */}
        <motion.path
          d="M80 200 L70 250 L80 280"
          stroke="rgba(var(--primary-500), 0.8)"
          strokeWidth="12"
          fill="none"
          initial={{ x: 0 }}
          animate={{ x: isHovered ? -3 : 0 }}
          transition={{ duration: 1.5, repeat: Infinity, repeatType: "reverse" }}
        />
        <motion.path
          d="M120 200 L130 250 L120 280"
          stroke="rgba(var(--primary-500), 0.8)"
          strokeWidth="12"
          fill="none"
          initial={{ x: 0 }}
          animate={{ x: isHovered ? 3 : 0 }}
          transition={{ duration: 1.5, repeat: Infinity, repeatType: "reverse" }}
        />

        {/* Circuit Lines */}
        {[1, 2, 3].map((i) => (
          <motion.path
            key={i}
            d={`M${70 + i * 20} 80 L${70 + i * 20} 180`}
            stroke="rgba(var(--primary-500), 0.4)"
            strokeWidth="1.5"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: isHovered ? 1 : 0 }}
            transition={{ duration: 1, delay: i * 0.2 }}
          />
        ))}
      </svg>

      {/* Energy Field Effect */}
      <motion.div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(circle at 50% 50%, rgba(var(--primary-500), 0.15) 0%, transparent 70%)',
          filter: 'blur(15px)',
        }}
        animate={{
          scale: isHovered ? [1, 1.08, 1] : 1,
          opacity: isHovered ? [0.4, 0.6, 0.4] : 0.4,
        }}
        transition={{ duration: 2, repeat: Infinity }}
      />

      {/* Particle Effects */}
      {Array.from({ length: 8 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-0.5 h-0.5 bg-primary-500/30 rounded-full"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            y: [-15, 15],
            x: [-8, 8],
            opacity: [0, 1, 0],
          }}
          transition={{
            duration: 2 + Math.random() * 2,
            repeat: Infinity,
            repeatType: "reverse",
            delay: Math.random() * 2,
          }}
        />
      ))}
    </motion.div>
  );
};

export default RobotSilhouette;

