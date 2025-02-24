import { ReactNode } from "react";
import { motion } from "framer-motion";

interface CardProps {
  variant?: string;
  className?: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}

const Card: React.FC<CardProps> = ({ variant, className, children, style }) => {
  return (
    <div className={className} style={style}>
      {children}
    </div>
  );
};

export default Card;
