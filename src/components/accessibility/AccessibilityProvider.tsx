import { useEffect, useState, useCallback, createContext, useContext, ReactNode } from 'react';

// Accessibility context
interface AccessibilityContextType {
  highContrast: boolean;
  reducedMotion: boolean;
  colorScheme: 'light' | 'dark';
  announce: (message: string, priority?: 'polite' | 'assertive') => void;
}

const AccessibilityContext = createContext<AccessibilityContextType | null>(null);

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const [highContrast, setHighContrast] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [colorScheme, setColorScheme] = useState<'light' | 'dark'>('light');
  
  useEffect(() => {
    // High contrast
    const hcQuery = window.matchMedia('(prefers-contrast: more)');
    const setHighContrast = (matches: boolean) => {
      document.documentElement.classList.toggle('high-contrast', matches);
    };
    setHighContrast(hcQuery.matches);
    hcQuery.addEventListener('change', e => setHighContrast(e.matches));
    
    // Reduced motion
    const rmQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const setReducedMotion = (matches: boolean) => {
      document.documentElement.classList.toggle('reduced-motion', matches);
    };
    setReducedMotion(rmQuery.matches);
    rmQuery.addEventListener('change', e => setReducedMotion(e.matches));
    
    // Color scheme
    const csQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const setColorScheme = (matches: boolean) => {
      document.documentElement.classList.toggle('dark', matches);
    };
    setColorScheme(csQuery.matches);
    csQuery.addEventListener('change', e => setColorScheme(e.matches));
    
    return () => {
      // Cleanup handled by media query listeners
    };
  }, []);
  
  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const announcer = document.getElementById('sr-announcer');
    if (announcer) {
      announcer.textContent = '';
      announcer.textContent = message;
      announcer.setAttribute('aria-live', priority);
    }
  }, []);
  
  return (
    <AccessibilityContext.Provider value={{
      highContrast,
      reducedMotion,
      colorScheme,
      announce,
    }}>
      <div className="min-h-screen bg-slate-900 text-white">
        <LiveRegion />
        <SkipToContent />
        {children}
      </div>
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within AccessibilityProvider');
  }
  return context;
}

// Live region for screen readers
function LiveRegion() {
  const [message, setMessage] = useState('');
  
  useEffect(() => {
    const announcer = document.getElementById('sr-announcer');
    if (announcer) {
      announcer.textContent = '';
    }
  }, []);
  
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
function SkipToContent() {
  return (
    <a 
      href="#main-content" 
      className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-indigo-600 focus:text-white focus:top-4 focus:left-4 z-50"
    >
      Skip to main content
    </a>
  );
}

// Focus outline styles
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
  
  .high-contrast {
    filter: contrast(150%);
  }
  
  .reduced-motion *,
  .reduced-motion *::before,
  .reduced-motion *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
`;
document.head.appendChild(style);