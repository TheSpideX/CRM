import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  FaEnvelope,
  FaLock,
  FaUser,
  FaEye,
  FaEyeSlash,
  FaBuilding,
  FaArrowRight,
  FaCircleCheck,
  FaRocket,
  FaBolt,
  FaChartLine,
  FaHeadset,
  FaUsers,
  FaClock,
  FaGoogle,
  FaGithub,
  FaLinkedin,
} from "react-icons/fa6";
import AuthBackground from "../components/AuthBackground";

interface FormData {
  fullName: string;
  email: string;
  password: string;
  role: string;
  organizationName?: string;
  inviteCode?: string;
}

const FeatureItem: React.FC<{
  icon: React.ReactNode;
  title: string;
  description: string;
}> = ({ icon, title, description }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="flex items-start space-x-4 p-4 rounded-xl hover:bg-white/5 transition-colors"
  >
    <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-primary-500/20 to-secondary-500/20 rounded-xl flex items-center justify-center text-primary-400">
      {icon}
    </div>
    <div>
      <h3 className="text-lg font-semibold text-white mb-1">{title}</h3>
      <p className="text-gray-400">{description}</p>
    </div>
  </motion.div>
);

const Stat: React.FC<{
  value: string;
  label: string;
  icon: React.ReactNode;
}> = ({ value, label, icon }) => (
  <div className="flex items-center space-x-3 bg-white/5 rounded-xl p-4">
    <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-primary-500/20 to-secondary-500/20 rounded-lg flex items-center justify-center text-primary-400">
      {icon}
    </div>
    <div>
      <div className="text-xl font-bold text-white">{value}</div>
      <div className="text-sm text-gray-400">{label}</div>
    </div>
  </div>
);

const SocialButton: React.FC<{
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}> = ({ icon, label, onClick }) => (
  <motion.button
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-lg 
               bg-white/5 hover:bg-white/10 border border-white/10 transition-all"
  >
    {icon}
    <span className="text-sm text-gray-300">{label}</span>
  </motion.button>
);

const InputField: React.FC<{
  type: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder: string;
  icon: React.ReactNode;
  error?: string;
}> = ({ type, name, value, onChange, placeholder, icon, error }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div className="space-y-1">
      <div
        className={`relative group ${
          isFocused ? "ring-2 ring-primary-500/30" : ""
        }`}
      >
        <div className="absolute inset-y-0 left-3 flex items-center text-gray-400 group-focus-within:text-primary-400">
          {icon}
        </div>
        <input
          type={
            type === "password" ? (showPassword ? "text" : "password") : type
          }
          name={name}
          value={value}
          onChange={onChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className="w-full py-2.5 px-10 rounded-lg bg-white/5 border border-white/10 
                   focus:border-primary-500 focus:ring-1 focus:ring-primary-500
                   transition-all placeholder:text-gray-500"
          placeholder={placeholder}
        />
        {type === "password" && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-300"
          >
            {showPassword ? <FaEyeSlash /> : <FaEye />}
          </button>
        )}
      </div>
      {error && (
        <motion.p
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-red-400 text-sm"
        >
          {error}
        </motion.p>
      )}
    </div>
  );
};

const AuthPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    fullName: "",
    email: "",
    password: "",
    role: "customer", // Default role
    organizationName: "",
    inviteCode: "",
  });
  const [errors, setErrors] = useState<Partial<FormData> & { submit?: string }>(
    {}
  );
  const navigate = useNavigate();

  const roles = [
    { value: "customer", label: "Customer" },
    { value: "support", label: "Support Agent" },
    { value: "technical", label: "Technical Agent" },
    { value: "team_lead", label: "Team Lead" },
  ];

  const verifyInvitation = async (inviteCode: string, role: string) => {
    try {
      const response = await fetch("/api/auth/verify-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteCode, role }),
      });

      if (!response.ok) {
        throw new Error("Invalid invitation code");
      }

      return await response.json();
    } catch (error) {
      throw new Error("Invalid invitation code");
    }
  };

  const validateForm = () => {
    const newErrors: Partial<FormData> = {};
    let isValid = true;

    // Common validations
    if (!isLogin && !formData.fullName.trim()) {
      newErrors.fullName = "Full name is required";
      isValid = false;
    }

    if (!formData.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      newErrors.email = "Please enter a valid email";
      isValid = false;
    }

    if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
      isValid = false;
    }

    // Role-specific validations
    if (!isLogin) {
      if (formData.role === "customer" && !formData.organizationName?.trim()) {
        newErrors.organizationName = "Organization name is required";
        isValid = false;
      }

      if (
        ["team_lead", "support", "technical"].includes(formData.role) &&
        !formData.inviteCode?.trim()
      ) {
        newErrors.inviteCode = "Invitation code is required";
        isValid = false;
      }
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      // For registration with invite code, verify the invitation first
      if (
        !isLogin &&
        ["team_lead", "support", "technical"].includes(formData.role)
      ) {
        await verifyInvitation(formData.inviteCode!, formData.role);
      }

      const endpoint = isLogin ? "/api/auth/login" : "/api/auth/register";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }

      const data = await response.json();
      localStorage.setItem("token", data.token);
      localStorage.setItem("role", data.user.role);
      navigate(getRoleBasedRedirect(data.user.role));
    } catch (error) {
      setErrors((prev) => ({
        ...prev,
        submit:
          error instanceof Error ? error.message : "Authentication failed",
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const getRoleBasedRedirect = (role: string): string => {
    switch (role) {
      case "admin":
        return "/admin/dashboard";
      case "team_lead":
        return "/team-lead/dashboard";
      case "customer":
        return "/customer/dashboard";
      case "support":
      case "technical":
        return "/agent/dashboard";
      default:
        return "/dashboard";
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleSocialLogin = (provider: string) => {
    // Implement social login logic
    console.log(`Logging in with ${provider}`);
  };

  // First, define the content for login and signup states
  const loginContent = {
    title: "Welcome Back!",
    subtitle: "Access your support dashboard",
    features: [
      {
        icon: <FaHeadset className="w-4 h-4" />,
        title: "Quick Access",
        description: "Resume your support activities instantly",
      },
      {
        icon: <FaChartLine className="w-4 h-4" />,
        title: "Dashboard Overview",
        description: "View your pending tickets and metrics",
      },
    ],
    stats: [
      {
        icon: <FaBolt className="w-3 h-3" />,
        value: "Instant",
        label: "Access",
      },
      {
        icon: <FaCircleCheck className="w-3 h-3" />,
        value: "Secure",
        label: "Login",
      },
    ],
  };

  const signupContent = {
    title: "Get Started Today",
    subtitle: "Join thousands of support teams worldwide",
    features: [
      {
        icon: <FaRocket className="w-4 h-4" />,
        title: "AI-Powered Support",
        description: "Smart ticket routing and automation",
      },
      {
        icon: <FaUsers className="w-4 h-4" />,
        title: "Team Collaboration",
        description: "Work together seamlessly with your team",
      },
    ],
    stats: [
      {
        icon: <FaHeadset className="w-3 h-3" />,
        value: "24/7",
        label: "Support",
      },
      {
        icon: <FaClock className="w-3 h-3" />,
        value: "2min",
        label: "Setup",
      },
    ],
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4">
      <AuthBackground />

      <div className="w-full max-w-5xl relative z-10">
        {/* More transparent main container */}
        <div
          className="relative bg-white/[0.03] rounded-2xl border border-white/[0.08]
                     shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] backdrop-blur-md overflow-hidden"
        >
          {/* Subtle gradient overlay */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent" />
          </div>

          {/* Content container */}
          <div className="relative z-10">
            <div className="flex flex-col lg:flex-row h-full">
              {/* Left Side - Details section */}
              <div className="lg:w-1/2 p-8 lg:p-12 bg-white/[0.02] backdrop-blur-md">
                <div className="h-full flex flex-col">
                  {/* Logo */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center space-x-3 mb-12"
                  >
                    <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-xl flex items-center justify-center">
                      <span className="text-xl font-bold text-white">SH</span>
                    </div>
                    <span className="text-xl font-bold text-white">
                      Support Hub
                    </span>
                  </motion.div>

                  {/* Dynamic Main Content */}
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={isLogin ? "login" : "signup"}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.3 }}
                      className="flex-1 flex flex-col"
                    >
                      <motion.h1 className="text-2xl font-bold text-white mb-2">
                        {isLogin ? loginContent.title : signupContent.title}
                      </motion.h1>
                      <motion.p className="text-gray-400 mb-8">
                        {isLogin
                          ? loginContent.subtitle
                          : signupContent.subtitle}
                      </motion.p>

                      <div className="space-y-6">
                        {(isLogin
                          ? loginContent.features
                          : signupContent.features
                        ).map((feature, index) => (
                          <motion.div
                            key={`${isLogin ? "login" : "signup"}-feature-${index}`}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="flex items-start space-x-4 bg-white/5 p-4 rounded-lg"
                          >
                            <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-lg flex items-center justify-center">
                              {feature.icon}
                            </div>
                            <div>
                              <h3 className="text-white font-medium mb-1">
                                {feature.title}
                              </h3>
                              <p className="text-gray-400 text-sm">
                                {feature.description}
                              </p>
                            </div>
                          </motion.div>
                        ))}
                      </div>

                      <div className="mt-auto pt-8">
                        <div className="grid grid-cols-2 gap-4">
                          {(isLogin
                            ? loginContent.stats
                            : signupContent.stats
                          ).map((stat, index) => (
                            <motion.div
                              key={`${isLogin ? "login" : "signup"}-stat-${index}`}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.1 }}
                              className="bg-white/5 p-4 rounded-lg flex items-center space-x-3"
                            >
                              <div className="w-6 h-6 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-full flex items-center justify-center">
                                {stat.icon}
                              </div>
                              <div>
                                <div className="text-xl font-bold text-white">
                                  {stat.value}
                                </div>
                                <div className="text-sm text-gray-400">
                                  {stat.label}
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>

              {/* Right Side - Auth Form */}
              <div className="lg:w-1/2 p-8 lg:p-12 bg-white/[0.01]">
                <div className="w-full max-w-md mx-auto">
                  <motion.h2
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-2xl font-bold text-white mb-2"
                  >
                    {isLogin ? "Welcome back!" : "Create your account"}
                  </motion.h2>
                  <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-gray-400 mb-8"
                  >
                    {isLogin
                      ? "Sign in to continue to your dashboard"
                      : "Get started with your free account"}
                  </motion.p>

                  {/* Social Login Buttons */}
                  <div className="grid grid-cols-3 gap-3 mb-8">
                    <SocialButton
                      icon={<FaGoogle className="w-4 h-4 text-gray-400" />}
                      label="Google"
                      onClick={() => handleSocialLogin("google")}
                    />
                    <SocialButton
                      icon={<FaGithub className="w-4 h-4 text-gray-400" />}
                      label="GitHub"
                      onClick={() => handleSocialLogin("github")}
                    />
                    <SocialButton
                      icon={<FaLinkedin className="w-4 h-4 text-gray-400" />}
                      label="LinkedIn"
                      onClick={() => handleSocialLogin("linkedin")}
                    />
                  </div>

                  <div className="relative mb-8">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-white/10"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-4 text-gray-400 bg-background-800">
                        Or continue with
                      </span>
                    </div>
                  </div>

                  {/* Auth Form */}
                  <AnimatePresence mode="wait">
                    <motion.form
                      key={isLogin ? "login" : "signup"}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      onSubmit={handleSubmit}
                      className="space-y-6"
                    >
                      {!isLogin && (
                        <InputField
                          type="text"
                          name="fullName"
                          value={formData.fullName}
                          onChange={handleInputChange}
                          placeholder="John Doe"
                          icon={<FaUser />}
                          error={errors.fullName}
                        />
                      )}

                      <InputField
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        placeholder="you@example.com"
                        icon={<FaEnvelope />}
                        error={errors.email}
                      />

                      <InputField
                        type="password"
                        name="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        placeholder="••••••••"
                        icon={<FaLock />}
                        error={errors.password}
                      />

                      {/* Submit Button */}
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-2.5 px-4 bg-gradient-to-r from-primary-500 to-secondary-500 
                                 rounded-lg text-white font-medium flex items-center justify-center 
                                 space-x-2 hover:from-primary-600 hover:to-secondary-600 
                                 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        {isLoading ? (
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <>
                            <span>
                              {isLogin ? "Sign In" : "Create Account"}
                            </span>
                            <FaArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </motion.button>

                      {/* Auth Toggle */}
                      <p className="text-center text-gray-400">
                        {isLogin
                          ? "Don't have an account?"
                          : "Already have an account?"}
                        <button
                          type="button"
                          onClick={() => setIsLogin(!isLogin)}
                          className="ml-2 text-primary-400 hover:text-primary-300 font-medium"
                        >
                          {isLogin ? "Sign Up" : "Sign In"}
                        </button>
                      </p>
                    </motion.form>
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </div>

          {/* Glass reflection */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] via-transparent to-transparent" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
