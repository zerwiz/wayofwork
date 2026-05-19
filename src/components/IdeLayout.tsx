import { type ChangeEvent, type RefObject } from "react";

interface IdeLayoutProps {
  children: React.ReactNode;
  workspaceFileInputRef: RefObject<HTMLInputElement | null>;
  onWorkspaceFileChange: (e: ChangeEvent<HTMLInputElement>) => void;
}

export function IdeLayout({
  children, workspaceFileInputRef, onWorkspaceFileChange,
}: IdeLayoutProps) {
  return (
    <>
      <input
        ref={workspaceFileInputRef}
        type="file"
        accept=".code-workspace,.json,application/json"
        className="hidden"
        aria-hidden
        onChange={onWorkspaceFileChange}
      />
      <div className="flex h-full w-full flex-col overflow-hidden bg-[#1e1e1e] font-sans text-[#cccccc] selection:bg-[#9a3412]">
        {children}
      </div>
    </>
  );
}
