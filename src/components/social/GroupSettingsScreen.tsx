import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  subscribeToUserGroups,
  updateGroupProfile,
  updateGroupSettings,
  setGroupMemberRole,
  removeGroupMember,
} from '../../services/socialService';
import type { ChatGroup } from '../../types';
import {
  ArrowLeft, Camera, Save, Trash2, Crown, Shield, UserMinus,
  Users, Loader2, CheckCircle, AlertCircle, Info, Lock, MessageCircle,
} from 'lucide-react';
import BorderGlow from '../ui/BorderGlow';

export default function GroupSettingsScreen() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const uid = user?.uid || '';
  const fileRef = useRef<HTMLInputElement>(null);

  const [group, setGroup] = useState<ChatGroup | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [groupName, setGroupName] = useState('');
  const [groupDesc, setGroupDesc] = useState('');
  const [groupPhoto, setGroupPhoto] = useState<string | null>(null);
  const [messagePerm, setMessagePerm] = useState<'all' | 'admins'>('all');

  useEffect(() => {
    if (!uid || !groupId) return;
    const unsub = subscribeToUserGroups(uid, (groups) => {
      const g = groups.find((gr) => gr.id === groupId);
      if (g) {
        setGroup(g);
        setGroupName(g.name);
        setGroupDesc(g.description || '');
        setGroupPhoto(g.photoURL || null);
        setMessagePerm(g.settings?.messagePermission || 'all');
      }
      setLoading(false);
    });
    return unsub;
  }, [uid, groupId]);

  const isOwner = group?.createdBy === uid;
  const myRole = group?.members.find((m) => m.uid === uid)?.role;
  const isAdmin = isOwner || myRole === 'admin';

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setError('Photo must be under 2MB'); return; }
    const reader = new FileReader();
    reader.onload = () => setGroupPhoto(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async () => {
    if (!groupId || !groupName.trim()) return;
    setSaving(true);
    setError('');
    try {
      await updateGroupProfile(groupId, {
        name: groupName.trim(),
        description: groupDesc.trim(),
        photoURL: groupPhoto,
      });
      setSuccess('Group profile updated');
    } catch { setError('Failed to update profile'); }
    setSaving(false);
  };

  const handleSavePermissions = async () => {
    if (!groupId) return;
    setSaving(true);
    setError('');
    try {
      await updateGroupSettings(groupId, { messagePermission: messagePerm });
      setSuccess('Permissions updated');
    } catch { setError('Failed to update permissions'); }
    setSaving(false);
  };

  const handleToggleRole = async (memberUid: string, currentRole: 'admin' | 'member') => {
    if (!groupId) return;
    const newRole = currentRole === 'admin' ? 'member' : 'admin';
    try {
      await setGroupMemberRole(groupId, memberUid, newRole);
      setSuccess(`${newRole === 'admin' ? 'Made admin' : 'Removed admin'}`);
    } catch { setError('Failed to change role'); }
  };

  const handleRemoveMember = async (memberUid: string) => {
    if (!groupId || !confirm('Remove this member from the group?')) return;
    try {
      await removeGroupMember(groupId, memberUid);
      setSuccess('Member removed');
    } catch { setError('Failed to remove member'); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-100 dark:bg-gray-900">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  if (!group || !isAdmin) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-100 dark:bg-gray-900 text-gray-500 dark:text-gray-400">
        Group not found or no access.
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-8">
      <button onClick={() => navigate(-1)} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-sm flex items-center gap-1">
        <ArrowLeft size={14} /> Back
      </button>

      <div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Group Settings</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm">Manage group profile, members, and permissions</p>
      </div>

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm rounded-lg flex items-center gap-2">
          <AlertCircle size={16} /> {error}
          <button onClick={() => setError('')} className="ml-auto text-red-400 hover:text-red-600">&times;</button>
        </div>
      )}
      {success && (
        <div className="p-3 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-sm rounded-lg flex items-center gap-2">
          <CheckCircle size={16} /> {success}
          <button onClick={() => setSuccess('')} className="ml-auto text-green-400 hover:text-green-600">&times;</button>
        </div>
      )}

      {/* Group Profile */}
      <BorderGlow backgroundColor={document.documentElement.classList.contains('dark') ? '#1f2937' : '#ffffff'} borderRadius={12} glowColor="142 80 70" glowIntensity={0.4} colors={['#6366f1', '#3b82f6', '#10b981']}>
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300 font-semibold">
            <Info size={16} /> Group Profile
          </div>

          {/* Photo */}
          <div className="flex items-center gap-4">
            <div className="relative">
              {groupPhoto ? (
                <img src={groupPhoto} alt="" className="w-20 h-20 rounded-full object-cover border-2 border-primary-500" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold">
                  {groupName.charAt(0).toUpperCase()}
                </div>
              )}
              <button
                onClick={() => fileRef.current?.click()}
                className="absolute -bottom-1 -right-1 p-1.5 bg-primary-600 rounded-full text-white hover:bg-primary-700 transition shadow-lg"
              >
                <Camera size={14} />
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-500 dark:text-gray-400">Group Photo</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">Max 2MB. JPG or PNG.</p>
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Group Name</label>
            <input
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 outline-none"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
            <textarea
              value={groupDesc}
              onChange={(e) => setGroupDesc(e.target.value)}
              placeholder="What is this group about?"
              rows={3}
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-primary-500 outline-none resize-none"
            />
          </div>

          <button
            onClick={handleSaveProfile}
            disabled={saving || !groupName.trim()}
            className="w-full py-2.5 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 disabled:opacity-50 transition flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Save Profile
          </button>
        </div>
      </BorderGlow>

      {/* Message Permissions */}
      <BorderGlow backgroundColor={document.documentElement.classList.contains('dark') ? '#1f2937' : '#ffffff'} borderRadius={12} glowColor="142 80 70" glowIntensity={0.4} colors={['#f59e0b', '#ef4444', '#6366f1']}>
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300 font-semibold">
            <Lock size={16} /> Message Permissions
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Control who can send messages in this group</p>

          <div className="space-y-2">
            <button
              onClick={() => setMessagePerm('all')}
              className={`w-full p-4 rounded-lg border-2 text-left transition flex items-center gap-3 ${
                messagePerm === 'all'
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <MessageCircle size={20} className={messagePerm === 'all' ? 'text-primary-600' : 'text-gray-400'} />
              <div>
                <p className="font-medium text-gray-800 dark:text-gray-200">All Members</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Anyone in the group can send messages</p>
              </div>
            </button>

            <button
              onClick={() => setMessagePerm('admins')}
              className={`w-full p-4 rounded-lg border-2 text-left transition flex items-center gap-3 ${
                messagePerm === 'admins'
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <Shield size={20} className={messagePerm === 'admins' ? 'text-primary-600' : 'text-gray-400'} />
              <div>
                <p className="font-medium text-gray-800 dark:text-gray-200">Admins Only</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Only admins can send messages</p>
              </div>
            </button>
          </div>

          <button
            onClick={handleSavePermissions}
            disabled={saving}
            className="w-full py-2.5 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 disabled:opacity-50 transition flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Save Permissions
          </button>
        </div>
      </BorderGlow>

      {/* Members Management */}
      <BorderGlow backgroundColor={document.documentElement.classList.contains('dark') ? '#1f2937' : '#ffffff'} borderRadius={12} glowColor="142 80 70" glowIntensity={0.4} colors={['#10b981', '#3b82f6', '#6366f1']}>
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300 font-semibold">
            <Users size={16} /> Members ({group.members.length})
          </div>

          <div className="space-y-2">
            {group.members.map((m) => {
              const isMe = m.uid === uid;
              const isCreator = m.uid === group.createdBy;
              return (
                <div key={m.uid} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  {m.photoURL ? (
                    <img src={m.photoURL} alt="" className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-sm">
                      {m.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{m.name}</span>
                      {isCreator && <Crown size={12} className="text-yellow-500 shrink-0" />}
                      {m.role === 'admin' && !isCreator && <Shield size={12} className="text-blue-500 shrink-0" />}
                      {isMe && <span className="text-xs text-gray-400">(you)</span>}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{isCreator ? 'Owner' : m.role}</p>
                  </div>

                  {!isMe && !isCreator && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleToggleRole(m.uid, m.role)}
                        className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition text-gray-500 dark:text-gray-400"
                        title={m.role === 'admin' ? 'Remove admin' : 'Make admin'}
                      >
                        {m.role === 'admin' ? <Shield size={14} className="text-blue-500" /> : <Crown size={14} />}
                      </button>
                      <button
                        onClick={() => handleRemoveMember(m.uid)}
                        className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition text-gray-500 hover:text-red-500"
                        title="Remove member"
                      >
                        <UserMinus size={14} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </BorderGlow>

      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
    </div>
  );
}
