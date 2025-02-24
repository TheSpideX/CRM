import React, { Suspense } from "react"; // Import Suspense from react
import { Canvas } from "@react-three/fiber";
import { motion } from "framer-motion";
import { useMousePosition } from "../hooks/useMousePosition";
import { ResourceParticles } from "../components/ResourceParticles";
import Navbar from "../components/Navbar";
import ResourceBackground from "../components/ResourceBackground";
import {
  FiBook,
  FiVideo,
  FiFileText,
  FiCode,
  FiCompass,
  FiCpu,
  FiDatabase,
  FiGlobe,
  FiLayout,
  FiLifeBuoy,
  FiSettings,
  FiShield,
  FiSmartphone,
  FiUsers,
} from "react-icons/fi";
import "../styles/ResourcesPage.css";

interface Resource {
  title: string;
  description: string;
  link: string;
  type: "guide" | "video" | "documentation" | "example" | "tutorial" | "tool";
  icon: React.ReactNode;
  color: string;
  isNew?: boolean;
  category?: string;
}

const resources: Resource[] = [
  {
    title: "Getting Started Guide",
    description:
      "Learn the basics of our platform with this comprehensive guide",
    link: "/resources/getting-started",
    type: "guide",
    icon: <FiCompass className="w-6 h-6" />,
    color: "from-violet-500 to-purple-500",
    category: "Basics",
  },
  {
    title: "Video Tutorials",
    description: "Watch step-by-step tutorials on advanced features",
    link: "/resources/tutorials",
    type: "video",
    icon: <FiVideo className="w-6 h-6" />,
    color: "from-blue-500 to-cyan-500",
    category: "Learning",
  },
  {
    title: "API Documentation",
    description: "Detailed API references and integration guides",
    link: "/resources/api-docs",
    type: "documentation",
    icon: <FiFileText className="w-6 h-6" />,
    color: "from-emerald-500 to-green-500",
    category: "Development",
  },
  {
    title: "Code Examples",
    description: "Real-world examples and code snippets",
    link: "/resources/examples",
    type: "example",
    icon: <FiCode className="w-6 h-6" />,
    color: "from-orange-500 to-red-500",
    category: "Development",
  },
  {
    title: "Security Best Practices",
    description: "Learn how to secure your applications and data",
    link: "/resources/security",
    type: "guide",
    icon: <FiShield className="w-6 h-6" />,
    color: "from-red-500 to-pink-500",
    category: "Security",
    isNew: true,
  },
  {
    title: "Mobile Development",
    description: "Build mobile applications with our SDK",
    link: "/resources/mobile",
    type: "tutorial",
    icon: <FiSmartphone className="w-6 h-6" />,
    color: "from-yellow-500 to-orange-500",
    category: "Development",
  },
  {
    title: "Database Optimization",
    description: "Tips and tricks for optimal database performance",
    link: "/resources/database",
    type: "guide",
    icon: <FiDatabase className="w-6 h-6" />,
    color: "from-cyan-500 to-blue-500",
    category: "Performance",
  },
  {
    title: "UI Components",
    description: "Explore our library of UI components",
    link: "/resources/components",
    type: "documentation",
    icon: <FiLayout className="w-6 h-6" />,
    color: "from-purple-500 to-indigo-500",
    category: "Design",
  },
];

const quickLinks = [
  {
    title: "Platform Status",
    icon: <FiCpu className="w-5 h-5" />,
    link: "/status",
  },
  {
    title: "Support Center",
    icon: <FiLifeBuoy className="w-5 h-5" />,
    link: "/support",
  },
  {
    title: "Community Forum",
    icon: <FiUsers className="w-5 h-5" />,
    link: "/community",
  },
  {
    title: "System Settings",
    icon: <FiSettings className="w-5 h-5" />,
    link: "/settings",
  },
];

const ResourceCard: React.FC<{ resource: Resource; index: number }> = ({
  resource,
  index,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="group relative overflow-hidden rounded-2xl backdrop-blur-xl bg-white/[0.03] border border-white/[0.05]"
    >
      <div className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-300">
        <div
          className={`absolute inset-0 bg-gradient-to-br ${resource.color}`}
        />
      </div>

      <div className="relative p-6 flex flex-col h-full">
        <div className="flex items-center space-x-4 mb-4">
          <motion.div
            whileHover={{ scale: 1.1, rotate: 10 }}
            className={`p-3 rounded-xl bg-gradient-to-br ${resource.color} bg-opacity-20`}
          >
            {resource.icon}
          </motion.div>
          <h3 className="text-xl font-semibold">{resource.title}</h3>
        </div>

        <p className="text-gray-400 mb-6">{resource.description}</p>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={`mt-auto px-4 py-2 rounded-lg bg-gradient-to-r ${resource.color} text-white font-medium`}
        >
          Explore Now
        </motion.button>
      </div>
    </motion.div>
  );
};

