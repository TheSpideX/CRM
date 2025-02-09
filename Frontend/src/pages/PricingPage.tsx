import {
  motion,
  useScroll,
  useTransform,
  useSpring,
  AnimatePresence,
} from "framer-motion";
import { useState, useRef, useEffect } from "react";
import { useInView } from "react-intersection-observer";
import Navbar from "../components/Navbar";
import { GlowingButton } from "../components/GlowingButton";
import PricingBackgroundAnimation from "../components/PricingBackgroundAnimation";
import { GradientBlob } from "../components/GradientBlob";
import { ParallaxText } from "../components/ParallaxText";
import { PricingCardHoverEffect } from "../components/PricingCardHoverEffect";
import {
  StarIcon,
  RocketIcon,
  BuildingOfficeIcon,
} from "../components/icons/CustomIcons";
import { PricingGlowEffect } from "../components/PricingGlowEffect";

interface PricingTier {
  name: string;
  price: { monthly: string; annual: string };
  description: string;
  features: string[];
  highlighted: boolean;
  gradient: string;
  cta: string;
  icon: React.FC<{ className?: string }>;
  accentColor: string;
}

const pricingTiers: PricingTier[] = [
  {
    name: "Starter",
    price: { monthly: "$29", annual: "$290" },
    description: "Perfect for small teams getting started",
    features: [
      "Up to 3 team members",
      "Basic ticket management",
      "Email support",
      "Basic analytics",
      "1 integration",
      "5GB storage",
    ],
    highlighted: false,
    gradient: "from-cyan-500 to-cyan-900",
    cta: "Start Free Trial",
    icon: StarIcon,
    accentColor: "cyan",
  },
  {
    name: "Professional",
    price: { monthly: "$79", annual: "$790" },
    description: "Ideal for growing support teams",
    features: [
      "Up to 10 team members",
      "Advanced ticket management",
      "AI-powered routing",
      "Priority support",
      "Advanced analytics",
      "All integrations",
      "25GB storage",
      "Custom workflows",
    ],
    highlighted: true,
    gradient: "from-violet-500 to-violet-900",
    cta: "Get Started",
    icon: RocketIcon,
    accentColor: "violet",
  },
  {
    name: "Enterprise",
    price: { monthly: "Custom", annual: "Custom" },
    description: "For large organizations with specific needs",
    features: [
      "Unlimited team members",
      "Enterprise-grade security",
      "24/7 priority support",
      "Custom integrations",
      "Unlimited storage",
      "Advanced AI features",
      "Dedicated account manager",
      "Custom SLA",
    ],
    highlighted: false,
    gradient: "from-emerald-500 to-emerald-900",
    cta: "Contact Sales",
    icon: BuildingOfficeIcon,
    accentColor: "emerald",
  },
];

interface PricingFeature {
  name: string;
  tiers: ("starter" | "pro" | "enterprise")[];
}

const pricingFeatures: PricingFeature[] = [
  { name: "Team members", tiers: ["starter", "pro", "enterprise"] },
  { name: "Ticket management", tiers: ["starter", "pro", "enterprise"] },
  { name: "Email support", tiers: ["starter", "pro", "enterprise"] },
  { name: "Basic analytics", tiers: ["starter", "pro", "enterprise"] },
  { name: "AI-powered routing", tiers: ["pro", "enterprise"] },
  { name: "Advanced analytics", tiers: ["pro", "enterprise"] },
  { name: "Custom workflows", tiers: ["pro", "enterprise"] },
  { name: "Priority support", tiers: ["pro", "enterprise"] },
  { name: "Enterprise security", tiers: ["enterprise"] },
  { name: "Custom integrations", tiers: ["enterprise"] },
  { name: "Dedicated account manager", tiers: ["enterprise"] },
  { name: "Custom SLA", tiers: ["enterprise"] },
];

const faqs = [
  {
    question: "What's included in the free trial?",
    answer:
      "Our 14-day free trial includes all features from the Professional plan, allowing you to fully experience our platform's capabilities. No credit card required.",
  },
  {
    question: "Can I switch plans anytime?",
    answer:
      "Yes, you can upgrade or downgrade your plan at any time. Changes will be prorated and reflected in your next billing cycle.",
  },
  {
    question: "Do you offer custom enterprise solutions?",
    answer:
      "Yes, our Enterprise plan can be fully customized to meet your organization's specific needs. Contact our sales team for a personalized quote.",
  },
  {
    question: "What payment methods do you accept?",
    answer:
      "We accept all major credit cards, PayPal, and can arrange wire transfers for Enterprise customers. All payments are processed securely.",
  },
  {
    question: "Is there a long-term contract?",
    answer:
      "No, all our plans are month-to-month or annual with no long-term commitment required. Annual plans come with a 20% discount.",
  },
  {
    question: "What kind of support is included?",
    answer:
      "All plans include email support. Professional plans include priority support, while Enterprise plans come with 24/7 dedicated support and a dedicated account manager.",
  },
];

