import { useState, useEffect } from "react";
import { getVault, updateVault, logout } from "../services/auth";
import { encryptVault } from "../services/crypto";

// ==========================================
// COMPONENT LOGIC
// ==========================================

export default function Vault() {
  const [passwords, setPasswords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // New state: Tracks which passwords are currently visible (by index)
  const [visiblePasswords, setVisiblePasswords] = useState({});

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

  const toggleVisibility = (index) => {
    setVisiblePasswords(prev => ({
      ...prev,
      [index]: !prev[index] // Toggle true/false for this specific index
    }));
  };

  const handleDelete = async (indexToDelete) => {
    if (!window.confirm("Are you sure you want to delete this password?")) return;
    setError("");
    
    const newPasswords = passwords.filter((_, i) => i !== indexToDelete);
    const newVaultObject = { passwords: newPasswords };

    try {
      const encryptionKey = localStorage.getItem("encryptionKey");
      if (!encryptionKey) {
        throw new Error("Session expired. Please login again.");
      }

      const vaultString = JSON.stringify(newVaultObject);
      const encryptedData = await encryptVault(vaultString, encryptionKey);

      await updateVault({ encryptedVault: encryptedData });
      setPasswords(newPasswords);
    } catch (err) {
      console.error("Delete failed:", err);
      setError(err.message || "Failed to delete password");
    }
  };

  const handleLogout = () => {
    logout();
    window.location.reload();
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  if (loading) return <div className="loading">Loading vault...</div>;

  return (
    <div className="vault-container">
      <div className="vault-header">
        <h2>Your Passwords</h2>
        <button onClick={handleLogout} className="logout-btn">Logout</button>
      </div>

      {error && <div className="error">{error}</div>}

      <div className="password-list">
        {passwords.length === 0 ? (
          <div className="empty-state">No passwords saved yet.</div>
        ) : (
          passwords.map((pwd, index) => {
            const isVisible = visiblePasswords[index];
            
            return (
              <div key={index} className="password-item">
                <div className="password-item-header">
                  <h3>{pwd.website}</h3>
                  <button 
                    className="delete-icon" 
                    onClick={() => handleDelete(index)}
                    title="Delete"
                  >
                    🗑️
                  </button>
                </div>
                
                <div className="password-details">
                  <p className="detail-row">
                    <span className="label">User:</span> {pwd.username}
                  </p>
                  <div className="detail-row password-row">
                    <span className="label">Pass:</span>
                    
                    {/* Password Display Area */}
                    <span className={`password-value ${isVisible ? 'visible' : ''}`}>
                      {isVisible ? pwd.password : "••••••••••••"}
                    </span>
                    
                    {/* Action Buttons */}
                    <div className="password-actions">
                      <button 
                        className="action-btn toggle-btn"
                        onClick={() => toggleVisibility(index)}
                        title={isVisible ? "Hide Password" : "Show Password"}
                      >
                        {isVisible ? "🙈" : "👁️"}
                      </button>
                      <button 
                        className="action-btn copy-btn"
                        onClick={() => copyToClipboard(pwd.password)}
                        title="Copy to Clipboard"
                      >
                        📋
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}