import { useState } from "react";
import Modal from "./Modal";
import { apiPostJson } from "../../api/client";

interface BugReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function BugReportModal({ isOpen, onClose }: BugReportModalProps) {
  const [formData, setFormData] = useState({
    title: "",
    category: "bug",
    severity: "medium",
    description: "",
    expected_behavior: "",
    actual_behavior: "",
    steps_to_reproduce: [""],
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const environment = {
        browser: navigator.userAgent,
        os: navigator.platform,
        language: navigator.language,
        url: window.location.href,
        resolution: `${window.screen.width}x${window.screen.height}`,
      };
      
      await apiPostJson("/api/bug-reports", {
        ...formData,
        environment,
      });
      onClose();
      // Reset form
      setFormData({
        title: "",
        category: "bug",
        severity: "medium",
        description: "",
        expected_behavior: "",
        actual_behavior: "",
        steps_to_reproduce: [""],
      });
    } catch (error) {
      console.error("Failed to submit bug report:", error);
      alert("Failed to submit bug report.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Report a Bug or Request Feature" maxWidth="xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-[#858585] mb-1">Title</label>
          <input 
            required
            className="w-full bg-[#1e1e1e] border border-[#3c3c3c] rounded px-3 py-2 text-white"
            value={formData.title}
            onChange={(e) => setFormData({...formData, title: e.target.value})}
            placeholder="e.g. Export feature crashes"
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-[#858585] mb-1">Category</label>
            <select 
              className="w-full bg-[#1e1e1e] border border-[#3c3c3c] rounded px-3 py-2 text-white"
              value={formData.category}
              onChange={(e) => setFormData({...formData, category: e.target.value})}
            >
              <option value="bug">Bug</option>
              <option value="feature">Feature Request</option>
              <option value="security">Security Issue</option>
              <option value="enhancement">Enhancement</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-[#858585] mb-1">Severity</label>
            <select 
              className="w-full bg-[#1e1e1e] border border-[#3c3c3c] rounded px-3 py-2 text-white"
              value={formData.severity}
              onChange={(e) => setFormData({...formData, severity: e.target.value})}
            >
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm text-[#858585] mb-1">Description</label>
          <textarea 
            required
            className="w-full bg-[#1e1e1e] border border-[#3c3c3c] rounded px-3 py-2 text-white h-24"
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
            placeholder="Describe the issue or feature request in detail..."
          />
        </div>

        <div>
          <label className="block text-sm text-[#858585] mb-1">Expected Behavior</label>
          <input 
            className="w-full bg-[#1e1e1e] border border-[#3c3c3c] rounded px-3 py-2 text-white"
            value={formData.expected_behavior}
            onChange={(e) => setFormData({...formData, expected_behavior: e.target.value})}
          />
        </div>

        <div>
          <label className="block text-sm text-[#858585] mb-1">Actual Behavior</label>
          <input 
            className="w-full bg-[#1e1e1e] border border-[#3c3c3c] rounded px-3 py-2 text-white"
            value={formData.actual_behavior}
            onChange={(e) => setFormData({...formData, actual_behavior: e.target.value})}
          />
        </div>

        <button 
          type="submit" 
          disabled={submitting}
          className="w-full bg-[#ea580c] hover:bg-[#d45309] text-white py-2 rounded font-medium transition-colors"
        >
          {submitting ? "Submitting..." : "Submit Report"}
        </button>
      </form>
    </Modal>
  );
}
