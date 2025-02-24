import React, { useEffect, useState, useRef } from "react";
import { motion, useAnimation } from "framer-motion";

interface Partner {
  name: string;
  logo: string;
  description: string;
}

interface IntegrationPartnersSectionProps {
  partners: Partner[];
}

export const IntegrationPartnersSection: React.FC<{ partners: Partner[] }> = ({
  partners,
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);
  const [isContainerHovered, setIsContainerHovered] = useState(false);
  const controls = useAnimation();
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartX = useRef(0);
  const dragCurrentX = useRef(0);
  const dragVelocity = useRef(0);
  const lastDragTime = useRef(Date.now());
  const animationRef = useRef<number>();

  const cardWidth = 256;
  const cardSpacing = 24;
  const totalWidth = partners.length * (cardWidth + cardSpacing);

  // Card animation variants
  const cardVariants = {
    hover: {
      y: -5,
      scale: 1.02,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 20,
      },
    },
    initial: {
      y: 0,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 20,
      },
    },
  };

  // Logo animation variants
  const logoVariants = {
    hover: {
      rotate: [0, -5, 5, 0],
      transition: {
        duration: 0.5,
        repeat: Infinity,
        repeatType: "reverse",
        ease: "easeInOut",
      },
    },
    initial: {
      rotate: 0,
      transition: {
        duration: 0.2,
      },
    },
  };

  const startAnimation = (fromPosition = 0) => {
    if (!containerRef.current) return;

    const duration =
      30 * (1 - Math.abs(fromPosition) / (totalWidth + cardSpacing));

    controls.start({
      x: [fromPosition, -(totalWidth + cardSpacing)],
      transition: {
        x: {
          repeat: Infinity,
          repeatType: "loop",
          duration: duration,
          ease: "linear",
        },
      },
    });
  };

  const handleDragStart = (e: React.MouseEvent) => {
    setIsDragging(true);
    controls.stop();

    dragStartX.current = e.clientX - dragCurrentX.current;
    lastDragTime.current = Date.now();

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  };

  const handleDrag = (e: React.MouseEvent) => {
    if (!isDragging) return;

    const currentX = e.clientX - dragStartX.current;
    const currentTime = Date.now();
    const timeDelta = currentTime - lastDragTime.current;

    if (timeDelta > 0) {
      const delta = currentX - dragCurrentX.current;
      dragVelocity.current = (delta / timeDelta) * 16;
    }

    dragCurrentX.current = currentX;
    controls.set({ x: currentX });

    lastDragTime.current = currentTime;
  };

  const smoothScroll = () => {
    if (!isDragging && Math.abs(dragVelocity.current) > 0.1) {
      dragVelocity.current *= 0.95;
      dragCurrentX.current += dragVelocity.current;
      controls.set({ x: dragCurrentX.current });
      animationRef.current = requestAnimationFrame(smoothScroll);
    } else {
      dragVelocity.current = 0;
      if (!autoScrollEnabled) {
        setAutoScrollEnabled(true);
        startAnimation(dragCurrentX.current);
      }
    }
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    if (Math.abs(dragVelocity.current) > 0.1) {
      animationRef.current = requestAnimationFrame(smoothScroll);
    } else if (!isContainerHovered) {
      startAnimation(dragCurrentX.current);
    }
  };

  useEffect(() => {
    if (!isContainerHovered && !isDragging) {
      startAnimation(dragCurrentX.current);
    }
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isContainerHovered, isDragging]);

  const triplePartners = [...partners, ...partners, ...partners];

  // Add container hover state
  const handleContainerMouseEnter = () => {
    setIsContainerHovered(true);
    controls.stop();
  };

  const handleContainerMouseLeave = () => {
    setIsContainerHovered(false);
    if (!isDragging) {
      const currentX = dragCurrentX.current;
      startAnimation(currentX);
    }
  };

  return (
    <section className="relative w-full" style={{ marginTop: '100px' }}>
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-20">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Seamless Integrations
          </h2>
          <p className="text-lg text-white/70 max-w-2xl mx-auto">
            Connect with your favorite tools and platforms
          </p>
        </motion.div>

        <div
          className="relative w-full overflow-hidden cursor-grab active:cursor-grabbing select-none rounded-3xl"
          ref={containerRef}
          onMouseDown={handleDragStart}
          onMouseMove={handleDrag}
          onMouseUp={handleDragEnd}
          onMouseLeave={handleDragEnd}
          onMouseEnter={handleContainerMouseEnter}
          onMouseOut={handleContainerMouseLeave}
        >
          {/* Softer gradients with lower opacity */}
          <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-background-900/30 to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-background-900/30 to-transparent z-10 pointer-events-none" />

          <motion.div
            className="flex space-x-6"
            style={{
              width: "max-content",
              touchAction: "none",
              willChange: "transform",
              backfaceVisibility: "hidden",
            }}
            animate={controls}
            drag="x"
            dragConstraints={{
              left: -(totalWidth + cardSpacing),
              right: 0,
            }}
            dragElastic={0}
            dragMomentum={false}
          >
            {triplePartners.map((partner, index) => (
              <motion.div
                key={`${partner.name}-${index}`}
                className="flex-none w-64 p-6 rounded-xl bg-white/5 hover:bg-white/10 transition-colors duration-300"
                variants={cardVariants}
                initial="initial"
                whileHover="hover"
                onHoverStart={() => setHoveredIndex(index)}
                onHoverEnd={() => setHoveredIndex(null)}
                style={{
                  transform: "translate3d(0, 0, 0)",
                  backfaceVisibility: "hidden",
                }}
              >
                <div className="h-12 flex items-center justify-center mb-4">
                  <motion.img
                    src={partner.logo}
                    alt={partner.name}
                    className="h-8 object-contain filter brightness-0 invert"
                    variants={logoVariants}
                    initial="initial"
                    animate={hoveredIndex === index ? "hover" : "initial"}
                    style={{
                      transform: "translate3d(0, 0, 0)",
                      backfaceVisibility: "hidden",
                    }}
                    draggable={false}
                  />
                </div>
                <h3 className="text-lg font-semibold text-center mb-2">
                  {partner.name}
                </h3>
                <p className="text-sm text-gray-400 text-center">
                  {partner.description}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
};
