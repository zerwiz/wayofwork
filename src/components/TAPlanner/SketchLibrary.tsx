import React from "react";
import { CheckCircle, Info } from "lucide-react";

export interface TASketch {
  id: string;
  tdok_ref: string;
  title: string;
  description: string;
  work_types: string[]; // 'fixed', 'moving', 'intermittent'
  max_speed: number;
}

export const TA_SKETCHES: TASketch[] = [
  {
    id: "sketch_1",
    tdok_ref: "TDOK 2024:0043, Bilaga 1",
    title: "Fast arbetsplats på vägren",
    description: "Standarduppställning för fast arbete på vägren, utan att påverka körfältet. Kräver VMS vid högre hastigheter.",
    work_types: ["fixed"],
    max_speed: 100,
  },
  {
    id: "sketch_2",
    tdok_ref: "TDOK 2024:0043, Bilaga 2",
    title: "Fast arbetsplats med körfältsavstängning",
    description: "Kräver tungavstängning och TMA vid hastigheter över 80 km/h.",
    work_types: ["fixed"],
    max_speed: 100,
  },
  {
    id: "sketch_3",
    tdok_ref: "TDOK 2024:0043, Bilaga 3",
    title: "Rörlig arbetsplats med varningsfordon",
    description: "Arbetsfordon med varningslykta och TMA-skydd på vägar över 80 km/h.",
    work_types: ["moving"],
    max_speed: 80,
  },
  {
    id: "sketch_4",
    tdok_ref: "TDOK 2024:0043, Bilaga 4",
    title: "Intermittent arbete i tätort",
    description: "Kortvarigt arbete under 15 minuter. Minimerad skyltning men höga krav på varningsljus.",
    work_types: ["intermittent"],
    max_speed: 60,
  }
];

interface SketchLibraryProps {
  selectedSketchId: string;
  onSelect: (sketchId: string) => void;
  filterWorkType?: string;
  filterSpeed?: number | null;
}

export function SketchLibrary({ selectedSketchId, onSelect, filterWorkType, filterSpeed }: SketchLibraryProps) {
  const filteredSketches = TA_SKETCHES.filter(s => {
    if (filterWorkType && !s.work_types.includes(filterWorkType)) return false;
    if (filterSpeed && filterSpeed > s.max_speed) return false;
    return true;
  });

  if (filteredSketches.length === 0) {
    return (
      <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400 text-sm flex items-start gap-2">
        <Info size={18} className="shrink-0 mt-0.5" />
        <p>No standard TDOK 2024:0043 sketches found for these conditions. A custom sketch and explicit Trafikverket approval may be required.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {filteredSketches.map(sketch => {
        const isSelected = selectedSketchId === sketch.id;
        return (
          <button
            key={sketch.id}
            onClick={() => onSelect(sketch.id)}
            className={`text-left p-4 rounded-xl border transition-all ${
              isSelected 
                ? "bg-[#ea580c]/10 border-[#ea580c] ring-1 ring-[#ea580c]" 
                : "bg-[#252526] border-[#3c3c3c] hover:border-[#666666]"
            }`}
          >
            <div className="flex justify-between items-start mb-2">
              <span className="text-[10px] font-mono text-[#858585]">{sketch.tdok_ref}</span>
              {isSelected && <CheckCircle size={16} className="text-[#ea580c]" />}
            </div>
            <h4 className="text-sm font-bold text-white mb-1">{sketch.title}</h4>
            <p className="text-xs text-[#858585] leading-relaxed">{sketch.description}</p>
          </button>
        );
      })}
    </div>
  );
}
