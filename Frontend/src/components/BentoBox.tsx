import { motion, AnimatePresence } from "framer-motion";
import { useInView } from "react-intersection-observer";
import {
  IconBolt,
  IconChart,
  IconMessages,
  IconBell,
  IconClock,
  IconRobot,
} from "./Icons";
import { useState } from "react";

interface Feature {
  name: string;
  description: string;
  Icon: React.FC<{ className?: string }>;
  gradient: string;
  size: "small" | "medium" | "large" | "vertical" | "horizontal";
  highlights: string[];
  accentColor: string;
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
    initial: { scale: 1, y: 0 },
    hover: {
      scale: 1.02,
      y: -5,
      transition: {
        duration: 0.3,
        ease: "easeOut",
      },
    },
  };

  const iconVariants = {
    initial: { rotate: 0 },
    hover: {
      rotate: 360,
      transition: {
        duration: 0.5,
        ease: "easeOut",
      },
    },
  };

  const highlightVariants = {
    initial: { scale: 1 },
    hover: {
      scale: 1.05,
      transition: {
        duration: 0.2,
        ease: "easeOut",
      },
    },
  };

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      variants={cardVariants}
      whileHover="hover"
      initial="initial"
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className={`
        group relative overflow-hidden rounded-3xl
        backdrop-blur-xl bg-white/[0.03] border border-white/[0.05]
        hover:bg-white/[0.08] transition-all duration-300
        ${feature.size === "large" ? "md:col-span-2 md:row-span-2" : ""}
        ${feature.size === "vertical" ? "md:row-span-2" : ""}
        ${feature.size === "horizontal" ? "md:col-span-2" : ""}
        ${feature.size === "small" ? "col-span-1" : ""}
      `}
    >
      {/* Animated gradient background */}
      <div
        className="absolute inset-0 opacity-30 mix-blend-overlay transition-opacity duration-300 group-hover:opacity-50"
        style={{
          background: `linear-gradient(to bottom right, ${feature.gradient})`,
          filter: "blur(20px)",
          transform: "scale(1.2)",
        }}
      />

      {/* Animated glow effect */}
      <motion.div
        animate={{
          opacity: isHovered ? 0.3 : 0,
          scale: isHovered ? 1.1 : 1,
        }}
        className="absolute inset-0 transition-all duration-300"
        style={{
          background: `radial-gradient(circle at 50% 50%, ${feature.gradient.split(" ")[1]}, transparent 70%)`,
          filter: "blur(40px)",
        }}
      />

      {/* Content */}
      <div className="relative z-10 h-full p-8 flex flex-col">
        <div className="flex items-center space-x-4 mb-6">
          <motion.div
            variants={iconVariants}
            className={`p-3 rounded-xl bg-${feature.accentColor}-500/20 backdrop-blur-md shadow-xl
              hover:bg-${feature.accentColor}-500/30 transition-colors duration-300`}
          >
            <feature.Icon
              className={`w-6 h-6 text-${feature.accentColor}-400`}
            />
          </motion.div>
          <h3 className={`text-2xl font-bold text-${feature.accentColor}-50`}>
            {feature.name}
          </h3>
        </div>

        <p className="text-lg text-white/70 mb-6 flex-grow leading-relaxed">
          {feature.description}
        </p>

        <div className="flex flex-wrap gap-2">
          {feature.highlights.map((highlight, i) => (
            <motion.span
              key={i}
              variants={highlightVariants}
              className={`px-4 py-2 rounded-full text-sm font-medium
                bg-${feature.accentColor}-500/10 text-${feature.accentColor}-200 backdrop-blur-sm
                transition-all duration-300 hover:bg-${feature.accentColor}-500/20
                border border-${feature.accentColor}-500/20 hover:border-${feature.accentColor}-500/30`}
            >
              {highlight}
            </motion.span>
          ))}
        </div>
      </div>

      {/* Animated corner accent */}
      <motion.div
        animate={{
          opacity: isHovered ? 1 : 0,
          scale: isHovered ? 1 : 0.8,
        }}
        className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br 
          from-${feature.accentColor}-500/30 to-transparent rounded-bl-full`}
        style={{ transition: "all 0.3s ease-out" }}
      />
    </motion.div>
  );
};

const BentoBox: React.FC = () => {
  const features: Feature[] = [
    {
      name: "Smart Ticket Management",
      description:
        "AI-powered ticket routing and prioritization with real-time SLA tracking.",
      Icon: IconBolt,
      gradient: "from-violet-500 to-violet-900",
      size: "large",
      highlights: ["AI routing", "SLA tracking", "Auto-assignment"],
      accentColor: "violet",
    },
    {
      name: "Analytics Dashboard",
      description:
        "Real-time insights and performance metrics with customizable views.",
      Icon: IconChart,
      gradient: "from-cyan-500 to-blue-600",
      size: "vertical",
      highlights: ["Real-time analytics", "Custom reports", "Team metrics"],
      accentColor: "cyan",
    },
    {
      name: "Team Collaboration",
      description:
        "Seamless communication and file sharing between support teams.",
      Icon: IconMessages,
      gradient: "from-emerald-500 to-teal-600",
      size: "horizontal",
      highlights: ["Real-time chat", "File sharing", "Team spaces"],
      accentColor: "emerald",
    },
    {
      name: "Smart Notifications",
      description: "Context-aware alerts and updates based on ticket priority.",
      Icon: IconBell,
      gradient: "from-amber-500 to-orange-600",
      size: "small",
      highlights: ["Priority alerts", "Custom rules"],
      accentColor: "amber",
    },
    {
      name: "SLA Monitoring",
      description:
        "Automated tracking and alerts for service level agreements.",
      Icon: IconClock,
      gradient: "from-rose-500 to-pink-600",
      size: "small",
      highlights: ["Real-time tracking", "Auto escalation"],
      accentColor: "rose",
    },
    {
      name: "AI Automation",
      description: "Intelligent workflow automation and ticket categorization.",
      Icon: IconRobot,
      gradient: "from-indigo-500 to-purple-600",
      size: "small",
      highlights: ["Smart routing", "Auto responses"],
      accentColor: "indigo",
    },
  ];

  return (
    <div className="w-full max-w-7xl mx-auto px-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[minmax(250px,auto)]">
        {features.map((feature, index) => (
          <FeatureCard key={feature.name} feature={feature} index={index} />
        ))}
      </div>
    </div>
  );
};

export default BentoBox;
