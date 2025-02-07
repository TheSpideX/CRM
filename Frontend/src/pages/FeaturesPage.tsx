import React, { useState, useEffect } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
  AnimatePresence,
} from "framer-motion";
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
import FeatureDetailsBentoBox from "../components/FeatureDetailsBentoBox";

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

const FeatureCard: React.FC<{
  feature: Feature;
  index: number;
}> = ({ feature, index }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [ref, inView] = useInView({
    threshold: 0.2,
    triggerOnce: true,
  });

  const cardVariants = {
    initial: {
      opacity: 0,
      y: 20,
      scale: 0.95,
    },
    animate: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.5,
        delay: index * 0.1,
        ease: "easeOut",
      },
    },
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
    initial: { rotate: 0, scale: 1 },
    hover: {
      rotate: 360,
      scale: 1.1,
      transition: {
        duration: 0.5,
        ease: "easeOut",
      },
    },
  };

  const highlightVariants = {
    initial: { opacity: 0.8, scale: 1 },
    hover: {
      opacity: 1,
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
      variants={cardVariants}
      initial="initial"
      animate={inView ? "animate" : "initial"}
      whileHover="hover"
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className={`${getGridClass(feature.size)} group`}
    >
      <div className="h-full w-full relative overflow-hidden rounded-3xl">
        {/* Base background - always visible */}
        <div className="absolute inset-0 bg-white/[0.03] backdrop-blur-xl" />

        {/* Content container */}
        <div className="relative h-full w-full p-6 md:p-8 border border-white/[0.05] transition-all duration-300 overflow-y-auto group-hover:bg-white/[0.08]">
          {/* Icon and Title */}
          <div className="flex items-start space-x-4 mb-6">
            <motion.div
              variants={iconVariants}
              className={`p-3 rounded-xl bg-${feature.accentColor}-500/10 backdrop-blur-md shadow-xl
              hover:bg-${feature.accentColor}-500/20 transition-colors duration-300`}
            >
              {feature.icon}
            </motion.div>
            <div className="flex-1 min-w-0">
              <h3
                className={`text-xl md:text-2xl font-bold text-${feature.accentColor}-50`}
              >
                {feature.name}
              </h3>
              {feature.stats && (
                <motion.div
                  className={`text-sm text-${feature.accentColor}-400/90 font-semibold mt-1`}
                >
                  {feature.stats}
                </motion.div>
              )}
            </div>
          </div>

          {/* Description */}
          <p className="text-base md:text-lg text-white/70 mb-6 leading-relaxed line-clamp-3">
            {feature.description}
          </p>

          {/* Details list with animated bullets */}
          <div className="space-y-4">
            {feature.details.map((detail, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -20 }}
                animate={inView ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
                transition={{ duration: 0.3, delay: 0.2 + idx * 0.1 }}
                className="flex items-center space-x-3 group/item"
              >
                <motion.div
                  className={`w-2 h-2 rounded-full bg-${feature.accentColor}-500/50`}
                  whileHover={{ scale: 1.5 }}
                  transition={{ type: "spring", stiffness: 300 }}
                />
                <span className="text-gray-300/80 group-hover/item:text-gray-200 transition-colors duration-300">
                  {detail}
                </span>
              </motion.div>
            ))}
          </div>

          {/* Highlights */}
          <div className="flex flex-wrap gap-2 mt-auto">
            {feature.highlights?.map((highlight, idx) => (
              <motion.span
                key={idx}
                variants={highlightVariants}
                className={`px-3 py-1 rounded-full text-xs md:text-sm font-medium
                bg-${feature.accentColor}-500/10
                text-${feature.accentColor}-200
                border border-${feature.accentColor}-500/20
                hover:border-${feature.accentColor}-500/30
                transition-all duration-300
                whitespace-nowrap`}
              >
                {highlight}
              </motion.span>
            ))}
          </div>
        </div>

        {/* Gradient overlay */}
        <motion.div
          className="absolute inset-0 opacity-20 mix-blend-overlay"
          style={{
            background: `linear-gradient(to bottom right, ${feature.gradient})`,
            filter: "blur(20px)",
          }}
          animate={{
            scale: isHovered ? 1.3 : 1.2,
            rotate: isHovered ? 5 : 0,
          }}
          transition={{ duration: 0.4 }}
        />

        {/* Glow effect */}
        <motion.div
          animate={{
            opacity: isHovered ? 0.1 : 0,
          }}
          className="absolute inset-0"
          style={{
            background: `radial-gradient(circle at 50% 50%, ${feature.gradient.split(" ")[1]}, transparent 70%)`,
            filter: "blur(40px)",
          }}
        />
      </div>
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

const FAQItem: React.FC<{
  faq: { question: string; answer: string };
  index: number;
}> = ({ faq, index }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <motion.div
      key={index}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="bg-white/[0.03] border border-white/[0.05] rounded-2xl p-8 backdrop-blur-xl" // Increased padding
      onHoverStart={() => setIsOpen(true)}
      onHoverEnd={() => setIsOpen(false)}
    >
      <div className="space-y-4">
        <div className="flex justify-between items-start gap-4">
          {" "}
          {/* Added gap */}
          <h3 className="text-xl font-semibold text-gray-200 flex-1">
            {" "}
            {/* Added flex-1 */}
            {faq.question}
          </h3>
          <motion.div
            animate={{ rotate: isOpen ? 45 : 0 }}
            transition={{ duration: 0.2 }}
            className="text-gray-400 flex-shrink-0" // Added flex-shrink-0
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
          </motion.div>
        </div>
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <p className="text-gray-400 leading-relaxed pt-2">{faq.answer}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

const FAQSection: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const faqs = [
    {
      question: "How does the AI-powered ticket routing work?",
      answer:
        "Our smart ticket management system uses machine learning to analyze ticket content, urgency, and team expertise. It automatically routes tickets to the most qualified team members while considering current workload distribution for optimal efficiency.",
    },
    {
      question: "What kind of analytics and reporting features are available?",
      answer:
        "The platform provides comprehensive analytics including real-time performance metrics, team productivity insights, trend analysis, and custom report building capabilities. You can track KPIs, monitor SLA compliance, and export data for further analysis.",
    },
    {
      question: "How does the platform ensure data security?",
      answer:
        "We implement bank-grade security measures including end-to-end encryption, two-factor authentication, role-based access control, and detailed audit logging. Our system complies with industry standards and maintains 99.99% uptime.",
    },
    {
      question: "Can the system integrate with our existing tools?",
      answer:
        "Yes, our platform offers seamless integration with popular tools and services. The system supports multi-region deployment, CDN integration, and can sync with calendar applications for scheduling and deadline management.",
    },
    {
      question: "How does the SLA tracking system work?",
      answer:
        "The SLA management system automatically tracks response and resolution times, sends alerts at 75% expiry, and handles priority escalations. Team leads receive notifications for potential breaches, and the system provides real-time visibility into SLA compliance.",
    },
    {
      question: "Is mobile access available?",
      answer:
        "Yes, we offer native mobile apps for both iOS and Android with features like push notifications, offline support, biometric authentication, and real-time synchronization. The mobile interface is optimized for on-the-go ticket management.",
    },
    {
      question: "How do you handle team collaboration?",
      answer:
        "Our platform facilitates seamless collaboration through built-in chat, file sharing, and real-time updates. Teams can work together on tickets, share knowledge, and communicate effectively across departments.",
    },
    {
      question: "What kind of customization options are available?",
      answer:
        "The system offers extensive customization including custom ticket statuses, routing rules, SLA configurations, and workflow automation. Teams can also personalize their dashboards and reporting views.",
    },
  ];

  return (
    <section className="py-16">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <motion.div
            className="relative inline-block cursor-pointer group w-full max-w-4xl" // Increased max-width
            onClick={() => setIsExpanded(!isExpanded)}
            onHoverStart={() => setIsHovered(true)}
            onHoverEnd={() => setIsHovered(false)}
          >
            {/* Animated background gradient */}
            <motion.div
              className="absolute inset-0 rounded-2xl bg-gradient-to-r from-primary-500/20 via-secondary-500/20 to-primary-500/20 blur-xl"
              animate={{
                scale: isHovered ? 1.1 : 1,
                opacity: isHovered ? 0.8 : 0.5,
              }}
              transition={{ duration: 0.3 }}
            />

            {/* Content container */}
            <motion.div
              className="relative px-8 py-6 rounded-2xl border border-white/10 backdrop-blur-sm"
              animate={{
                scale: isHovered ? 1.02 : 1,
                backgroundColor: isHovered
                  ? "rgba(255,255,255,0.03)"
                  : "rgba(255,255,255,0.01)",
              }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex items-center justify-center gap-4">
                <h2 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-400 to-secondary-400">
                  Frequently Asked Questions
                </h2>
                <motion.div
                  animate={{
                    rotate: isExpanded ? 180 : 0,
                    scale: isHovered ? 1.1 : 1,
                  }}
                  transition={{ duration: 0.3 }}
                  className="text-primary-400"
                >
                  <svg
                    className="w-8 h-8"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </motion.div>
              </div>

              {/* Interactive hint */}
              <motion.p
                className="text-sm text-gray-400 mt-2"
                animate={{
                  opacity: isHovered ? 1 : 0.7,
                }}
              >
                {isExpanded ? "Click to collapse" : "Click to explore our FAQ"}
              </motion.p>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* FAQ Items Container */}
        <AnimatePresence mode="sync">
          {" "}
          {/* Changed from "wait" to "sync" */}
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{
                duration: 0.2,
                exit: { duration: 0.1 }, // Faster exit animation
                opacity: { duration: 0.2 },
              }}
              className="max-w-5xl mx-auto space-y-6 overflow-hidden" // Added overflow-hidden
            >
              {faqs.map((faq, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{
                    duration: 0.2,
                    delay: index * 0.05, // Reduced delay
                    exit: { delay: 0 }, // No delay on exit
                  }}
                >
                  <FAQItem faq={faq} index={index} />
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
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
          <div className="container mx-auto">
            <FeatureDetailsBentoBox features={features} />
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

        {/* CTA Section with transparent design */}
        <section className="py-20 relative">
          <div className="container mx-auto px-4">
            <div className="relative rounded-3xl overflow-hidden">
              {/* Remove the solid background and add subtle gradient overlay */}
              <div className="absolute inset-0">
                <div className="absolute inset-0 bg-gradient-to-r from-primary-500/5 to-secondary-500/5 backdrop-blur-sm" />
                <div className="absolute inset-0 bg-white/[0.02]" />
              </div>

              {/* Decorative elements */}
              <div className="absolute -left-20 -top-20 w-60 h-60 bg-primary-500/10 rounded-full blur-3xl" />
              <div className="absolute -right-20 -bottom-20 w-60 h-60 bg-secondary-500/10 rounded-full blur-3xl" />

              {/* Content */}
              <div className="relative z-10 px-8 py-16 text-center">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8 }}
                  className="max-w-3xl mx-auto"
                >
                  <h2 className="text-4xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-300">
                    Ready to Transform Your Customer Support?
                  </h2>
                  <p className="text-xl text-gray-300/80 mb-8">
                    Start your free trial today. No credit card required.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="px-8 py-4 rounded-xl font-semibold
                      bg-white/[0.03] backdrop-blur-sm
                      border border-white/10 hover:border-white/20
                      text-white shadow-lg transition-all duration-300
                      hover:bg-white/[0.05] hover:shadow-2xl"
                    >
                      Get Started Free
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="px-8 py-4 rounded-xl font-semibold
                      bg-primary-500/10 backdrop-blur-sm
                      border border-primary-500/20 hover:border-primary-500/30
                      text-primary-300 shadow-lg transition-all duration-300
                      hover:bg-primary-500/20 hover:shadow-2xl"
                    >
                      Schedule Demo
                    </motion.button>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <FAQSection />

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
