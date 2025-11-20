import { useState, useEffect } from "react";
import { getVault, updateVault, logout } from "../services/auth";
import { encryptVault } from "../services/crypto";

export default function Vault() {
  const [passwords, setPasswords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadVault();
  }, []);

  const loadVault = async () => {
    try {
      const vault = await getVault();
      setPasswords(vault.passwords || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (indexToDelete) => {
    // 1. Confirm action
    if (!window.confirm("Are you sure you want to delete this password?")) return;

    setError("");
    
    // Optimistically create the new list to encrypt
    const newPasswords = passwords.filter((_, i) => i !== indexToDelete);
    const newVaultObject = { passwords: newPasswords };

    try {
      // 2. Get the encryption key
      const encryptionKey = localStorage.getItem("encryptionKey");
      if (!encryptionKey) {
        throw new Error("Session expired. Please login again.");
      }

      // 3. Encrypt the updated list BEFORE sending
      // The API requires the structure: { encryptedVault: "..." }
      const vaultString = JSON.stringify(newVaultObject);
      const encryptedData = await encryptVault(vaultString, encryptionKey);

      // 4. Send to API
      await updateVault({ 
        encryptedVault: encryptedData 
      });

      // 5. Update UI
      setPasswords(newPasswords);

    } catch (err) {
      console.error("Delete failed:", err);
      setError(err.message || "Failed to delete password");
      
      // Optional: If key is missing, force logout
      if (err.message.includes("Session expired")) {
        handleLogout();
      }
    }
  };

  const handleLogout = () => {
    logout();
    window.location.reload();
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="vault-container">
      <div className="vault-header">
        <h2>Your Passwords</h2>
        <button onClick={handleLogout} className="logout-btn">Logout</button>
      </div>

      {error && <div className="error">{error}</div>}

      <div className="password-list">
        {passwords.length === 0 ? (
          <p>No passwords saved yet.</p>
        ) : (
          passwords.map((pwd, index) => (
            <div key={index} className="password-item">
              <h3>{pwd.website}</h3>
              <p>Username: {pwd.username}</p>
              <button onClick={() => handleDelete(index)}>Delete</button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}