import * as React from "react";
import { cn } from "@/lib/utils";

interface ScrollAreaProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: "vertical" | "horizontal";
}

const ScrollArea = React.forwardRef<
  HTMLDivElement,
  ScrollAreaProps
>(({ className, children, orientation = "vertical", ...props }, ref) => {
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const scrollContainer = container.querySelector(
      "[data-scroll-container-ref]",
    ) as HTMLElement;

    if (!scrollContainer) return;

    const handleScroll = () => {
      const containerScroll = container.scrollTop;
      if (scrollContainer) {
        const scrollHeight = scrollContainer.scrollHeight;
        const clientHeight = scrollContainer.clientHeight;
        const isBottom =
          scrollHeight - scrollContainer.scrollTop - clientHeight < 1;
      }
    };

    return () => {};
  }, [orientation]);

  return (
    <div
      data-scroll-area-ref
      ref={ref}
      className={cn("relative overflow-hidden", className)}
      {...props}
    >
      <div
        data-scroll-content-ref
        data-scroll-orientation={orientation}
        className="h-full w-full overflow-hidden"
      >
        {children}
      </div>
    </div>
  );
});

ScrollArea.displayName = "ScrollArea";

export { ScrollArea };
export type ScrollAreaVariants = "default";
export const SCROLL_AREA_VARIANTS: ScrollAreaVariants[] = ["default"];
export default ScrollArea;
