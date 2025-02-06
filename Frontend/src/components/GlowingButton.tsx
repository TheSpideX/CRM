import React from "react";
import { motion } from "framer-motion";

interface GlowingButtonProps {
  primary?: boolean;
  secondary?: boolean;
  children: React.ReactNode;
  onClick: () => void;
  className?: string;
  disabled?: boolean;
}

export const GlowingButton: React.FC<GlowingButtonProps> = ({
  primary,
  secondary,
  children,
  onClick,
  className = "",
  disabled = false,
}) => {
  const baseClasses = `
    relative px-6 py-3 rounded-lg font-medium 
    transition-all duration-300 ease-in-out
    overflow-hidden group
    disabled:opacity-50 disabled:cursor-not-allowed
    focus:outline-none focus:ring-2 focus:ring-offset-2
  `;

  const primaryClasses = primary
    ? `
      bg-gradient-to-r from-primary-500 to-primary-600
      hover:from-primary-600 hover:to-primary-700
      text-white
      focus:ring-primary-500
      before:absolute before:inset-0
      before:bg-gradient-to-r before:from-primary-400/50 before:to-primary-500/50
      before:opacity-0 before:transition-opacity before:duration-300
      hover:before:opacity-100
      after:absolute after:inset-0
      after:bg-[length:400%_400%]
      after:animate-glow
    `
    : "";

  const secondaryClasses = secondary
    ? `
      bg-gradient-to-r from-secondary-500 to-secondary-600
      hover:from-secondary-600 hover:to-secondary-700
      text-white
      focus:ring-secondary-500
      before:absolute before:inset-0
      before:bg-gradient-to-r before:from-secondary-400/50 before:to-secondary-500/50
      before:opacity-0 before:transition-opacity before:duration-300
      hover:before:opacity-100
      after:absolute after:inset-0
      after:bg-[length:400%_400%]
      after:animate-glow
    `
    : "";

  return (
    <motion.button
      className={`${baseClasses} ${primaryClasses} ${secondaryClasses} ${className}`}
      onClick={onClick}
      disabled={disabled}
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.3,
        ease: "easeOut",
      }}
    >
      <span className="relative z-10 flex items-center justify-center gap-2">
        {children}
      </span>
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-xl" />
      <div className="absolute inset-0 -z-20 bg-gradient-to-r from-primary-500/20 to-secondary-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-2xl" />
    </motion.button>
  );
};

export default GlowingButton;
