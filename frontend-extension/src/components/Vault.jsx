import { useState, useEffect } from "react";
import { getVault, updateVault, logout } from "../services/auth";

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

  const handleDelete = async (index) => {
    const newPasswords = passwords.filter((_, i) => i !== index);
    const updatedVault = { passwords: newPasswords };
    
    try {
      await updateVault(updatedVault);
      setPasswords(newPasswords);
    } catch (err) {
      setError(err.message);
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