const QuickLink: React.FC<{
  title: string;
  icon: React.ReactNode;
  link: string;
}> = ({ title, icon, link }) => (
  <motion.a
    href={link}
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
    className="flex items-center space-x-3 p-4 rounded-xl bg-black/20 backdrop-blur-sm border border-white/[0.05] hover:border-white/[0.1] transition-colors"
  >
    <div className="p-2 rounded-lg bg-white/[0.05]">{icon}</div>
    <span className="font-medium">{title}</span>
  </motion.a>
);

const CategoryBadge: React.FC<{ category: string }> = ({ category }) => (
  <span className="px-2 py-1 text-xs rounded-full bg-white/[0.1] text-white/[0.8]">
    {category}
  </span>
);

const ResourcesPage: React.FC = () => {
  const mousePosition = useMousePosition();
  const normalizedMouse = {
    x: (mousePosition.x / window.innerWidth) * 2 - 1,
    y: -(mousePosition.y / window.innerHeight) * 2 + 1,
  };

  return (
    <div className="min-h-screen text-white relative">
      {/* Background Animation */}
      <div className="fixed inset-0 -z-10">
        <ResourceBackground />

        {/* Particle Animation */}
        <div className="absolute inset-0" style={{ zIndex: -5 }}>
          <Canvas
            camera={{
              position: [0, 0, 40], // Moved camera back to show full particle field
              fov: 50, // Reduced FOV for better perspective
              near: 0.1,
              far: 1000,
            }}
            style={{
              background: "transparent",
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
            }}
          >
            <ambientLight intensity={0.5} />
            <Suspense fallback={null}>
              <ResourceParticles count={2000} mouse={normalizedMouse} />
            </Suspense>
          </Canvas>
        </div>

        {/* Add gradient overlay to blend animations */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{ zIndex: -4 }}
          animate={{
            background: [
              "radial-gradient(circle at 20% 20%, rgba(99, 102, 241, 0.1) 0%, transparent 50%)",
              "radial-gradient(circle at 80% 80%, rgba(16, 185, 129, 0.1) 0%, transparent 50%)",
              "radial-gradient(circle at 50% 50%, rgba(139, 92, 246, 0.1) 0%, transparent 50%)",
            ],
          }}
          transition={{ duration: 20, repeat: Infinity, repeatType: "mirror" }}
        />
      </div>

      {/* Main Content */}
      <div className="relative bg-transparent">
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

        <div className="container mx-auto px-4 py-20 bg-transparent">
          {/* Hero Section */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center max-w-3xl mx-auto mb-20 bg-transparent"
          >
            <motion.h1 className="text-5xl md:text-6xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-emerald-400">
              Resources & Guides
            </motion.h1>
            <motion.p className="text-xl text-gray-400">
              Explore our comprehensive collection of resources to help you
              master our platform
            </motion.p>
          </motion.div>

          {/* Quick Links Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-12 bg-transparent"
          >
            {quickLinks.map((link) => (
              <QuickLink key={link.title} {...link} />
            ))}
          </motion.div>

          {/* Resource Categories */}
          <div className="mb-8 flex flex-wrap gap-2 bg-transparent">
            {Array.from(new Set(resources.map((r) => r.category))).map(
              (category) => (
                <motion.button
                  key={category}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-4 py-2 rounded-full bg-white/[0.05] hover:bg-white/[0.1] transition-colors"
                >
                  {category}
                </motion.button>
              )
            )}
          </div>

          {/* Resource Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-20 bg-transparent">
            {resources.map((resource, index) => (
              <ResourceCard
                key={resource.title}
                resource={resource}
                index={index}
              />
            ))}
          </div>

          {/* Latest Updates Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl backdrop-blur-xl bg-white/[0.03] border border-white/[0.05] p-8 mb-20"
          >
            <h2 className="text-3xl font-bold mb-6">Latest Updates</h2>
            <div className="space-y-4">
              {[1, 2, 3].map((item) => (
                <motion.div
                  key={item}
                  whileHover={{ x: 4 }}
                  className="flex items-center space-x-4 p-4 rounded-xl bg-white/[0.02] border border-white/[0.05]"
                >
                  <div className="h-2 w-2 rounded-full bg-emerald-500" />
                  <div>
                    <h3 className="font-medium">New Resource Update {item}</h3>
                    <p className="text-sm text-gray-400">Updated 2 days ago</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Newsletter Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl backdrop-blur-xl bg-black/20 border border-white/[0.05] p-8 text-center"
          >
            <h2 className="text-3xl font-bold mb-4">Stay Updated</h2>
            <p className="text-gray-400 mb-6">
              Subscribe to our newsletter for the latest resources and updates
            </p>
            <div className="flex max-w-md mx-auto">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 px-4 py-2 rounded-l-lg bg-white/[0.05] border border-white/[0.1] focus:outline-none focus:border-white/[0.2]"
              />
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="px-6 py-2 rounded-r-lg bg-gradient-to-r from-violet-500 to-purple-500 font-medium"
              >
                Subscribe
              </motion.button>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default ResourcesPage;
