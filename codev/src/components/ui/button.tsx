import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[calc(var(--radius)-6px)] border border-transparent text-sm font-medium ring-offset-background transition-[transform,box-shadow,background-color,color,border-color] duration-200 ease-out will-change-transform hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.985] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-45 disabled:hover:translate-y-0 disabled:hover:shadow-none',
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground shadow-[0_14px_30px_-18px_rgb(228,109,88)] hover:bg-primary/95 hover:shadow-[0_18px_36px_-20px_rgb(228,109,88)]',
        secondary:
          'border-border/70 bg-card/80 text-secondary-foreground shadow-[inset_0_1px_0_rgb(255,255,255,0.55)] hover:bg-secondary/95 hover:shadow-[0_16px_30px_-22px_rgb(36,27,20,0.45)]',
        ghost:
          'text-foreground/80 hover:bg-accent/85 hover:text-accent-foreground',
        outline:
          'border-input/85 bg-background/86 shadow-[inset_0_1px_0_rgb(255,255,255,0.55)] hover:bg-accent/65 hover:text-accent-foreground',
        destructive:
          'bg-destructive text-destructive-foreground shadow-[0_14px_30px_-18px_rgb(220,75,75)] hover:bg-destructive/92',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-[calc(var(--radius)-8px)] px-3 text-xs',
        lg: 'h-11 rounded-[calc(var(--radius)-4px)] px-8',
        icon: 'h-10 w-10 rounded-2xl',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';
