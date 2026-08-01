import { cn } from "@/lib/cn";
import type { LabelHTMLAttributes } from "react";

export function Label({
  className,
  ...props
}: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("text-body-sm font-medium text-text-muted", className)}
      {...props}
    />
  );
}
