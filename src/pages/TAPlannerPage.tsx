import React, { useState, useEffect } from "react";
import { 
  Map as RoadIcon, 
  Plus, 
  FileText, 
  CheckCircle, 
  AlertTriangle, 
  ChevronRight,
  MapPin,
  Clock,
  ShieldCheck,
  Search
} from "lucide-react";
import { useTranslation } from "../contexts/LanguageContext";
import { TAPlanningWizard } from "./TAPlanningWizard";

interface TAPlan {
  id: string;
  title: string;
  road_number: string;
  speed_limit: number;
  traffic_volume_adt: number;
  work_type: string;
  status: string;
  validation_status: string;
  created_at: string;
}

export function TAPlannerPage() {
  const { t } = useTranslation();
  const [plans, setPlans] = useState<TAPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showWizard, setShowWizard] = useState(false);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const res = await fetch("/api/ta-plans", {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem("wop_token")}`
        }
      });
      if (!res.ok) throw new Error("Failed to fetch TA plans");
      const data = await res.json();
      setPlans(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePlan = async (planData: any) => {
    const res = await fetch("/api/ta-plans", {
      method: "POST",
      headers: {
        'Authorization': `Bearer ${localStorage.getItem("wop_token")}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(planData)
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(errorText || "Failed to create plan");
    }
    
    setShowWizard(false);
    await fetchPlans();
  };

  const filteredPlans = plans.filter(p => 
    p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.road_number?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (showWizard) {
    return <TAPlanningWizard onComplete={handleCreatePlan} onCancel={() => setShowWizard(false)} />;
  }

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e] text-[#cccccc]">
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#3c3c3c] bg-[#252526]">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[#ea580c]/20">
            <RoadIcon className="text-[#ea580c]" size={24} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white uppercase tracking-tight">TA-Planner</h1>
            <p className="text-xs text-[#858585]">Traffic Arrangement & Road Work Safety</p>
          </div>
        </div>
        <button 
          onClick={() => setShowWizard(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#ea580c] hover:bg-[#d94e06] text-white text-sm font-bold rounded-lg transition-all shadow-lg active:scale-95"
        >
          <Plus size={18} />
          New TA-Plan
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex gap-4 mb-8">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#858585]" size={18} />
              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search plans by title or road number..."
                className="w-full pl-10 pr-4 py-2.5 bg-[#252526] border border-[#3c3c3c] rounded-xl text-sm focus:border-[#ea580c] outline-none transition-all"
              />
            </div>
            <div className="flex gap-2">
              <select className="bg-[#252526] border border-[#3c3c3c] rounded-xl px-4 text-sm outline-none focus:border-[#ea580c]">
                <option>All Status</option>
                <option>Draft</option>
                <option>Approved</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-10 h-10 border-4 border-[#ea580c]/20 border-t-[#ea580c] rounded-full animate-spin mb-4" />
              <p className="text-sm text-[#858585]">Loading plans...</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400">
              <AlertTriangle size={20} />
              <p className="text-sm">{error}</p>
            </div>
          ) : filteredPlans.length === 0 ? (
            <div className="text-center py-20 bg-[#252526] border border-[#3c3c3c] border-dashed rounded-2xl">
              <FileText className="mx-auto text-[#3c3c3c] mb-4" size={48} />
              <h3 className="text-lg font-bold text-[#cccccc]">No plans found</h3>
              <p className="text-sm text-[#858585] mt-1">Start by creating your first traffic arrangement plan.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPlans.map((plan) => (
                <div key={plan.id} className="group flex flex-col bg-[#252526] border border-[#3c3c3c] rounded-2xl overflow-hidden hover:border-[#ea580c]/50 transition-all shadow-sm">
                  <div className="p-5 border-b border-[#3c3c3c]">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-bold text-white group-hover:text-[#ea580c] transition-colors line-clamp-1">{plan.title}</h4>
                      <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        plan.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                      }`}>
                        {plan.status}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-[#858585]">
                      <div className="flex items-center gap-1">
                        <MapPin size={14} />
                        Road {plan.road_number || 'N/A'}
                      </div>
                      <div className="flex items-center gap-1">
                        <ShieldCheck size={14} />
                        {plan.speed_limit || '--'} km/h
                      </div>
                    </div>
                  </div>
                  <div className="p-4 bg-[#1e1e1e]/50 flex items-center justify-between">
                    <div className="flex items-center gap-1 text-[11px] text-[#666666]">
                      <Clock size={12} />
                      {new Date(plan.created_at).toLocaleDateString()}
                    </div>
                    <button className="flex items-center gap-1 text-xs font-bold text-[#ea580c] hover:text-[#fb923c] transition-colors">
                      Open Plan
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
