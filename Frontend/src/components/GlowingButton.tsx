import React, { useState } from "react";
import { motion, useAnimation } from "framer-motion";

interface GlowingButtonProps {
  primary?: boolean;
  secondary?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  className?: string;
  icon?: React.ReactNode;
  loading?: boolean;
}

export const GlowingButton: React.FC<GlowingButtonProps> = ({
  primary,
  secondary,
  children,
  onClick,
  onMouseEnter,
  onMouseLeave,
  className = "",
  icon,
  loading = false,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const controls = useAnimation();

  const baseClasses = `
    relative group overflow-hidden rounded-full font-medium 
    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500
    disabled:opacity-70 disabled:cursor-not-allowed
    transition-all duration-300 ease-out
  `;
  
  const primaryClasses = primary
    ? "bg-gradient-to-r from-primary-500 to-secondary-500 text-white shadow-lg shadow-primary-500/25"
    : "";
    
  const secondaryClasses = secondary
    ? "bg-white/5 text-white border border-white/10 hover:bg-white/10 backdrop-blur-sm"
    : "";

  const handleMouseEnter = async () => {
    setIsHovered(true);
    onMouseEnter?.();
    await controls.start({
      scale: 1.02,
      transition: { duration: 0.2 }
    });
  };

  const handleMouseLeave = async () => {
    setIsHovered(false);
    onMouseLeave?.();
    await controls.start({
      scale: 1,
      transition: { duration: 0.2 }
    });
  };

  return (
    <motion.button
      disabled={loading}
      className={`${baseClasses} ${primaryClasses} ${secondaryClasses} ${className}`}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      animate={controls}
      whileTap={{ scale: 0.98 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.3,
        ease: "easeOut",
      }}
    >
      {/* Content wrapper */}
      <span className="relative z-10 flex items-center justify-center gap-2 px-6 py-3">
        {loading ? (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
          />
        ) : (
          <>
            {icon && (
              <motion.span
                animate={isHovered ? { scale: 1.1, rotate: 5 } : { scale: 1, rotate: 0 }}
                className="text-lg"
              >
                {icon}
              </motion.span>
            )}
            {children}
          </>
        )}
      </span>
      
      {/* Gradient glow effect */}
      <motion.div
        className="absolute inset-0 -z-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: isHovered ? 1 : 0 }}
        transition={{ duration: 0.2 }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-primary-500/30 to-secondary-500/30 blur-xl" />
        <div className="absolute inset-0 bg-gradient-to-r from-primary-500/20 to-secondary-500/20 blur-2xl" />
      </motion.div>

      {/* Shine effect */}
      <motion.div
        className="absolute inset-0 -z-20"
        initial={{ x: '-100%' }}
        animate={isHovered ? { x: '100%' } : { x: '-100%' }}
        transition={{ duration: 0.8, ease: 'easeInOut' }}
      >
        <div className="w-1/3 h-full bg-gradient-to-r from-transparent via-white/20 to-transparent transform rotate-12" />
      </motion.div>

      {/* Particle effects */}
      {isHovered && primary && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-white rounded-full"
              initial={{
                x: '50%',
                y: '50%',
                opacity: 1
              }}
              animate={{
                x: `${50 + (Math.random() * 100 - 50)}%`,
                y: `${50 + (Math.random() * 100 - 50)}%`,
                opacity: 0
              }}
              transition={{
                duration: 0.8,
                delay: i * 0.1,
                repeat: Infinity
              }}
            />
          ))}
        </motion.div>
      )}
    </motion.button>
  );
};

export default GlowingButton;
