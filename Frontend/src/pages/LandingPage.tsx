import { motion, useScroll, useTransform, useSpring } from "framer-motion";
import { useInView } from "react-intersection-observer";
import { useState, useEffect, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { Particles } from "../components/Particles";
import { GlowingButton } from "../components/GlowingButton";
import { FloatingIcons } from "../components/FloatingIcons";
import Navbar from "../components/Navbar";
import { TestimonialsSection } from "../components/TestimonialsSection";
import { IntegrationPartnersSection } from "../components/IntegrationPartnersSection";
import { CTASection } from "../components/CTASection";
import { useMousePosition } from "../hooks/useMousePosition";
import { ParallaxText } from "../components/ParallaxText";
import { GradientBlob } from "../components/GradientBlob";
import BentoBox from "../components/BentoBox";

// Modern IconSet component to replace IconPlaceholder
const FeatureIcon: React.FC<{ variant: string }> = ({ variant }) => {
  const iconVariants = {
    lightning: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
        <path
          d="M13 3L4 14h7l-2 7 9-11h-7l2-7z"
          className="stroke-current"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    chart: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
        <path
          d="M18 20V10M12 20V4M6 20v-6"
          className="stroke-current"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    chat: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
        <path
          d="M12 21a9 9 0 1 0-9-9c0 1.488.36 2.891 1 4.127L3 21l4.873-1c1.236.64 2.64 1 4.127 1z"
          className="stroke-current"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    notification: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
        <path
          d="M18 8A6 6 0 1 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0"
          className="stroke-current"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {iconVariants[variant as keyof typeof iconVariants]}
    </div>
  );
};

// Card component
const Card: React.FC<{
  variant?: string;
  className?: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ variant, className, children, style }) => (
  <div
    className={`rounded-xl ${className} ${
      variant === "glass" ? "backdrop-blur-xl bg-background-900/50" : ""
    }`}
    style={style}
  >
    {children}
  </div>
);

interface Feature {
  name: string;
  description: string;
  Icon: React.FC<{ className?: string }>;
  gradient: string;
  bgPattern?: string;
  size: "small" | "medium" | "large" | "vertical" | "horizontal";
  accentColor?: string;
  priority?: number;
  stats: string;
  highlights: string[];
}

const features: Feature[] = [
  {
    name: "Smart Ticket Management",
    description:
      "AI-powered ticket routing and prioritization with real-time SLA tracking.",
    Icon: () => <FeatureIcon variant="lightning" />,
    gradient: "from-violet-500 to-violet-900",
    size: "large", // Takes up more space
    priority: 1,
    stats: "50% faster resolution",
    highlights: ["AI routing", "SLA tracking", "Auto-assignment"],
    accentColor: "violet",
  },
  {
    name: "Real-time Analytics",
    description: "Track team performance and metrics in real-time.",
    Icon: () => <FeatureIcon variant="chart" />,
    gradient: "from-cyan-500 to-cyan-900",
    size: "vertical", // Tall card
    priority: 2,
    stats: "40% more insights",
    highlights: ["Live metrics", "Team stats"],
    accentColor: "cyan",
  },
  {
    name: "Team Collaboration",
    description: "Built-in chat and file sharing.",
    Icon: () => <FeatureIcon variant="chat" />,
    gradient: "from-emerald-500 to-emerald-900",
    size: "horizontal", // Wide card
    priority: 2,
    stats: "30% better teamwork",
    highlights: ["Real-time chat", "File sharing"],
    accentColor: "emerald",
  },
  {
    name: "Smart Notifications",
    description: "Context-aware alerts and updates.",
    Icon: () => <FeatureIcon variant="notification" />,
    gradient: "from-amber-500 to-amber-900",
    size: "small",
    priority: 3,
    stats: "Real-time updates",
    highlights: ["Priority alerts"],
    accentColor: "amber",
  },
];

const featureContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.5,
    },
  },
};

// New subtle hover animation for cards
const cardVariants = {
  initial: {
    backgroundColor: "rgba(255, 255, 255, 0.02)",
  },
  hover: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    transition: {
      duration: 0.3,
    },
  },
};

