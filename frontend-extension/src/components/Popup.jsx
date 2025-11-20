import { useState } from "react";
import { isAuthenticated } from "../services/auth";
import Auth from "./Auth";
import Vault from "./Vault";
import AddPassword from "./AddPassword";
import "../styles/popup.css";

export default function Popup() {
  const [authenticated, setAuthenticated] = useState(isAuthenticated());
  const [showAddPassword, setShowAddPassword] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleAuthSuccess = () => {
    setAuthenticated(true);
  };

  const handlePasswordAdded = () => {
    setShowAddPassword(false);
    setRefreshTrigger(r => r + 1);
  };

  return (
    <div className="popup">
      {!authenticated ? (
        <Auth onSuccess={handleAuthSuccess} />
      ) : (
        <>
          {showAddPassword ? (
            <AddPassword 
              onAdded={handlePasswordAdded} 
              onCancel={() => setShowAddPassword(false)}
            />
          ) : (
            <>
             <Vault key={refreshTrigger} />
              <button 
                onClick={() => setShowAddPassword(true)}
                className="add-btn"
              >
                + Add Password
              </button>
              
            </>
          )}
        </>
      )}
    </div>
  );
}