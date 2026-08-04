import { useState, useRef } from 'react';
import { Reply } from 'lucide-react';

interface SwipeableMessageProps {
  children: React.ReactNode;
  onSwipeReply: () => void;
  isOwn: boolean;
}

const SWIPE_THRESHOLD = 80;

export default function SwipeableMessage({ children, onSwipeReply, isOwn }: SwipeableMessageProps) {
  const [offsetX, setOffsetX] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const isHorizontalRef = useRef<boolean | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    startXRef.current = touch.clientX;
    startYRef.current = touch.clientY;
    isHorizontalRef.current = null;
    setSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!swiping) return;
    const touch = e.touches[0];
    const dx = touch.clientX - startXRef.current;
    const dy = touch.clientY - startYRef.current;

    if (isHorizontalRef.current === null) {
      if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
        isHorizontalRef.current = Math.abs(dx) > Math.abs(dy);
      }
      return;
    }

    if (!isHorizontalRef.current) return;

    if (!isOwn) {
      setOffsetX(Math.max(0, Math.min(dx, 120)));
    } else {
      setOffsetX(Math.min(0, Math.max(dx, -120)));
    }
  };

  const handleTouchEnd = () => {
    setSwiping(false);
    if ((!isOwn && offsetX > SWIPE_THRESHOLD) || (isOwn && offsetX < -SWIPE_THRESHOLD)) {
      onSwipeReply();
    }
    setOffsetX(0);
  };

  const replyProgress = Math.min(Math.abs(offsetX) / SWIPE_THRESHOLD, 1);

  return (
    <div className="relative overflow-hidden" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
      {/* Reply icon revealed behind */}
      <div className={`absolute top-0 bottom-0 flex items-center ${isOwn ? 'right-0 pr-2' : 'left-0 pl-2'}`} style={{ opacity: replyProgress }}>
        <div
          className="w-8 h-8 rounded-full bg-indigo-500/80 flex items-center justify-center transition-transform"
          style={{ transform: `scale(${0.5 + replyProgress * 0.5})` }}
        >
          <Reply className="w-4 h-4 text-white" />
        </div>
      </div>

      {/* Message content */}
      <div
        className="relative transition-transform"
        style={{
          transform: `translateX(${offsetX}px)`,
          transition: swiping ? 'none' : 'transform 0.2s ease-out',
        }}
      >
        {children}
      </div>
    </div>
  );
}