// Testimonial data
const testimonials = [
  {
    quote:
      "This platform has transformed how we handle customer support. The AI-powered routing has reduced our response time by 50%.",
    author: "Sarah Johnson",
    role: "Customer Success Manager",
    company: "TechCorp",
    image: "https://randomuser.me/api/portraits/women/1.jpg",
  },
  {
    quote:
      "The analytics dashboard gives us incredible insights into our team's performance. We've improved our CSAT scores by 30%.",
    author: "Michael Chen",
    role: "Support Director",
    company: "CloudSoft",
    image: "https://randomuser.me/api/portraits/men/2.jpg",
  },
  {
    name: "GitHub",
    logo: "/assets/logos/github.svg",
    description: "Code repository and version control",
  },
  {
    name: "Salesforce",
    logo: "/assets/logos/salesforce.svg",
    description: "CRM and sales management",
  },
  {
    name: "Slack",
    logo: "/assets/logos/slack.svg",
    description: "Team communication",
  },
  {
    name: "Jira",
    logo: "/assets/logos/jira.svg",
    description: "Project management",
  },
  {
    name: "Zendesk",
    logo: "/assets/logos/zendesk.svg",
    description: "Customer service",
  },
  {
    name: "Microsoft Teams",
    logo: "/assets/logos/teams.svg",
    description: "Team collaboration",
  },
  {
    name: "Asana",
    logo: "/assets/logos/asana.svg",
    description: "Project management",
  },
  {
    name: "Notion",
    logo: "/assets/logos/notion.svg",
    description: "Knowledge management",
  },
  {
    name: "Trello",
    logo: "/assets/logos/trello.svg",
    description: "Task management",
  },
  {
    name: "Linear",
    logo: "/assets/logos/linear.svg",
    description: "Issue tracking",
  },
];

const partners = [
  {
    name: "GitHub",
    logo: "/assets/logos/github.svg",
    description: "Code repository and version control",
  },
  {
    name: "Salesforce",
    logo: "/assets/logos/salesforce.svg",
    description: "CRM and sales management",
  },
  {
    name: "Slack",
    logo: "/assets/logos/slack.svg",
    description: "Team communication",
  },
  {
    name: "Jira",
    logo: "/assets/logos/jira.svg",
    description: "Project management",
  },
  {
    name: "Zendesk",
    logo: "/assets/logos/zendesk.svg",
    description: "Customer service",
  },
  {
    name: "Microsoft Teams",
    logo: "/assets/logos/teams.svg",
    description: "Team collaboration",
  },
  {
    name: "Asana",
    logo: "/assets/logos/asana.svg",
    description: "Project management",
  },
  {
    name: "Notion",
    logo: "/assets/logos/notion.svg",
    description: "Knowledge management",
  },
  {
    name: "Trello",
    logo: "/assets/logos/trello.svg",
    description: "Task management",
  },
  {
    name: "Linear",
    logo: "/assets/logos/linear.svg",
    description: "Issue tracking",
  },
];

const productLinks = [
  { label: "Features", href: "/features" },
  { label: "Solutions", href: "/solutions" },
  { label: "Pricing", href: "/pricing" },
  { label: "Tutorials", href: "/tutorials" },
];

const resourceLinks = [
  { label: "Documentation", href: "/docs" },
  { label: "API Reference", href: "/api" },
  { label: "Blog", href: "/blog" },
  { label: "Community", href: "/community" },
];

const companyLinks = [
  { label: "About Us", href: "/about" },
  { label: "Careers", href: "/careers" },
  { label: "Contact", href: "/contact" },
  { label: "Partners", href: "/partners" },
];

const legalLinks = [
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms of Service", href: "/terms" },
  { label: "Cookie Policy", href: "/cookies" },
  { label: "Security", href: "/security" },
];

