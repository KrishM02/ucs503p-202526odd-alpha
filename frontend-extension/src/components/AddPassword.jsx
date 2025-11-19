import { useState } from "react";
import { getVault, updateVault } from "../services/auth";

export default function AddPassword({ onAdded, onCancel }) {
  const [website, setWebsite] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const vault = await getVault();
      const newPassword = { website, username, password };
      vault.passwords.push(newPassword);

      await updateVault(vault);
      onAdded();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="add-password-container">
      <h3>Add New Password</h3>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Website/Service"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          required
        />
        <input
          type="text"
          placeholder="Username/Email"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <div className="error">{error}</div>}
        <div className="button-group">
          <button type="submit" disabled={loading}>
            {loading ? "Saving..." : "Save"}
          </button>
          <button type="button" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}