import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import {
  LayoutDashboard,
  GraduationCap,
  Clock,
  Bookmark,
  TrendingUp,
  Search,
  Shield,
  CalendarDays,
  User,
  LogOut,
  Menu,
  X,
  Award,
  Upload,
  Target,
  ArrowRightLeft,
  Users,
  Swords,
  FileText,
  UserPlus,
  Rss,
  MessageSquare,
  MessageCircle,
  Circle,
  ChevronDown,
  ChevronRight,
  Settings,
  Home,
  BarChart3,
  Crown,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { storage } from '../../services/storage';
import Logo from '../landing/Logo';
import FenBotIcon from '../effects/FenBotIcon';
import NotificationBell from '../notifications/NotificationBell';
import AnimatedBackground from '../ui/AnimatedBackground';

const NAVY = '#111b2e';

function FenBotNavIcon({ size }: { size: number }) {
  return <FenBotIcon size={size} />;
}

interface NavItem {
  to: string;
  label: string;
  icon: any;
}

interface NavGroup {
  label: string;
  items: NavItem[];
  color: string;
}

function NavGroupSection({ group, defaultOpen, onNavigate, tourId }: { group: NavGroup; defaultOpen: boolean; onNavigate: () => void; tourId?: string }) {
  const [open, setOpen] = useState(defaultOpen);
  const Icon = open ? ChevronDown : ChevronRight;

  return (
    <div className="mb-1" data-tour-id={tourId}>
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center justify-between w-full px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors ${group.color} opacity-90`}
      >
        {group.label}
        <Icon size={12} />
      </button>
      {open && (
        <div className="space-y-0.5">
          {group.items.map(({ to, label, icon: ItemIcon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onNavigate}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-lg text-base font-medium transition-colors ${
                  isActive
                    ? 'bg-violet-500/20 text-violet-300'
                    : 'text-white/70 hover:bg-white/5 hover:text-white'
                }`
              }
            >
              <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 bg-white/5">
                  <ItemIcon size={17} className={group.color} />
              </div>
              <span className="truncate">{label}</span>
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const tourActiveRef = useRef(false);
  const [photoVersion, setPhotoVersion] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { t } = useLanguage();

  const displayPhoto = storage.getProfilePhoto() || user?.photoURL || null;
  const displayName = storage.getDisplayName() || user?.fullName || 'Student';

  useEffect(() => {
    const handler = () => setPhotoVersion((v) => v + 1);
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  useEffect(() => {
    const openHandler = () => { tourActiveRef.current = true; setSidebarOpen(true); };
    const closeHandler = () => { tourActiveRef.current = false; setSidebarOpen(false); };
    window.addEventListener('tour-open-sidebar', openHandler);
    window.addEventListener('tour-close-sidebar', closeHandler);
    return () => {
      window.removeEventListener('tour-open-sidebar', openHandler);
      window.removeEventListener('tour-close-sidebar', closeHandler);
    };
  }, []);

  const handleLogout = async () => {
    try { await logout(); } catch {}
    navigate('/login');
  };

  const closeSidebar = () => { if (!tourActiveRef.current) setSidebarOpen(false); };

  const navGroups: (NavGroup & { tourId?: string })[] = [
    {
      label: t('Practice'),
      tourId: 'tour-practice',
      color: 'text-blue-400',
      items: [
        { to: '/practice', label: t('Practice'), icon: GraduationCap },
        { to: '/doc-quiz', label: t('Document Quiz'), icon: FileText },
        { to: '/exam-setup', label: t('Exam Sim'), icon: Shield },
      ],
    },
    {
      label: t('Review'),
      tourId: 'tour-review',
      color: 'text-amber-400',
      items: [
        { to: '/history', label: t('History'), icon: Clock },
        { to: '/bookmarks', label: t('Bookmarks'), icon: Bookmark },
        { to: '/search', label: t('Search'), icon: Search },
      ],
    },
    {
      label: t('Progress'),
      color: 'text-emerald-400',
      items: [
        { to: '/progress', label: t('Progress'), icon: TrendingUp },
        { to: '/achievements', label: t('Achievements'), icon: Award },
        { to: '/rankings', label: t('Global Rankings'), icon: TrendingUp },
        { to: '/weak-areas', label: t('Weak Areas'), icon: Target },
        { to: '/compare', label: t('Compare'), icon: ArrowRightLeft },
      ],
    },
    {
      label: t('Study'),
      tourId: 'tour-groups',
      color: 'text-violet-400',
      items: [
        { to: '/groups', label: t('Study Groups'), icon: Users },
        { to: '/multiplayer', label: t('Multiplayer'), icon: Swords },
        { to: '/tournaments', label: t('Tournaments'), icon: Crown },
        { to: '/study-plans', label: t('Study Plans'), icon: CalendarDays },
      ],
    },
    {
      label: t('Social'),
      tourId: 'tour-social',
      color: 'text-rose-400',
      items: [
        { to: '/statuses', label: t('Status'), icon: Circle },
        { to: '/feed', label: t('Feed'), icon: Rss },
        { to: '/friends', label: t('Friends'), icon: UserPlus },
        { to: '/chat', label: t('Chat'), icon: MessageSquare },
        { to: '/groups-chat', label: t('Group Chat'), icon: MessageCircle },
      ],
    },
  ];

  const bottomItems: NavItem[] = [
    { to: '/profile', label: t('Profile'), icon: User },
    { to: '/settings', label: t('Settings'), icon: Settings },
    { to: '/import', label: t('Import'), icon: Upload },
  ];

  const mobileTabs = [
    { to: '/', label: t('Home'), icon: Home },
    { to: '/practice', label: t('Practice'), icon: GraduationCap },
    { to: '/tournaments', label: t('Tournaments'), icon: Crown },
    { to: '/multiplayer', label: t('Multiplayer'), icon: Users },
    { to: '/profile', label: t('Profile'), icon: User },
  ];

  const isFullscreen = ['/chat/', '/groups-chat/', '/fenbot'].some((p) => location.pathname.startsWith(p));

  if (isFullscreen) {
    return <Outlet />;
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: NAVY }}>
      <AnimatedBackground />
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={closeSidebar} />
      )}

      {!isOnline && (
        <div className="fixed top-0 inset-x-0 z-50 bg-amber-500 text-white text-center text-xs font-medium py-1 px-4 shadow-md">
          You're offline — using cached data
        </div>
      )}

      {/* Desktop sidebar */}
      <aside data-tour-id="tour-sidebar" className={`fixed z-40 inset-y-0 left-0 w-64 border-r border-white/5 transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:z-auto flex flex-col ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`} style={{ background: NAVY }}>
        <div className="flex items-center justify-between h-14 px-4 border-b border-white/5 shrink-0">
          <div className="text-white">
            <Logo size={130} />
          </div>
          <button className="lg:hidden text-white/50 hover:text-white" onClick={closeSidebar}>
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
          <NavLink to="/" end onClick={closeSidebar} className={({ isActive }) => `flex items-center gap-2.5 px-3 py-2 rounded-lg text-base font-medium transition-colors ${isActive ? 'bg-violet-500/20 text-violet-300' : 'text-white/70 hover:bg-white/5 hover:text-white'}`}>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 bg-white/5">
              <LayoutDashboard size={17} className="text-white/60" />
            </div>
            <span className="truncate">{t('Dashboard')}</span>
          </NavLink>
          <NavLink to="/fenbot" onClick={closeSidebar} data-tour-id="tour-fenbot" className={({ isActive }) => `flex items-center gap-2.5 px-3 py-2 rounded-lg text-base font-medium transition-colors ${isActive ? 'bg-violet-500/20 text-violet-300' : 'text-white/70 hover:bg-white/5 hover:text-white'}`}>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 bg-white/5">
              <FenBotNavIcon size={17} />
            </div>
            <span className="truncate">FenBot</span>
          </NavLink>

          <div className="pt-2 border-t border-white/5 mt-2">
            {navGroups.map((group) => (
              <NavGroupSection
                key={group.label}
                group={group}
                defaultOpen={group.label === t('Practice') || group.label === t('Social')}
                onNavigate={closeSidebar}
                tourId={group.tourId}
              />
            ))}
          </div>

          <div className="pt-2 border-t border-white/5 mt-2 space-y-0.5">
            {bottomItems.map(({ to, label, icon: ItemIcon }) => (
              <NavLink key={to} to={to} onClick={closeSidebar} className={({ isActive }) => `flex items-center gap-2.5 px-3 py-2 rounded-lg text-base font-medium transition-colors ${isActive ? 'bg-violet-500/20 text-violet-300' : 'text-white/70 hover:bg-white/5 hover:text-white'}`}>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 bg-white/5">
                  <ItemIcon size={17} className="text-white/60" />
                </div>
                <span className="truncate">{label}</span>
              </NavLink>
            ))}
          </div>
        </nav>

        <div className="shrink-0 p-3 border-t border-white/5">
          <button onClick={handleLogout} className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-base font-medium text-red-400/80 hover:bg-red-500/10 transition-colors">
            <LogOut size={16} />
            {t('Logout')}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Desktop header */}
        <header className="hidden lg:flex items-center h-14 px-6 border-b border-white/5 shrink-0" style={{ background: NAVY }}>
          <h2 className="text-lg font-semibold text-white flex-1">STand Exam Practice</h2>
          {user && (
            <div className="flex items-center gap-2 mr-3">
              {displayPhoto ? <img key={photoVersion} src={displayPhoto} alt="" className="w-6 h-6 rounded-full object-cover" /> : null}
              <span className="text-sm text-white/60">{displayName}</span>
            </div>
          )}
          <NotificationBell />
        </header>

        {/* Mobile top bar */}
        <header className="flex lg:hidden items-center h-14 px-4 border-b border-white/5 shrink-0" style={{ background: NAVY }}>
          <button data-tour-id="tour-hamburger" className="text-white/60 hover:text-white mr-3" onClick={() => setSidebarOpen(true)}>
            <Menu size={22} />
          </button>
          <div className="flex-1">
            <Logo size={100} />
          </div>
          <NotificationBell />
        </header>

        <main className="flex-1 overflow-y-auto overflow-x-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/10 via-transparent to-purple-900/10 pointer-events-none" />
          <div className="relative z-10">
            <Outlet />
          </div>
        </main>

        {/* Mobile bottom tab bar */}
        <nav className="lg:hidden flex items-center justify-around border-t border-white/5 safe-area-bottom shrink-0" style={{ background: NAVY }}>
          {mobileTabs.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 py-2.5 px-3 min-w-[64px] transition-colors ${
                  isActive ? 'text-violet-400' : 'text-white'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={26} strokeWidth={isActive ? 2.5 : 2} />
                  <span className="text-xs font-bold">{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
