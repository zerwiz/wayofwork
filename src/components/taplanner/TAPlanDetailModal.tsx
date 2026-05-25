import React from 'react';
import { X, MapPin, ShieldCheck, Clock, FileText } from 'lucide-react';

export const TAPlanDetailModal = ({ plan, onClose }: { plan: any; onClose: () => void }) => {
  const details = plan.details_json ? JSON.parse(plan.details_json) : {};
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-[#252526] p-6 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-[#3c3c3c] shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">{plan.title}</h2>
          <button onClick={onClose} className="text-[#999] hover:text-white"><X size={24} /></button>
        </div>
        <div className="flex-1 overflow-y-auto space-y-4 text-sm text-[#cccccc]">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-[#1e1e1e] rounded-lg">
                <span className="text-[#858585] text-xs">Road</span>
                <p className="font-mono">{plan.road_number || 'N/A'}</p>
            </div>
            <div className="p-3 bg-[#1e1e1e] rounded-lg">
                <span className="text-[#858585] text-xs">Speed</span>
                <p>{plan.speed_limit || '--'} km/h</p>
            </div>
          </div>
          <div className="p-3 bg-[#1e1e1e] rounded-lg">
                <span className="text-[#858585] text-xs">Work Type</span>
                <p className="capitalize">{plan.work_type}</p>
          </div>
          
          <div className="mt-4">
            <span className="text-[#858585] text-xs block mb-2">Visual Map Overlay</span>
            {details.map_screenshot_base64 ? (
                <img src={details.map_screenshot_base64} alt="TA Plan Map" className="w-full rounded border border-[#3c3c3c]" />
            ) : (
                <div className="p-4 border border-[#3c3c3c] rounded-xl text-center text-[#666]">
                    <FileText className="mx-auto mb-2" size={32} />
                    <p>No map screenshot generated for this plan.</p>
                </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
