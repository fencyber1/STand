import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Plus, LogIn, Copy, Crown, LogOut, Trash2, ArrowLeft,
  BookOpen, Trophy, Flame, CheckCircle, AlertCircle, Loader2,
  MessageCircle,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { storage } from '../../services/storage';
import { createGroup, joinGroup, subscribeToGroup, leaveGroup, deleteGroup, getUserGroups, type StudyGroup, type GroupMember } from '../../services/firebaseService';
import BorderGlow from '../ui/BorderGlow';

export default function StudyGroupsScreen() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [myGroups, setMyGroups] = useState<StudyGroup[]>([]);
  const [activeGroup, setActiveGroup] = useState<StudyGroup | null>(null);
  const [tab, setTab] = useState<'list' | 'create' | 'join'>('list');
  const [groupName, setGroupName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [copiedCode, setCopiedCode] = useState('');

  const userObj = useMemo(() => ({
    uid: user?.uid || '',
    name: user?.fullName || 'Student',
    email: user?.email || '',
    photoURL: user?.photoURL || null,
  }), [user]);

  useEffect(() => {
    if (!userObj.uid) return;
    getUserGroups(userObj.uid).then(setMyGroups).catch(() => {});
  }, [userObj.uid, tab]);

  useEffect(() => {
    if (!activeGroup) return;
    const unsub = subscribeToGroup(activeGroup.id, (g) => {
      if (g) setActiveGroup(g);
    });
    return unsub;
  }, [activeGroup?.id]);

  const handleCreate = async () => {
    if (!groupName.trim()) return;
    setLoading(true);
    setError('');
    try {
      const code = await createGroup(groupName.trim(), userObj);
      setSuccess(`${t('Group created! Code')}: ${code}`);
      setGroupName('');
      setTab('list');
      const groups = await getUserGroups(userObj.uid);
      setMyGroups(groups);
    } catch (e: any) {
      setError(e.message || t('Failed to create group'));
    }
    setLoading(false);
  };

  const handleJoin = async () => {
    if (!joinCode.trim()) return;
    setLoading(true);
    setError('');
    try {
      const result = await joinGroup(joinCode.trim().toUpperCase(), userObj);
      if (result.success) {
        setSuccess(t('Joined group!'));
        setJoinCode('');
        setTab('list');
        const groups = await getUserGroups(userObj.uid);
        setMyGroups(groups);
      } else {
        setError(result.error || t('Failed to join'));
      }
    } catch (e: any) {
      setError(e.message || t('Failed to join group'));
    }
    setLoading(false);
  };

  const handleLeave = async (group: StudyGroup) => {
    if (!confirm(t('Leave this group?'))) return;
    const member = group.members.find((m) => m.uid === userObj.uid);
    if (!member) return;
    await leaveGroup(group.id, userObj.uid, member);
    setActiveGroup(null);
    const groups = await getUserGroups(userObj.uid);
    setMyGroups(groups);
  };

  const handleDelete = async (group: StudyGroup) => {
    if (!confirm(t('Delete this group? All members will be removed.'))) return;
    await deleteGroup(group.id);
    setActiveGroup(null);
    const groups = await getUserGroups(userObj.uid);
    setMyGroups(groups);
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(''), 2000);
  };

  // ── Group Detail View ──
  if (activeGroup) {
    const isOwner = activeGroup.createdBy === userObj.uid;
    const me = activeGroup.members.find((m) => m.uid === userObj.uid);
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <button onClick={() => setActiveGroup(null)} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-sm flex items-center gap-1">
          <ArrowLeft size={14} /> {t('Back to Groups')}
        </button>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">{activeGroup.name}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">{activeGroup.members.length} {t('member')}{activeGroup.members.length !== 1 ? 's' : ''}</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => copyCode(activeGroup.code)} className="px-3 py-1.5 bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-lg text-sm font-mono font-bold flex items-center gap-1.5 hover:bg-primary-100 dark:hover:bg-primary-900/50 transition">
                {copiedCode === activeGroup.code ? <CheckCircle size={14} /> : <Copy size={14} />}
                {t('Copy Code')} {activeGroup.code}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {activeGroup.members.map((m) => (
              <div key={m.uid} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                {m.photoURL ? (
                  <img src={m.photoURL} alt="" className="w-9 h-9 rounded-full object-cover" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center text-primary-600 dark:text-primary-400 font-bold text-sm">
                    {m.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{m.name}</span>
                    {m.uid === activeGroup.createdBy && <Crown size={12} className="text-yellow-500 shrink-0" />}
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">{t('Joined')} {new Date(m.joinedAt).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                  <span className="flex items-center gap-1"><BookOpen size={12} />{m.stats.sessions}</span>
                  <span className="flex items-center gap-1"><Trophy size={12} />{m.stats.avgScore}%</span>
                  <span className="flex items-center gap-1"><Flame size={12} />{m.stats.streak}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          {activeGroup.chatGroupId && (
            <button onClick={() => navigate(`/groups-chat/${activeGroup.chatGroupId}`)} className="flex-1 py-2.5 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition flex items-center justify-center gap-2">
              <MessageCircle size={16} /> {t('Group Chat')}
            </button>
          )}
          {isOwner ? (
            <button onClick={() => handleDelete(activeGroup)} className="flex-1 py-2.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg font-semibold hover:bg-red-100 dark:hover:bg-red-900/30 transition flex items-center justify-center gap-2">
              <Trash2 size={16} /> {t('Delete Group')}
            </button>
          ) : (
            <button onClick={() => handleLeave(activeGroup)} className="flex-1 py-2.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg font-semibold hover:bg-red-100 dark:hover:bg-red-900/30 transition flex items-center justify-center gap-2">
              <LogOut size={16} /> {t('Leave Group')}
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── Group List / Create / Join ──
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{t('Study Groups')}</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">{t('Learn together with classmates')}</p>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm rounded-lg flex items-center gap-2">
          <AlertCircle size={16} /> {error}
        </div>
      )}
      {success && (
        <div className="p-3 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-sm rounded-lg flex items-center gap-2">
          <CheckCircle size={16} /> {success}
        </div>
      )}

      <div className="flex gap-2">
        {(['list', 'create', 'join'] as const).map((tabKey) => (
          <button
            key={tabKey}
            onClick={() => { setTab(tabKey); setError(''); setSuccess(''); }}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition ${
              tab === tabKey
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {tabKey === 'list' ? t('My Groups') : tabKey === 'create' ? t('Create') : t('Join')}
          </button>
        ))}
      </div>

      {tab === 'create' && (
        <BorderGlow backgroundColor={document.documentElement.classList.contains('dark') ? '#1f2937' : '#ffffff'} borderRadius={12} glowColor="220 80 70" glowIntensity={0.4} colors={['#6366f1', '#8b5cf6', '#3b82f6']}>
          <div className="p-6 space-y-4">
            <h3 className="font-semibold text-gray-800 dark:text-gray-100">{t('Create a Study Group')}</h3>
            <input
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder={t('Group name (e.g. CS Study Group)')}
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 outline-none"
            />
            <button onClick={handleCreate} disabled={loading || !groupName.trim()} className="w-full py-2.5 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 disabled:opacity-50 transition flex items-center justify-center gap-2">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              {t('Create Group')}
            </button>
          </div>
        </BorderGlow>
      )}

      {tab === 'join' && (
        <BorderGlow backgroundColor={document.documentElement.classList.contains('dark') ? '#1f2937' : '#ffffff'} borderRadius={12} glowColor="220 80 70" glowIntensity={0.4} colors={['#6366f1', '#8b5cf6', '#3b82f6']}>
          <div className="p-6 space-y-4">
            <h3 className="font-semibold text-gray-800 dark:text-gray-100">{t('Join a Study Group')}</h3>
            <input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder={t('Enter group code')}
              maxLength={6}
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-mono text-lg tracking-widest text-center focus:ring-2 focus:ring-primary-500 outline-none uppercase"
            />
            <button onClick={handleJoin} disabled={loading || joinCode.length < 6} className="w-full py-2.5 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 disabled:opacity-50 transition flex items-center justify-center gap-2">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />}
              {t('Join Group')}
            </button>
          </div>
        </BorderGlow>
      )}

      {tab === 'list' && (
        <div className="space-y-3">
          {myGroups.length === 0 ? (
            <div className="text-center py-12 text-gray-400 dark:text-gray-500">
              <Users size={40} className="mx-auto mb-3 opacity-50" />
              <p className="font-medium">{t('No groups yet')}</p>
              <p className="text-sm mt-1">{t('Create or join a group to get started')}</p>
            </div>
          ) : (
            myGroups.map((g) => (
              <button
                key={g.id}
                onClick={() => setActiveGroup(g)}
                className="w-full text-left p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-600 transition"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-800 dark:text-gray-100">{g.name}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{g.members.length} {t('member')}{g.members.length !== 1 ? 's' : ''}</p>
                  </div>
                  <span className="text-xs font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-gray-600 dark:text-gray-400">{g.code}</span>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
