import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "../components/Navbar";
import AboutBackgroundAnimation from "../components/AboutBackgroundAnimation";
import StargazerScene from "../components/StargazerScene";
import { FiUsers, FiTarget, FiHeart, FiAward, FiChevronRight, FiGlobe, FiCode } from "react-icons/fi";

interface TeamMember {
  name: string;
  role: string;
  image: string;
  bio: string;
  skills: string[];
  social: {
    twitter?: string;
    linkedin?: string;
    github?: string;
  };
}

const teamMembers: TeamMember[] = [
  {
    name: "Sarah Johnson",
    role: "CEO & Founder",
    image: "/assets/team/sarah.jpg",
    bio: "Passionate about revolutionizing customer support through AI and automation.",
    skills: ["Leadership", "AI Strategy", "Product Vision", "Team Building"],
    social: {
      twitter: "https://twitter.com/sarahj",
      linkedin: "https://linkedin.com/in/sarahj",
    },
  },
  {
    name: "David Chen",
    role: "CTO",
    image: "/assets/team/david.jpg",
    bio: "Building the future of support technology with cutting-edge AI solutions.",
    skills: ["AI/ML", "System Architecture", "Cloud Infrastructure", "Innovation"],
    social: {
      github: "https://github.com/davidchen",
      linkedin: "https://linkedin.com/in/davidchen",
    },
  },
  // Add more team members as needed
];

const AboutPage: React.FC = () => {
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);

  return (
    <div className="min-h-screen bg-background-900 text-white relative overflow-hidden">
      <AboutBackgroundAnimation />
      
      {/* Navbar */}
      <motion.div
        className="sticky top-0 z-50 border-b border-white/5"
        initial={{ y: -100 }}
        animate={{ y: 0 }}
      >
        <div className="absolute inset-0 backdrop-blur-xl bg-background-900/70" />
        <Navbar />
      </motion.div>

      {/* Hero Section */}
      <section className="relative min-h-[80vh] flex items-center justify-center">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-4xl mx-auto"
          >
            <motion.div 
              className="mb-8 inline-block"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.2 }}
            >
              <span className="px-4 py-2 rounded-full text-sm font-medium bg-primary-500/10 text-primary-300 border border-primary-500/20">
                Our Story
              </span>
            </motion.div>
            <h1 className="text-6xl md:text-7xl font-bold mb-8">
              Revolutionizing
              <span className="block mt-2 bg-clip-text text-transparent bg-gradient-to-r from-primary-400 via-purple-500 to-secondary-400">
                Customer Support
              </span>
            </h1>
            <p className="text-xl text-gray-400 leading-relaxed">
              We're building the future of customer service through innovative AI solutions 
              and human expertise, helping businesses deliver exceptional support experiences.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 relative">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: <FiGlobe />, value: "50+", label: "Countries" },
              { icon: <FiUsers />, value: "10M+", label: "Tickets Resolved" },
              { icon: <FiCode />, value: "99.9%", label: "Uptime" }
            ].map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.2 }}
                className="bg-white/5 backdrop-blur-lg rounded-2xl p-8 border border-white/10"
              >
                <div className="text-primary-400 text-3xl mb-4">{stat.icon}</div>
                <div className="text-4xl font-bold mb-2">{stat.value}</div>
                <div className="text-gray-400">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-20 relative">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-4xl font-bold mb-6">Our Mission</h2>
              <p className="text-xl text-gray-400 leading-relaxed mb-8">
                We envision a future where exceptional customer support is accessible
                to businesses of all sizes through the perfect blend of AI and human expertise.
              </p>
              <div className="space-y-4">
                {[
                  "Revolutionize customer support through AI",
                  "Empower support teams with cutting-edge tools",
                  "Drive meaningful customer connections"
                ].map((item, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <FiChevronRight className="text-primary-400" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative aspect-square"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary-500/20 to-secondary-500/20 rounded-2xl backdrop-blur-xl border border-white/10" />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-20 relative">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold mb-4">Meet Our Team</h2>
            <p className="text-xl text-gray-400">The passionate individuals behind our success</p>
          </motion.div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {teamMembers.map((member, index) => (
              <motion.div
                key={member.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                onClick={() => setSelectedMember(member)}
                className="group cursor-pointer"
              >
                <div className="relative overflow-hidden rounded-2xl backdrop-blur-xl bg-white/[0.03] border border-white/[0.05] p-6 transition-all duration-300 hover:bg-white/[0.05]">
                  <div className="flex items-center space-x-4 mb-4">
                    <img
                      src={member.image}
                      alt={member.name}
                      className="w-16 h-16 rounded-full object-cover ring-2 ring-primary-500"
                    />
                    <div>
                      <h3 className="text-xl font-semibold">{member.name}</h3>
                      <p className="text-primary-400">{member.role}</p>
                    </div>
                  </div>
                  <p className="text-gray-400 mb-4">{member.bio}</p>
                  <div className="flex flex-wrap gap-2">
                    {member.skills.map((skill) => (
                      <span key={skill} className="text-xs px-2 py-1 rounded-full bg-white/10">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Team Member Modal */}
      <AnimatePresence>
        {selectedMember && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setSelectedMember(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-background-800 rounded-2xl p-8 max-w-2xl w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center space-x-4">
                  <img
                    src={selectedMember.image}
                    alt={selectedMember.name}
                    className="w-20 h-20 rounded-full object-cover"
                  />
                  <div>
                    <h3 className="text-2xl font-bold">{selectedMember.name}</h3>
                    <p className="text-primary-400">{selectedMember.role}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedMember(null)}
                  className="text-gray-400 hover:text-white"
                >
                  <span className="sr-only">Close</span>
                  ×
                </button>
              </div>
              <p className="text-gray-300 mb-6">{selectedMember.bio}</p>
              <div className="flex space-x-4">
                {Object.entries(selectedMember.social).map(([platform, url]) => (
                  <a
                    key={platform}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary-400 hover:text-primary-300"
                  >
                    {platform.charAt(0).toUpperCase() + platform.slice(1)}
                  </a>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Stargazer Scene */}
      <StargazerScene />
    </div>
  );
};

export default AboutPage;
