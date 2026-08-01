import { cn } from "@/lib/cn";
import { forwardRef, type InputHTMLAttributes } from "react";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "w-full rounded-sm border border-border bg-surface px-3 py-2 text-body text-text placeholder:text-text-faint",
          "focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg",
          className,
        )}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";
