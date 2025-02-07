import React from "react";

interface CardProps {
  variant?: "default" | "glass";
  className?: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export const Card: React.FC<CardProps> = ({
  variant = "default",
  className = "",
  children,
  style,
}) => {
  const baseClasses =
    "rounded-2xl transition-all duration-300 ease-out hover:translate-y-[-2px]";
  const variantClasses =
    variant === "glass"
      ? "backdrop-blur-sm bg-black/50 hover:bg-black/60 border border-white/10 hover:border-white/20"
      : "bg-black/70";

  return (
    <div
      className={`${baseClasses} ${variantClasses} ${className}`}
      style={style}
    >
      {children}
    </div>
  );
};
