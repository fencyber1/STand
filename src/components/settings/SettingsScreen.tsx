import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage, LANGUAGES } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { storage } from '../../services/storage';
import {
  Sun, Moon, Globe, Bell, User, HelpCircle, ChevronDown, Check, Info,
  Shield, Palette, Volume2, VolumeX, Bot,
} from 'lucide-react';

const FENBOT_SETTINGS_KEY = 'fenbot_settings';
const SPEED_PRESETS = [
  { label: 'Very slow', value: 400 },
  { label: 'Slow', value: 200 },
  { label: 'Medium', value: 80 },
  { label: 'Fast', value: 30 },
  { label: 'Very fast', value: 0 },
];
const FONT_SIZES = [12, 13, 14, 15, 16, 18, 20];
const FONT_FAMILIES = [
  { label: 'Default', value: 'inherit' },
  { label: 'Serif', value: 'Georgia, serif' },
  { label: 'Mono', value: 'ui-monospace, monospace' },
  { label: 'Rounded', value: 'system-ui, -apple-system, sans-serif' },
];

interface FenBotSettings {
  speed: number;
  fontSize: number;
  fontFamily: string;
  tts: boolean;
}

function loadFenBotSettings(): FenBotSettings {
  try {
    const raw = localStorage.getItem(FENBOT_SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const validSpeeds = SPEED_PRESETS.map((p) => p.value);
      if (!validSpeeds.includes(parsed.speed)) parsed.speed = 30;
      if (typeof parsed.tts !== 'boolean') parsed.tts = true;
      return parsed;
    }
  } catch {}
  return { speed: 30, fontSize: 14, fontFamily: 'inherit', tts: true };
}

function saveFenBotSettings(s: FenBotSettings) {
  try { localStorage.setItem(FENBOT_SETTINGS_KEY, JSON.stringify(s)); } catch {}
}

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
  const [fenbot, setFenbot] = useState<FenBotSettings>(loadFenBotSettings);

  const currentLang = LANGUAGES.find((l) => l.code === language);
  const displayName = storage.getDisplayName() || user?.fullName || 'Student';

  const updateFenBot = (patch: Partial<FenBotSettings>) => {
    setFenbot((prev) => {
      const next = { ...prev, ...patch };
      saveFenBotSettings(next);
      return next;
    });
    if (patch.tts === false) window.speechSynthesis?.cancel();
  };

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

      {/* FenBot */}
      <Section title="FenBot">
        {/* Streaming Speed */}
        <div className="px-6 pt-4 pb-3 border-b border-gray-100 dark:border-gray-700">
          <label className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 block">{t('Streaming Speed')}</label>
          <div className="flex gap-1.5">
            {SPEED_PRESETS.map((p) => (
              <button
                key={p.label}
                onClick={() => updateFenBot({ speed: p.value })}
                className={`flex-1 py-2 rounded-lg text-[11px] font-medium transition-all ${
                  fenbot.speed === p.value
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Font Size */}
        <div className="px-6 py-3 border-b border-gray-100 dark:border-gray-700">
          <label className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 block">{t('Font Size')}</label>
          <div className="flex gap-1.5">
            {FONT_SIZES.map((size) => (
              <button
                key={size}
                onClick={() => updateFenBot({ fontSize: size })}
                className={`flex-1 py-2 rounded-lg text-[11px] font-medium transition-all ${
                  fenbot.fontSize === size
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>

        {/* Font Family */}
        <div className="px-6 py-3 border-b border-gray-100 dark:border-gray-700">
          <label className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 block">{t('Font Style')}</label>
          <div className="grid grid-cols-2 gap-1.5">
            {FONT_FAMILIES.map((f) => (
              <button
                key={f.label}
                onClick={() => updateFenBot({ fontFamily: f.value })}
                className={`py-2.5 rounded-lg text-xs font-medium transition-all ${
                  fenbot.fontFamily === f.value
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
                style={{ fontFamily: f.value }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* TTS */}
        <div className="px-6 py-3 border-b border-gray-100 dark:border-gray-700">
          <label className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 block">{t('Voice (Text-to-Speech)')}</label>
          <button
            onClick={() => updateFenBot({ tts: !fenbot.tts })}
            className={`flex items-center gap-3 w-full py-3 px-4 rounded-xl text-sm font-medium transition-all ${
              fenbot.tts
                ? 'bg-primary-50 dark:bg-primary-900/20 border border-primary-300 dark:border-primary-700 text-primary-700 dark:text-primary-300'
                : 'bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-400 dark:text-gray-500'
            }`}
          >
            {fenbot.tts ? <Volume2 size={18} /> : <VolumeX size={18} />}
            <div className="text-left">
              <p className={fenbot.tts ? 'text-primary-700 dark:text-primary-300' : 'text-gray-500 dark:text-gray-400'}>
                {fenbot.tts ? t('Voice is ON') : t('Voice is OFF')}
              </p>
              <p className="text-[11px] opacity-60">
                {fenbot.tts ? t('FenBot speaks responses aloud') : t('Click to enable voice')}
              </p>
            </div>
          </button>
        </div>

        {/* Preview */}
        <div className="px-6 py-4">
          <label className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 block">{t('Preview')}</label>
          <div className="bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-gray-600 dark:text-gray-400" style={{ fontSize: fenbot.fontSize, fontFamily: fenbot.fontFamily }}>
              This is how your FenBot chat text will look.
            </p>
          </div>
        </div>
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
          iconColor="bg-teal-500"
          label={t('Privacy')}
          onClick={() => navigate('/privacy')}
          trailing={<span className="text-xs text-gray-400">{t('Settings')}</span>}
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
