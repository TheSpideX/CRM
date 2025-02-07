import React, { useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { GlowingButton } from "./GlowingButton";
import {
  SparkleIcon,
  ArrowRightIcon,
  CalendarIcon,
  ChartIcon,
  LightningIcon,
  HeartIcon,
} from "./icons/CustomIcons";

export const Hero: React.FC = () => {
  const { scrollYProgress } = useScroll();
  const y = useTransform(scrollYProgress, [0, 1], [0, -50]);
  const [isLoading, setIsLoading] = useState(false);

  const handleGetStarted = () => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 2000);
  };

  return (
    <motion.div
      style={{ y }}
      className="relative z-10 max-w-7xl mx-auto px-4 pt-32 pb-20 sm:pt-40 sm:pb-24"
    >
      {/* Enhanced Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute w-full h-full">
          {[...Array(50)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-primary-500/20 rounded-full"
              animate={{
                scale: [1, 2, 1],
                opacity: [0.1, 0.6, 0.1],
                rotate: [0, 180, 360],
              }}
              transition={{
                duration: Math.random() * 3 + 2,
                repeat: Infinity,
                delay: Math.random() * 2,
              }}
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Main Content */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="relative"
      >
        {/* Enhanced Feature Badge */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-center mb-8"
        >
          <motion.div
            className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-gradient-to-r from-primary-500/10 via-secondary-500/10 to-primary-500/10 border border-primary-500/20 backdrop-blur-sm shadow-lg shadow-primary-500/20"
            whileHover={{
              scale: 1.05,
              boxShadow: "0 0 20px rgba(99, 102, 241, 0.4)",
            }}
            transition={{ duration: 0.2 }}
          >
            <SparkleIcon className="w-5 h-5 text-primary-400 animate-pulse" />
            <span className="text-sm font-medium text-primary-400">
              New: AI-Powered Features Released
            </span>
          </motion.div>
        </motion.div>

        {/* Enhanced Heading */}
        <motion.h1
          className="text-center text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <motion.span
            className="inline-block bg-clip-text text-transparent bg-gradient-to-r from-primary-400 via-secondary-400 to-primary-400"
            animate={{
              backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
            }}
            transition={{
              duration: 5,
              repeat: Infinity,
              ease: "linear",
            }}
            style={{
              backgroundSize: "200% auto",
            }}
          >
            Next-Gen Support
          </motion.span>
          <motion.div
            className="inline-block ml-4"
            animate={{
              rotate: [0, 10, -10, 0],
              scale: [1, 1.2, 0.9, 1],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              repeatType: "reverse",
            }}
          >
            <SparkleIcon className="w-12 h-12 text-primary-400" />
          </motion.div>
        </motion.h1>

        {/* Enhanced Description */}
        <motion.p
          className="text-center text-xl md:text-2xl text-gray-300/90 max-w-3xl mx-auto leading-relaxed"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          Transform your customer experience with{" "}
          <span className="text-primary-400 font-semibold">
            intelligent automation
          </span>
          ,{" "}
          <span className="text-secondary-400 font-semibold">
            real-time insights
          </span>
          , and{" "}
          <span className="text-primary-400 font-semibold">
            seamless collaboration
          </span>
          .
        </motion.p>

        {/* Enhanced Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16 max-w-4xl mx-auto">
          {[
            {
              icon: LightningIcon,
              label: "Faster Resolution",
              value: "85%",
              color: "primary",
            },
            {
              icon: HeartIcon,
              label: "Customer Satisfaction",
              value: "98%",
              color: "secondary",
            },
            {
              icon: ChartIcon,
              label: "Team Productivity",
              value: "3x",
              color: "primary",
            },
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="relative group"
              whileHover={{ y: -5 }}
            >
              <div
                className={`absolute inset-0 bg-gradient-to-r from-${stat.color}-500/10 to-${stat.color}-600/10 rounded-xl blur-xl group-hover:opacity-100 transition-all duration-300 opacity-50`}
              />
              <div className="relative p-8 backdrop-blur-sm border border-white/10 rounded-xl bg-white/5 hover:bg-white/10 transition-colors duration-300">
                <motion.div whileHover={{ scale: 1.1 }} className="mb-4">
                  <stat.icon className={`w-10 h-10 text-${stat.color}-400`} />
                </motion.div>
                <div className="text-4xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-primary-400 to-secondary-400">
                  {stat.value}
                </div>
                <div className="text-sm text-gray-400 font-medium">
                  {stat.label}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Enhanced CTA Buttons */}
        <motion.div
          className="mt-16 flex flex-col sm:flex-row justify-center gap-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <GlowingButton
            primary
            loading={isLoading}
            className="px-8 py-4 text-lg group relative overflow-hidden"
            onClick={handleGetStarted}
          >
            <span className="relative z-10 flex items-center gap-2">
              Get Started Free
              <motion.div
                animate={{ x: [0, 4, 0] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
              >
                <ArrowRightIcon className="w-5 h-5" />
              </motion.div>
            </span>
          </GlowingButton>

          <GlowingButton
            secondary
            className="px-8 py-4 text-lg group relative overflow-hidden"
          >
            <span className="relative z-10 flex items-center gap-2">
              <CalendarIcon className="w-5 h-5" />
              Book a Demo
            </span>
          </GlowingButton>
        </motion.div>

        {/* Enhanced Trust Badges */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-24 text-center"
        >
          <div className="text-sm text-gray-500 mb-8 font-medium">
            Trusted by leading companies worldwide
          </div>
          <div className="flex flex-wrap justify-center items-center gap-x-12 gap-y-8">
            {["microsoft", "google", "amazon", "meta", "apple"].map(
              (company, i) => (
                <motion.div
                  key={company}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 0.5, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  whileHover={{ opacity: 1, scale: 1.05 }}
                  className="text-gray-400 font-bold text-xl uppercase tracking-wider"
                >
                  {company}
                </motion.div>
              )
            )}
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
};

export default Hero;
