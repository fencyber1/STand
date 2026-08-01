import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage, LANGUAGES } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { storage } from '../../services/storage';
import {
  Sun, Moon, Globe, Bell, User, HelpCircle, ChevronDown, Check, Info,
  Shield, Palette, Volume2, VolumeX, Eye, EyeOff,
} from 'lucide-react';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden transition-colors">
      <h3 className="px-6 pt-5 pb-2 text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">{title}</h3>
      {children}
    </div>
  );
}

function Row({ icon: Icon, iconColor, label, onClick, trailing }: {
  icon: any; iconColor: string; label: string; onClick?: () => void; trailing?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={`w-full text-left px-6 py-4 flex items-center justify-between transition ${
        onClick ? 'hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer' : 'cursor-default'
      } border-b border-gray-100 dark:border-gray-700 last:border-0`}
    >
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${iconColor}`}>
          <Icon size={16} className="text-white" />
        </div>
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
      </div>
      {trailing}
    </button>
  );
}

export default function SettingsScreen() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const { user } = useAuth();
  const [showLangPicker, setShowLangPicker] = useState(false);

  const currentLang = LANGUAGES.find((l) => l.code === language);
  const displayName = storage.getDisplayName() || user?.fullName || 'Student';

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-8">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{t('Settings')}</h1>

      {/* Appearance */}
      <Section title={t('Appearance')}>
        <Row
          icon={theme === 'dark' ? Moon : Sun}
          iconColor={theme === 'dark' ? 'bg-indigo-500' : 'bg-amber-500'}
          label={t('Theme')}
          trailing={
            <button
              onClick={toggleTheme}
              className={`relative w-12 h-6 rounded-full transition-colors ${theme === 'dark' ? 'bg-primary-600' : 'bg-gray-300'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${theme === 'dark' ? 'translate-x-6' : ''}`} />
            </button>
          }
        />
        <Row
          icon={Palette}
          iconColor="bg-pink-500"
          label={t('Chat Wallpaper')}
          onClick={() => navigate('/profile')}
          trailing={<span className="text-xs text-gray-400">{t('Profile')}</span>}
        />
      </Section>

      {/* Language */}
      <Section title={t('Language')}>
        <button
          onClick={() => setShowLangPicker(!showLangPicker)}
          className="w-full text-left px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition border-b border-gray-100 dark:border-gray-700 last:border-0"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500">
              <Globe size={16} className="text-white" />
            </div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('Language')}</span>
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
      </Section>

      {/* Notifications */}
      <Section title={t('Notifications')}>
        <Row
          icon={Bell}
          iconColor="bg-green-500"
          label={t('Notification Sounds')}
          trailing={
            <span className="text-xs text-gray-400 dark:text-gray-500">{t('On')}</span>
          }
        />
        <Row
          icon={Bell}
          iconColor="bg-emerald-500"
          label={t('Push Notifications')}
          trailing={
            <span className="text-xs text-green-500 dark:text-green-400">{t('Enabled')}</span>
          }
        />
      </Section>

      {/* Account */}
      <Section title={t('Account')}>
        <Row
          icon={User}
          iconColor="bg-purple-500"
          label={t('Edit Profile')}
          onClick={() => navigate('/profile')}
          trailing={<span className="text-xs text-gray-400">{displayName}</span>}
        />
        <Row
          icon={Shield}
          iconColor="bg-red-500"
          label={t('Account Info')}
          trailing={<span className="text-xs text-gray-400">{user?.email}</span>}
        />
      </Section>

      {/* Help */}
      <Section title={t('Help & Support')}>
        <Row
          icon={HelpCircle}
          iconColor="bg-cyan-500"
          label={t('Onboarding Tour')}
          onClick={() => window.dispatchEvent(new Event('start-tour'))}
        />
        <Row
          icon={Info}
          iconColor="bg-gray-500"
          label={t('About')}
          trailing={
            <span className="text-xs text-gray-400">STand v1.0</span>
          }
        />
      </Section>
    </div>
  );
}
