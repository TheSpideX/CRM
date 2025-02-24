import { useMemo } from 'react';
import { useCursorContext } from '../../../contexts/CursorContext';

export const useCursorStyle = () => {
  const { cursorState } = useCursorContext();

  return useMemo(() => {
    const baseRingStyle = {
      scale: cursorState.scale || 1,
      opacity: cursorState.isHidden ? 0 : 1,
      backgroundColor: 'transparent',
      width: '80px',  // Increased from 40px
      height: '80px', // Increased from 40px
    };

    const variants = {
      default: { 
        ...baseRingStyle,
        filter: 'blur(0px)',
      },
      button: {
        ...baseRingStyle,
        scale: 1.5,
        filter: 'blur(2px)',
      },
      text: {
        ...baseRingStyle,
        scale: 0.8,
        width: '50px',  // Increased from 24px
        height: '50px', // Increased from 24px
      },
      link: {
        ...baseRingStyle,
        scale: 1.2,
        filter: 'blur(1px)',
      },
      drag: {
        ...baseRingStyle,
        scale: 2,
        rotate: 45,
      },
      expand: {
        ...baseRingStyle,
        scale: 2.5,
        filter: 'blur(4px)',
      },
      video: {
        ...baseRingStyle,
        scale: 1.8,
        borderRadius: '4px',
      },
      copy: {
        ...baseRingStyle,
        scale: 1.2,
      },
      loading: {
        ...baseRingStyle,
        scale: 1.2,
        rotate: 0,
      },
      success: {
        ...baseRingStyle,
        scale: 1.2,
        backgroundColor: 'rgba(34, 197, 94, 0.2)',
      },
      error: {
        ...baseRingStyle,
        scale: 1.2,
        backgroundColor: 'rgba(239, 68, 68, 0.2)',
      },
    };

    return {
      ringStyle: {
        ...variants[cursorState.variant],
        x: -40, // Adjusted center offset (half of width)
        y: -40, // Adjusted center offset (half of height)
      },
      dotStyle: {
        scale: cursorState.isHidden ? 0 : 1,
        opacity: cursorState.isHidden ? 0 : 1,
        x: -4, // Adjusted for larger dot
        y: -4, // Adjusted for larger dot
      },
    };
  }, [cursorState]);
};
