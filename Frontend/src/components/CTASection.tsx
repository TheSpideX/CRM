import React from "react";
import { motion } from "framer-motion";
import { GlowingButton } from "./GlowingButton";

export const CTASection: React.FC = () => {
  const companies = ["Microsoft", "Google", "Amazon", "Meta", "Apple"];

  return (
    <section className="py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Ready to Transform Your Customer Support?
          </h2>
          <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
            Join thousands of companies that are delivering exceptional customer
            experiences with our platform.
          </p>
          <div className="flex flex-col md:flex-row justify-center gap-4">
            <GlowingButton
              primary
              onClick={() => console.log("Start Free Trial clicked!")}
              className="px-8 py-3"
            >
              Start Free Trial
              <span className="ml-2">→</span>
            </GlowingButton>
            <GlowingButton
              secondary
              onClick={() => console.log("Contact Sales clicked!")}
              className="px-8 py-3"
            >
              Contact Sales
              <span className="ml-2">📞</span>
            </GlowingButton>
          </div>

          {/* Trusted By Section */}
          <div className="mt-16">
            <p className="text-sm text-gray-500 mb-6">
              TRUSTED BY LEADING COMPANIES
            </p>
            <motion.div
              className="flex flex-wrap justify-center items-center gap-8"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              {companies.map((company, index) => (
                <span
                  key={index}
                  className="text-gray-500 text-lg font-semibold hover:text-gray-300 transition-colors duration-300"
                >
                  {company}
                </span>
              ))}
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
