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
      {/* Dynamic color patch behind robot */}
      <motion.div
        className="absolute inset-0 -z-10"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ 
          scale: [0.8, 1, 0.8],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        style={{
          background: `
            radial-gradient(circle at 50% 50%, 
              rgba(124, 58, 237, 0.15) 0%,
              rgba(124, 58, 237, 0.1) 30%,
              transparent 70%
            )
          `,
          filter: 'blur(20px)',
          transform: 'translateY(20px) scale(1.2)',
        }}
      />

      {/* Background glow effect */}
      <motion.div
        className="absolute inset-0"
        initial={{ y: 0 }}
        style={{
          background: 'radial-gradient(circle at 70% 50%, rgba(124, 58, 237, 0.16414) 0%, transparent 70%)',
          filter: 'blur(15px)',
          willChange: 'transform',
        }}
        animate={{
          y: isHovered ? -3 : 0,
          scale: isHovered ? [1, 1.08, 1] : 1,
          opacity: isHovered ? [0.4, 0.6, 0.4] : 0.4,
        }}
        transition={{ 
          y: { duration: 1, repeat: Infinity, repeatType: "reverse" },
          scale: { duration: 2, repeat: Infinity },
          opacity: { duration: 2, repeat: Infinity }
        }}
      />

      <svg
        viewBox="0 0 200 300"
        className="w-full h-full relative z-10"
        style={{ filter: 'drop-shadow(0 0 8px rgba(124, 58, 237, 0.3))' }}
      >
        {/* Robot parts with enhanced animations */}
        <motion.path
          d="M80 40 L120 40 L130 60 L70 60 Z"
          fill="rgba(124, 58, 237, 0.8)"
          initial={{ y: 0 }}
          animate={{ 
            y: isHovered ? [-3, 0, -3] : 0,
            scale: isHovered ? [1, 1.05, 1] : 1
          }}
          transition={{ 
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        
        {/* Antenna with enhanced animation */}
        <motion.path
          d="M100 30 L100 10"
          stroke="rgba(124, 58, 237, 0.8)"
          strokeWidth="2"
          initial={{ scaleY: 1 }}
          animate={{ 
            scaleY: isHovered ? [1, 1.2, 1] : 1,
            rotate: isHovered ? [-5, 5, -5] : 0
          }}
          transition={{ 
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          style={{ transformOrigin: 'bottom' }}
        />
        
        {/* Eyes with pulsing effect */}
        <motion.circle
          cx="85"
          cy="50"
          r="3"
          fill="rgba(124, 58, 237, 0.8)"
          animate={{ 
            opacity: isHovered ? [0.6, 1, 0.6] : 0.8,
            scale: isHovered ? [1, 1.2, 1] : 1
          }}
          transition={{ 
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.circle
          cx="115"
          cy="50"
          r="3"
          fill="rgba(124, 58, 237, 0.8)"
          animate={{ 
            opacity: isHovered ? [0.6, 1, 0.6] : 0.8,
            scale: isHovered ? [1, 1.2, 1] : 1
          }}
          transition={{ 
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.2
          }}
        />

        {/* Add floating particles around the robot */}
        {[...Array(6)].map((_, i) => (
          <motion.circle
            key={i}
            r="1"
            fill="rgba(124, 58, 237, 0.6)"
            initial={{
              cx: 100 + Math.cos(i * 60) * 30,
              cy: 150 + Math.sin(i * 60) * 30,
            }}
            animate={{
              cx: [
                100 + Math.cos(i * 60) * 30,
                100 + Math.cos((i * 60) + 180) * 20,
                100 + Math.cos(i * 60) * 30
              ],
              cy: [
                150 + Math.sin(i * 60) * 30,
                150 + Math.sin((i * 60) + 180) * 20,
                150 + Math.sin(i * 60) * 30
              ],
              opacity: [0.6, 1, 0.6]
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.2
            }}
          />
        ))}

        {/* Body */}
        <motion.path
          d="M70 60 L130 60 L140 200 L60 200 Z"
          fill="rgba(124, 58, 237, 0.6)"
          initial={{ scaleY: 1 }}
          animate={{ scaleY: isHovered ? 1.02 : 1 }}
          transition={{ duration: 1.5, repeat: Infinity, repeatType: "reverse" }}
        />

        {/* Chest Light */}
        <motion.circle
          cx="100"
          cy="100"
          r="12"
          fill="rgba(124, 58, 237, 0.8)"
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
          stroke="rgba(124, 58, 237, 0.8)"
          strokeWidth="8"
          fill="none"
          initial={{ rotate: 0 }}
          animate={{ rotate: isHovered ? [-3, 3] : 0 }}
          transition={{ duration: 2, repeat: Infinity, repeatType: "reverse" }}
        />
        <motion.path
          d="M140 80 L160 150 L155 180 L145 160 L140 120"
          stroke="rgba(124, 58, 237, 0.8)"
          strokeWidth="8"
          fill="none"
          initial={{ rotate: 0 }}
          animate={{ rotate: isHovered ? [3, -3] : 0 }}
          transition={{ duration: 2, repeat: Infinity, repeatType: "reverse" }}
        />

        {/* Legs */}
        <motion.path
          d="M80 200 L70 250 L80 280"
          stroke="rgba(124, 58, 237, 0.8)"
          strokeWidth="12"
          fill="none"
          initial={{ x: 0 }}
          animate={{ x: isHovered ? -3 : 0 }}
          transition={{ duration: 1.5, repeat: Infinity, repeatType: "reverse" }}
        />
        <motion.path
          d="M120 200 L130 250 L120 280"
          stroke="rgba(124, 58, 237, 0.8)"
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
            stroke="rgba(124, 58, 237, 0.4)"
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
          background: 'radial-gradient(circle at 50% 50%, rgba(124, 58, 237, 0.15) 0%, transparent 70%)',
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



