import { motion, useScroll, useTransform } from "framer-motion";
import { useMousePosition } from "../hooks/useMousePosition";

export const PricingGlowEffect: React.FC = () => {
  const mousePosition = useMousePosition();
  const { scrollY } = useScroll();

  const glowOpacity = useTransform(scrollY, [0, 300], [0.15, 0.05]);
  const glowSize = useTransform(scrollY, [0, 300], [600, 400]);

  return (
    <motion.div
      className="pointer-events-none fixed inset-0 z-30 transition-opacity duration-300"
      style={{
        opacity: glowOpacity,
        background: `
          radial-gradient(
            circle at ${mousePosition.x}px ${mousePosition.y}px,
            rgba(139, 92, 246, 0.15),
            transparent ${glowSize}px
          )
        `,
      }}
    />
  );
};
