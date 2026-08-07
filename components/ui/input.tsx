import * as React from 'react';
import { cn } from '@/lib/utils';

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-9 w-full rounded-lg border border-[var(--os-border-strong)] bg-[var(--os-surface)] px-3 py-1 text-sm text-[var(--os-text)] shadow-sm transition-colors',
          'placeholder:text-[var(--os-text-muted)]/60',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--os-primary)]/40 focus-visible:border-[var(--os-primary)]/50',
          'disabled:cursor-not-allowed disabled:opacity-45',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export { Input };
