import { forwardRef, HTMLAttributes, ReactNode } from 'react';
import { cn } from '../../utils/classnames';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline';
  children: ReactNode;
}

const variantClasses = {
  default: 'bg-indigo-600 text-white',
  secondary: 'bg-slate-700 text-slate-200',
  destructive: 'bg-red-600 text-white',
  outline: 'border border-slate-600 text-slate-300',
};

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', children, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
);

Badge.displayName = 'Badge';