const LandingPage: React.FC = () => {
  useEffect(() => {
    console.log("LandingPage mounted"); // Debug log
  }, []);

  const mousePosition = useMousePosition();
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll();
  const springConfig = { stiffness: 100, damping: 30, restDelta: 0.001 };

  const opacity = useSpring(
    useTransform(scrollYProgress, [0, 0.5], [1, 0]),
    springConfig
  );

  return (
    <div className="min-h-screen bg-background-900 text-white relative overflow-hidden">
      {/* Enhanced Background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-background-900 via-background-800 to-background-900" />
        <GradientBlob />
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-20" />
      </div>

      {/* Particles with adjusted opacity */}
      <div className="fixed inset-0 z-0 opacity-60">
        <Canvas
          camera={{
            position: [0, 0, 35],
            fov: 75,
            near: 0.1,
            far: 1000,
          }}
        >
          <Particles count={3000} mouse={mousePosition} />
        </Canvas>
      </div>

      {/* Enhanced Navbar with Blur Effect */}
      <motion.div
        className="sticky top-0 z-50 border-b border-white/5"
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="absolute inset-0 backdrop-blur-xl bg-background-900/70" />
        <Navbar />
      </motion.div>

      <main className="relative z-10">
        {/* Refined Hero Section */}
        <motion.section
          className="relative min-h-[90vh] flex items-center justify-center py-24"
          style={{ opacity }}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              className="text-center relative z-10"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              {/* Enhanced Gradient Text */}
              <div className="relative">
                <motion.div
                  className="absolute -inset-x-20 -top-16 h-44 bg-gradient-to-r from-primary-500/20 via-secondary-500/20 to-primary-500/20 blur-3xl"
                  animate={{
                    opacity: [0.5, 0.8, 0.5],
                    scale: [1, 1.1, 1],
                  }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    repeatType: "reverse",
                  }}
                />
                <h1 className="text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight">
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary-400 via-secondary-400 to-primary-400">
                    Next-Gen Support
                  </span>
                </h1>
              </div>

              {/* Enhanced Subtitle */}
              <motion.p
                className="mt-8 text-xl md:text-2xl text-gray-300/90 max-w-3xl mx-auto leading-relaxed"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                Transform your customer experience with{" "}
                <span className="text-primary-400">AI-powered automation</span>,{" "}
                <span className="text-secondary-400">real-time analytics</span>,
                and{" "}
                <span className="text-primary-400">seamless collaboration</span>
                .
              </motion.p>

              {/* Enhanced Stats Section */}
              <motion.div
                className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto"
                variants={{
                  hidden: { opacity: 0 },
                  show: {
                    opacity: 1,
                    transition: { staggerChildren: 0.2 },
                  },
                }}
                initial="hidden"
                animate="show"
              >
                <StatsCard
                  value="50%"
                  label="Faster Resolution"
                  icon="⚡"
                  gradient="from-primary-500/20 to-primary-500/10"
                />
                <StatsCard
                  value="24/7"
                  label="AI-Powered Support"
                  icon="🤖"
                  gradient="from-secondary-500/20 to-secondary-500/10"
                />
                <StatsCard
                  value="99.9%"
                  label="Satisfaction Rate"
                  icon="⭐"
                  gradient="from-primary-500/20 to-secondary-500/10"
                />
              </motion.div>

              {/* Enhanced CTA Buttons */}
              <motion.div
                className="mt-12 flex flex-col md:flex-row justify-center gap-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <GlowingButton
                  primary
                  onClick={() => console.log("Get Started clicked!")}
                  className="group relative px-8 py-4 text-lg"
                >
                  Get Started Free
                  <motion.span
                    className="ml-2 inline-block"
                    animate={{ x: [0, 4, 0] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                  >
                    →
                  </motion.span>
                </GlowingButton>

                <GlowingButton
                  secondary
                  onClick={() => console.log("Book Demo clicked!")}
                  className="group relative px-8 py-4 text-lg"
                >
                  Book a Demo
                  <span className="ml-2 opacity-80">📅</span>
                </GlowingButton>
              </motion.div>
            </motion.div>
          </div>
        </motion.section>

        {/* Powerful Features Section */}
        <section className="relative py-20 overflow-hidden">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="container mx-auto px-4"
          >
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
                Powerful Features
              </h2>
              <p className="text-gray-400 text-lg max-w-2xl mx-auto">
                Everything you need to manage your support tickets efficiently
              </p>
            </div>

            {/* Add debug wrapper */}
            <div className="relative z-10">
              <BentoBox />
            </div>
          </motion.div>
        </section>

        {/* Integration Partners Section */}
        <IntegrationPartnersSection partners={partners} />

        {/* Testimonials Section */}
        <TestimonialsSection testimonials={testimonials} />

        {/* Enhanced CTA Section */}
        <CTASection />
      </main>

      {/* Enhanced Footer */}
      <footer className="relative z-10 border-t border-white/10">
        <div className="absolute inset-0 backdrop-blur-xl bg-background-900/70" />
        <div className="relative max-w-7xl mx-auto px-4 py-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <FooterSection title="Product" items={productLinks} />
            <FooterSection title="Resources" items={resourceLinks} />
            <FooterSection title="Company" items={companyLinks} />
            <FooterSection title="Legal" items={legalLinks} />
          </div>
          <div className="mt-16 pt-8 border-t border-white/10 text-center">
            <p className="text-gray-400">
              © {new Date().getFullYear()} Your Company. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

const FeatureCard: React.FC<{
  feature: Feature;
  index: number;
  className?: string;
}> = ({ feature, index, className }) => {
  const [ref, inView] = useInView({
    threshold: 0.1,
    triggerOnce: true,
  });

  return (
    <motion.div
      ref={ref}
      className={`${className} relative overflow-hidden`}
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
    >
      <div className="h-full w-full">
        <div className="relative h-full w-full rounded-2xl">
          <div
            className={`absolute inset-0 opacity-10 bg-gradient-to-br ${feature.gradient} rounded-2xl`}
          />
          <div className="relative h-full w-full p-8 md:p-10 bg-background-900/50 backdrop-blur-sm border border-white/10 rounded-2xl flex flex-col">
            {/* Card content */}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// Container for the feature grid
const FeaturesSection: React.FC = () => {
  const [ref, inView] = useInView({
    threshold: 0.1,
    triggerOnce: true,
  });

  return (
    <section
      ref={ref}
      className="relative w-full py-20 md:py-32"
      style={{ marginBottom: "200px" }} // Explicit margin
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16 md:mb-20"
        >
          <h2 className="text-5xl md:text-6xl font-bold mb-6">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary-400 via-secondary-400 to-primary-400">
              Powerful Features
            </span>
          </h2>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            Everything you need to manage support tickets efficiently and
            provide exceptional customer service
          </p>
        </motion.div>

        {/* Features Grid */}
        <div className="grid grid-cols-12 gap-8 relative">
          {features.map((feature, index) => (
            <FeatureCard
              key={feature.name}
              feature={feature}
              index={index}
              className={getGridClass(feature.size)}
            />
          ))}
        </div>
      </div>
    </section>
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

// Enhanced StatsCard component
const StatsCard: React.FC<{
  value: string;
  label: string;
  icon: string;
  gradient: string;
}> = ({ value, label, icon, gradient }) => (
  <motion.div
    variants={fadeInUp}
    className="relative p-6 rounded-2xl overflow-hidden group"
  >
    <div className={`absolute inset-0 bg-gradient-to-br ${gradient}`} />
    <div className="absolute inset-[1px] bg-background-900 rounded-2xl" />
    <div className="relative flex flex-col items-center">
      <span className="text-4xl mb-2 transform group-hover:scale-110 transition-transform duration-300">
        {icon}
      </span>
      <h3 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-400 to-secondary-400">
        {value}
      </h3>
      <p className="text-gray-400 mt-2">{label}</p>
    </div>
  </motion.div>
);

const FooterSection: React.FC<{
  title: string;
  items: Array<{ label: string; href: string }>;
}> = ({ title, items }) => (
  <div>
    <h3 className="text-lg font-semibold mb-4">{title}</h3>
    <ul className="space-y-2">
      {items.map((item, index) => (
        <li key={index}>
          <a
            href={item.href}
            className="text-gray-400 hover:text-primary-400 transition-colors duration-200"
          >
            {item.label}
          </a>
        </li>
      ))}
    </ul>
  </div>
);

// Animation variants
const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: "easeOut",
    },
  },
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.3,
    },
  },
};

export default LandingPage;
