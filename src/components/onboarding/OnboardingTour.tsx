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
    description: 'Generate AI-powered questions on any subject. Pick your topic, exam type, and difficulty — fresh questions every time.',
    route: '/',
  },
  {
    target: 'tour-topic-input',
    title: 'Choose Your Topic',
    description: 'Enter any subject — Math, Biology, History, Literature, anything. The AI creates questions tailored to your level.',
    route: '/practice',
  },
  {
    target: 'tour-review',
    title: 'Review & Improve',
    description: 'Check your session history, revisit bookmarked questions, and search through everything you\'ve practiced.',
    route: '/',
  },
  {
    target: 'tour-fenbot',
    title: 'Meet FenBot',
    description: 'Your personal AI tutor. Ask anything, get deep explanations, and learn at your own pace — available 24/7.',
    route: '/fenbot',
  },
  {
    target: 'tour-doc-quiz',
    title: 'Document Quiz',
    description: 'Upload a PDF, DOCX, or paste text — AI generates quiz questions directly from your own materials.',
    route: '/doc-quiz',
  },
  {
    target: 'tour-exam-sim',
    title: 'Exam Simulation',
    description: 'Timed exams with strict rules — no going back, no hints. Test your readiness just like the real exam.',
    route: '/exam-setup',
  },
  {
    target: 'tour-groups',
    title: 'Study Together',
    description: 'Create study groups, invite friends with a code, and compete in real-time multiplayer quizzes.',
    route: '/groups',
  },
  {
    target: 'tour-social',
    title: 'Stay Connected',
    description: 'Share updates on the feed, post statuses, chat 1-on-1 or in groups, and see what your friends are up to.',
    route: '/feed',
  },
];

interface Props {
  open: boolean;
  onComplete: () => void;
}

export default function OnboardingTour({ open, onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [spotRect, setSpotRect] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number; placement: string }>({ top: 0, left: 0, placement: 'bottom' });
  const navigate = useNavigate();
  const tooltipRef = useRef<HTMLDivElement>(null);
  const current = STEPS[step];

  const findTarget = useCallback(() => {
    const el = document.querySelector(`[data-tour-id="${current.target}"]`) as HTMLElement;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    return {
      top: rect.top - 8,
      left: rect.left - 8,
      width: rect.width + 16,
      height: rect.height + 16,
      centerX: rect.left + rect.width / 2,
      centerY: rect.top + rect.height / 2,
    };
  }, [current.target]);

  const positionTooltip = useCallback((spot: { top: number; left: number; width: number; height: number; centerX: number; centerY: number }) => {
    const tooltipW = 380;
    const tooltipH = tooltipRef.current?.offsetHeight || 260;
    const gap = 20;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let placement = current.placement || 'bottom';
    let top = 0;
    let left = 0;

    if (placement === 'bottom') {
      top = spot.top + spot.height + gap;
      left = spot.centerX - tooltipW / 2;
      if (top + tooltipH > vh - 16) {
        placement = 'top';
        top = spot.top - tooltipH - gap;
      }
    }
    if (placement === 'top') {
      top = spot.top - tooltipH - gap;
      left = spot.centerX - tooltipW / 2;
      if (top < 16) {
        placement = 'bottom';
        top = spot.top + spot.height + gap;
      }
    }
    if (placement === 'left') {
      left = spot.left - tooltipW - gap;
      top = spot.centerY - tooltipH / 2;
    }
    if (placement === 'right') {
      left = spot.left + spot.width + gap;
      top = spot.centerY - tooltipH / 2;
    }

    left = Math.max(16, Math.min(left, vw - tooltipW - 16));
    top = Math.max(16, Math.min(top, vh - tooltipH - 16));

    setTooltipPos({ top, left, placement });
  }, [current.placement]);

  const updateSpotlight = useCallback(() => {
    const spot = findTarget();
    if (!spot) return;
    setSpotRect({ top: spot.top, left: spot.left, width: spot.width, height: spot.height });
    requestAnimationFrame(() => positionTooltip(spot));
  }, [findTarget, positionTooltip]);

  useEffect(() => {
    if (!open) return;
    // Navigate to the correct route for this step
    if (window.location.pathname !== current.route) {
      navigate(current.route, { replace: true });
    }
    // Wait for navigation + render, then find target
    const timer = setTimeout(updateSpotlight, 300);
    return () => clearTimeout(timer);
  }, [open, step, current.route, navigate, updateSpotlight]);

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
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      onComplete();
    }
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
          style={{
            top: spotRect.top,
            left: spotRect.left,
            width: spotRect.width,
            height: spotRect.height,
          }}
        />
      )}

      <div
        ref={tooltipRef}
        className="tour-tooltip"
        style={{ top: tooltipPos.top, left: tooltipPos.left }}
      >
        <div className={`tour-tooltip-arrow ${tooltipPos.placement}`} />

        <div className="tour-step-badge">
          <Compass size={13} />
          Step {step + 1} of {STEPS.length}
        </div>

        <div className="tour-title">{current.title}</div>
        <div className="tour-description">{current.description}</div>

        <div className="tour-footer">
          <button className="tour-btn tour-btn-skip" onClick={onComplete}>
            Skip Tour
          </button>

          <div className="tour-dots">
            {STEPS.map((_, i) => (
              <div key={i} className={`tour-dot ${i === step ? 'active' : ''}`} />
            ))}
          </div>

          <div style={{ display: 'flex', gap: 6 }}>
            {step > 0 && (
              <button className="tour-btn tour-btn-back" onClick={handleBack}>
                <ChevronLeft size={15} />
              </button>
            )}
            <button className="tour-btn tour-btn-next" onClick={handleNext}>
              {step === STEPS.length - 1 ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  Get Started <Check size={14} />
                </span>
              ) : (
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  Next <ChevronRight size={14} />
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
