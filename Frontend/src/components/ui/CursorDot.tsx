import React from 'react';
import { motion } from 'framer-motion';
import { useCursorStyle } from './hooks/useCursorStyle';
import { useCursorContext } from '../../contexts/CursorContext';

export const CursorDot: React.FC = () => {
  const { dotStyle } = useCursorStyle();
  const { cursorState } = useCursorContext();

  return (
    <motion.div
      className="fixed pointer-events-none z-[9999] flex items-center justify-center"
      animate={dotStyle}
      transition={{
        type: 'spring',
        stiffness: 150,
        damping: 15,
        mass: 1
      }}
    >
      {/* Main dot */}
      <motion.div
        className={`
          w-2 h-2 rounded-full
          bg-gradient-to-r
          ${cursorState.variant === 'button' ? 'from-purple-500 to-indigo-500' :
            cursorState.variant === 'link' ? 'from-blue-500 to-cyan-500' :
            'from-white to-white/80'}
        `}
        animate={{
          scale: cursorState.variant === 'button' || cursorState.variant === 'link' ? 1.5 : 1,
        }}
        transition={{ duration: 0.2 }}
      />

      {/* Glow effect */}
      <motion.div
        className="absolute w-8 h-8 rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(255,255,255,0.2) 0%, transparent 70%)',
        }}
        animate={{
          scale: cursorState.variant === 'button' || cursorState.variant === 'link' ? 1.5 : 1,
          opacity: cursorState.isHidden ? 0 : 0.5,
        }}
      />
    </motion.div>
  );
};
