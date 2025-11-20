import { useState } from "react";
import { getVault, updateVault } from "../services/auth";
import { encryptVault } from "../services/crypto";

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
      // 1. Retrieve the Encryption Key from Storage
      // (This key should have been saved during Login/Registration)
      const encryptionKey = localStorage.getItem("encryptionKey");

      if (!encryptionKey) {
        throw new Error("Encryption key missing. Please log out and log in again.");
      }

      // 2. Get the current vault
      const vault = await getVault();
      
      // 3. Update the local object
      const newPassword = { website, username, password };
      if (!vault.passwords) vault.passwords = [];
      vault.passwords.push(newPassword);

      // 4. Encrypt the vault
      const vaultString = JSON.stringify(vault);
      
      // ✅ FIX: Pass 'encryptionKey' as the second argument
      const encryptedData = await encryptVault(vaultString, encryptionKey);

      // 5. Send to API
      await updateVault({ 
        encryptedVault: encryptedData 
      });

      onAdded();
    } catch (err) {
      console.error("Save Error:", err);
      setError(err.message || "Failed to save password");
    } finally {
      setLoading(false);
    }
  };

  // ... (Return JSX remains the same)
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