import { cn } from "@/lib/cn";
import { forwardRef, type TextareaHTMLAttributes } from "react";

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => {
  return (
    <textarea
      ref={ref}
      className={cn(
        "w-full rounded-sm border border-border bg-surface px-3 py-2 text-body text-text placeholder:text-text-faint",
        "focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg",
        className,
      )}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";
