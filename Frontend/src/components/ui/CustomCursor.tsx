import React, { useEffect } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';
import { CursorRing } from './CursorRing';
import { CursorDot } from './CursorDot';
import { useMousePosition } from '../../hooks/useMousePosition';

export const CustomCursor: React.FC = () => {
  const mousePosition = useMousePosition();
  const cursorX = useMotionValue(-100); // Start offscreen
  const cursorY = useMotionValue(-100); // Start offscreen

  // Spring animations for smooth cursor movement
  const springConfig = { damping: 25, stiffness: 400, mass: 0.5 };
  const cursorXSpring = useSpring(cursorX, springConfig);
  const cursorYSpring = useSpring(cursorY, springConfig);

  useEffect(() => {
    cursorX.set(mousePosition.x);
    cursorY.set(mousePosition.y);
  }, [mousePosition, cursorX, cursorY]);

  return (
    <>
      {/* Cursor wrapper */}
      <motion.div
        style={{ x: cursorXSpring, y: cursorYSpring }}
        className="fixed top-0 left-0 pointer-events-none z-[9999] mix-blend-difference"
      >
        <CursorRing />
        <CursorDot />
      </motion.div>

      {/* Global style to hide default cursor */}
      <style jsx global>{`
        * {
          cursor: none !important;
        }
        
        /* Show default cursor for specific elements if needed */
        input, textarea, select, [role="button"] {
          cursor: auto !important;
        }
      `}</style>
    </>
  );
};
