import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { storage } from '../../services/storage';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage, LANGUAGES } from '../../contexts/LanguageContext';
import EditProfileModal from './EditProfileModal';
import { User, BookOpen, Trophy, Clock, LogOut, Briefcase, MapPin, Heart, Mail, Globe, ChevronDown, Check } from 'lucide-react';

export default function ProfileScreen() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const history = useMemo(() => storage.getHistory(), []);
  const [editOpen, setEditOpen] = useState(false);
  const [photoVersion, setPhotoVersion] = useState(0);
  const [showLangPicker, setShowLangPicker] = useState(false);

  const displayPhoto = storage.getProfilePhoto() || user?.photoURL || null;
  const displayName = storage.getDisplayName() || user?.fullName || 'Student';
  const bio = storage.getBio();
  const surname = storage.getSurname();
  const role = storage.getRole();
  const hobby = storage.getHobby();
  const country = storage.getCountry();

  const stats = useMemo(() => {
    const total = history.length;
    const totalQ = history.reduce((s, h) => s + (h.totalQuestions || 0), 0);
    const totalCorrect = history.reduce((s, h) => s + (h.correctAnswers || 0), 0);
    const avgScore = total > 0 ? history.reduce((s, h) => s + (h.score || 0), 0) / total : 0;
    const subjects = new Set(history.map((h) => h.sector)).size;
    return { total, totalQ, totalCorrect, avgScore: avgScore.toFixed(1), subjects };
  }, [history]);

  const handleLogout = () => {
    if (window.confirm(t('Are you sure you want to logout?'))) {
      logout();
      navigate('/login');
    }
  };

  const currentLang = LANGUAGES.find((l) => l.code === language);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <EditProfileModal open={editOpen} onClose={() => { setEditOpen(false); setPhotoVersion((v) => v + 1); }} />

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
        {surname && <p className="text-sm text-primary-500 dark:text-primary-400 mt-0.5">@{surname}</p>}
        {bio && <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 max-w-xs mx-auto">{bio}</p>}

        <div className="flex flex-wrap items-center justify-center gap-3 mt-4">
          {role && (
            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-3 py-1.5 rounded-full">
              <Briefcase size={13} /> {role}
            </div>
          )}
          {country && (
            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-3 py-1.5 rounded-full">
              <MapPin size={13} /> {country}
            </div>
          )}
          {hobby && (
            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-3 py-1.5 rounded-full">
              <Heart size={13} /> {hobby}
            </div>
          )}
          {user?.email && (
            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-3 py-1.5 rounded-full">
              <Mail size={13} /> {user.email}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {[
          { label: t('Sessions'), value: stats.total, icon: BookOpen, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/30' },
          { label: t('Questions'), value: stats.totalQ, icon: Trophy, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/30' },
          { label: t('Avg Score'), value: `${stats.avgScore}%`, icon: Clock, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/30' },
          { label: t('Subjects'), value: stats.subjects, icon: User, color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/30' },
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

      {/* Language Selector */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden transition-colors">
        <button
          onClick={() => setShowLangPicker(!showLangPicker)}
          className="w-full text-left px-6 py-4 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition flex items-center justify-between border-b border-gray-100 dark:border-gray-700"
        >
          <div className="flex items-center gap-3">
            <Globe size={18} className="text-blue-500" />
            <span>{t('Language')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">{currentLang?.nativeName}</span>
            <ChevronDown size={16} className={`text-gray-400 transition-transform ${showLangPicker ? 'rotate-180' : ''}`} />
          </div>
        </button>
        {showLangPicker && (
          <div className="max-h-64 overflow-y-auto">
            {LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                onClick={() => { setLanguage(lang.code); setShowLangPicker(false); }}
                className={`w-full text-left px-6 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition ${
                  language === lang.code ? 'bg-primary-50 dark:bg-primary-900/20' : ''
                } border-b border-gray-50 dark:border-gray-700/50 last:border-0`}
              >
                <div>
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{lang.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{lang.nativeName}</p>
                </div>
                {language === lang.code && <Check size={16} className="text-primary-500" />}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden transition-colors">
        {[
          { label: t('Edit Profile'), action: () => setEditOpen(true) },
          { label: t('Notification Settings'), action: () => {} },
          { label: t('Help & Support'), action: () => window.dispatchEvent(new Event('start-tour')) },
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
        {t('Logout')}
      </button>
    </div>
  );
}
