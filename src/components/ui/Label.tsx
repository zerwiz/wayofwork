import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const labelVariants = cva(
  "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
  {
    variants: {
      variant: {
        default: "",
        destructive: "text-red-500",
        muted: "text-muted-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

type LabelProps = React.HTMLAttributes<HTMLLabelElement> &
  VariantProps<typeof labelVariants>;

function Label({ className, variant, ...props }: LabelProps) {
  return <label className={cn(labelVariants({ variant }), className)} {...props} />;
}

export { Label };
export { labelVariants };

export type LabelVariants = "default" | "destructive" | "muted";
export const LABEL_VARIANTS: LabelVariants[] = ["default", "destructive", "muted"];
