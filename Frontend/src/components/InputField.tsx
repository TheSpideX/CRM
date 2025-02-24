interface InputFieldProps {
  type: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder: string;
  icon: React.ReactNode;
  error?: string;
}

const InputField: React.FC<InputFieldProps> = ({
  type,
  name,
  value,
  onChange,
  placeholder,
  icon,
  error,
}) => {
  return (
    <div className="space-y-1">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
          {icon}
        </div>
        <input
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          className="block w-full pl-10 pr-3 py-2.5 
                     bg-white/[0.03] border border-white/[0.08]
                     text-white placeholder-gray-400 
                     focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500/20
                     rounded-lg transition-all duration-200
                     hover:bg-white/[0.05] hover:border-white/[0.12]
                     backdrop-blur-md"
          placeholder={placeholder}
        />
      </div>
      {error && <p className="text-red-400 text-sm">{error}</p>}
    </div>
  );
};

export default InputField;
