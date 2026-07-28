import { useRef, useEffect, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  className?: string;
}

export default function TwemojiText({ children, className }: Props) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (ref.current && (window as any).twemoji) {
      (window as any).twemoji.parse(ref.current, { folder: 'svg', ext: '.svg' });
    }
  }, [children]);

  return <span ref={ref} className={className}>{children}</span>;
}
