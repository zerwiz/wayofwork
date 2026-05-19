import * as React from 'react';
import { cn } from '@/lib/utils';

const Scrollbar = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        'relative overflow-hidden rounded-md',
        'scrollbar-vertical scrollbar-thin scrollbar-thumb-rounded-full scrollbar-thumb-background scrollbar-track-transparent',
        'scrollbar-hover:scrollbar-thumb-background/70',
        className,
      )}
      {...props}
    >
      <div className="flex w-full h-full relative">
        {children}
      </div>
    </div>
  );
});

Scrollbar.displayName = 'Scrollbar';

export { Scrollbar };
export default Scrollbar;
