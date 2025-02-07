import { motion, useScroll, useTransform, useSpring } from "framer-motion";
import { useInView } from "react-intersection-observer";
import { useState } from 'react';
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

const features = [
  {
    name: "Smart Ticket Management",
    description:
      "AI-powered ticket routing and prioritization with real-time SLA tracking.",
    icon: <FaBolt className="w-6 h-6" />,
    gradient: "from-violet-500 to-violet-900",
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
    gradient: "from-blue-500 to-blue-900",
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
    details: [
      "Push notifications",
      "Offline support",
      "Biometric authentication",
      "Mobile-optimized UI",
      "Real-time sync",
    ],
  },
];

const FeatureCard: React.FC<{ feature: any; index: number }> = ({
  feature,
  index,
}) => {
  const [ref, inView] = useInView({
    threshold: 0.1,
    triggerOnce: true,
  });

  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
      className="relative group"
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
    >
      <motion.div
        className="relative overflow-hidden rounded-2xl"
        whileHover={{ scale: 1.02 }}
        transition={{ duration: 0.3 }}
      >
        {/* Animated gradient background */}
        <motion.div
          className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-10`}
          animate={{
            opacity: isHovered ? 0.2 : 0.1,
            scale: isHovered ? 1.1 : 1,
          }}
          transition={{ duration: 0.3 }}
        />

        {/* Content */}
        <div className="relative p-8 bg-black/30 backdrop-blur-sm border border-white/10 rounded-2xl">
          <motion.div
            className="flex items-center space-x-4 mb-6"
            initial={{ x: -20 }}
            animate={{ x: 0 }}
          >
            <motion.div
              className={`p-3 rounded-xl bg-gradient-to-br ${feature.gradient}`}
              whileHover={{ scale: 1.1, rotate: 5 }}
            >
              {feature.icon}
            </motion.div>
            <h3 className="text-2xl font-bold text-white">{feature.name}</h3>
          </motion.div>

          <p className="text-gray-300 mb-6">{feature.description}</p>

          <ul className="space-y-3">
            {feature.details.map((detail: string, idx: number) => (
              <motion.li
                key={idx}
                initial={{ opacity: 0, x: -20 }}
                animate={inView ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
                transition={{ duration: 0.3, delay: 0.2 + idx * 0.1 }}
                className="flex items-center space-x-3 text-gray-400"
              >
                <motion.div
                  className="w-1.5 h-1.5 rounded-full bg-primary-500"
                  whileHover={{ scale: 1.5 }}
                />
                <span>{detail}</span>
              </motion.li>
            ))}
          </ul>

          {/* Hover effect corner accent */}
          <motion.div
            className="absolute top-0 right-0 w-32 h-32"
            initial={{ opacity: 0 }}
            animate={{ opacity: isHovered ? 1 : 0 }}
            style={{
              background: `radial-gradient(circle at top right, ${feature.gradient.split(" ")[1]}, transparent 70%)`,
              filter: "blur(20px)",
            }}
          />
        </div>
      </motion.div>
    </motion.div>
  );
};

const FeaturesPage: React.FC = () => {
  const { scrollYProgress } = useScroll();
  const opacity = useSpring(useTransform(scrollYProgress, [0, 0.2], [1, 0]));

  return (
    <div className="min-h-screen bg-black">
      {/* Animated background patterns */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute inset-0 opacity-[0.03]"
          animate={{
            backgroundPosition: ["0px 0px", "100px 100px"],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            repeatType: "reverse",
          }}
          style={{
            backgroundImage: `radial-gradient(circle at center, rgba(255, 255, 255, 0.8) 1px, transparent 1px)`,
            backgroundSize: "24px 24px",
          }}
        />
      </div>

      {/* Navbar */}
      <motion.div
        className="sticky top-0 z-50 border-b border-white/5"
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="absolute inset-0 backdrop-blur-xl bg-black/70" />
        <Navbar />
      </motion.div>

      {/* Hero Section */}
      <motion.section
        className="relative pt-32 pb-16 overflow-hidden"
        style={{ opacity }}
      >
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-b from-primary-500/10 to-transparent opacity-30" />
        </div>

        <div className="relative container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-3xl mx-auto mb-16"
          >
            <motion.h1
              className="text-5xl md:text-6xl font-bold mb-6 bg-clip-text text-transparent 
                       bg-gradient-to-r from-primary-400 via-secondary-400 to-primary-400"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              Powerful Features
            </motion.h1>
            <motion.p
              className="text-xl text-gray-400"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              Discover all the powerful features that make our platform the
              perfect solution for your support needs
            </motion.p>
          </motion.div>
        </div>
      </motion.section>

      {/* Features Grid */}
      <section className="relative py-20">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <FeatureCard key={feature.name} feature={feature} index={index} />
            ))}
          </div>
        </div>
      </section>

      {/* Enhanced CTA Section */}
      <section className="relative py-20">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="relative rounded-2xl overflow-hidden"
          >
            <motion.div
              className="absolute inset-0 bg-gradient-to-br from-primary-500/20 to-secondary-500/20"
              animate={{
                opacity: [0.2, 0.3, 0.2],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
              }}
            />
            <div className="relative bg-black/30 backdrop-blur-sm border border-white/10 p-12 text-center">
              <motion.h2
                className="text-3xl font-bold text-white mb-4"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                Ready to transform your support experience?
              </motion.h2>
              <motion.p
                className="text-gray-400 mb-8"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                Join thousands of teams already using our platform
              </motion.p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-8 py-3 bg-gradient-to-r from-primary-500 to-secondary-500 
                         hover:from-primary-600 hover:to-secondary-600 
                         text-white rounded-lg font-medium transition-colors"
              >
                Start Free Trial
              </motion.button>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default FeaturesPage;
