import React from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "glow" | "ghost" | "danger" | "destructive";
  size?: "sm" | "md" | "lg";
  children?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", variant = "secondary", size = "md", children, ...props }, ref) => {
    const base = "inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none disabled:opacity-50 disabled:pointer-events-none rounded-md";

    const variants: Record<string, string> = {
      primary: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-manus-xs",
      secondary: "bg-muted text-foreground hover:bg-muted/80 border border-border shadow-manus-xs",
      outline: "border border-border bg-background hover:bg-muted text-foreground shadow-manus-xs",
      glow: "bg-primary text-primary-foreground shadow-[0_0_15px_rgba(136,81,255,0.4)] hover:shadow-[0_0_20px_rgba(136,81,255,0.6)]",
      ghost: "hover:bg-muted text-muted-foreground hover:text-foreground",
      danger: "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-manus-xs",
      destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-manus-xs",
    };

    const sizes: Record<string, string> = {
      sm: "h-7 px-2.5 text-xs",
      md: "h-9 px-4 text-sm",
      lg: "h-11 px-6 text-base",
    };

    const variantClass = variants[variant] || variants.secondary;
    const sizeClass = sizes[size] || sizes.md;

    return (
      <button
        ref={ref}
        className={`${base}${variantClass} ${sizeClass}${className}`}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
export default Button;