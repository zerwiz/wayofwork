/**
 * Worker Portal Entry Point
 * Uses main app API for all CRUD operations
 */

import ReactDOM from "react-dom/client";
import "./workerportal.css";
import { PortalNavigation, PortalAuth } from "./src/components";
import { PortalHeader } from "./components/PortalHeader";
import { useState } from "react";

const portalApiBaseUrl = "/api";

// Simple token-based auth for demo
const portalToken = "worker-portal-token";

// Helper functions (would use real API)
const api = {
  async getPendingTimeEntries() {
    const url = new URL(`${portalApiBaseUrl}/time_entries/pending`);
    return fetch(url, { credentials: "same-origin" }).then(r => r.json());
  },
  
  async submitTimeEntry(entries) {
    const url = new URL(`${portalApiBaseUrl}/time_entries/bulk`);
    return fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entries }),
    }).then(r => r.json());
  },
  
  async getTeam() {
    const url = new URL(`${portalApiBaseUrl}/team`);
    return fetch(url).then(r => r.json());
  },
};

function App() {
  const [token, setToken] = useState(localStorage.getItem("portal_token"));
  const [team, setTeam] = useState(null);
  
  const handleRefresh = async () => {
    const t = localStorage.getItem("portal_token");
    setToken(t);
  };
  
  return (
    <div className="portal-app">
      <PortalHeader token={token} onRefresh={handleRefresh} />
      <PortalNavigation token={token} refreshToken={handleRefresh} />
      <PortalAuth>
        {/* Worker portal content would go here */}
        <div className="portal-content">Worker Portal Demo</div>
      </PortalAuth>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("portal-root") as HTMLElement);
root.render(<App />);
