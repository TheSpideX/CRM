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
  FaRocket,
  FaBolt,
  FaChartLine,
  FaHeadset,
  FaUsers,
  FaClock,
  FaGoogle,
  FaGithub,
  FaLinkedin,
  FaKey,
  FaArrowLeft,
  FaUserTie,
} from "react-icons/fa";

// Add this new import for FA6 icons
import { FaCircleCheck } from "react-icons/fa6";

import AuthBackground from "../components/AuthBackground";

interface RegistrationFormData {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  organizationName?: string;
  inviteCode?: string;
  role?: string;
}

interface AuthState {
  isLogin: boolean;
  registrationType: "customer" | "company" | "company_employee" | null;
  formData: RegistrationFormData;
  errors: Record<string, string>;
  isLoading: boolean;
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
  const [state, setState] = useState<AuthState>({
    isLogin: true,
    registrationType: null,
    formData: {
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
    errors: {},
    isLoading: false,
  });

  const navigate = useNavigate();

  const setIsLogin = (value: boolean) => {
    setState((prev) => ({
      ...prev,
      isLogin: value,
      registrationType: null, // Reset registration type when switching modes
    }));
  };

  const handleRegistrationTypeSelect = (
    type: "customer" | "company" | "company_employee"
  ) => {
    setState((prev) => ({
      ...prev,
      registrationType: type,
      formData: {
        ...prev.formData,
        role:
          type === "company"
            ? "admin"
            : type === "company_employee"
              ? ""
              : "customer",
      },
    }));
  };

  const roles = [
    { value: "customer", label: "Customer" },
    { value: "support", label: "Support Agent" },
    { value: "technical", label: "Technical Agent" },
    { value: "team_lead", label: "Team Lead" },
  ];

  const verifyInvitation = async (inviteCode: string) => {
    try {
      const response = await fetch("/api/auth/verify-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteCode }),
      });

      if (!response.ok) {
        throw new Error("Invalid invitation code");
      }

      const data = await response.json();
      // Update the form data with the role from the invite code
      setFormData((prev) => ({
        ...prev,
        role: data.role, // The backend will return the role associated with the invite code
      }));

      return data;
    } catch (error) {
      throw new Error("Invalid invitation code");
    }
  };

