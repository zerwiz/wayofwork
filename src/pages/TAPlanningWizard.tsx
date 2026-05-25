import React, { useState } from "react";
import { ChevronRight, ArrowLeft, Save, Map, AlertTriangle, FileText, CheckCircle, Info } from "lucide-react";
import { useTranslation } from "../contexts/LanguageContext";
import { validateTAPlan, type ValidationResult } from "../utils/ta-validation";
import { SketchLibrary, TA_SKETCHES } from "../components/TAPlanner/SketchLibrary";
import { MapCanvas } from "../components/taplanner/MapCanvas";
import html2canvas from "html2canvas";

interface WizardProps {
  onComplete: (planData: any) => Promise<void>;
  onCancel: () => void;
}

export function TAPlanningWizard({ onComplete, onCancel }: WizardProps) {
  const { t } = useTranslation();
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    road_number: "",
    speed_limit: "",
    traffic_volume_adt: "",
    work_type: "fixed",
    sketch_id: "",
    map_screenshot_base64: "",
    risk_assessment: {
      hazards: [],
      mitigations: ""
    }
  });

  const handleCapture = async (element: HTMLDivElement) => {
    const canvas = await html2canvas(element);
    updateField("map_screenshot_base64", canvas.toDataURL("image/png"));
  };
  const handleNext = () => setStep(s => s + 1);
  const handlePrev = () => setStep(s => Math.max(1, s - 1));

  const handleSubmit = async () => {
    if (!formData.title) {
      setError("Title is required");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onComplete({
        ...formData,
        speed_limit: formData.speed_limit ? parseInt(formData.speed_limit) : null,
        traffic_volume_adt: formData.traffic_volume_adt ? parseInt(formData.traffic_volume_adt) : null
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e] text-[#cccccc]">
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#3c3c3c] bg-[#252526]">
        <div className="flex items-center gap-3">
          <button onClick={onCancel} className="p-2 hover:bg-[#3c3c3c] rounded-lg transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-lg font-bold text-white">Create TA Plan</h2>
            <p className="text-xs text-[#858585]">Step {step} of 4</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-2xl mx-auto">
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400">
              <AlertTriangle size={20} />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg"><Map size={24} /></div>
                <h3 className="text-xl font-bold text-white">Basic Information</h3>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#858585] uppercase tracking-wider mb-2">Project Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={e => updateField("title", e.target.value)}
                  placeholder="e.g. E4 Highway Repair Section B"
                  className="w-full bg-[#252526] border border-[#3c3c3c] rounded-xl px-4 py-3 text-white focus:border-[#ea580c] outline-none transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#858585] uppercase tracking-wider mb-2">Road Number</label>
                  <input
                    type="text"
                    value={formData.road_number}
                    onChange={e => updateField("road_number", e.target.value)}
                    placeholder="e.g. E4, 73"
                    className="w-full bg-[#252526] border border-[#3c3c3c] rounded-xl px-4 py-3 text-white focus:border-[#ea580c] outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#858585] uppercase tracking-wider mb-2">Speed Limit (km/h)</label>
                  <input
                    type="number"
                    value={formData.speed_limit}
                    onChange={e => updateField("speed_limit", e.target.value)}
                    placeholder="e.g. 70"
                    className="w-full bg-[#252526] border border-[#3c3c3c] rounded-xl px-4 py-3 text-white focus:border-[#ea580c] outline-none transition-colors"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg"><Map size={24} /></div>
                    <h3 className="text-xl font-bold text-white">Visual Map & Overlay</h3>
                </div>
                <MapCanvas onCapture={handleCapture} />
                {formData.map_screenshot_base64 && (
                    <div className="mt-4">
                        <p className="text-xs text-emerald-400">Screenshot captured successfully!</p>
                        <img src={formData.map_screenshot_base64} alt="Screenshot" className="max-h-32 mt-2 rounded border border-[#3c3c3c]" />
                    </div>
                )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg"><AlertTriangle size={24} /></div>
                <h3 className="text-xl font-bold text-white">Work Characteristics</h3>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#858585] uppercase tracking-wider mb-2">Type of Work</label>
                <select
                  value={formData.work_type}
                  onChange={e => updateField("work_type", e.target.value)}
                  className="w-full bg-[#252526] border border-[#3c3c3c] rounded-xl px-4 py-3 text-white focus:border-[#ea580c] outline-none transition-colors appearance-none"
                >
                  <option value="fixed">Fixed workplace (Fast arbetsplats)</option>
                  <option value="moving">Moving workplace (Rörlig arbetsplats)</option>
                  <option value="intermittent">Intermittent (Intermittent arbete)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#858585] uppercase tracking-wider mb-2">Traffic Volume (ADT)</label>
                <input
                  type="number"
                  value={formData.traffic_volume_adt}
                  onChange={e => updateField("traffic_volume_adt", e.target.value)}
                  placeholder="Average Daily Traffic"
                  className="w-full bg-[#252526] border border-[#3c3c3c] rounded-xl px-4 py-3 text-white focus:border-[#ea580c] outline-none transition-colors"
                />
                <p className="text-xs text-[#666666] mt-2">Required for TDOK 2024:0043 compliance calculations.</p>
              </div>

              <div className="pt-4 border-t border-[#3c3c3c]">
                <label className="block text-xs font-bold text-[#858585] uppercase tracking-wider mb-4">Standard Sketches (TDOK 2024:0043)</label>
                <SketchLibrary 
                  selectedSketchId={formData.sketch_id} 
                  onSelect={(id) => updateField("sketch_id", id)}
                  filterWorkType={formData.work_type}
                  filterSpeed={formData.speed_limit ? parseInt(formData.speed_limit) : null}
                />
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg"><CheckCircle size={24} /></div>
                <h3 className="text-xl font-bold text-white">Review & Save</h3>
              </div>

              <div className="bg-[#252526] border border-[#3c3c3c] rounded-2xl p-6 space-y-4">
                <div className="grid grid-cols-2 gap-y-4 border-b border-[#3c3c3c] pb-4">
                  <div>
                    <span className="text-xs text-[#858585] block">Title</span>
                    <span className="font-medium text-white">{formData.title || "-"}</span>
                  </div>
                  <div>
                    <span className="text-xs text-[#858585] block">Road</span>
                    <span className="font-medium text-white">{formData.road_number || "-"}</span>
                  </div>
                  <div>
                    <span className="text-xs text-[#858585] block">Speed Limit</span>
                    <span className="font-medium text-white">{formData.speed_limit ? `${formData.speed_limit} km/h` : "-"}</span>
                  </div>
                  <div>
                    <span className="text-xs text-[#858585] block">Work Type</span>
                    <span className="font-medium text-white capitalize">{formData.work_type}</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 text-sm text-emerald-400">
                  <CheckCircle size={16} />
                  Ready for AI risk assessment generation
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-[#3c3c3c] bg-[#252526] px-8 py-4 flex justify-between items-center">
        <button
          onClick={handlePrev}
          disabled={step === 1 || busy}
          className="px-6 py-2 text-sm font-bold text-[#858585] hover:text-white disabled:opacity-30 transition-colors"
        >
          Back
        </button>

        {step < 3 ? (
          <button
            onClick={handleNext}
            disabled={step === 1 && !formData.title}
            className="flex items-center gap-2 px-6 py-2 bg-[#ea580c] hover:bg-[#d94e06] text-white text-sm font-bold rounded-lg transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:active:scale-100"
          >
            Next Step
            <ChevronRight size={16} />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={busy}
            className="flex items-center gap-2 px-6 py-2 bg-[#238636] hover:bg-[#2ea043] text-white text-sm font-bold rounded-lg transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:active:scale-100"
          >
            {busy ? (
              <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              <Save size={16} />
            )}
            Save TA Plan
          </button>
        )}
      </div>
    </div>
  );
}
