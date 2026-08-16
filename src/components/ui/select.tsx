import {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
  ReactNode,
  HTMLAttributes,
} from 'react';
import { cn } from '../../utils/classnames';
import { ChevronDown } from 'lucide-react';

interface SelectContextType {
  value: string;
  onValueChange: (value: string) => void;
  items: { value: string; label: string }[];
  setItems: React.Dispatch<React.SetStateAction<{ value: string; label: string }[]>>;
  open: boolean;
  setOpen: (open: boolean) => void;
}

const SelectContext = createContext<SelectContextType>({
  value: '',
  onValueChange: () => {},
  items: [],
  setItems: () => {},
  open: false,
  setOpen: () => {},
});

export function Select({
  value,
  onValueChange,
  children,
}: {
  value: string;
  onValueChange: (value: string) => void;
  children: ReactNode;
}) {
  const [items, setItems] = useState<{ value: string; label: string }[]>([]);
  const [open, setOpen] = useState(false);

  return (
    <SelectContext.Provider value={{ value, onValueChange, items, setItems, open, setOpen }}>
      <div className="relative" onClick={() => {}}>{children}</div>
    </SelectContext.Provider>
  );
}

export function SelectTrigger({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLButtonElement>) {
  const ctx = useContext(SelectContext);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        ctx.setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [ctx]);

  const selectedLabel = ctx.items.find((i) => i.value === ctx.value)?.label;

  return (
    <div ref={ref} className="w-full">
      <button
        type="button"
        onClick={() => ctx.setOpen(!ctx.open)}
        className={cn(
          'flex w-full items-center justify-between rounded-md border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-slate-100 placeholder-slate-400 focus-within:outline-none focus-within:ring-2 focus-within:ring-indigo-500',
          className
        )}
        {...props}
      >
        <span>{selectedLabel ?? (typeof children === 'string' ? children : ctx.value)}</span>
        <ChevronDown className="h-4 w-4 opacity-50" />
      </button>

      {ctx.open && (
        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-slate-800 text-slate-100 shadow-lg">
          {ctx.items.map((item) => (
            <div
              key={item.value}
              onClick={() => {
                ctx.onValueChange(item.value);
                ctx.setOpen(false);
              }}
              className={cn(
                'relative flex w-full cursor-pointer select-none items-center px-2 py-1.5 text-sm hover:bg-slate-700 rounded',
                ctx.value === item.value && 'bg-slate-600'
              )}
            >
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function SelectValue({ placeholder, children }: { placeholder?: string; children?: ReactNode }) {
  const ctx = useContext(SelectContext);
  const selectedLabel = ctx.items.find((i) => i.value === ctx.value)?.label;

  if (!selectedLabel && !ctx.value && placeholder) {
    return <span className="text-slate-400">{placeholder}</span>;
  }

  return children ?? selectedLabel ?? ctx.value;
}

export function SelectItem({
  value,
  children,
}: {
  value: string;
  children: ReactNode;
}) {
  const ctx = useContext(SelectContext);

  useEffect(() => {
    const label = typeof children === 'string' ? children : value;
    ctx.setItems((prev) => {
      if (prev.find((i) => i.value === value)) return prev;
      return [...prev, { value, label }];
    });
  }, [value, children, ctx]);

  return null;
}

export function SelectItemText({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function SelectLabel({ children }: { children: ReactNode }) {
  return (
    <div className="px-2 py-1.5 text-sm font-semibold text-slate-400">
      {children}
    </div>
  );
}

export function SelectSeparator() {
  return <div className="h-px bg-slate-700 my-1" />;
}

// These are kept for API compatibility but can be no-ops
export function SelectContent({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function SelectViewport({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function SelectScrollUpButton() {
  return null;
}

export function SelectScrollDownButton() {
  return null;
}