  const validateForm = () => {
    const newErrors: Partial<RegistrationFormData> = {};
    let isValid = true;

    if (!state.isLogin) {
      // Common validation for all registrations
      if (!state.formData.fullName?.trim()) {
        newErrors.fullName = "Full name is required";
        isValid = false;
      }
      if (!state.formData.email?.trim()) {
        newErrors.email = "Email is required";
        isValid = false;
      }
      if (!state.formData.password?.trim()) {
        newErrors.password = "Password is required";
        isValid = false;
      }

      // Organization name validation for both customer and company
      if (
        state.registrationType === "customer" ||
        state.registrationType === "company"
      ) {
        if (!state.formData.organizationName?.trim()) {
          newErrors.organizationName = "Organization name is required";
          isValid = false;
        }
      }

      // Invite code validation only for company employees
      if (state.registrationType === "company_employee") {
        if (!state.formData.inviteCode?.trim()) {
          newErrors.inviteCode = "Invite code is required";
          isValid = false;
        }
      }
    }

    setState((prev) => ({
      ...prev,
      errors: newErrors,
    }));
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setState((prev) => ({
      ...prev,
      isLoading: true,
    }));

    try {
      // For company employees (joining existing company), verify invite first
      if (state.registrationType === "company_employee") {
        await verifyInvitation(
          state.formData.inviteCode!,
          state.formData.role!
        );
      }

      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...state.formData,
          // Set appropriate role based on registration type
          role:
            state.registrationType === "company"
              ? "admin" // Company creator becomes admin
              : state.registrationType === "company_employee"
                ? state.formData.role! // Role determined by invite code
                : "customer", // Customer registration
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }

      const data = await response.json();
      localStorage.setItem("token", data.token);
      navigate(getRoleBasedRedirect(data.role));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        errors: {
          ...prev.errors,
          submit:
            error instanceof Error ? error.message : "Registration failed",
        },
      }));
    } finally {
      setState((prev) => ({
        ...prev,
        isLoading: false,
      }));
    }
  };

  const getRoleBasedRedirect = (role: string): string => {
    switch (role) {
      case "admin":
        return "/admin/dashboard"; // For company creators
      case "team_lead":
      case "support":
      case "technical":
        return "/agent/dashboard"; // For company employees
      case "customer":
        return "/customer/dashboard";
      default:
        return "/dashboard";
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setState((prev) => ({
      ...prev,
      formData: {
        ...prev.formData,
        [name]: value,
      },
    }));
    setState((prev) => ({
      ...prev,
      errors: {
        ...prev.errors,
        [name]: "",
      },
    }));
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

  // Registration type selection view
  const RegistrationTypeSelection = () => (
    <div className="h-full flex items-center justify-center">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-2">
            Choose Registration Type
          </h2>
          <p className="text-gray-400">
            Select how you want to use Support Hub
          </p>
        </div>

        <div className="space-y-4">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleRegistrationTypeSelect("customer")}
            className="w-full p-4 bg-white/[0.05] rounded-lg border border-white/10 
                       hover:bg-white/[0.08] transition-all group"
          >
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg">
                <FaUser className="w-6 h-6 text-white" />
              </div>
              <div className="text-left">
                <h3 className="text-white font-medium mb-1">
                  Register as Customer
                </h3>
                <p className="text-gray-400 text-sm">
                  Get support for your business
                </p>
              </div>
            </div>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleRegistrationTypeSelect("company")}
            className="w-full p-4 bg-white/[0.05] rounded-lg border border-white/10 
                       hover:bg-white/[0.08] transition-all group"
          >
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-gradient-to-br from-secondary-500 to-secondary-600 rounded-lg">
                <FaBuilding className="w-6 h-6 text-white" />
              </div>
              <div className="text-left">
                <h3 className="text-white font-medium mb-1">
                  Create New Company
                </h3>
                <p className="text-gray-400 text-sm">
                  Set up your company's support system
                </p>
              </div>
            </div>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleRegistrationTypeSelect("company_employee")}
            className="w-full p-4 bg-white/[0.05] rounded-lg border border-white/10 
                       hover:bg-white/[0.08] transition-all group"
          >
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-gradient-to-br from-secondary-500 to-secondary-600 rounded-lg">
                <FaUserTie className="w-6 h-6 text-white" />
              </div>
              <div className="text-left">
                <h3 className="text-white font-medium mb-1">
                  Join Existing Company
                </h3>
                <p className="text-gray-400 text-sm">
                  Join with an invite code
                </p>
              </div>
            </div>
          </motion.button>
        </div>

        <p className="text-center text-gray-400">
          Already have an account?{" "}
          <button
            type="button"
            onClick={() => setState((prev) => ({ ...prev, isLogin: true }))}
            className="ml-2 text-primary-400 hover:text-primary-300 font-medium"
          >
            Sign In
          </button>
        </p>
      </div>
    </div>
  );

  // Modify the existing return statement to handle registration flow
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
                      key={state.isLogin ? "login" : "signup"}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.3 }}
                      className="flex-1 flex flex-col"
                    >
                      <motion.h1 className="text-2xl font-bold text-white mb-2">
                        {state.isLogin
                          ? loginContent.title
                          : signupContent.title}
                      </motion.h1>
                      <motion.p className="text-gray-400 mb-8">
                        {state.isLogin
                          ? loginContent.subtitle
                          : signupContent.subtitle}
                      </motion.p>

                      <div className="space-y-6">
                        {(state.isLogin
                          ? loginContent.features
                          : signupContent.features
                        ).map((feature, index) => (
                          <motion.div
                            key={`${state.isLogin ? "login" : "signup"}-feature-${index}`}
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
                          {(state.isLogin
                            ? loginContent.stats
                            : signupContent.stats
                          ).map((stat, index) => (
                            <motion.div
                              key={`${state.isLogin ? "login" : "signup"}-stat-${index}`}
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
              <div className="lg:w-1/2 p-8 lg:p-12 bg-white/[0.01] flex">
                <div className="w-full max-w-md mx-auto self-center">
                  {state.isLogin ? (
                    <LoginForm
                      setIsLogin={setIsLogin}
                      handleSocialLogin={handleSocialLogin}
                    />
                  ) : !state.registrationType ? (
                    // Show registration type selection
                    <RegistrationTypeSelection />
                  ) : (
                    // Show registration form based on type
                    <RegistrationForm
                      type={state.registrationType}
                      onBack={() =>
                        setState((prev) => ({
                          ...prev,
                          registrationType: null,
                        }))
                      }
                      handleInputChange={handleInputChange}
                    />
                  )}
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

// New RegistrationForm component
const RegistrationForm: React.FC<{
  type: "customer" | "company" | "company_employee";
  onBack: () => void;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
}> = ({ type, onBack, handleInputChange }) => {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    organizationName: "",
    inviteCode: "",
    role: type === "company" ? "admin" : "customer", // Default roles for company and customer
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const formContent = {
    title:
      type === "company"
        ? "Create Company Account"
        : type === "company_employee"
          ? "Join Company"
          : "Create Customer Account",
    subtitle:
      type === "company"
        ? "Set up your company's support system"
        : type === "company_employee"
          ? "Join your company's support team"
          : "Get started with customer support",
    buttonText: "Create Account",
  };

  const verifyInvitation = async (inviteCode: string) => {
    try {
      const response = await fetch("/api/auth/verify-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteCode }),
      });

      if (!response.ok) {
        throw new Error("Invalid invitation code");
      }

      const data = await response.json();
      // Update the form data with the role from the invite code
      setFormData((prev) => ({
        ...prev,
        role: data.role, // The backend will return the role associated with the invite code
      }));

      return data;
    } catch (error) {
      throw new Error("Invalid invitation code");
    }
  };

  const handleInviteCodeChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const code = e.target.value;
    setFormData((prev) => ({
      ...prev,
      inviteCode: code,
    }));

    // Clear any previous errors
    setErrors((prev) => ({
      ...prev,
      inviteCode: "",
      submit: "",
    }));

    // If the invite code is complete (you can add your own length validation)
    if (code.length >= 6) {
      try {
        await verifyInvitation(code);
      } catch (error) {
        setErrors((prev) => ({
          ...prev,
          inviteCode: "Invalid invitation code",
        }));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});

    try {
      // For company employees, verify invite code one final time before submission
      if (type === "company_employee") {
        await verifyInvitation(formData.inviteCode);
      }

      const response = await fetch("/api/auth/register", {
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
      navigate(getRoleBasedRedirect(data.role));
    } catch (error) {
      setErrors((prev) => ({
        ...prev,
        submit: error instanceof Error ? error.message : "Registration failed",
      }));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4 mb-6">
        <button
          onClick={onBack}
          className="p-2 hover:bg-white/[0.05] rounded-lg transition-colors"
        >
          <FaArrowLeft className="w-5 h-5 text-gray-400" />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-white">{formContent.title}</h2>
          <p className="text-gray-400">
            {type === "customer"
              ? "Create your customer account"
              : "Set up your company account"}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <InputField
          type="text"
          name="fullName"
          value={formData.fullName}
          onChange={handleInputChange}
          placeholder="Full Name"
          icon={<FaUser />}
          error={errors.fullName}
        />

        <InputField
          type="email"
          name="email"
          value={formData.email}
          onChange={handleInputChange}
          placeholder="Email Address"
          icon={<FaEnvelope />}
          error={errors.email}
        />

        <InputField
          type={showPassword ? "text" : "password"}
          name="password"
          value={formData.password}
          onChange={handleInputChange}
          placeholder="Password"
          icon={<FaLock />}
          error={errors.password}
          endIcon={
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-gray-400 hover:text-gray-300"
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </button>
          }
        />

        <InputField
          type={showPassword ? "text" : "password"}
          name="confirmPassword"
          value={formData.confirmPassword}
          onChange={handleInputChange}
          placeholder="Confirm Password"
          icon={<FaLock />}
          error={errors.confirmPassword}
        />

        {/* Show organization name field for both company and customer */}
        {(type === "company" || type === "customer") && (
          <InputField
            type="text"
            name="organizationName"
            value={formData.organizationName}
            onChange={handleInputChange}
            placeholder="Organization Name"
            icon={<FaBuilding />}
            error={errors.organizationName}
          />
        )}

        {/* Show invite code field ONLY for company employees */}
        {type === "company_employee" && (
          <InputField
            type="text"
            name="inviteCode"
            value={formData.inviteCode}
            onChange={handleInviteCodeChange}
            placeholder="Enter Invite Code"
            icon={<FaKey />}
            error={errors.inviteCode}
          />
        )}

        {errors.submit && (
          <p className="text-red-400 text-sm">{errors.submit}</p>
        )}

        <button
          type="submit"
          disabled={
            isLoading || (type === "company_employee" && !formData.role)
          }
          className="w-full py-2.5 px-4 bg-primary-500 hover:bg-primary-600 rounded-lg 
                   transition-colors disabled:opacity-50"
        >
          {isLoading ? "Creating Account..." : formContent.buttonText}
        </button>
      </form>
    </div>
  );
};

// Add LoginForm component
interface LoginFormProps {
  setIsLogin: (value: boolean) => void;
  handleSocialLogin: (provider: string) => void;
}

const LoginForm: React.FC<LoginFormProps> = ({
  setIsLogin,
  handleSocialLogin,
}) => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
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
        submit: error instanceof Error ? error.message : "Login failed",
      }));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white mb-2">Welcome Back</h2>
        <p className="text-gray-400">Sign in to your account</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <InputField
          type="email"
          name="email"
          value={formData.email}
          onChange={handleInputChange}
          placeholder="Email"
          icon={<FaEnvelope />}
          error={errors.email}
        />

        <InputField
          type="password"
          name="password"
          value={formData.password}
          onChange={handleInputChange}
          placeholder="Password"
          icon={<FaLock />}
          error={errors.password}
        />

        {errors.submit && (
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-red-400 text-sm text-center"
          >
            {errors.submit}
          </motion.p>
        )}

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
              <span>Sign In</span>
              <FaArrowRight className="w-4 h-4" />
            </>
          )}
        </motion.button>

        <div className="text-center">
          <button
            type="button"
            onClick={() => setIsLogin(false)}
            className="text-primary-400 hover:text-primary-300"
          >
            Don't have an account? Sign Up
          </button>
        </div>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-white/10"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-[#0A0A0A] text-gray-400">
            Or continue with
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {["google", "github", "linkedin"].map((provider) => (
          <motion.button
            key={provider}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleSocialLogin(provider)}
            className="flex items-center justify-center px-4 py-2 border border-white/10 
                     rounded-lg hover:bg-white/5 transition-colors"
          >
            {provider === "google" && (
              <FaGoogle className="w-5 h-5 text-gray-400" />
            )}
            {provider === "github" && (
              <FaGithub className="w-5 h-5 text-gray-400" />
            )}
            {provider === "linkedin" && (
              <FaLinkedin className="w-5 h-5 text-gray-400" />
            )}
          </motion.button>
        ))}
      </div>
    </div>
  );
};

export default AuthPage;
