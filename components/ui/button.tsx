import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--os-primary)]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--os-bg)] disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default:
          'bg-[var(--os-primary)] text-[#060608] hover:opacity-90 shadow-sm shadow-[var(--os-primary)]/25 active:scale-[0.98]',
        secondary:
          'bg-[var(--os-surface-elevated)] text-[var(--os-text)] border border-[var(--os-border)] hover:bg-[var(--os-hover)] hover:text-[var(--os-text)] active:scale-[0.98]',
        outline:
          'border border-[var(--os-border-strong)] bg-transparent text-[var(--os-text)] hover:bg-[var(--os-hover)] active:scale-[0.98]',
        ghost:
          'bg-transparent text-[var(--os-text-muted)] hover:bg-[var(--os-hover)] hover:text-[var(--os-text)]',
        destructive:
          'bg-[var(--os-error)] text-white hover:opacity-90 active:scale-[0.98]',
        link: 'text-[var(--os-primary)] underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-10 rounded-lg px-6',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
