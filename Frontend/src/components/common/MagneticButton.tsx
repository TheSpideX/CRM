import React, { useState } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { useCursorContext } from '../../contexts/CursorContext';
import { useMagneticCursor } from '../ui/CustomCursor/hooks/useMagneticCursor';
import { useRipple } from '../ui/CustomCursor/hooks/useRipple';

interface MagneticButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  magneticStrength?: number;
  magneticRadius?: number;
  rippleColor?: string;
  hoverText?: string;
  disabled?: boolean;
  loading?: boolean;
}

export const MagneticButton: React.FC<MagneticButtonProps> = ({
  children,
  onClick,
  className = '',
  variant = 'primary',
  size = 'md',
  magneticStrength = 0.8,
  magneticRadius = 150,
  rippleColor = 'rgba(255, 255, 255, 0.7)',
  hoverText = 'Click',
  disabled = false,
  loading = false,
}) => {
  const { setCursorState, resetCursor } = useCursorContext();
  const { ref, x, y } = useMagneticCursor({ 
    strength: disabled ? 0 : magneticStrength, 
    radius: magneticRadius 
  });
  const controls = useAnimation();
  const [isHovered, setIsHovered] = useState(false);
  const { createRipple } = useRipple({ color: rippleColor });

  // Size classes
  const sizeClasses = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg'
  };

  // Variant classes
  const variantClasses = {
    primary: 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700',
    secondary: 'bg-gray-800 text-white hover:bg-gray-700',
    ghost: 'bg-transparent border-2 border-white/20 hover:border-white/40'
  };

  const handleMouseEnter = () => {
    if (disabled) return;
    
    setIsHovered(true);
    setCursorState({ 
      variant: loading ? 'loading' : 'button',
      scale: 1.5,
      text: loading ? 'Loading...' : hoverText
    });
    
    controls.start({
      scale: 1.05,
      transition: { type: 'spring', stiffness: 400, damping: 10 }
    });
  };

  const handleMouseLeave = () => {
    if (disabled) return;
    
    setIsHovered(false);
    resetCursor();
    
    controls.start({
      scale: 1,
      transition: { type: 'spring', stiffness: 400, damping: 10 }
    });
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || loading) return;
    
    createRipple(e);
    controls.start({
      scale: 0.95,
      transition: { duration: 0.1 }
    }).then(() => {
      controls.start({
        scale: 1,
        transition: { type: 'spring', stiffness: 400, damping: 10 }
      });
    });

    onClick?.();
  };

  return (
    <motion.button
      ref={ref}
      style={{ x, y }}
      animate={controls}
      className={`
        relative overflow-hidden
        rounded-lg font-medium
        transition-colors duration-200
        ${sizeClasses[size]}
        ${variantClasses[variant]}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-none'}
        ${className}
      `}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      disabled={disabled || loading}
    >
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0"
        initial={{ x: '-100%' }}
        animate={isHovered ? { x: '100%' } : { x: '-100%' }}
        transition={{ duration: 1, repeat: Infinity }}
        style={{ display: isHovered ? 'block' : 'none' }}
      />
      
      <motion.div
        className="relative flex items-center justify-center gap-2"
        animate={{ opacity: loading ? 0.7 : 1 }}
      >
        {loading && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          </motion.div>
        )}
        
        <motion.div
          animate={{ opacity: loading ? 0 : 1 }}
          transition={{ duration: 0.2 }}
        >
          {children}
        </motion.div>
      </motion.div>

      {/* Hover glow effect */}
      <motion.div
        className="absolute inset-0 bg-white/5 pointer-events-none rounded-lg"
        initial={{ opacity: 0 }}
        animate={{ opacity: isHovered ? 1 : 0 }}
        transition={{ duration: 0.2 }}
      />
    </motion.button>
  );
};
