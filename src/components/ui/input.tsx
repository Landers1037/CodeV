import * as React from 'react';

import { cn } from '@/lib/utils';

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        className={cn(
          'flex h-11 w-full rounded-[14px] border border-input/85 bg-background/88 px-4 py-2 text-sm shadow-[inset_0_1px_0_rgb(255,255,255,0.6)] ring-offset-background transition-[border-color,box-shadow,background-color] duration-200 ease-out [color-scheme:light] dark:[color-scheme:dark] file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 hover:border-border disabled:cursor-not-allowed disabled:opacity-50',
          type === 'number'
            ? 'appearance-none [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none'
            : '',
          className,
        )}
        {...props}
      />
    );
  },
);
Input.displayName = 'Input';
