import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { storage } from '../../services/storage';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import EditProfileModal from './EditProfileModal';
import { User, BookOpen, Trophy, Clock, LogOut, Moon, Sun } from 'lucide-react';

export default function ProfileScreen() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const history = useMemo(() => storage.getHistory(), []);
  const [editOpen, setEditOpen] = useState(false);
  const [photoVersion, setPhotoVersion] = useState(0);

  const displayPhoto = storage.getProfilePhoto() || user?.photoURL || null;
  const displayName = storage.getDisplayName() || user?.fullName || 'Student';

  const stats = useMemo(() => {
    const total = history.length;
    const totalQ = history.reduce((s, h) => s + (h.totalQuestions || 0), 0);
    const totalCorrect = history.reduce((s, h) => s + (h.correctAnswers || 0), 0);
    const avgScore = total > 0 ? history.reduce((s, h) => s + (h.score || 0), 0) / total : 0;
    const subjects = new Set(history.map((h) => h.sector)).size;
    return { total, totalQ, totalCorrect, avgScore: avgScore.toFixed(1), subjects };
  }, [history]);

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      logout();
      navigate('/login');
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <EditProfileModal open={editOpen} onClose={() => setPhotoVersion((v) => v + 1)} />

      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 text-center transition-colors">
        {displayPhoto ? (
          <img
            key={photoVersion}
            src={displayPhoto}
            alt={displayName}
            className="w-20 h-20 rounded-full mx-auto mb-3 object-cover border-2 border-primary-200 dark:border-primary-800"
          />
        ) : (
          <div className="inline-flex items-center justify-center w-20 h-20 bg-primary-100 dark:bg-primary-900/40 rounded-full mb-3">
            <User size={36} className="text-primary-600 dark:text-primary-400" />
          </div>
        )}
        <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">{displayName}</h1>
        <p className="text-gray-500 dark:text-gray-400">{user?.email || ''}</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {[
          { label: 'Sessions', value: stats.total, icon: BookOpen, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/30' },
          { label: 'Questions', value: stats.totalQ, icon: Trophy, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/30' },
          { label: 'Avg Score', value: `${stats.avgScore}%`, icon: Clock, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/30' },
          { label: 'Subjects', value: stats.subjects, icon: User, color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/30' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 text-center transition-colors">
            <div className={`inline-flex p-2 rounded-lg ${bg} mb-2`}>
              <Icon size={18} className={color} />
            </div>
            <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{value}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden transition-colors">
        <button
          onClick={toggleTheme}
          className="w-full text-left px-6 py-4 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition flex items-center justify-between border-b border-gray-100 dark:border-gray-700"
        >
          <span>Dark Mode</span>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">{theme === 'dark' ? 'On' : 'Off'}</span>
            {theme === 'dark' ? <Sun size={18} className="text-yellow-400" /> : <Moon size={18} className="text-gray-400" />}
          </div>
        </button>
        {[
          { label: 'Edit Profile', action: () => setEditOpen(true) },
          { label: 'Notification Settings', action: () => {} },
          { label: 'Help & Support', action: () => {} },
        ].map(({ label, action }, i) => (
          <button
            key={label}
            onClick={action}
            className={`w-full text-left px-6 py-4 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition ${
              i < 2 ? 'border-b border-gray-100 dark:border-gray-700' : ''
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <button
        onClick={handleLogout}
        className="w-full py-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl font-semibold hover:bg-red-100 dark:hover:bg-red-900/30 transition flex items-center justify-center gap-2"
      >
        <LogOut size={18} />
        Logout
      </button>
    </div>
  );
}
