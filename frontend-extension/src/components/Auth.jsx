import { useState } from "react";
import { register, login } from "../services/auth";

export default function Auth({ onSuccess }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      let result;

      // 1. Call the service (which should perform crypto + API calls)
      if (mode === "register") {
        result = await register(email, password);
      } else {
        result = await login(email, password);
      }

      // 2. Save critical data to LocalStorage
      // Your services/auth.js MUST return these values for this to work
      if (result && result.token) {
        localStorage.setItem("token", result.token);
      }
      
      if (result && result.encryptionKey) {
        localStorage.setItem("encryptionKey", result.encryptionKey);
      } else {
        // Safety warning during development
        console.warn("Warning: No encryption key returned from auth service!");
      }

      // 3. Proceed to main app
      onSuccess();
    } catch (err) {
      console.error("Auth Error:", err);
      setError(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <h1>SecureVault</h1>
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Master Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit" disabled={loading}>
          {loading ? "Loading..." : mode === "login" ? "Login" : "Register"}
        </button>
      </form>
      {error && <div className="error">{error}</div>}
      <button
        type="button"
        onClick={() => {
          setMode(mode === "login" ? "register" : "login");
          setError(""); // Clear errors when switching modes
        }}
      >
        {mode === "login" ? "Need an account?" : "Already have an account?"}
      </button>
    </div>
  );
}