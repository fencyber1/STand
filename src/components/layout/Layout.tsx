import { NavLink, Outlet, useNavigate } from 'react-router-dom';
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
  Sun,
  Moon,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';
import { storage } from '../../services/storage';
import Logo from '../landing/Logo';
import FenBotIcon from '../effects/FenBotIcon';
import NotificationBell from '../notifications/NotificationBell';

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
        className={`flex items-center justify-between w-full px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors ${group.color}`}
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
                    ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                    : 'text-gray-600 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-white'
                }`
              }
            >
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                'shadow-[1.5px_1.5px_4px_rgba(0,0,0,0.07),-1.5px_-1.5px_4px_rgba(255,255,255,0.9)] dark:shadow-[1.5px_1.5px_4px_rgba(0,0,0,0.25),-1.5px_-1.5px_4px_rgba(255,255,255,0.05)] bg-gray-100 dark:bg-gray-700'
              }`}>
                  <ItemIcon size={17} className="text-gray-500 dark:text-gray-100" />
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
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const { theme, toggleTheme } = useTheme();

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

  // Tour sidebar control: open sidebar + set tour-active flag
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

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900 transition-colors overflow-hidden">
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={closeSidebar} />
      )}

      {/* Offline banner */}
      {!isOnline && (
        <div className="fixed top-0 inset-x-0 z-50 bg-amber-500 text-white text-center text-xs font-medium py-1 px-4 shadow-md">
          You're offline — using cached data
        </div>
      )}

      <aside data-tour-id="tour-sidebar" className={`fixed z-40 inset-y-0 left-0 w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:z-auto flex flex-col ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between h-14 px-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <div className="text-primary-600 dark:text-primary-400">
            <Logo size={130} />
          </div>
          <button className="lg:hidden text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200" onClick={closeSidebar}>
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
          <NavLink to="/" end onClick={closeSidebar} className={({ isActive }) => `flex items-center gap-2.5 px-3 py-2 rounded-lg text-base font-medium transition-colors ${isActive ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300' : 'text-gray-600 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-white'}`}>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-[1.5px_1.5px_4px_rgba(0,0,0,0.07),-1.5px_-1.5px_4px_rgba(255,255,255,0.9)] dark:shadow-[1.5px_1.5px_4px_rgba(0,0,0,0.25),-1.5px_-1.5px_4px_rgba(255,255,255,0.05)] bg-gray-100 dark:bg-gray-700">
              <LayoutDashboard size={17} className="text-gray-500 dark:text-gray-100" />
            </div>
            <span className="truncate">{t('Dashboard')}</span>
          </NavLink>
          <NavLink to="/fenbot" onClick={closeSidebar} data-tour-id="tour-fenbot" className={({ isActive }) => `flex items-center gap-2.5 px-3 py-2 rounded-lg text-base font-medium transition-colors ${isActive ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300' : 'text-gray-600 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-white'}`}>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-[1.5px_1.5px_4px_rgba(0,0,0,0.07),-1.5px_-1.5px_4px_rgba(255,255,255,0.9)] dark:shadow-[1.5px_1.5px_4px_rgba(0,0,0,0.25),-1.5px_-1.5px_4px_rgba(255,255,255,0.05)] bg-gray-100 dark:bg-gray-700">
              <FenBotNavIcon size={17} />
            </div>
            <span className="truncate">FenBot</span>
          </NavLink>

          <div className="pt-2 border-t border-gray-100 dark:border-gray-700/50 mt-2">
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

          <div className="pt-2 border-t border-gray-100 dark:border-gray-700/50 mt-2 space-y-0.5">
            {bottomItems.map(({ to, label, icon: ItemIcon }) => (
              <NavLink key={to} to={to} onClick={closeSidebar} className={({ isActive }) => `flex items-center gap-2.5 px-3 py-2 rounded-lg text-base font-medium transition-colors ${isActive ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300' : 'text-gray-600 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-white'}`}>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-[1.5px_1.5px_4px_rgba(0,0,0,0.07),-1.5px_-1.5px_4px_rgba(255,255,255,0.9)] dark:shadow-[1.5px_1.5px_4px_rgba(0,0,0,0.25),-1.5px_-1.5px_4px_rgba(255,255,255,0.05)] bg-gray-100 dark:bg-gray-700">
                <ItemIcon size={17} className="text-gray-500 dark:text-gray-100" />
                </div>
                <span className="truncate">{label}</span>
              </NavLink>
            ))}
          </div>
        </nav>

        <div className="shrink-0 p-3 border-t border-gray-200 dark:border-gray-700">
          <button onClick={handleLogout} className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-base font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
            <LogOut size={16} />
            {t('Logout')}
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="flex items-center h-14 px-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 lg:px-6 transition-colors shrink-0">
          <button data-tour-id="tour-hamburger" className="lg:hidden text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mr-3" onClick={() => setSidebarOpen(true)}>
            <Menu size={22} />
          </button>
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 flex-1">STand Exam Practice</h2>
          {user && (
            <div className="flex items-center gap-2 mr-3 hidden sm:flex">
              {displayPhoto ? <img key={photoVersion} src={displayPhoto} alt="" className="w-6 h-6 rounded-full object-cover" /> : null}
              <span className="text-sm text-gray-500 dark:text-gray-400">{displayName}</span>
            </div>
          )}
          <NotificationBell />
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ml-1"
            title={theme === 'dark' ? 'Switch to day mode' : 'Switch to night mode'}
          >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
