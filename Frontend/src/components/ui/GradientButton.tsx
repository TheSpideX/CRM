import { ButtonHTMLAttributes } from "react";
import { motion } from "framer-motion";

interface GradientButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  size?: "sm" | "md" | "lg";
  variant?: "primary" | "secondary";
  children: React.ReactNode;
}

const GradientButton = ({
  size = "md",
  variant = "primary",
  children,
  className = "",
  ...props
}: GradientButtonProps) => {
  const sizeClasses = {
    sm: "px-4 py-2 text-sm",
    md: "px-6 py-2.5 text-base",
    lg: "px-8 py-3 text-lg",
  };

  const gradientClasses = {
    primary:
      "bg-gradient-to-r from-primary-500 to-primary-700 hover:from-primary-600 hover:to-primary-800",
    secondary:
      "bg-gradient-to-r from-secondary-500 to-secondary-700 hover:from-secondary-600 hover:to-secondary-800",
  };

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={`
        ${sizeClasses[size]}
        ${gradientClasses[variant]}
        rounded-lg
        font-semibold
        text-white
        transition-all
        duration-200
        focus:outline-none
        focus:ring-2
        focus:ring-offset-2
        focus:ring-primary-500
        ${className}
      `}
      {...props}
    >
      {children}
    </motion.button>
  );
};

export default GradientButton;
