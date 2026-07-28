import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  subscribeToUserGroups,
  subscribeToFriends,
  addGroupMember,
  updateGroupProfile,
  updateGroupSettings,
  setGroupMemberRole,
  removeGroupMember,
} from '../../services/socialService';
import type { ChatGroup, Friend } from '../../types';
import {
  ArrowLeft, Camera, Save, Crown, Shield, UserMinus,
  Users, Loader2, CheckCircle, AlertCircle, Lock, MessageCircle, X, UserPlus,
} from 'lucide-react';

export default function GroupSettingsScreen() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const uid = user?.uid || '';
  const fileRef = useRef<HTMLInputElement>(null);

  const [group, setGroup] = useState<ChatGroup | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [groupName, setGroupName] = useState('');
  const [groupDesc, setGroupDesc] = useState('');
  const [groupPhoto, setGroupPhoto] = useState<string | null>(null);
  const [messagePerm, setMessagePerm] = useState<'all' | 'admins'>('all');
  const [expanded, setExpanded] = useState<'profile' | 'permissions' | 'addMember' | null>('profile');
  const [addingMember, setAddingMember] = useState(false);

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

  useEffect(() => {
    if (!uid) return;
    const unsub = subscribeToFriends(uid, (list) => setFriends(list));
    return unsub;
  }, [uid]);

  const isOwner = group?.createdBy === uid;
  const myRole = group?.members.find((m) => m.uid === uid)?.role;
  const isAdmin = isOwner || myRole === 'admin';
  const memberUids = group?.members.map((m) => m.uid) || [];
  const nonMembers = friends.filter((f) => !memberUids.includes(f.uid));

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
      setSuccess('Profile updated');
      setTimeout(() => setSuccess(''), 2000);
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
      setTimeout(() => setSuccess(''), 2000);
    } catch { setError('Failed to update permissions'); }
    setSaving(false);
  };

  const handleToggleRole = async (memberUid: string, currentRole: 'admin' | 'member') => {
    if (!groupId) return;
    const newRole = currentRole === 'admin' ? 'member' : 'admin';
    try {
      await setGroupMemberRole(groupId, memberUid, newRole);
      setSuccess(newRole === 'admin' ? 'Made admin' : 'Removed admin');
      setTimeout(() => setSuccess(''), 2000);
    } catch { setError('Failed to change role'); }
  };

  const handleRemoveMember = async (memberUid: string) => {
    if (!groupId || !confirm('Remove this member from the group?')) return;
    try {
      await removeGroupMember(groupId, memberUid);
      setSuccess('Member removed');
      setTimeout(() => setSuccess(''), 2000);
    } catch { setError('Failed to remove member'); }
  };

  const handleAddMember = async (friend: Friend) => {
    if (!groupId || addingMember) return;
    setAddingMember(true);
    try {
      await addGroupMember(groupId, { uid: friend.uid, name: friend.displayName, photo: friend.photoURL || null });
      setSuccess(`Added ${friend.displayName}`);
      setTimeout(() => setSuccess(''), 2000);
    } catch { setError('Failed to add member'); }
    setAddingMember(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-900">
        <Loader2 className="w-8 h-8 text-white/60 animate-spin" />
      </div>
    );
  }

  if (!group || !isAdmin) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-900 text-white/40">
        Group not found or no access.
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-900">
      <div className="max-w-2xl mx-auto px-4 py-4 space-y-3 pb-12">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
            <ArrowLeft className="w-5 h-5 text-white/70" />
          </button>
          <h1 className="text-xl font-bold text-white">Group Settings</h1>
        </div>

        {/* Alerts */}
        {error && (
          <div className="p-3 bg-red-500/20 border border-red-500/30 text-red-400 text-sm rounded-xl flex items-center gap-2">
            <AlertCircle size={16} /> {error}
            <button onClick={() => setError('')} className="ml-auto"><X size={14} /></button>
          </div>
        )}
        {success && (
          <div className="p-3 bg-green-500/20 border border-green-500/30 text-green-400 text-sm rounded-xl flex items-center gap-2">
            <CheckCircle size={16} /> {success}
          </div>
        )}

        {/* Profile Card */}
        <div className="backdrop-blur-xl bg-white/10 rounded-2xl border border-white/10 overflow-hidden">
          <div className="h-24 bg-gradient-to-r from-purple-600/40 to-indigo-600/40 relative">
            {groupPhoto && <img src={groupPhoto} alt="" className="w-full h-full object-cover" />}
          </div>
          <div className="px-5 pb-5">
            <div className="flex items-end gap-4 -mt-10 mb-4">
              <div className="relative">
                {groupPhoto ? (
                  <img src={groupPhoto} alt="" className="w-20 h-20 rounded-full object-cover border-4 border-gray-900 shadow-xl" />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold border-4 border-gray-900 shadow-xl">
                    {groupName.charAt(0).toUpperCase()}
                  </div>
                )}
                <button
                  onClick={() => fileRef.current?.click()}
                  className="absolute bottom-0 right-0 p-1.5 bg-primary-600 rounded-full text-white hover:bg-primary-700 transition shadow-lg"
                >
                  <Camera size={12} />
                </button>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
              </div>
              <div className="flex-1 min-w-0 pb-1">
                <h2 className="text-lg font-bold text-white truncate">{group.name}</h2>
                <p className="text-xs text-white/40">{group.members.length} member{group.members.length !== 1 ? 's' : ''}</p>
              </div>
            </div>
            {group.description && (
              <p className="text-sm text-white/60 mb-4 leading-relaxed">{group.description}</p>
            )}
            <button
              onClick={() => setExpanded(expanded === 'profile' ? null : 'profile')}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition text-sm text-white/70 font-medium"
            >
              <span>Edit Group Profile</span>
              <span className="text-white/30">{expanded === 'profile' ? '−' : '+'}</span>
            </button>
            {expanded === 'profile' && (
              <div className="mt-3 space-y-3">
                <input
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Group name"
                  className="w-full px-4 py-2.5 bg-white/10 border border-white/10 rounded-xl text-sm text-white placeholder-white/30 outline-none focus:border-primary-500/50"
                />
                <textarea
                  value={groupDesc}
                  onChange={(e) => setGroupDesc(e.target.value)}
                  placeholder="Description (optional)"
                  rows={2}
                  className="w-full px-4 py-2.5 bg-white/10 border border-white/10 rounded-xl text-sm text-white placeholder-white/30 outline-none focus:border-primary-500/50 resize-none"
                />
                <button
                  onClick={handleSaveProfile}
                  disabled={saving || !groupName.trim()}
                  className="w-full py-2.5 bg-primary-600 hover:bg-primary-500 text-white rounded-xl text-sm font-semibold disabled:opacity-50 transition flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  Save Profile
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Members */}
        <div className="backdrop-blur-xl bg-white/10 rounded-2xl border border-white/10 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-white/80 flex items-center gap-2">
              <Users size={14} /> Members
            </h3>
            <span className="text-xs text-white/30">{group.members.length}</span>
          </div>
          <div className="space-y-1">
            {group.members.map((m) => {
              const isMe = m.uid === uid;
              const isCreator = m.uid === group.createdBy;
              return (
                <div key={m.uid} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/5 transition group">
                  {m.photoURL ? (
                    <img src={m.photoURL} alt="" className="w-9 h-9 rounded-full object-cover" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold">
                      {m.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm text-white truncate">{m.name}</span>
                      {isCreator && <Crown size={11} className="text-yellow-400 shrink-0" />}
                      {m.role === 'admin' && !isCreator && <Shield size={11} className="text-blue-400 shrink-0" />}
                      {isMe && <span className="text-[10px] text-white/30">(you)</span>}
                    </div>
                    <p className="text-[11px] text-white/30">{isCreator ? 'Owner' : m.role === 'admin' ? 'Admin' : 'Member'}</p>
                  </div>
                  {!isMe && !isCreator && (
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleToggleRole(m.uid, m.role)}
                        className="p-1.5 rounded-lg hover:bg-white/10 transition text-white/40 hover:text-white/70"
                        title={m.role === 'admin' ? 'Remove admin' : 'Make admin'}
                      >
                        {m.role === 'admin' ? <Shield size={13} className="text-blue-400" /> : <Crown size={13} />}
                      </button>
                      <button
                        onClick={() => handleRemoveMember(m.uid)}
                        className="p-1.5 rounded-lg hover:bg-red-500/20 transition text-white/40 hover:text-red-400"
                        title="Remove member"
                      >
                        <UserMinus size={13} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Add Member */}
          <button
            onClick={() => setExpanded(expanded === 'addMember' ? null : 'addMember')}
            className="w-full mt-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition text-sm text-primary-400 font-medium flex items-center justify-center gap-2"
          >
            <UserPlus size={14} /> Add Member
          </button>
          {expanded === 'addMember' && (
            <div className="mt-3 space-y-1 max-h-48 overflow-y-auto">
              {nonMembers.length === 0 ? (
                <p className="text-xs text-white/30 text-center py-3">All friends are already in this group</p>
              ) : (
                nonMembers.map((f) => (
                  <div key={f.uid} className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition">
                    {f.photoURL ? (
                      <img src={f.photoURL} alt="" className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold">
                        {f.displayName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="flex-1 text-sm text-white truncate">{f.displayName}</span>
                    <button
                      onClick={() => handleAddMember(f)}
                      disabled={addingMember}
                      className="px-3 py-1 bg-primary-600 hover:bg-primary-500 text-white rounded-lg text-xs font-semibold transition disabled:opacity-50"
                    >
                      Add
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Permissions */}
        <div className="backdrop-blur-xl bg-white/10 rounded-2xl border border-white/10 overflow-hidden">
          <button
            onClick={() => setExpanded(expanded === 'permissions' ? null : 'permissions')}
            className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition"
          >
            <h3 className="text-sm font-bold text-white/80 flex items-center gap-2">
              <Lock size={14} /> Message Permissions
            </h3>
            <span className="text-white/30 text-xs">{expanded === 'permissions' ? '−' : '+'}</span>
          </button>
          {expanded === 'permissions' && (
            <div className="px-4 pb-4 space-y-2">
              <button
                onClick={() => setMessagePerm('all')}
                className={`w-full p-3 rounded-xl text-left transition flex items-center gap-3 ${
                  messagePerm === 'all'
                    ? 'bg-primary-500/20 border border-primary-500/40'
                    : 'bg-white/5 border border-white/10 hover:bg-white/10'
                }`}
              >
                <MessageCircle size={18} className={messagePerm === 'all' ? 'text-primary-400' : 'text-white/30'} />
                <div>
                  <p className="text-sm font-medium text-white">All Members</p>
                  <p className="text-[11px] text-white/40">Anyone can send messages</p>
                </div>
              </button>
              <button
                onClick={() => setMessagePerm('admins')}
                className={`w-full p-3 rounded-xl text-left transition flex items-center gap-3 ${
                  messagePerm === 'admins'
                    ? 'bg-primary-500/20 border border-primary-500/40'
                    : 'bg-white/5 border border-white/10 hover:bg-white/10'
                }`}
              >
                <Shield size={18} className={messagePerm === 'admins' ? 'text-primary-400' : 'text-white/30'} />
                <div>
                  <p className="text-sm font-medium text-white">Admins Only</p>
                  <p className="text-[11px] text-white/40">Only admins can send messages</p>
                </div>
              </button>
              <button
                onClick={handleSavePermissions}
                disabled={saving}
                className="w-full py-2.5 bg-primary-600 hover:bg-primary-500 text-white rounded-xl text-sm font-semibold disabled:opacity-50 transition flex items-center justify-center gap-2 mt-2"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Save Permissions
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
