import React, { useState, useEffect } from "react";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";
import { useInView } from "react-intersection-observer";
import Navbar from "../components/Navbar";
import {
  FaRocket,
  FaRobot,
  FaBolt,
  FaChartLine,
  FaUsers,
  FaClock,
  FaShieldAlt,
  FaGlobe,
  FaMobile,
  FaDatabase,
  FaCloud,
  FaCog,
} from "react-icons/fa";
import { Canvas } from "@react-three/fiber";
import { FeatureParticles } from "../components/FeatureParticles";
import { Card } from "../components/Card";
import { Suspense } from "react";

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

const features: Feature[] = [
  {
    name: "Smart Ticket Management",
    description:
      "AI-powered ticket routing and prioritization with real-time SLA tracking.",
    icon: <FaBolt className="w-6 h-6" />,
    gradient: "from-violet-500 to-violet-900",
    size: "large",
    priority: 1,
    stats: "50% faster resolution",
    highlights: ["AI routing", "SLA tracking", "Auto-assignment"],
    accentColor: "violet",
    details: [
      "Machine learning-based ticket classification",
      "Automatic priority assignment",
      "Smart workload distribution",
      "Real-time SLA monitoring",
      "Customizable routing rules",
    ],
  },
  {
    name: "AI Automation",
    description:
      "Intelligent automation powered by cutting-edge AI technology.",
    icon: <FaRobot className="w-6 h-6" />,
    gradient: "from-cyan-500 to-cyan-900",
    size: "vertical",
    priority: 2,
    stats: "40% more efficiency",
    highlights: ["Smart automation", "24/7 operation"],
    accentColor: "cyan",
    details: [
      "Automated response suggestions",
      "Pattern recognition",
      "Predictive analytics",
      "Natural language processing",
      "Sentiment analysis",
    ],
  },
  {
    name: "Advanced Analytics",
    description: "Comprehensive analytics and reporting dashboard.",
    icon: <FaChartLine className="w-6 h-6" />,
    gradient: "from-emerald-500 to-emerald-900",
    size: "horizontal",
    priority: 3,
    stats: "10% more insights",
    highlights: ["Real-time metrics", "Custom reports"],
    accentColor: "emerald",
    details: [
      "Real-time performance metrics",
      "Custom report builder",
      "Team productivity insights",
      "Trend analysis",
      "Export capabilities",
    ],
  },
  {
    name: "Enterprise Security",
    description: "Bank-grade security features to protect your data.",
    icon: <FaShieldAlt className="w-6 h-6" />,
    gradient: "from-red-500 to-rose-900",
    size: "small",
    priority: 4,
    stats: "99.99% uptime",
    highlights: ["End-to-end encryption", "Two-factor auth"],
    accentColor: "red",
    details: [
      "End-to-end encryption",
      "Two-factor authentication",
      "Role-based access control",
      "Audit logging",
      "Compliance management",
    ],
  },
  {
    name: "Global Infrastructure",
    description: "Distributed system for optimal performance worldwide.",
    icon: <FaGlobe className="w-6 h-6" />,
    gradient: "from-cyan-500 to-blue-900",
    size: "vertical",
    priority: 5,
    stats: "24/7 global coverage",
    highlights: ["Multi-region deployment", "Auto-scaling"],
    accentColor: "cyan",
    details: [
      "Multi-region deployment",
      "Auto-scaling",
      "Load balancing",
      "CDN integration",
      "99.99% uptime SLA",
    ],
  },
  {
    name: "Mobile Experience",
    description: "Native mobile apps for iOS and Android.",
    icon: <FaMobile className="w-6 h-6" />,
    gradient: "from-orange-500 to-red-900",
    size: "horizontal",
    priority: 6,
    stats: "50% faster response",
    highlights: ["Push notifications", "Mobile-optimized UI"],
    accentColor: "orange",
    details: [
      "Push notifications",
      "Offline support",
      "Biometric authentication",
      "Mobile-optimized UI",
      "Real-time sync",
    ],
  },
];

