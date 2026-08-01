import { cn } from "@/lib/cn";
import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type ButtonHTMLAttributes } from "react";

// §5.4 — background/border color transition only, 150ms, no scale-bounce.
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-sm px-4 py-2 text-body font-semibold text-text transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg",
  {
    variants: {
      variant: {
        primary: "bg-accent text-white hover:bg-accent-hover",
        secondary: "border border-border bg-surface hover:border-border-glow",
        danger: "bg-danger text-white hover:bg-danger/90",
        ghost: "text-text-muted hover:text-text",
      },
    },
    defaultVariants: {
      variant: "primary",
    },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant }), className)}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";
