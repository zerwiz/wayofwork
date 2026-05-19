import { useCallback, useState } from "react";
import { CircleDot, Plus, Info } from "lucide-react";
import { Button } from "./ui/Button";
import { LlmCatalogModel } from "../hooks/useLlmModels";
import { AiModelDropdown } from "./ai-model-dropdown";

interface ModelSelectorModalProps {
  models: LlmCatalogModel[];
  activeModelId: string | null;
  onSelectModel: (modelId: string) => void;
  onAddModel: () => void;
  loading: boolean;
  error: string | null;
  trigger?: React.ReactNode;
}

export function ModelSelectorModal({
  models,
  activeModelId,
  onSelectModel,
  onAddModel,
  loading,
  error,
  trigger,
}: ModelSelectorModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleOpen = useCallback(() => {
    setIsOpen((o) => !o);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  if (!isOpen) {
    return null;
  }

  const activeModel = models.find((m) => m.name === activeModelId) || models[0];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="model-selector-title"
    >
      <div className="max-w-96 w-full rounded border border-[#454545] bg-[#252526] p-0 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#3c3c3c] bg-[#323233] px-4 py-3">
          <h2
            id="model-selector-title"
            className="text-[13px] font-bold text-white"
          >
            Model Selector
          </h2>
          <button
            type="button"
            className="rounded p-1 text-[#cccccc] hover:bg-[#474747] hover:text-white"
            onClick={close}
            aria-label="Close model selector"
          >
            <Info className="h-4 w-4" />
          </button>
        </div>

        {/* Content - Simple Dropdown */}
        <div className="p-4">
          {error ? (
            <div className="space-y-2 px-3">
              <div className="flex items-center gap-2 rounded bg-[#2d2d2d] border border-[#454545] px-3 py-2">
                <Info className="h-4 w-4 text-[#f48771]" />
                <p className="text-[12px] text-[#f48771]">{error}</p>
              </div>
            </div>
          ) : loading ? (
            <div className="px-3 py-8 text-center">
              <CircleDot className="h-6 w-6 animate-spin text-[#89d185]" />
              <p className="mt-2 text-[12px] text-[#858585]">Loading models…</p>
            </div>
          ) : models.length === 0 ? (
            <div className="space-y-3 px-3">
              <div className="flex flex-col items-center gap-2 rounded bg-[#2d2d2d] border border-[#454545] px-4 py-3">
                <CircleDot className="h-6 w-6 text-[#89d185]" />
                <p className="text-[12px] text-[#858585] text-center">
                  No models found. Add a model to get started.
                </p>
              </div>
              <div className="flex justify-center pt-2">
                <Button onClick={onAddModel}>
                  <Plus className="h-3 w-3 mr-1.5" />
                  <span className="hidden sm:inline">Add Model</span>
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <AiModelDropdown
                trigger={
                  trigger || (
                    <Button variant="outline" size="sm">
                      Change Model
                    </Button>
                  )
                }
                items={models.map((m) => ({
                  id: m.name,
                  label: m.name,
                }))}
                selectedId={activeModelId}
                onSelect={onSelectModel}
                onBack={close}
                title="Select AI Model"
                description="Choose an AI model to use"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-[#3c3c3c] bg-[#2d2d2d] px-4 py-2">
          <div className="text-[11px] text-[#858585]">
            {models.length > 0 ? (
              <span className="font-mono text-[10px] text-[#9cdcfe]">
                {activeModelId || "—"}
              </span>
            ) : loading ? (
              <span>Loading…</span>
            ) : (
              <span>No models available</span>
            )}
          </div>
          <div className="flex gap-2">
            <Button onClick={close} size="sm">
              Cancel
            </Button>
            {activeModelId && (
              <Button
                onClick={close}
                size="sm"
                variant="outline"
                disabled={loading}
              >
                {loading ? "…" : "Done"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
