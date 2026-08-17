import { useEffect, useRef, useCallback, useState } from 'react';

// Focus management
export function useFocusTrap(isActive: boolean) {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isActive) return;

    const container = containerRef.current;
    if (!container) return;

    previousActiveElement.current = document.activeElement as HTMLElement;

    const focusableElements = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const focusable = Array.from(
        container.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
      ).filter(el => !(el as HTMLInputElement).disabled && el.offsetParent !== null);

      if (focusable.length === 0) return;

      const firstElement = focusable[0];
      const lastElement = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (previousActiveElement.current) {
        previousActiveElement.current.focus();
      }
    };
  }, [isActive]);

  return containerRef;
}

// Focus management hook
export function useFocusManager() {
  const focusHistory = useRef<HTMLElement[]>([]);
  const currentIndex = useRef(-1);

  const saveFocus = useCallback((element: HTMLElement) => {
    focusHistory.current = focusHistory.current.slice(0, currentIndex.current + 1);
    focusHistory.current.push(element);
    currentIndex.current = focusHistory.current.length - 1;
  }, []);

  const goBack = useCallback(() => {
    if (currentIndex.current > 0) {
      currentIndex.current--;
      focusHistory.current[currentIndex.current]?.focus();
    }
  }, []);

  const goForward = useCallback(() => {
    if (currentIndex.current < focusHistory.current.length - 1) {
      currentIndex.current++;
      focusHistory.current[currentIndex.current]?.focus();
    }
  }, []);

  const clear = useCallback(() => {
    focusHistory.current = [];
    currentIndex.current = -1;
  }, []);

  return { saveFocus, goBack, goForward, clear };
}

// Keyboard navigation hooks
export function useKeyboardNavigation(
  onEnter?: () => void,
  onEscape?: () => void,
  onArrowUp?: () => void,
  onArrowDown?: () => void,
  onArrowLeft?: () => void,
  onArrowRight?: () => void,
  onTab?: () => void
) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Enter':
          onEnter?.();
          break;
        case 'Escape':
          onEscape?.();
          break;
        case 'ArrowUp':
          onArrowUp?.();
          break;
        case 'ArrowDown':
          onArrowDown?.();
          break;
        case 'ArrowLeft':
          onArrowLeft?.();
          break;
        case 'ArrowRight':
          onArrowRight?.();
          break;
        case 'Tab':
          onTab?.();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onEnter, onEscape, onArrowUp, onArrowDown, onArrowLeft, onArrowRight, onTab]);
}

// Announce to screen readers
export function useAnnouncer() {
  const [announcement, setAnnouncement] = useState('');

  const announce = useCallback((message: string, _priority: 'polite' | 'assertive' = 'polite') => {
    setAnnouncement(message);
  }, []);

  return { announcement, setAnnouncement, announce };
}

// Screen reader announcer component
export function ScreenReaderAnnouncer() {
  const [announcement, setAnnouncement] = useState('');

  useEffect(() => {
    if (!announcement) return;

    const announcer = document.getElementById('sr-announcer');
    if (announcer) {
      announcer.textContent = '';
      announcer.textContent = announcement;
    }
  }, [announcement]);

  return (
    <div
      id="sr-announcer"
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    />
  );
}

// Skip to main content link
export function SkipToContent() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-indigo-600 focus:text-white focus:top-4 focus:left-4 z-50"
    >
      Skip to main content
    </a>
  );
}

// Focus indicator styles
export const focusStyles = `
  .focus-visible:focus {
    outline: 2px solid #6366f1;
    outline-offset: 2px;
  }

  .focus-visible:focus:not(:focus-visible) {
    outline: none;
  }
`;

// High contrast mode detection
export function useHighContrast() {
  const [highContrast, setHighContrast] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-contrast: more)');
    setHighContrast(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setHighContrast(e.matches);
    mediaQuery.addEventListener('change', handler);

    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return highContrast;
}

// Reduced motion detection
export function useReducedMotion() {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);

    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return reducedMotion;
}

// Color scheme detection
export function useColorScheme() {
  const [colorScheme, setColorScheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setColorScheme(mediaQuery.matches ? 'dark' : 'light');

    const handler = (e: MediaQueryListEvent) => setColorScheme(e.matches ? 'dark' : 'light');
    mediaQuery.addEventListener('change', handler);

    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return colorScheme;
}

// Focus visible polyfill
export function useFocusVisible() {
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .focus-visible:focus:not(:focus-visible) {
        outline: none;
      }

      :focus:not(.focus-visible) {
        outline: none;
      }

      .focus-visible:focus {
        outline: 2px solid #6366f1;
        outline-offset: 2px;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);
}

// ARIA live region hook
export function useLiveRegion() {
  const announce = useCallback((message: string, _priority: 'polite' | 'assertive' = 'polite') => {
    const liveRegion = document.getElementById('aria-live-region');
    if (liveRegion) {
      liveRegion.textContent = message;
    }
  }, []);

  return { announce };
}

// Live region component
export function LiveRegion() {
  useEffect(() => {
    return () => {
      const region = document.getElementById('aria-live-region');
      if (region) region.textContent = '';
    };
  }, []);

  return (
    <div
      id="aria-live-region"
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    />
  );
}

// Focus management for modals
export function useModalFocus(isOpen: boolean, onClose: () => void) {
  const previousActiveElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement as HTMLElement;

      const modal = document.querySelector('[role="dialog"]') as HTMLElement;
      if (modal) {
        modal.focus();
      }

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };

      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    } else if (previousActiveElement.current) {
      previousActiveElement.current.focus();
    }
  }, [isOpen, onClose]);
}

// ARIA utilities
export const aria = {
  generateId: (prefix: string = 'aria') => `${prefix}-${Math.random().toString(36).substr(2, 9)}`,
  describedBy: (ids: string[]) => ids.filter(Boolean).join(' '),
  labelledBy: (ids: string[]) => ids.filter(Boolean).join(' '),
  controls: (ids: string[]) => ids.filter(Boolean).join(' '),
  owns: (ids: string[]) => ids.filter(Boolean).join(' '),
  activeDescendant: (id: string) => id,
  expanded: (expanded: boolean) => expanded,
  selected: (selected: boolean) => selected,
  disabled: (disabled: boolean) => disabled,
  hidden: (hidden: boolean) => hidden,
  required: (required: boolean) => required,
  invalid: (invalid: boolean) => invalid,
  live: (politeness: 'off' | 'polite' | 'assertive' = 'polite') => politeness,
  atomic: (atomic: boolean) => atomic,
  relevant: (relevant: 'additions' | 'removals' | 'text' | 'all' = 'additions') => relevant,
};

// Keyboard event helpers
export const keyCodes = {
  enter: 'Enter',
  escape: 'Escape',
  tab: 'Tab',
  arrowUp: 'ArrowUp',
  arrowDown: 'ArrowDown',
  arrowLeft: 'ArrowLeft',
  arrowRight: 'ArrowRight',
  space: ' ',
  home: 'Home',
  end: 'End',
  pageUp: 'PageUp',
  pageDown: 'PageDown',
  backspace: 'Backspace',
  delete: 'Delete',
};

export function isKey(e: KeyboardEvent, key: string): boolean {
  return e.key === key;
}

export function isModifierPressed(e: KeyboardEvent): boolean {
  return e.ctrlKey || e.metaKey || e.shiftKey || e.altKey;
}

export function isEnterOnly(e: KeyboardEvent): boolean {
  return e.key === 'Enter' && !e.shiftKey;
}

export function isShiftEnter(e: KeyboardEvent): boolean {
  return e.key === 'Enter' && e.shiftKey;
}
