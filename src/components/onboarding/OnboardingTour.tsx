import { useState, useEffect, useCallback, useRef } from 'react';
import { Compass, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './OnboardingTour.css';

interface TourStep {
  target: string;
  title: string;
  description: string;
  route: string;
  placement?: 'top' | 'bottom' | 'left' | 'right';
}

const STEPS: TourStep[] = [
  {
    target: 'tour-practice',
    title: 'Start Practicing',
    description: 'Generate AI-powered questions on any subject. Pick your topic, exam type, and difficulty.',
    route: '/',
    placement: 'right',
  },
  {
    target: 'tour-topic-input',
    title: 'Choose Your Topic',
    description: 'Enter any subject — Math, Biology, History, anything. AI creates questions tailored to your level.',
    route: '/practice',
  },
  {
    target: 'tour-review',
    title: 'Review & Improve',
    description: 'Check your history, revisit bookmarked questions, and search through everything you\'ve practiced.',
    route: '/',
    placement: 'right',
  },
  {
    target: 'tour-fenbot',
    title: 'Meet FenBot',
    description: 'Your personal AI tutor. Ask anything, get deep explanations, and learn at your own pace.',
    route: '/fenbot',
  },
  {
    target: 'tour-doc-quiz',
    title: 'Document Quiz',
    description: 'Upload a PDF, DOCX, or paste text — AI generates quiz questions from your own materials.',
    route: '/doc-quiz',
  },
  {
    target: 'tour-exam-sim',
    title: 'Exam Simulation',
    description: 'Timed exams with strict rules — no going back. Test your readiness like the real exam.',
    route: '/exam-setup',
  },
  {
    target: 'tour-groups',
    title: 'Study Together',
    description: 'Create study groups, invite friends with a code, and compete in real-time multiplayer.',
    route: '/groups',
    placement: 'right',
  },
  {
    target: 'tour-social',
    title: 'Stay Connected',
    description: 'Share updates, post statuses, chat 1-on-1 or in groups, and see what friends are up to.',
    route: '/feed',
    placement: 'right',
  },
];

const SIDEBAR_TARGETS = new Set(['tour-practice', 'tour-review', 'tour-fenbot', 'tour-groups', 'tour-social']);

interface Props {
  open: boolean;
  onComplete: () => void;
}

export default function OnboardingTour({ open, onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [spotRect, setSpotRect] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});
  const [arrowStyle, setArrowStyle] = useState<React.CSSProperties>({});
  const [arrowDir, setArrowDir] = useState<'top' | 'bottom' | 'left' | 'right'>('top');
  const navigate = useNavigate();
  const tooltipRef = useRef<HTMLDivElement>(null);
  const current = STEPS[step];

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;
  const TOOLTIP_W = isMobile ? 280 : 320;
  const GAP = 14;

  const findTarget = useCallback(() => {
    let el: HTMLElement | null = null;
    let isFallback = false;

    if (SIDEBAR_TARGETS.has(current.target)) {
      // Try sidebar first
      const sidebar = document.querySelector('[data-tour-id="tour-sidebar"]') as HTMLElement;
      if (sidebar) {
        el = sidebar.querySelector(`[data-tour-id="${current.target}"]`) as HTMLElement;
      }
      // If not found or not visible (sidebar closed on mobile), fall back to hamburger menu
      if (!el || !el.getBoundingClientRect) {
        el = document.querySelector('[data-tour-id="tour-hamburger"]') as HTMLElement;
        isFallback = true;
      }
      // Also check if element is off-screen (sidebar closed)
      if (el && !isFallback) {
        const r = el.getBoundingClientRect();
        if (r.left < -10 || r.right > window.innerWidth + 10) {
          el = document.querySelector('[data-tour-id="tour-hamburger"]') as HTMLElement;
          isFallback = true;
        }
      }
    } else {
      el = document.querySelector(`[data-tour-id="${current.target}"]`) as HTMLElement;
    }

    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const pad = isMobile ? 4 : 6;
    return {
      top: rect.top - pad,
      left: rect.left - pad,
      width: rect.width + pad * 2,
      height: rect.height + pad * 2,
      centerX: rect.left + rect.width / 2,
      centerY: rect.top + rect.height / 2,
      elTop: rect.top,
      elLeft: rect.left,
      elRight: rect.right,
      elBottom: rect.bottom,
      isFallback,
    };
  }, [current.target, isMobile]);

  const positionTooltip = useCallback((spot: ReturnType<typeof findTarget>) => {
    if (!spot) return;
    const tooltipH = tooltipRef.current?.offsetHeight || 200;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let placement = current.placement || 'bottom';

    // On desktop, sidebar items go to the right (if sidebar is visible)
    if (!isMobile && !current.placement && SIDEBAR_TARGETS.has(current.target) && !spot.isFallback) {
      placement = 'right';
    }
    // Fallback (hamburger) always goes below
    if (spot.isFallback) {
      placement = 'bottom';
    }
    // On mobile, non-fallback sidebar items go below
    if (isMobile && SIDEBAR_TARGETS.has(current.target) && !spot.isFallback) {
      placement = 'bottom';
    }

    let top = 0;
    let left = 0;
    let arrowTop = 0;
    let arrowLeft = 0;

    const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(v, max));

    if (placement === 'right') {
      left = spot.elRight + GAP;
      top = spot.centerY - tooltipH / 2;
      arrowTop = spot.centerY - top - 8;
      arrowLeft = -8;
      if (left + TOOLTIP_W > vw - 16) {
        placement = 'bottom';
        left = spot.centerX - TOOLTIP_W / 2;
        top = spot.elBottom + GAP;
        arrowTop = -8;
        arrowLeft = spot.centerX - left - 8;
      }
    }
    if (placement === 'bottom') {
      left = spot.centerX - TOOLTIP_W / 2;
      top = spot.elBottom + GAP;
      arrowTop = -8;
      arrowLeft = spot.centerX - left - 8;
      if (top + tooltipH > vh - 16) {
        placement = 'top';
        top = spot.elTop - tooltipH - GAP;
        arrowTop = tooltipH - 8;
        arrowLeft = spot.centerX - left - 8;
      }
    }
    if (placement === 'top') {
      left = spot.centerX - TOOLTIP_W / 2;
      top = spot.elTop - tooltipH - GAP;
      arrowTop = tooltipH - 8;
      arrowLeft = spot.centerX - left - 8;
      if (top < 16) {
        placement = 'bottom';
        top = spot.elBottom + GAP;
        arrowTop = -8;
      }
    }
    if (placement === 'left') {
      left = spot.elLeft - TOOLTIP_W - GAP;
      top = spot.centerY - tooltipH / 2;
      arrowTop = spot.centerY - top - 8;
      arrowLeft = TOOLTIP_W - 8;
    }

    left = clamp(left, 12, vw - TOOLTIP_W - 12);
    top = clamp(top, 12, vh - tooltipH - 12);
    arrowLeft = clamp(arrowLeft, 20, TOOLTIP_W - 20);
    arrowTop = clamp(arrowTop, 8, tooltipH - 16);

    setTooltipStyle({ top, left, width: TOOLTIP_W });
    setArrowStyle({ top: arrowTop, left: arrowLeft });
    setArrowDir(placement === 'top' ? 'bottom' : placement === 'bottom' ? 'top' : placement === 'left' ? 'right' : 'left');
  }, [current.placement, current.target, isMobile, TOOLTIP_W, GAP]);

  const updateSpotlight = useCallback(() => {
    const spot = findTarget();
    if (!spot) return;
    setSpotRect({ top: spot.top, left: spot.left, width: spot.width, height: spot.height });
    requestAnimationFrame(() => positionTooltip(spot));
  }, [findTarget, positionTooltip]);

  useEffect(() => {
    if (!open) return;
    if (window.location.pathname !== current.route) {
      navigate(current.route, { replace: true });
    }
    // On mobile, open sidebar if targeting sidebar elements
    const mobile = window.innerWidth < 1024;
    if (mobile && SIDEBAR_TARGETS.has(current.target)) {
      window.dispatchEvent(new Event('tour-open-sidebar'));
    }
    const delay = 400;
    const timer = setTimeout(updateSpotlight, delay);
    return () => clearTimeout(timer);
  }, [open, step, current.route, current.target, navigate, updateSpotlight]);

  useEffect(() => {
    if (!open) return;
    const handleResize = () => updateSpotlight();
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleResize, true);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize, true);
    };
  }, [open, updateSpotlight]);

  const handleNext = () => {
    if (step < STEPS.length - 1) setStep(step + 1);
    else onComplete();
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  if (!open) return null;

  const clipPath = spotRect
    ? `polygon(0% 0%, 0% 100%, ${spotRect.left}px 100%, ${spotRect.left}px ${spotRect.top}px, ${spotRect.left + spotRect.width}px ${spotRect.top}px, ${spotRect.left + spotRect.width}px ${spotRect.top + spotRect.height}px, ${spotRect.left}px ${spotRect.top + spotRect.height}px, ${spotRect.left}px 100%, 100% 100%, 100% 0%)`
    : 'none';

  return (
    <div className="tour-overlay">
      <div
        className="tour-backdrop"
        style={{ clipPath, WebkitClipPath: clipPath }}
        onClick={onComplete}
      />

      {spotRect && (
        <div
          className="tour-spotlight"
          style={{ top: spotRect.top, left: spotRect.left, width: spotRect.width, height: spotRect.height }}
        />
      )}

      <div ref={tooltipRef} className="tour-tooltip" style={tooltipStyle}>
        <div className={`tour-tooltip-arrow ${arrowDir}`} style={arrowStyle} />

        <div className="tour-step-badge">
          <Compass size={12} />
          Step {step + 1} of {STEPS.length}
        </div>

        <div className="tour-title">{current.title}</div>
        <div className="tour-description">{current.description}</div>

        <div className="tour-footer">
          <button className="tour-btn tour-btn-skip" onClick={onComplete}>Skip</button>

          <div className="tour-dots">
            {STEPS.map((_, i) => (
              <div key={i} className={`tour-dot ${i === step ? 'active' : ''}`} />
            ))}
          </div>

          <div className="tour-nav-btns">
            {step > 0 && (
              <button className="tour-btn tour-btn-back" onClick={handleBack}>
                <ChevronLeft size={14} />
              </button>
            )}
            <button className="tour-btn tour-btn-next" onClick={handleNext}>
              {step === STEPS.length - 1 ? (
                <span className="tour-btn-inner"><Check size={13} /> Got it</span>
              ) : (
                <span className="tour-btn-inner">Next <ChevronRight size={13} /></span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
