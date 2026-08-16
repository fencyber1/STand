import { forwardRef, LabelHTMLAttributes } from 'react';
import { cn } from '../../utils/classnames';

interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {}

export const Label = forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, children, ...props }, ref) => (
    <label
      ref={ref}
      className={cn('text-sm font-medium text-slate-200', className)}
      {...props}
    >
      {children}
    </label>
  )
);

Label.displayName = 'Label';