const AnimatedNumber: React.FC<{ value: string }> = ({ value }) => {
  const isNumber = !isNaN(parseInt(value.replace(/[^0-9]/g, '')));
  
  if (!isNumber) return <span>{value}</span>;
  
  return (
    <motion.span
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, type: "spring" }}
    >
      {value}
    </motion.span>
  );
};

const FeatureHighlight: React.FC<{ feature: string }> = ({ feature }) => {
  const [ref, inView] = useInView({ threshold: 0.1, triggerOnce: true });
  
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, x: -20 }}
      animate={inView ? { opacity: 1, x: 0 } : {}}
      transition={{ duration: 0.5 }}
      className="flex items-center space-x-2"
    >
      <motion.div
        className="w-1.5 h-1.5 rounded-full bg-violet-400"
        animate={{ scale: [1, 1.5, 1] }}
        transition={{ duration: 1, repeat: Infinity }}
      />
      <span className="text-gray-300">{feature}</span>
    </motion.div>
  );
};

const PricingCard: React.FC<{
  tier: PricingTier;
  isAnnual: boolean;
  index: number;
}> = ({ tier, isAnnual, index }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [ref, inView] = useInView({ threshold: 0.1, triggerOnce: true });
  const Icon = tier.icon;
  const cardRef = useRef<HTMLDivElement>(null);

  // Add parallax effect on hover
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = (y - centerY) / 30;
    const rotateY = (centerX - x) / 30;

    cardRef.current.style.transform = 
      `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
  };

  const handleMouseLeave = () => {
    if (!cardRef.current) return;
    cardRef.current.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg)';
    setIsHovered(false);
  };

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay: index * 0.1 }}
      className={`relative ${tier.highlighted ? "scale-105" : ""}`}
    >
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={handleMouseLeave}
        className="transition-all duration-200"
      >
        <PricingCardHoverEffect isHovered={isHovered} gradient={tier.gradient} />

        <motion.div
          className="relative p-8 rounded-3xl backdrop-blur-xl border border-white/10 bg-white/[0.02]"
          animate={{
            scale: isHovered ? 1.02 : 1,
            transform: isHovered ? "translateY(-8px)" : "translateY(0px)",
          }}
          transition={{ duration: 0.2 }}
        >
          {tier.highlighted && (
            <motion.div
              className="absolute -top-4 left-1/2 transform -translate-x-1/2"
              initial={{ y: -10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <motion.div
                className="px-4 py-1 rounded-full text-sm font-medium bg-violet-500/20 text-violet-300 border border-violet-500/30"
                animate={{
                  boxShadow: isHovered 
                    ? "0 0 20px rgba(139, 92, 246, 0.3)" 
                    : "0 0 0px rgba(139, 92, 246, 0)"
                }}
              >
                Most Popular
              </motion.div>
            </motion.div>
          )}

          <motion.div
            className="flex items-center space-x-3 mb-6"
            animate={{
              scale: isHovered ? 1.05 : 1,
            }}
            transition={{ duration: 0.2 }}
          >
            <Icon className={`w-6 h-6 text-${tier.accentColor}-500`} />
            <h3 className="text-2xl font-bold text-white">{tier.name}</h3>
          </motion.div>

          <motion.div
            className="mb-6"
            animate={{
              scale: isHovered ? 1.05 : 1,
            }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex items-baseline justify-center">
              <AnimatedNumber value={isAnnual ? tier.price.annual : tier.price.monthly} />
              <span className="text-gray-400 ml-2">
                / {isAnnual ? "year" : "month"}
              </span>
            </div>
            <p className="text-gray-400 mt-2 text-center">{tier.description}</p>
          </motion.div>

          <ul className="space-y-4 mb-8">
            {tier.features.map((feature, i) => (
              <motion.li
                key={i}
                className="flex items-center text-gray-300"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.1 }}
              >
                <FeatureHighlight feature={feature} />
              </motion.li>
            ))}
          </ul>

          <motion.button
            className={`w-full py-3 px-6 rounded-xl font-medium transition-all
              ${
                tier.highlighted
                  ? "bg-violet-500 hover:bg-violet-600 text-white"
                  : "bg-white/5 hover:bg-white/10 text-gray-100 border border-white/10"
              }`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
            animate={{
              boxShadow: isHovered 
                ? "0 0 30px rgba(139, 92, 246, 0.2)" 
                : "0 0 0px rgba(139, 92, 246, 0)"
            }}
          >
            {tier.cta}
          </motion.button>
        </motion.div>
      </div>
    </motion.div>
  );
};

const FAQ: React.FC<{
  faq: { question: string; answer: string };
  index: number;
}> = ({ faq, index }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="bg-white/[0.03] border border-white/[0.05] rounded-2xl p-8 backdrop-blur-xl"
      onHoverStart={() => setIsOpen(true)}
      onHoverEnd={() => setIsOpen(false)}
    >
      <div className="space-y-4">
        <div className="flex justify-between items-center gap-4">
          <h3 className="text-xl font-semibold text-gray-200 flex-1">
            {faq.question}
          </h3>
          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 20,
            }}
            className="text-gray-400 flex-shrink-0"
          >
            <svg
              className="w-5 h-5"
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
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{
                duration: 0.3,
                ease: [0.04, 0.62, 0.23, 0.98],
              }}
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

const PricingPage: React.FC = () => {
  const [isAnnual, setIsAnnual] = useState(true);
  const { scrollYProgress } = useScroll();
  const y = useSpring(useTransform(scrollYProgress, [0, 1], [0, 300]));

  return (
    <>
      <div className="fixed inset-0">
        <PricingBackgroundAnimation />
        <PricingGlowEffect />
      </div>

      <div className="relative min-h-screen bg-transparent">
        {/* Navbar */}
        <motion.div
          className="sticky top-0 z-50 border-b border-white/5"
          initial={{ y: -100 }}
          animate={{ y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="absolute inset-0 backdrop-blur-xl bg-black/30" />
          <Navbar />
        </motion.div>

        {/* Hero Section */}
        <div className="relative overflow-hidden">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 text-center"
          >
            <motion.h1
              className="text-5xl md:text-7xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-emerald-400"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              Simple, transparent pricing
            </motion.h1>
            <motion.p
              className="text-xl text-gray-400 max-w-3xl mx-auto mb-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              Choose the perfect plan for your team. All plans include a 14-day
              free trial.
            </motion.p>

            {/* Billing Toggle */}
            <motion.div
              className="flex justify-center mb-12"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <div className="flex items-center space-x-4 bg-white/5 rounded-full p-1.5 backdrop-blur-lg border border-white/10">
                <button
                  onClick={() => setIsAnnual(false)}
                  className={`px-6 py-2.5 rounded-full transition-all duration-300 ${
                    !isAnnual
                      ? "bg-violet-500/20 text-violet-300 border border-violet-500/30"
                      : "text-gray-400 hover:text-gray-300"
                  }`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setIsAnnual(true)}
                  className={`px-6 py-2.5 rounded-full transition-all duration-300 ${
                    isAnnual
                      ? "bg-violet-500/20 text-violet-300 border border-violet-500/30"
                      : "text-gray-400 hover:text-gray-300"
                  }`}
                >
                  Annual
                  <span className="ml-2 text-sm text-emerald-400">
                    Save 20%
                  </span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        </div>

        {/* Pricing Cards */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {pricingTiers.map((tier, index) => (
              <PricingCard
                key={tier.name}
                tier={tier}
                isAnnual={isAnnual}
                index={index}
              />
            ))}
          </div>
        </div>

        {/* Features Comparison */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <motion.h2
            className="text-3xl font-bold text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            Compare Features
          </motion.h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="py-4 px-6 text-left">Feature</th>
                  <th className="py-4 px-6 text-center">Starter</th>
                  <th className="py-4 px-6 text-center">Professional</th>
                  <th className="py-4 px-6 text-center">Enterprise</th>
                </tr>
              </thead>
              <tbody>
                {pricingFeatures.map((feature, index) => (
                  <motion.tr
                    key={feature.name}
                    className="border-b border-white/5"
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <td className="py-4 px-6">{feature.name}</td>
                    {["starter", "pro", "enterprise"].map((tierName) => (
                      <td key={tierName} className="py-4 px-6 text-center">
                        {feature.tiers.includes(tierName) ? (
                          <svg
                            className="w-6 h-6 mx-auto text-emerald-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
                      </td>
                    ))}
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <motion.h2
            className="text-4xl font-bold text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            Frequently Asked Questions
          </motion.h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
            {faqs.map((faq, index) => (
              <FAQ key={index} faq={faq} index={index} />
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <motion.div
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl font-bold mb-6">Ready to get started?</h2>
          <p className="text-gray-400 mb-8">
            Join thousands of teams already using our platform
          </p>
          <GlowingButton>Start Free Trial</GlowingButton>
        </motion.div>
      </div>
    </>
  );
};

const CheckIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M5 13l4 4L19 7"
    />
  </svg>
);

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
      className="bg-white/[0.03] border border-white/[0.05] rounded-2xl p-8 backdrop-blur-xl"
      onHoverStart={() => setIsOpen(true)}
      onHoverEnd={() => setIsOpen(false)}
    >
      <div className="space-y-4">
        <div className="flex justify-between items-center gap-4">
          <h3 className="text-xl font-semibold text-gray-200 flex-1">
            {faq.question}
          </h3>
          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 20,
            }}
            className="text-gray-400 flex-shrink-0"
          >
            <svg
              className="w-5 h-5"
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
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{
                duration: 0.3,
                ease: [0.04, 0.62, 0.23, 0.98],
              }}
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

export default PricingPage;
