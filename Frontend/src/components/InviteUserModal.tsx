import { useState } from "react";
import { FaEnvelope, FaTimes } from "react-icons/fa";

interface InviteUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserRole: string;
}

const InviteUserModal: React.FC<InviteUserModalProps> = ({
  isOpen,
  onClose,
  currentUserRole,
}) => {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Available roles based on current user's role
  const getAvailableRoles = () => {
    if (currentUserRole === "admin") {
      return [{ value: "team_lead", label: "Team Lead" }];
    }
    if (currentUserRole === "team_lead") {
      return [
        { value: "support", label: "Support Agent" },
        { value: "technical", label: "Technical Agent" },
      ];
    }
    return [];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/auth/send-invite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ email, role }),
      });

      if (!response.ok) {
        throw new Error("Failed to send invitation");
      }

      const data = await response.json();
      setSuccess("Invitation sent successfully!");
      setEmail("");
      setRole("");

      // Close modal after 2 seconds
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to send invitation"
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-background-800 p-6 rounded-lg w-full max-w-md relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white"
        >
          <FaTimes />
        </button>

        <h2 className="text-xl font-bold mb-4">Invite Team Member</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-3 flex items-center">
              <FaEnvelope className="text-gray-400" />
            </div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email Address"
              className="w-full py-3 px-10 rounded-lg bg-white/5 border border-white/10 focus:border-primary-500"
              required
            />
          </div>

          <div className="relative">
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full py-3 px-4 rounded-lg bg-white/5 border border-white/10 focus:border-primary-500"
              required
            >
              <option value="">Select Role</option>
              {getAvailableRoles().map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}
          {success && <p className="text-green-400 text-sm">{success}</p>}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 bg-primary-500 hover:bg-primary-600 rounded-lg transition-colors"
          >
            {isLoading ? "Sending..." : "Send Invitation"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default InviteUserModal;
