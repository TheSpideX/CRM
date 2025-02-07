import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useState } from "react";

const Navbar = () => {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const navigate = useNavigate();

  const navItems = [
    { label: "Features", path: "/features" },
    { label: "Pricing", path: "/pricing" },
    { label: "Resources", path: "/resources" },
    { label: "About", path: "/about" },
  ];

  return (
    <nav className="relative w-full z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center space-x-2">
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-400 to-secondary-400"
            >
              SupportHub
            </motion.div>
          </Link>

          <div className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => (
              <Link
                key={item.label}
                to={item.path}
                className="relative px-3 py-2"
                onMouseEnter={() => setHoveredItem(item.label)}
                onMouseLeave={() => setHoveredItem(null)}
              >
                <motion.span
                  className="relative z-10 text-sm font-medium"
                  animate={{
                    color: hoveredItem === item.label ? "#ffffff" : "#9ca3af",
                  }}
                >
                  {item.label}
                </motion.span>
                {hoveredItem === item.label && (
                  <motion.div
                    layoutId="navbar-hover"
                    className="absolute inset-0 rounded-md bg-white/10"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  />
                )}
              </Link>
            ))}

            <motion.button
              whileHover={{ scale: 1.05 }}
              className="ml-4 px-4 py-2 rounded-md bg-gradient-to-r from-primary-500 to-secondary-500 text-white text-sm font-medium"
              onClick={() => navigate("/auth")}
            >
              Get Started
            </motion.button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
