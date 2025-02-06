export interface Feature {
  title: string;
  description: string;
  icon: React.ReactNode;
  gradient: string;
  size: "small" | "large" | "vertical" | "horizontal";
}

export const features: Feature[] = [
  {
    title: "Smart Ticket Routing",
    description:
      "Automatically route tickets to the right team based on AI-powered analysis of ticket content and team expertise.",
    icon: "🎯",
    gradient: "from-purple-500 to-pink-500",
    size: "large",
  },
  {
    title: "Real-time Collaboration",
    description:
      "Work together seamlessly with built-in chat, file sharing, and live updates.",
    icon: "👥",
    gradient: "from-blue-500 to-teal-500",
    size: "vertical",
  },
  {
    title: "SLA Management",
    description:
      "Track and manage Service Level Agreements with automated alerts and escalations.",
    icon: "⏱️",
    gradient: "from-orange-500 to-red-500",
    size: "small",
  },
  {
    title: "Analytics Dashboard",
    description:
      "Comprehensive insights into team performance, ticket trends, and customer satisfaction.",
    icon: "📊",
    gradient: "from-green-500 to-teal-500",
    size: "horizontal",
  },
  // Add more features as needed
];
