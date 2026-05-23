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
    reproduction_rate: "often",
  });
  const [screenshots, setScreenshots] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const handleScreenshotUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    for (let i = 0; i < files.length; i++) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          setScreenshots((prev) => [...prev, ev.target!.result as string]);
        }
      };
      reader.readAsDataURL(files[i]);
    }
  };

  const removeScreenshot = (idx: number) => {
    setScreenshots((prev) => prev.filter((_, i) => i !== idx));
  };

  const addStep = () => {
    setFormData((prev) => ({ ...prev, steps_to_reproduce: [...prev.steps_to_reproduce, ""] }));
  };

  const updateStep = (idx: number, val: string) => {
    setFormData((prev) => {
      const steps = [...prev.steps_to_reproduce];
      steps[idx] = val;
      return { ...prev, steps_to_reproduce: steps };
    });
  };

  const removeStep = (idx: number) => {
    setFormData((prev) => ({
      ...prev,
      steps_to_reproduce: prev.steps_to_reproduce.filter((_, i) => i !== idx),
    }));
  };

  const resetForm = () => {
    setFormData({
      title: "",
      category: "bug",
      severity: "medium",
      description: "",
      expected_behavior: "",
      actual_behavior: "",
      steps_to_reproduce: [""],
      reproduction_rate: "often",
    });
    setScreenshots([]);
  };

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
        screenshots: screenshots.length > 0 ? screenshots : undefined,
      });
      onClose();
      resetForm();
    } catch (error) {
      console.error("Failed to submit bug report:", error);
      alert("Failed to submit bug report.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Report a Bug or Request Feature" maxWidth="xl">
      <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
        <div>
          <label className="block text-sm text-[#858585] mb-1">Title *</label>
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
            <label className="block text-sm text-[#858585] mb-1">Category *</label>
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
          <label className="block text-sm text-[#858585] mb-1">Reproduction Rate</label>
          <select 
            className="w-full bg-[#1e1e1e] border border-[#3c3c3c] rounded px-3 py-2 text-white"
            value={formData.reproduction_rate}
            onChange={(e) => setFormData({...formData, reproduction_rate: e.target.value})}
          >
            <option value="always">Always</option>
            <option value="often">Often</option>
            <option value="sometimes">Sometimes</option>
            <option value="rarely">Rarely</option>
            <option value="unable">Unable to reproduce</option>
          </select>
        </div>

        <div>
          <label className="block text-sm text-[#858585] mb-1">Description *</label>
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

        <div>
          <label className="block text-sm text-[#858585] mb-1">Steps to Reproduce</label>
          <div className="space-y-2">
            {formData.steps_to_reproduce.map((step, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="text-xs text-[#858585] w-5">{idx + 1}.</span>
                <input
                  className="flex-1 bg-[#1e1e1e] border border-[#3c3c3c] rounded px-3 py-2 text-white text-sm"
                  value={step}
                  onChange={(e) => updateStep(idx, e.target.value)}
                  placeholder={`Step ${idx + 1}`}
                />
                <button
                  type="button"
                  onClick={() => removeStep(idx)}
                  className="text-[#858585] hover:text-red-400 transition-colors text-sm"
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addStep}
              className="text-sm text-[#ea580c] hover:underline"
            >
              + Add step
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm text-[#858585] mb-1">Screenshots</label>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleScreenshotUpload}
            className="w-full text-sm text-[#858585] file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-sm file:font-bold file:bg-[#3c3c3c] file:text-[#cccccc] hover:file:bg-[#4a4a4a]"
          />
          {screenshots.length > 0 ? (
            <div className="flex flex-wrap gap-2 mt-2">
              {screenshots.map((s, idx) => (
                <div key={idx} className="relative group">
                  <img
                    src={s}
                    alt={`Screenshot ${idx + 1}`}
                    className="h-16 w-24 object-cover rounded border border-[#3c3c3c]"
                  />
                  <button
                    type="button"
                    onClick={() => removeScreenshot(idx)}
                    className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          ) : null}
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
