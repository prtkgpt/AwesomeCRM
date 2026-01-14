import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-12 w-full rounded-xl border-2 border-gray-300 dark:border-gray-700 bg-background text-foreground px-5 py-3 text-sm font-medium ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-semibold placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/20 dark:focus-visible:ring-blue-400/20 focus-visible:border-blue-500 dark:focus-visible:border-blue-400 focus-visible:shadow-lg transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 shadow-sm hover:border-gray-400 dark:hover:border-gray-600 hover:shadow-md",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
