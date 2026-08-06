import { useState, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  getPrivacySettings, savePrivacySettings, setExcludedUids,
  type PrivacySettings, type PrivacyLevel,
} from '../../services/privacyService';
import { subscribeToFriends } from '../../services/socialService';
import type { Friend } from '../../types';
import { useEffect } from 'react';
import {
  Eye, EyeOff, Clock, Circle, Image, FileText, MessageSquare, RotateCw,
  Check, Users, ChevronDown, ChevronRight, UserX, Shield,
} from 'lucide-react';

const LEVELS: { value: PrivacyLevel; label: string }[] = [
  { value: 'everyone', label: 'Everyone' },
  { value: 'friends', label: 'My Friends' },
  { value: 'friends_except', label: 'My Friends Except...' },
  { value: 'nobody', label: 'Nobody' },
];

function PrivacyRadio({ value, onChange, options }: { value: PrivacyLevel; onChange: (v: PrivacyLevel) => void; options: PrivacyLevel[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const label = LEVELS.find((l) => l.value === opt)?.label || opt;
        return (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              value === opt
                ? 'bg-primary-500 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

function ExcludeFriendsPicker({ selected, onChange, friends }: {
  selected: string[];
  onChange: (uids: string[]) => void;
  friends: Friend[];
}) {
  const [open, setOpen] = useState(false);
  const toggle = (uid: string) => {
    onChange(selected.includes(uid) ? selected.filter((u) => u !== uid) : [...selected, uid]);
  };
  return (
    <div className="mt-2">
      <button onClick={() => setOpen(!open)} className="flex items-center gap-1.5 text-xs text-primary-500 dark:text-primary-400 font-medium">
        {selected.length > 0 ? `${selected.length} excluded` : 'Choose friends...'}
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
      </button>
      {open && (
        <div className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-600 divide-y divide-gray-100 dark:divide-gray-700">
          {friends.map((f) => (
            <button
              key={f.uid}
              onClick={() => toggle(f.uid)}
              className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition"
            >
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition ${
                selected.includes(f.uid) ? 'bg-red-500 border-red-500' : 'border-gray-300 dark:border-gray-600'
              }`}>
                {selected.includes(f.uid) && <Check size={12} className="text-white" />}
              </div>
              {f.photoURL ? (
                <img src={f.photoURL} alt="" className="w-7 h-7 rounded-full object-cover" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center">
                  <span className="text-xs font-bold text-primary-600 dark:text-primary-400">{f.displayName?.[0] || '?'}</span>
                </div>
              )}
              <span className="text-sm text-gray-700 dark:text-gray-300">{f.displayName}</span>
            </button>
          ))}
          {friends.length === 0 && (
            <p className="px-3 py-4 text-xs text-gray-400 dark:text-gray-500 text-center">No friends yet</p>
          )}
        </div>
      )}
    </div>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden transition-colors">
      <div className="px-6 pt-5 pb-3 flex items-center gap-2">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-[2px_2px_6px_rgba(0,0,0,0.08),-2px_-2px_6px_rgba(255,255,255,0.9)] dark:shadow-[2px_2px_6px_rgba(0,0,0,0.3),-2px_-2px_6px_rgba(255,255,255,0.05)] bg-gray-100 dark:bg-gray-700">
          <Icon size={18} className="text-gray-500 dark:text-gray-300" />
        </div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">{title}</h3>
      </div>
      <div className="px-6 pb-5 space-y-5">
        {children}
      </div>
    </div>
  );
}

function Field({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">{label}</label>
      {description && <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">{description}</p>}
      {children}
    </div>
  );
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`relative w-11 h-6 rounded-full transition-colors ${value ? 'bg-primary-500' : 'bg-gray-300 dark:bg-gray-600'}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${value ? 'translate-x-5' : ''}`} />
    </button>
  );
}

export default function PrivacySettingsScreen() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [settings, setSettings] = useState<PrivacySettings>(getPrivacySettings);
  const [friends, setFriends] = useState<Friend[]>([]);

  useEffect(() => {
    if (!user) return;
    return subscribeToFriends(user.uid, setFriends);
  }, [user]);

  const update = (patch: Partial<PrivacySettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      savePrivacySettings(next);
      return next;
    });
  };

  const updateExcluded = (key: string, uids: string[]) => {
    setExcludedUids(key, uids);
    setSettings(getPrivacySettings());
  };

  const allOptions: PrivacyLevel[] = ['everyone', 'friends', 'friends_except', 'nobody'];
  const friendOnlyOptions: PrivacyLevel[] = ['everyone', 'friends', 'nobody'];

  return (
    <div className="max-w-2xl mx-auto px-4 space-y-6 pb-8">
      <div className="flex items-center gap-3">
        <Shield size={24} className="text-primary-600 dark:text-primary-400" />
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{t('Privacy')}</h1>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 -mt-4">{t('Control who can see your information')}</p>

      {/* ── Last Seen & Online ── */}
      <Section title={t('Last Seen & Online')} icon={Clock}>
        <Field label={t('Who can see my last seen')} description={t('Controls when others can see your last active time')}>
          <PrivacyRadio
            value={settings.lastSeen}
            onChange={(v) => update({ lastSeen: v })}
            options={friendOnlyOptions}
          />
        </Field>

        <Field label={t('Who can see my online status')} description={t('Controls whether others see when you are online')}>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => update({ online: 'same_as_last_seen' })}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                settings.online === 'same_as_last_seen'
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {t('Same as Last Seen')}
            </button>
            <button
              onClick={() => update({ online: 'everyone' })}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                settings.online === 'everyone'
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {t('Everyone')}
            </button>
          </div>
        </Field>
      </Section>

      {/* ── Profile Info ── */}
      <Section title={t('Profile Info')} icon={Eye}>
        <Field label={t('Who can see my profile picture')} description={t('Controls visibility of your avatar')}>
          <PrivacyRadio
            value={settings.profilePhoto}
            onChange={(v) => update({ profilePhoto: v })}
            options={allOptions}
          />
          {settings.profilePhoto === 'friends_except' && (
            <ExcludeFriendsPicker
              selected={getExcluded(settings, 'profilePhoto')}
              onChange={(uids) => updateExcluded('profilePhoto', uids)}
              friends={friends}
            />
          )}
        </Field>

        <Field label={t('Who can see my bio')} description={t('Controls visibility of your bio text')}>
          <PrivacyRadio
            value={settings.bio}
            onChange={(v) => update({ bio: v })}
            options={allOptions}
          />
          {settings.bio === 'friends_except' && (
            <ExcludeFriendsPicker
              selected={getExcluded(settings, 'bio')}
              onChange={(uids) => updateExcluded('bio', uids)}
              friends={friends}
            />
          )}
        </Field>
      </Section>

      {/* ── Status ── */}
      <Section title={t('Status')} icon={Circle}>
        <Field label={t('Who can see my status')} description={t('Controls who sees your status updates')}>
          <PrivacyRadio
            value={settings.status}
            onChange={(v) => update({ status: v })}
            options={allOptions}
          />
          {settings.status === 'friends_except' && (
            <ExcludeFriendsPicker
              selected={getExcluded(settings, 'status')}
              onChange={(uids) => updateExcluded('status', uids)}
              friends={friends}
            />
          )}
        </Field>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('Allow Resharing of Status')}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">{t('Others can share your status to their feed')}</p>
          </div>
          <Toggle value={settings.allowStatusResharing} onChange={(v) => update({ allowStatusResharing: v })} />
        </div>
      </Section>

      {/* ── Messaging ── */}
      <Section title={t('Messaging')} icon={MessageSquare}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('Read Receipts')}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">{t('Others can see when you have read their messages')}</p>
          </div>
          <Toggle value={settings.readReceipts} onChange={(v) => update({ readReceipts: v })} />
        </div>
      </Section>

      {/* ── Groups ── */}
      <Section title={t('Groups')} icon={Users}>
        <Field label={t('Who can add me to groups')} description={t('Controls who can add you to study groups and group chats')}>
          <PrivacyRadio
            value={settings.groupAdd}
            onChange={(v) => update({ groupAdd: v })}
            options={allOptions}
          />
          {settings.groupAdd === 'friends_except' && (
            <ExcludeFriendsPicker
              selected={getExcluded(settings, 'groupAdd')}
              onChange={(uids) => updateExcluded('groupAdd', uids)}
              friends={friends}
            />
          )}
        </Field>
      </Section>
    </div>
  );
}

function getExcluded(settings: PrivacySettings, key: string): string[] {
  return settings._friendsExcept?.[key]?.excludedUids || [];
}
