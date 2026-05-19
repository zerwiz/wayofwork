import { X, Maximize2, Printer } from "lucide-react";
import { useDocumentHandler } from "./context/DocumentHandlerContext";
import PreviewContent from "./PreviewContent";
import ZoomControls from "./ZoomControls";
import PageControls from "./PageControls";

interface PreviewModalProps {
  visible: boolean;
  onClose: () => void;
  path: string;
  appearanceDark?: boolean;
}

export function PreviewModal({
  visible,
  onClose,
  appearanceDark = true,
}: PreviewModalProps) {
  const {
    selectedFileForPreview,
    currentZoom,
    setCurrentZoom,
    currentPage,
    setCurrentPage,
    totalPages,
    onPrint,
    onFullscreen,
  } = useDocumentHandler();

  const backdropBg = "bg-black/50";
  const modalBg = appearanceDark ? "bg-[#252526]" : "bg-white";
  const borderColor = appearanceDark ? "border-[#3c3c3c]" : "border-[#e5e5e5]";
  const titleC = appearanceDark ? "text-[#cccccc]" : "text-[#333333]";
  const subC = appearanceDark ? "text-[#858585]" : "text-[#616161]";
  const btnHover = appearanceDark ? "hover:bg-[#3c3c3c]" : "hover:bg-[#e5e5e5]";

  if (!visible) return null;

  return (
    <div
      className={`preview-modal-backdrop fixed inset-0 z-50 flex items-center justify-center ${backdropBg}`}
      onClick={onClose}
    >
      <div
        className={`preview-modal-content flex max-h-[90vh] w-[90vw] max-w-[1200px] flex-col overflow-hidden rounded-lg border shadow-xl ${modalBg} ${borderColor}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={`flex shrink-0 items-center justify-between border-b px-4 py-3 ${borderColor}`}
        >
          <h2 className={`text-lg font-semibold ${titleC}`}>
            {selectedFileForPreview?.name ?? "Preview"}
          </h2>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onFullscreen}
              className={`rounded p-2 ${subC} ${btnHover}`}
              aria-label="Fullscreen"
            >
              <Maximize2 size={18} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className={`rounded p-2 ${subC} ${btnHover}`}
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="preview-modal-body min-h-0 flex-1 overflow-auto p-4">
          <div className="preview-controls mb-4 flex flex-wrap items-center gap-4">
            <ZoomControls
              zoom={currentZoom}
              setZoom={setCurrentZoom}
              appearanceDark={appearanceDark}
            />
            <PageControls
              currentPage={currentPage}
              totalPages={totalPages}
              goToPage={setCurrentPage}
              appearanceDark={appearanceDark}
            />
            <button
              type="button"
              onClick={onPrint}
              className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm ${subC} ${btnHover}`}
            >
              <Printer size={16} />
              Print
            </button>
          </div>

          <PreviewContent
            file={selectedFileForPreview}
            zoom={currentZoom}
            currentPage={currentPage}
            appearanceDark={appearanceDark}
          />
        </div>

        <div
          className={`flex shrink-0 items-center justify-between border-t px-4 py-2 text-xs ${subC} ${borderColor}`}
        >
          <span>{selectedFileForPreview?.name ?? ""}</span>
          <span>
            {totalPages > 0 ? `Page ${currentPage} of ${totalPages}` : ""}
          </span>
        </div>
      </div>
    </div>
  );
}

export default PreviewModal;
