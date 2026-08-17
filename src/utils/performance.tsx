import { lazy, Suspense, ComponentType, LazyExoticComponent } from 'react';

// Lazy loading wrapper with custom fallback
interface LazyComponentProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function LazyWrapper({ children, fallback = <LoadingSpinner /> }: LazyComponentProps) {
  return <Suspense fallback={fallback}>{children}</Suspense>;
}

export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-[200px]">
      <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

// Preload component for faster navigation
export function preloadComponent(importFn: () => Promise<any>) {
  return importFn();
}

// Route-based code splitting
export const routes = {
  TeacherDashboard: () => import('../screens/TeacherDashboard'),
  TeacherAttendance: () => import('../screens/classroom/TeacherAttendanceScreen'),
  TeacherAnnouncements: () => import('../screens/classroom/TeacherAnnouncementsScreen'),
  TopicList: () => import('../screens/classroom/TopicListScreen'),
  AddTopic: () => import('../screens/classroom/AddTopicForm'),
  StudentsScreen: () => import('../screens/classroom/StudentsScreen'),
  Analytics: () => import('../screens/classroom/AnalyticsScreen'),
  Settings: () => import('../screens/classroom/SettingsScreen'),
  AssessmentsList: () => import('../screens/classroom/AssessmentsListScreen'),

  StudentDashboard: () => import('../screens/StudentDashboard'),
  StudentTopics: () => import('../screens/classroom/StudentTopicListScreen'),
  StudentTopicReader: () => import('../screens/classroom/StudentTopicReader'),
  StudentProgress: () => import('../screens/classroom/StudentProgressScreen'),
  StudentAssessment: () => import('../screens/classroom/StudentAssessmentScreen'),
  AssessmentResults: () => import('../screens/classroom/AssessmentResultsScreen'),
  StudentAttendance: () => import('../screens/classroom/StudentAttendanceScreen'),
  StudentAnnouncements: () => import('../screens/classroom/StudentAnnouncementsScreen'),

  ClassroomHome: () => import('../screens/ClassroomHome'),
  TopicReader: () => import('../screens/classroom/TopicReader'),
  TopicDraftReview: () => import('../screens/classroom/TopicDraftReview'),
};

// Memoized components to prevent unnecessary re-renders
import { memo, MemoExoticComponent } from 'react';

export function memoize<T extends ComponentType<any>>(
  Component: T,
  arePropsEqual?: (prevProps: any, nextProps: any) => boolean
): MemoExoticComponent<T> {
  return memo(Component, arePropsEqual);
}

// Shallow comparison for simple props
export const shallowEqual = (prev: any, next: any): boolean => {
  const prevKeys = Object.keys(prev);
  const nextKeys = Object.keys(next);

  if (prevKeys.length !== nextKeys.length) return false;

  for (const key of prevKeys) {
    if (prev[key] !== next[key]) return false;
  }

  return true;
};

// Deep comparison for complex objects
export const deepEqual = (prev: any, next: any): boolean => {
  if (prev === next) return true;
  if (prev == null || next == null) return prev === next;
  if (typeof prev !== 'object' || typeof next !== 'object') return prev === next;

  const prevKeys = Object.keys(prev);
  const nextKeys = Object.keys(next);

  if (prevKeys.length !== nextKeys.length) return false;

  for (const key of prevKeys) {
    if (!nextKeys.includes(key)) return false;
    if (!deepEqual(prev[key], next[key])) return false;
  }

  return true;
};

// Virtualized list for large datasets
import { useMemo, useState as useStateHook, useCallback, useRef, useEffect } from 'react';

interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  overscan?: number;
}

export function VirtualList<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  overscan = 5
}: VirtualListProps<T>) {
  const [scrollTop, setScrollTop] = useStateHook(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const visibleRange = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    );
    return { startIndex, endIndex };
  }, [scrollTop, containerHeight, items.length, itemHeight, overscan]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  const totalHeight = items.length * itemHeight;
  const offsetY = visibleRange.startIndex * itemHeight;

  return (
    <div
      ref={containerRef}
      className="overflow-auto"
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div
          style={{
            transform: `translateY(${offsetY}px)`,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
          }}
        >
          {items.slice(visibleRange.startIndex, visibleRange.endIndex + 1).map((item, index) => (
            <div key={index} style={{ height: itemHeight }}>
              {renderItem(item, visibleRange.startIndex + index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Debounced callback hook
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  return useCallback((...args: any[]) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      callbackRef.current(...args);
    }, delay);
  }, [delay]);
}

// Throttled callback hook
export function useThrottledCallback<T extends (...args: any[]) => any>(
  callback: T,
  limit: number
) {
  const lastRun = useRef(Date.now());
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  return useCallback((...args: any[]) => {
    const now = Date.now();
    const remaining = limit - (now - lastRun.current);

    if (remaining <= 0) {
      lastRun.current = now;
      callbackRef.current(...args);
    } else if (!timeoutRef.current) {
      timeoutRef.current = setTimeout(() => {
        lastRun.current = Date.now();
        timeoutRef.current = null;
        callbackRef.current(...args);
      }, remaining);
    }
  }, [limit]);
}

// Intersection Observer hook for lazy loading images
export function useIntersectionObserver(
  options: IntersectionObserverInit = {}
) {
  const [isIntersecting, setIsIntersecting] = useStateHook(false);
  const elementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(([entry]) => {
      setIsIntersecting(entry.isIntersecting);
    }, options);

    observer.observe(element);
    return () => observer.disconnect();
  }, [options]);

  return [elementRef, isIntersecting] as const;
}

// Performance monitoring hook
export function usePerformanceMonitor(componentName: string) {
  const renderCount = useRef(0);
  const mountTime = useRef(performance.now());

  useEffect(() => {
    renderCount.current++;
    const renderTime = performance.now() - mountTime.current;

    if (renderCount.current % 10 === 0) {
      console.log(`[Perf] ${componentName}: ${renderCount.current} renders, ${renderTime.toFixed(2)}ms since mount`);
    }
  });

  return {
    renderCount: renderCount.current,
    mountTime: mountTime.current,
  };
}
