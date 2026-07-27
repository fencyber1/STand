import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
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
  Sun,
  Moon,
  Award,
  Upload,
  Target,
  ArrowRightLeft,
  Users,
  Swords,
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { storage } from '../../services/storage';
import Logo from '../landing/Logo';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/practice', label: 'Practice', icon: GraduationCap },
  { to: '/exam-setup', label: 'Exam Sim', icon: Shield },
  { to: '/history', label: 'History', icon: Clock },
  { to: '/bookmarks', label: 'Bookmarks', icon: Bookmark },
  { to: '/search', label: 'Search', icon: Search },
  { to: '/progress', label: 'Progress', icon: TrendingUp },
  { to: '/achievements', label: 'Achievements', icon: Award },
  { to: '/weak-areas', label: 'Weak Areas', icon: Target },
  { to: '/compare', label: 'Compare', icon: ArrowRightLeft },
  { to: '/import', label: 'Import', icon: Upload },
  { to: '/groups', label: 'Study Groups', icon: Users },
  { to: '/multiplayer', label: 'Multiplayer', icon: Swords },
  { to: '/study-plans', label: 'Study Plans', icon: CalendarDays },
  { to: '/profile', label: 'Profile', icon: User },
];

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [photoVersion, setPhotoVersion] = useState(0);
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();

  const displayPhoto = storage.getProfilePhoto() || user?.photoURL || null;
  const displayName = storage.getDisplayName() || user?.fullName || 'Student';

  useEffect(() => {
    const handler = () => setPhotoVersion((v) => v + 1);
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900 transition-colors overflow-hidden">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed z-40 inset-y-0 left-0 w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:z-auto flex flex-col ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between h-14 px-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <div className="text-primary-600 dark:text-primary-400">
            <Logo size={100} />
          </div>
          <button
            className="lg:hidden text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-gray-200'
                }`
              }
            >
              <Icon size={16} />
              <span className="truncate">{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="shrink-0 p-3 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="flex items-center h-14 px-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 lg:px-6 transition-colors shrink-0">
          <button
            className="lg:hidden text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mr-3"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={22} />
          </button>
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 flex-1">STand Exam Practice</h2>
          {user && (
            <div className="flex items-center gap-2 mr-3 hidden sm:flex">
              {displayPhoto ? (
                <img key={photoVersion} src={displayPhoto} alt="" className="w-6 h-6 rounded-full object-cover" />
              ) : null}
              <span className="text-sm text-gray-500 dark:text-gray-400">{displayName}</span>
            </div>
          )}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