const FeatureCard: React.FC<{ feature: Feature; index: number }> = ({
  feature,
  index,
}) => {
  const [ref, inView] = useInView({
    threshold: 0.1,
    triggerOnce: true,
  });

  return (
    <motion.div
      ref={ref}
      className={`${getGridClass(feature.size)} relative`}
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
    >
      <Card className="h-full group hover:scale-[1.02] transition-transform duration-300 bg-background-900/40 backdrop-blur-xl border border-white/10 hover:border-white/20 shadow-2xl">
        <div className="h-full w-full p-8 md:p-10 flex flex-col relative overflow-hidden">
          {/* Gradient Overlay */}
          <div
            className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-300"
            style={{
              background: `linear-gradient(to bottom right, ${feature.gradient})`,
            }}
          />

          {/* Icon and Title */}
          <div className="flex items-center space-x-4 mb-8">
            <motion.div
              className={`p-4 rounded-2xl bg-gradient-to-br ${feature.gradient} shadow-xl`}
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              {feature.icon}
            </motion.div>
            <div>
              <h3 className="text-2xl font-bold text-white mb-1">
                {feature.name}
              </h3>
              {feature.stats && (
                <div
                  className={`text-sm text-${feature.accentColor}-400 font-semibold`}
                >
                  {feature.stats}
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          <p className="text-lg text-gray-300 mb-8 leading-relaxed">
            {feature.description}
          </p>

          {/* Highlights */}
          {feature.highlights && (
            <div className="flex flex-wrap gap-2 mb-8">
              {feature.highlights.map((highlight, idx) => (
                <motion.span
                  key={idx}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium
                    bg-${feature.accentColor}-500/10 
                    text-${feature.accentColor}-300
                    border border-${feature.accentColor}-500/20
                    hover:border-${feature.accentColor}-500/40
                    transition-colors duration-300`}
                  whileHover={{ scale: 1.05 }}
                  transition={{ type: "spring", stiffness: 400 }}
                >
                  {highlight}
                </motion.span>
              ))}
            </div>
          )}

          {/* Details */}
          <ul className="space-y-4 mt-auto">
            {feature.details.map((detail, idx) => (
              <motion.li
                key={idx}
                initial={{ opacity: 0, x: -20 }}
                animate={inView ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
                transition={{ duration: 0.3, delay: 0.2 + idx * 0.1 }}
                className="flex items-center space-x-3 text-gray-300 group/item"
              >
                <motion.div
                  className={`w-2 h-2 rounded-full bg-${feature.accentColor}-500/50 
                    group-hover/item:bg-${feature.accentColor}-500 transition-colors duration-300`}
                />
                <span className="group-hover/item:text-gray-200 transition-colors duration-300">
                  {detail}
                </span>
              </motion.li>
            ))}
          </ul>
        </div>
      </Card>
    </motion.div>
  );
};

const getGridClass = (size: Feature["size"]) => {
  const baseClasses = "relative w-full";

  switch (size) {
    case "large":
      return `${baseClasses} col-span-12 lg:col-span-8 h-[500px]`;
    case "vertical":
      return `${baseClasses} col-span-12 md:col-span-6 lg:col-span-4 h-[600px]`;
    case "horizontal":
      return `${baseClasses} col-span-12 lg:col-span-8 h-[500px]`;
    case "small":
      return `${baseClasses} col-span-12 md:col-span-6 lg:col-span-4 h-[500px]`;
    default:
      return `${baseClasses} col-span-12 md:col-span-6 lg:col-span-4 h-[500px]`;
  }
};

const BackgroundAnimation: React.FC = () => {
  const [normalizedMouse, setNormalizedMouse] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      setNormalizedMouse({
        x: (event.clientX / window.innerWidth) * 2 - 1,
        y: -(event.clientY / window.innerHeight) * 2 + 1,
      });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <div className="fixed inset-0 -z-10">
      <Canvas
        camera={{
          position: [0, 0, 15],
          fov: 50,
          near: 0.1,
          far: 1000,
        }}
      >
        <color attach="background" args={["#000000"]} />
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />
        <Suspense fallback={null}>
          <FeatureParticles
            mouse={normalizedMouse}
            count={75} // Increased particle count
            color="#6366F1"
            size={0.45}
            speed={0.00001}
          />
        </Suspense>
      </Canvas>
      <div className="absolute inset-0 bg-gradient-radial from-background-900/50 to-background-900/80 pointer-events-none" />
    </div>
  );
};

const FeaturesPage: React.FC = () => {
  const { scrollYProgress } = useScroll();
  const y = useSpring(useTransform(scrollYProgress, [0, 1], [0, 300]));

  return (
    <>
      {/* Background Animation Layer */}
      <div className="fixed inset-0 -z-10">
        <BackgroundAnimation />
      </div>

      {/* Main Content Layer */}
      <div className="relative min-h-screen bg-transparent">
        <motion.div
          className="sticky top-0 z-50 border-b border-white/5"
          initial={{ y: -100 }}
          animate={{ y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="absolute inset-0 backdrop-blur-xl bg-background-900/70" />
          <Navbar />
        </motion.div>

        {/* Hero Section */}
        <section className="relative pt-32 pb-20 overflow-hidden">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-center max-w-4xl mx-auto"
            >
              <div className="mb-6 inline-block">
                <motion.span
                  className="inline-block px-4 py-2 rounded-full text-sm font-medium bg-primary-500/10 text-primary-300 border border-primary-500/20"
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  Discover Our Platform
                </motion.span>
              </div>
              <h1 className="text-5xl md:text-7xl font-bold mb-8 bg-clip-text text-transparent bg-gradient-to-r from-primary-400 via-secondary-400 to-primary-400">
                Powerful Features for Modern Support Teams
              </h1>
              <p className="text-xl md:text-2xl text-gray-300 mb-12 leading-relaxed max-w-3xl mx-auto">
                Everything you need to deliver exceptional customer service and
                streamline your support operations.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-12 gap-6">
              {features.map((feature, index) => (
                <FeatureCard
                  key={feature.name}
                  feature={feature}
                  index={index}
                />
              ))}
            </div>
          </div>
        </section>

        {/* Integration Section with improved design */}
        <section className="py-20 relative">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-center mb-16"
            >
              <span className="inline-block px-4 py-2 rounded-full text-sm font-medium bg-secondary-500/10 text-secondary-300 border border-secondary-500/20 mb-6">
                Integrations
              </span>
              <h2 className="text-4xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-secondary-400 to-primary-400">
                Seamless Integrations
              </h2>
              <p className="text-xl text-gray-300 max-w-2xl mx-auto">
                Connect with your favorite tools and services to create a
                unified workflow
              </p>
            </motion.div>

            {/* Integration logos grid here */}
          </div>
        </section>

        {/* CTA Section with improved design */}
        <section className="py-20 relative">
          <div className="container mx-auto px-4">
            <div className="relative rounded-3xl overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-primary-500/20 to-secondary-500/20 backdrop-blur-xl" />
              <div className="relative z-10 px-8 py-16 text-center">
                <h2 className="text-4xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-300">
                  Ready to Transform Your Customer Support?
                </h2>
                <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
                  Start your free trial today. No credit card required.
                </p>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-8 py-4 bg-white text-black rounded-xl font-semibold 
                    shadow-lg transition-all duration-300 hover:shadow-2xl
                    hover:bg-gray-100"
                >
                  Get Started Free
                </motion.button>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-center mb-16"
            >
              <h2 className="text-4xl font-bold mb-6">
                Frequently Asked Questions
              </h2>
              <p className="text-xl text-gray-400">
                Got questions? We've got answers.
              </p>
            </motion.div>

            <div className="max-w-3xl mx-auto">{/* FAQ items here */}</div>
          </div>
        </section>

        {/* Footer with improved design */}
        <footer className="py-20 border-t border-white/10">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {/* Footer content here */}
            </div>
            <div className="mt-16 pt-8 border-t border-white/10 text-center text-gray-400">
              <p>
                © {new Date().getFullYear()} Your Company. All rights reserved.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
};

export default FeaturesPage;
