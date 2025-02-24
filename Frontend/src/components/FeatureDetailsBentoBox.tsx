import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useInView } from "react-intersection-observer";

interface Feature {
  name: string;
  description: string;
  icon: React.ReactNode;
  gradient: string;
  size: "small" | "medium" | "large" | "vertical" | "horizontal";
  details: string[];
  stats?: string;
  highlights?: string[];
  accentColor?: string;
  priority?: number;
}

const FeatureCard: React.FC<{ feature: Feature; index: number }> = ({
  feature,
  index,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [ref, inView] = useInView({
    threshold: 0.2,
    triggerOnce: true,
  });

  // Enhanced card animations
  const cardVariants = {
    initial: {
      opacity: 0,
      y: 50,
      scale: 0.95,
    },
    animate: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 20,
        duration: 0.8,
      },
    },
    hover: {
      scale: 1.02,
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 25,
      },
    },
  };

  // Improved icon animations
  const iconVariants = {
    initial: { scale: 0.8, rotate: -10 },
    animate: {
      scale: 1,
      rotate: 0,
      transition: {
        type: "spring",
        stiffness: 200,
        damping: 20,
      },
    },
    hover: {
      scale: 1.1,
      rotate: 5,
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 25,
      },
    },
  };

  // New content animation variants
  const contentVariants = {
    initial: { opacity: 0, y: 10 },
    animate: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.4,
        delay: index * 0.1 + 0.2,
      },
    },
  };

  // New detail item animations
  const detailVariants = {
    initial: { opacity: 0, x: -20 },
    animate: (i: number) => ({
      opacity: 1,
      x: 0,
      transition: {
        delay: i * 0.1,
        duration: 0.5,
      },
    }),
    hover: {
      x: 10,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 25,
      },
    },
  };

  // New highlight animations
  const highlightVariants = {
    initial: { opacity: 0, scale: 0.8 },
    animate: (i: number) => ({
      opacity: 1,
      scale: 1,
      transition: {
        delay: i * 0.1,
        duration: 0.5,
      },
    }),
    hover: {
      scale: 1.05,
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 25,
      },
    },
  };

  return (
    <motion.div
      ref={ref}
      variants={cardVariants}
      initial="initial"
      animate={inView ? "animate" : "initial"}
      whileHover="hover"
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className={`
        group relative overflow-hidden rounded-3xl
        shadow-[0_4px_16px_rgba(0,0,0,0.2)]
        hover:shadow-[0_6px_20px_rgba(0,0,0,0.25)]
        transition-all duration-300 ease-out
        ${getGridClass(feature.size)}
      `}
    >
      {/* Base layer with subtle elevation */}
      <div className="absolute inset-0 backdrop-blur-xl bg-background-900/80 border border-white/10" />

      {/* Subtle ambient light effect */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/[0.05] to-transparent" />

      {/* Gradient background */}
      <div
        className="absolute inset-0 opacity-15 group-hover:opacity-25 transition-opacity duration-500"
        style={{
          background: `linear-gradient(to bottom right, ${feature.gradient})`,
        }}
      />

      {/* Content Container */}
      <motion.div
        variants={contentVariants}
        className="relative h-full p-6 md:p-8 flex flex-col"
      >
        {/* Header Section */}
        <div className="flex items-start space-x-4 mb-6">
          <motion.div
            variants={iconVariants}
            className={`
              p-3 rounded-xl
              bg-${feature.accentColor}-500/20
              group-hover:bg-${feature.accentColor}-500/30
              backdrop-blur-sm transition-colors duration-300
            `}
          >
            {React.cloneElement(feature.icon as React.ReactElement, {
              className: `w-6 h-6 text-${feature.accentColor}-200`,
            })}
          </motion.div>
          <div>
            <h3 className="text-2xl font-bold text-white mb-1">
              {feature.name}
            </h3>
            {feature.stats && (
              <p
                className={`text-sm font-medium text-${feature.accentColor}-200`}
              >
                {feature.stats}
              </p>
            )}
          </div>
        </div>

        {/* Description */}
        <p className="text-lg text-white/90 mb-6">{feature.description}</p>

        {/* Details with animated bullets */}
        <div className="space-y-3 mb-6 flex-grow">
          <AnimatePresence>
            {feature.details.map((detail, idx) => (
              <motion.div
                key={idx}
                custom={idx}
                variants={detailVariants}
                className="flex items-center space-x-3"
              >
                <motion.div
                  className={`w-2 h-2 rounded-full bg-${feature.accentColor}-400`}
                  whileHover={{ scale: 1.5 }}
                  transition={{ type: "spring", stiffness: 300 }}
                />
                <span className="text-gray-100 group-hover:text-white transition-colors duration-300">
                  {detail}
                </span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Highlights */}
        <div className="flex flex-wrap gap-2 mt-auto">
          {feature.highlights?.map((highlight, idx) => (
            <motion.span
              key={idx}
              custom={idx}
              variants={highlightVariants}
              whileHover="hover"
              className={`
                px-3 py-1 rounded-full text-sm font-medium
                bg-${feature.accentColor}-500/20
                text-${feature.accentColor}-100
                border border-${feature.accentColor}-400/30
                group-hover:border-${feature.accentColor}-400/40
                group-hover:bg-${feature.accentColor}-500/30
                transition-all duration-300
              `}
            >
              {highlight}
            </motion.span>
          ))}
        </div>
      </motion.div>

      {/* Subtle hover glow effect */}
      <motion.div
        animate={{
          opacity: isHovered ? 0.15 : 0,
        }}
        className="absolute inset-0"
        style={{
          background: `radial-gradient(circle at 50% 50%, ${
            feature.gradient.split(" ")[1]
          }, transparent 70%)`,
          filter: "blur(40px)",
        }}
      />

      {/* Subtle top edge highlight */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
    </motion.div>
  );
};

const getGridClass = (size: Feature["size"]) => {
  const baseClasses = "w-full";
  switch (size) {
    case "large":
      return `${baseClasses} col-span-12 lg:col-span-8 h-[600px]`;
    case "vertical":
      return `${baseClasses} col-span-12 md:col-span-6 lg:col-span-4 h-[700px]`;
    case "horizontal":
      return `${baseClasses} col-span-12 lg:col-span-8 h-[600px]`;
    case "small":
      return `${baseClasses} col-span-12 md:col-span-6 lg:col-span-4 h-[600px]`;
    default:
      return `${baseClasses} col-span-12 md:col-span-6 lg:col-span-4 h-[600px]`;
  }
};

const FeatureDetailsBentoBox: React.FC<{ features: Feature[] }> = ({
  features,
}) => {
  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8">
      <div className="grid grid-cols-12 gap-6 relative z-10">
        {features.map((feature, index) => (
          <FeatureCard key={feature.name} feature={feature} index={index} />
        ))}
      </div>
    </div>
  );
};

export default FeatureDetailsBentoBox;
