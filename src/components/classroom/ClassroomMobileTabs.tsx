import { NavLink, useLocation } from 'react-router-dom';
import { MoreHorizontal, X } from 'lucide-react';

export function greetingFor(date = new Date()): string {
  const h = date.getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}

export function initialsOf(name?: string | null): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase() || '?';
}

export interface MobileTab {
  label: string;
  icon: any;
  to?: string;
  end?: boolean;
  onClick?: () => void;
}

interface TabsProps {
  tabs: MobileTab[];
}

/**
 * Mobile-only (lg:hidden) bottom tab bar for classroom dashboards.
 * Mirrors the main Layout mobile tab pattern.
 */
export function ClassroomMobileTabs({ tabs }: TabsProps) {
  const location = useLocation();
  return (
    <nav
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 flex items-center justify-around border-t border-white/10 bg-[#0e1627]/95 backdrop-blur px-2 pt-2"
      style={{ paddingBottom: 'max(0.65rem, env(safe-area-inset-bottom))' }}
      aria-label="Classroom sections"
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const active = tab.to
          ? tab.end
            ? location.pathname === tab.to
            : location.pathname === tab.to || location.pathname.startsWith(tab.to + '/')
          : false;
        const cls = `flex flex-col items-center gap-1 py-1.5 px-3 min-w-[60px] transition-colors ${
          active ? 'text-violet-400' : 'text-slate-300'
        }`;
        const inner = (
          <>
            <Icon size={24} strokeWidth={active ? 2.5 : 2} />
            <span className="text-[11px] font-bold">{tab.label}</span>
          </>
        );
        return tab.to ? (
          <NavLink key={tab.label} to={tab.to} end={tab.end} className={cls}>
            {inner}
          </NavLink>
        ) : (
          <button key={tab.label} onClick={tab.onClick} className={cls} aria-label={tab.label}>
            {inner}
          </button>
        );
      })}
    </nav>
  );
}

export const MoreTabIcon = MoreHorizontal;

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  items: { label: string; icon: any; to: string }[];
}

/**
 * Mobile-only bottom sheet used for overflow tabs (e.g. teacher "More").
 */
export function ClassroomMoreSheet({ open, onClose, title = 'More', items }: SheetProps) {
  if (!open) return null;
  return (
    <div className="lg:hidden fixed inset-0 z-50" role="dialog" aria-label={title}>
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="absolute bottom-0 inset-x-0 bg-slate-900 border-t border-white/10 rounded-t-2xl p-4 pb-8">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white font-semibold">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="space-y-1">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to + item.label}
                to={item.to}
                onClick={onClose}
                className="flex items-center gap-3 px-3 py-3 rounded-lg text-slate-200 hover:bg-white/5"
              >
                <Icon className="w-5 h-5 text-violet-300" />
                <span className="font-medium">{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      </div>
    </div>
  );
}
