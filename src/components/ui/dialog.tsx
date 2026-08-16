import {
  createContext,
  useContext,
  useState,
  ReactNode,
} from 'react';
import { cn } from '../../utils/classnames';

interface DialogContext {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DialogContext = createContext<DialogContext>({
  open: false,
  onOpenChange: () => {},
});

export function Dialog({
  open,
  onOpenChange,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}) {
  const [mounted, setMounted] = useState(false);

  if (!mounted && !open) {
    setMounted(true);
  }

  if (!mounted && !open) {
    return null;
  }

  if (!open && !mounted) {
    return null;
  }

  return (
    <DialogContext.Provider value={{ open, onOpenChange }}>
      {children}
      {open && <DialogOverlay />}
    </DialogContext.Provider>
  );
}

export function DialogTrigger({
  children,
}: {
  children: ReactNode;
}) {
  const { onOpenChange } = useContext(DialogContext);

  return (
    <div
      onClick={() => onOpenChange(true)}
      className="cursor-pointer"
    >
      {children}
    </div>
  );
}

export function DialogOverlay() {
  const { onOpenChange } = useContext(DialogContext);
  return (
    <div
      className="fixed inset-0 z-50 bg-black/80"
      onClick={() => onOpenChange(false)}
    />
  );
}

export function DialogContent({
  className,
  children,
  ...props
}: {
  className?: string;
  children: ReactNode;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'fixed left-1/2 top-1/2 z-50 grid w-full max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 border bg-slate-800 p-6 shadow-lg rounded-lg',
        className
      )}
      role="dialog"
      aria-modal="true"
      {...props}
    >
      {children}
    </div>
  );
}

export function DialogHeader({
  className,
  children,
  ...props
}: {
  className?: string;
  children: ReactNode;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex flex-col space-y-2 text-center sm:text-left', className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function DialogFooter({
  className,
  children,
  ...props
}: {
  className?: string;
  children: ReactNode;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2', className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function DialogTitle({
  className,
  children,
  ...props
}: {
  className?: string;
  children: ReactNode;
} & React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn('text-lg font-semibold leading-none tracking-tight text-slate-100', className)}
      {...props}
    >
      {children}
    </h2>
  );
}

export function DialogDescription({
  className,
  children,
  ...props
}: {
  className?: string;
  children: ReactNode;
} & React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn('text-sm text-slate-400', className)}
      {...props}
    >
      {children}
    </p>
  );
}
