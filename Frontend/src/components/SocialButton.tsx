interface SocialButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}

const SocialButton: React.FC<SocialButtonProps> = ({
  icon,
  label,
  onClick,
}) => {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-center w-full px-4 py-2.5
                 bg-black/40 hover:bg-black/50
                 border border-white/[0.08] hover:border-white/[0.12]
                 rounded-lg transition-all duration-200
                 text-gray-300 hover:text-white"
    >
      {icon}
    </button>
  );
};

export default SocialButton;
