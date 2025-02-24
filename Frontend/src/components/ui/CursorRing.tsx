import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCursorContext } from '../../contexts/CursorContext';
import { useCursorStyle } from './hooks/useCursorStyle';

export const CursorRing: React.FC = () => {
  const { cursorState } = useCursorContext();
  const { ringStyle } = useCursorStyle();

  return (
    <motion.div
      className="fixed pointer-events-none z-[9998] flex items-center justify-center"
      animate={ringStyle}
      transition={{
        type: 'spring',
        stiffness: 150,
        damping: 15,
        mass: 1
      }}
    >
      {/* Main ring with gradient border */}
      <motion.div 
        className={`
          rounded-full border-[3px] transition-all duration-150
          bg-gradient-to-r backdrop-blur-sm w-full h-full
          ${cursorState.variant === 'default' ? 'from-white/10 to-white/5 border-white/20' : 
            cursorState.variant === 'button' ? 'from-purple-500/20 to-indigo-500/20 border-purple-500/40' :
            cursorState.variant === 'link' ? 'from-blue-500/20 to-cyan-500/20 border-blue-500/40' :
            cursorState.variant === 'text' ? 'from-white/5 to-white/0 border-white/10' :
            'from-white/20 to-white/10 border-white/30'}
        `}
      />

      {/* Magnetic effect circles */}
      <motion.div
        className="absolute inset-0 rounded-full"
        animate={{
          scale: cursorState.variant === 'button' || cursorState.variant === 'link' ? 1.2 : 1,
          opacity: cursorState.variant === 'button' || cursorState.variant === 'link' ? 0.2 : 0,
        }}
        transition={{ duration: 0.2 }}
      />

      {/* Text label with enhanced animation */}
      <AnimatePresence>
        {cursorState.text && (
          <motion.span
            className="absolute text-sm font-medium text-white whitespace-nowrap bg-black/50 px-3 py-1.5 rounded-full backdrop-blur-sm"
            initial={{ opacity: 0, y: 10, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.8 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          >
            {cursorState.text}
          </motion.span>
        )}
      </AnimatePresence>

      {/* Loading spinner with gradient */}
      {cursorState.variant === 'loading' && (
        <motion.div
          className="absolute w-full h-full rounded-full"
          style={{
            border: '2px solid transparent',
            borderTopColor: 'rgba(255, 255, 255, 0.8)',
            borderRightColor: 'rgba(255, 255, 255, 0.4)',
            borderBottomColor: 'rgba(255, 255, 255, 0.2)',
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        />
      )}

      {/* Success/Error indicators */}
      <AnimatePresence>
        {(cursorState.variant === 'success' || cursorState.variant === 'error') && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className={`absolute inset-0 flex items-center justify-center ${
              cursorState.variant === 'success' ? 'text-green-500' : 'text-red-500'
            }`}
          >
            {cursorState.variant === 'success' ? '✓' : '×'}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
