import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "./ui/Button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "./ui/DropdownMenu";
import { ScrollArea } from "./ui/ScrollArea";

type AiModelDropdownProps = {
  trigger?: React.ReactNode;
  items: { id: string; label: string; icon?: React.ReactNode }[];
  selectedId?: string | null;
  onSelect: (id: string) => void;
  onBack?: () => void;
  title?: string;
  description?: string;
};

export function AiModelDropdown({
  trigger = (
    <Button variant="outline" size="sm">
      Select
    </Button>
  ),
  items,
  selectedId,
  onSelect,
  onBack,
  title = "Select AI Model",
  description = "Choose an AI model to use",
}: AiModelDropdownProps) {
  const [open, setOpen] = React.useState(false);

  const handleSelect = (id: string) => {
    onSelect(id);
    setOpen(false);
  };

  return (
    <DropdownMenu {...({ open, onOpenChange: setOpen } as any)}>
      <DropdownMenuTrigger asChild // @ts-ignore
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      >
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          {trigger}
          <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[300px]">
        <ScrollArea className="max-h-[300px]">
          {items.map((item) => (
            <DropdownMenuItem
              key={item.id}
              // @ts-ignore - DropdownMenuMenuItem type definition is complex
              onClick={() => {
                handleSelect(item.id);
              }}
              className={
                selectedId === item.id
                  ? "bg-accent text-accent-foreground"
                  : ""
              }
            >
              {item.icon && <span className="mr-2">{item.icon}</span>}
              {item.label}
              {selectedId === item.id && (
                <Check className="ml-auto h-4 w-4" />
              )}
            </DropdownMenuItem>
          ))}
        </ScrollArea>
        {onBack && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onBack}>
              Back
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export type AiModelDropdownVariants = "default";
export const AI_MODEL_DROPDOWN_VARIANTS: AiModelDropdownVariants[] = [
  "default",
];
export default AiModelDropdown;
