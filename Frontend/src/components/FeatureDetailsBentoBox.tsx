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

  const cardVariants = {
    initial: { opacity: 0, y: 20 },
    animate: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, delay: index * 0.1 },
    },
    hover: {
      y: -5,
      transition: { duration: 0.2 },
    },
  };

  const iconVariants = {
    initial: { scale: 1 },
    hover: { scale: 1.1, transition: { duration: 0.2 } },
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
       ${getGridClass(feature.size)}
     `}
    >
      {/* Base layer with backdrop blur */}
      <div className="absolute inset-0 backdrop-blur-xl bg-white/[0.03] border border-white/[0.05]" />

      {/* Gradient background */}
      <div
        className="absolute inset-0 opacity-[0.15] group-hover:opacity-[0.25] transition-opacity duration-500"
        style={{
          background: `linear-gradient(to bottom right, ${feature.gradient})`,
        }}
      />

      {/* Content Container */}
      <div className="relative h-full p-6 md:p-8 flex flex-col">
        {/* Header Section */}
        <div className="flex items-start space-x-4 mb-6">
          <motion.div
            variants={iconVariants}
            className={`
             p-3 rounded-xl
             bg-${feature.accentColor}-500/10
             group-hover:bg-${feature.accentColor}-500/20
             backdrop-blur-md transition-colors duration-300
           `}
          >
            {feature.icon}
          </motion.div>
          <div>
            <h3
              className={`text-2xl font-bold text-${feature.accentColor}-50 mb-1`}
            >
              {feature.name}
            </h3>
            {feature.stats && (
              <p
                className={`text-sm font-medium text-${feature.accentColor}-400/90`}
              >
                {feature.stats}
              </p>
            )}
          </div>
        </div>

        {/* Description */}
        <p className="text-lg text-white/70 mb-6">{feature.description}</p>

        {/* Details with animated bullets */}
        <div className="space-y-3 mb-6 flex-grow">
          <AnimatePresence>
            {feature.details.map((detail, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="flex items-center space-x-3"
              >
                <motion.div
                  className={`w-2 h-2 rounded-full bg-${feature.accentColor}-500/50`}
                  whileHover={{ scale: 1.5 }}
                  transition={{ type: "spring", stiffness: 300 }}
                />
                <span className="text-gray-300/80 group-hover:text-gray-200 transition-colors duration-300">
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
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.1 }}
              className={`
               px-3 py-1 rounded-full text-sm font-medium
               bg-${feature.accentColor}-500/10
               text-${feature.accentColor}-200
               border border-${feature.accentColor}-500/20
               group-hover:border-${feature.accentColor}-500/30
               group-hover:bg-${feature.accentColor}-500/20
               transition-all duration-300
             `}
            >
              {highlight}
            </motion.span>
          ))}
        </div>
      </div>

      {/* Hover glow effect */}
      <motion.div
        animate={{
          opacity: isHovered ? 0.2 : 0,
        }}
        className="absolute inset-0"
        style={{
          background: `radial-gradient(circle at 50% 50%, ${
            feature.gradient.split(" ")[1]
          }, transparent 70%)`,
          filter: "blur(40px)",
        }}
      />

      {/* Corner accent */}
      <motion.div
        animate={{
          opacity: isHovered ? 1 : 0,
          scale: isHovered ? 1 : 0.8,
        }}
        className={`
         absolute top-0 right-0 w-24 h-24
         bg-gradient-to-br from-${feature.accentColor}-500/30 to-transparent
         rounded-bl-full
       `}
        style={{ transition: "all 0.3s ease-out" }}
      />
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
    <div className="w-full max-w-7xl mx-auto px-4">
      <div className="grid grid-cols-12 gap-6">
        {features.map((feature, index) => (
          <FeatureCard key={feature.name} feature={feature} index={index} />
        ))}
      </div>
    </div>
  );
};

export default FeatureDetailsBentoBox;
