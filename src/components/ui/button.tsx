import { forwardRef, ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '../../utils/classnames';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  children: ReactNode;
}

const variantClasses = {
  default: 'bg-indigo-600 text-white hover:bg-indigo-700',
  destructive: 'bg-red-600 text-white hover:bg-red-700',
  outline: 'border border-slate-600 text-slate-300 hover:bg-slate-700/50',
  secondary: 'bg-slate-700 text-slate-200 hover:bg-slate-600',
  ghost: 'text-slate-300 hover:bg-slate-700/50',
};

const sizeClasses = {
  default: 'h-10 px-4 py-2',
  sm: 'h-9 px-3',
  lg: 'h-12 px-6',
  icon: 'h-10 w-10',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', children, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50',
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
);

Button.displayName = 'Button';
