import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useChatTheme } from '../../contexts/ChatThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  subscribeToUserGroups,
  subscribeToGroupMessages,
  sendGroupMessage,
  editGroupMessage,
  createChatGroup,
  subscribeToFriends,
  subscribeToPresence,
  setTyping,
  pinGroupMessage,
  unpinGroupMessage,
} from '../../services/socialService';
import type { ChatGroup, GroupMessage, Friend, Presence } from '../../types';
import { Send, ArrowLeft, Users, Plus, X, Loader2, Crown, Palette, Pencil, Settings, Lock } from 'lucide-react';
import ChatThemePicker from './ChatThemePicker';
import AttachmentMenu from './AttachmentMenu';
import ContactForm from './ContactForm';
import MediaMessage from './MediaMessage';
import ChatProfileModal from './ChatProfileModal';
import TwemojiText from './TwemojiText';
import ChatInputBar from './ChatInputBar';
import MessageContextMenu from './MessageContextMenu';
import SwipeableMessage from './SwipeableMessage';

function timeAgo(dateStr: string): string {
  if (!dateStr) return '';
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(dateStr).toLocaleDateString();
}

function formatTime(dateStr: string): string {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function UserAvatar({ photo, name, size = 48, ring, onClick }: { photo: string | null; name: string; size?: number; ring?: string; onClick?: () => void }) {
  const ringClass = ring || '';
  if (photo) {
    return <img src={photo} alt="" style={{ width: size, height: size }} className={`rounded-full object-cover ${ringClass} ${onClick ? 'cursor-pointer' : ''}`} onClick={onClick} />;
  }
  return (
    <div className={`rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold shadow-lg ${ringClass} ${onClick ? 'cursor-pointer' : ''}`} style={{ width: size, height: size }} onClick={onClick}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

export default function GroupChatScreen() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const uid = user?.uid || '';
  const { theme, wallpaper } = useChatTheme();
  const { t } = useLanguage();
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [showAttach, setShowAttach] = useState(false);
  const [showContactForm, setShowContactForm] = useState(false);
  const [profileModal, setProfileModal] = useState<{ uid: string; name: string; photo: string | null; online: boolean } | null>(null);
  const [editingMsg, setEditingMsg] = useState<GroupMessage | null>(null);
  const [editText, setEditText] = useState('');

  const [groups, setGroups] = useState<ChatGroup[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [presenceMap, setPresenceMap] = useState<Record<string, Presence>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingAttachRef = useRef<{ type: string; file?: File } | null>(null);
  const [contextMenu, setContextMenu] = useState<{ msg: GroupMessage; isOwn: boolean } | null>(null);
  const [replyTo, setReplyTo] = useState<{ id: string; senderName: string; text: string } | null>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  useEffect(() => {
    if (!uid) return;
    const unsub = subscribeToUserGroups(uid, (list) => { setGroups(list); setLoading(false); });
    return unsub;
  }, [uid]);

  useEffect(() => {
    if (!uid) return;
    const unsub = subscribeToFriends(uid, (list) => setFriends(list));
    return unsub;
  }, [uid]);

  useEffect(() => {
    if (!groupId || !uid) { setMessages([]); return; }
    const unsub = subscribeToGroupMessages(groupId, (msgs) => setMessages(msgs));
    return unsub;
  }, [groupId, uid]);

  useEffect(() => {
    const currentGroup = groups.find((g) => g.id === groupId);
    if (!currentGroup) return;
    const memberUids = currentGroup.members.map((m) => m.uid).filter((u) => u !== uid);
    if (memberUids.length === 0) return;
    const unsub = subscribeToPresence(memberUids, (map) => setPresenceMap(map));
    return unsub;
  }, [groupId, groups, uid]);

  useEffect(() => { return () => { if (uid) setTyping(uid, null); }; }, [uid]);

  const handleTyping = useCallback(() => {
    if (!groupId || !uid) return;
    setTyping(uid, groupId);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => setTyping(uid, null), 2000);
  }, [groupId, uid]);

  const currentGroup = groups.find((g) => g.id === groupId);
  const myRole = currentGroup?.members.find((m) => m.uid === uid)?.role;
  const isGroupAdmin = currentGroup?.createdBy === uid || myRole === 'admin';
  const canSendMessages = !currentGroup || currentGroup.settings?.messagePermission !== 'admins' || isGroupAdmin;

  const typingMembers = currentGroup
    ? currentGroup.members.filter((m) => m.uid !== uid && presenceMap[m.uid]?.typingIn === groupId).map((m) => m.name)
    : [];
  const typingText = typingMembers.length === 0
    ? ''
    : typingMembers.length === 1
      ? `${typingMembers[0]} is typing...`
      : typingMembers.length === 2
        ? `${typingMembers[0]} and ${typingMembers[1]} are typing...`
        : `${typingMembers[0]} and ${typingMembers.length - 1} others are typing...`;

  const doSend = useCallback(async (text: string, media?: { type: string; mediaUrl: string; mediaType?: string; fileName?: string; fileSize?: number; contact?: { name: string; phone: string; email: string }; location?: { lat: number; lng: number; name: string } }) => {
    if (!groupId || !uid || sending || !canSendMessages) return;
    setSending(true);
    try {
      await sendGroupMessage(groupId, { uid, name: user?.fullName || 'Student', photo: user?.photoURL || null }, text, media, replyTo || undefined);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      setTyping(uid, null);
      setReplyTo(null);
    } catch { } finally { setSending(false); }
  }, [groupId, uid, user, sending, replyTo]);

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    const text = newMessage.trim();
    setNewMessage('');
    await doSend(text);
  };

  const handleEditSave = async () => {
    if (!editingMsg || !editText.trim()) return;
    await editGroupMessage(editingMsg.id, editText.trim());
    setEditingMsg(null);
    setEditText('');
  };

  const readFile = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleAttachSelect = async (type: string) => {
    if (type === 'image') {
      pendingAttachRef.current = { type };
      if (fileInputRef.current) { fileInputRef.current.accept = 'image/*'; fileInputRef.current.click(); }
    } else if (type === 'audio') {
      pendingAttachRef.current = { type };
      if (fileInputRef.current) { fileInputRef.current.accept = 'audio/*'; fileInputRef.current.click(); }
    } else if (type === 'document') {
      pendingAttachRef.current = { type };
      if (fileInputRef.current) { fileInputRef.current.accept = '.pdf,.doc,.docx,.txt,.csv,.xls,.xlsx,.ppt,.pptx,.zip,.rar'; fileInputRef.current.click(); }
    } else if (type === 'contact') {
      setShowContactForm(true);
    } else if (type === 'location') {
      if (!navigator.geolocation) { alert('Geolocation not supported'); return; }
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude: lat, longitude: lng } = pos.coords;
          let name = 'Shared Location';
          try {
            const resp = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
            const data = await resp.json();
            if (data.display_name) name = data.display_name.split(',').slice(0, 3).join(', ');
          } catch { }
          await doSend('', { type: 'location', mediaUrl: '', location: { lat, lng, name } });
        },
        () => alert('Could not get your location')
      );
    }
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const pending = pendingAttachRef.current;
    pendingAttachRef.current = null;
    e.target.value = '';
    if (!file || !pending) return;

    if (file.size > 10 * 1024 * 1024) { alert('File must be under 10MB'); return; }
    const dataUrl = await readFile(file);
    await doSend('', { type: pending.type, mediaUrl: dataUrl, mediaType: file.type, fileName: file.name, fileSize: file.size });
  };

  const handleContactSend = async (contact: { name: string; phone: string; email: string }) => {
    setShowContactForm(false);
    await doSend('', { type: 'contact', mediaUrl: '', contact });
  };

  const handleContextMenu = (msg: GroupMessage, isOwn: boolean, e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ msg, isOwn });
  };

  const handlePin = async (msg: GroupMessage) => {
    if (!groupId) return;
    try {
      if (currentGroup?.pinnedMessageId === msg.id) {
        await unpinGroupMessage(groupId);
      } else {
        await pinGroupMessage(groupId, msg.id);
      }
    } catch (err) {
      console.error('Failed to pin message:', err);
    }
  };

  const handleReply = (msg: GroupMessage) => {
    setReplyTo({ id: msg.id, senderName: msg.senderName, text: msg.text || '📎 Media' });
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedFriends.length === 0 || !uid || creating) return;
    setCreating(true);
    try {
      const memberUids = [uid, ...selectedFriends];
      await createChatGroup({ uid, name: user?.fullName || 'Student', photo: user?.photoURL || null }, groupName.trim(), memberUids);
      setShowCreate(false);
      setGroupName('');
      setSelectedFriends([]);
    } finally { setCreating(false); }
  };

  const tc = (light: string, dark: string) => theme.textColor === 'text-white' ? dark : light;

  if (!uid) return <div className="flex items-center justify-center h-full bg-gray-900 text-white">{t('Please log in.')}</div>;

  // ── Group List ──
  if (!groupId) {
    return (
      <div className="h-full relative overflow-y-auto" style={{ background: theme.gradient }}>
        {wallpaper && (
          <div className="fixed inset-0 opacity-20 pointer-events-none">
            {wallpaper.startsWith('linear-gradient') || wallpaper.startsWith('radial-gradient') ? (
              <div className="w-full h-full" style={{ background: wallpaper }} />
            ) : (
              <img src={wallpaper} alt="" className="w-full h-full object-cover" />
            )}
          </div>
        )}
        <div className="relative max-w-2xl mx-auto p-4">
          <div className="flex items-center justify-between mb-6 pt-2">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate('/')} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
                <ArrowLeft className="w-5 h-5 text-white/70" />
              </button>
              <Users className={`w-6 h-6 ${tc('text-primary-500', 'text-white/80')}`} />
              <h1 className={`text-2xl font-bold ${theme.textColor}`}>{t('Group Chats')}</h1>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowThemePicker(true)} className="p-2 bg-white/10 hover:bg-white/20 backdrop-blur border border-white/10 rounded-xl transition-all">
                <Palette className="w-5 h-5 text-white/70" />
              </button>
              <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur border border-white/10 rounded-xl text-white text-sm font-medium transition-all">
                <Plus className="w-4 h-4" /> {t('New Group')}
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 text-white/60 animate-spin" /></div>
          ) : groups.length === 0 ? (
            <div className="backdrop-blur-xl bg-white/10 rounded-2xl border border-white/10 p-12 text-center">
              <Users className="w-14 h-14 text-white/30 mx-auto mb-3" />
              <p className="text-white/50 text-sm font-medium">{t('No groups yet')}</p>
              <p className="text-white/30 text-xs mt-1">{t('Create a group to start chatting')}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {groups.map((group) => (
                <button key={group.id} onClick={() => navigate(`/groups-chat/${group.id}`)} className="w-full backdrop-blur-xl bg-white/10 rounded-2xl border border-white/10 p-4 flex items-center gap-4 hover:bg-white/20 transition-all text-left">
                  {group.photoURL ? (
                    <img src={group.photoURL} alt="" className="w-12 h-12 rounded-full object-cover border-2 border-white/20 shadow-lg" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white shadow-lg"><Users className="w-6 h-6" /></div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-bold ${theme.textColor} truncate`}>{group.name}</p>
                    <p className={`text-xs ${tc('text-gray-500', 'text-white/40')} mt-0.5`}>{group.members.length} {t('members')}</p>
                    {group.lastMessage && <p className={`text-xs ${tc('text-gray-400', 'text-white/50')} truncate mt-1`}>{group.lastMessage}</p>}
                  </div>
                  {group.lastMessageAt && <span className={`text-[10px] ${tc('text-gray-400', 'text-white/30')} flex-shrink-0`}>{timeAgo(group.lastMessageAt)}</span>}
                </button>
              ))}
            </div>
          )}

          {showCreate && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowCreate(false)}>
              <div className="bg-gray-900 rounded-2xl border border-white/10 w-full max-w-md p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className={`text-lg font-bold ${theme.textColor}`}>{t('Create Group')}</h3>
                  <button onClick={() => setShowCreate(false)} className="p-1.5 rounded-lg hover:bg-white/10"><X className="w-5 h-5 text-white/60" /></button>
                </div>
                <input type="text" value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder={t('Group name')} className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 outline-none mb-4" autoFocus />
                <p className="text-xs font-medium text-white/40 mb-2">{t('Add friends')} ({selectedFriends.length} {t('selected')})</p>
                <div className="max-h-48 overflow-y-auto space-y-1 mb-4">
                  {friends.length === 0 ? <p className="text-xs text-white/30">{t('No friends to add')}</p> : friends.map((f) => (
                    <label key={f.uid} className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/10 cursor-pointer">
                      <input type="checkbox" checked={selectedFriends.includes(f.uid)} onChange={() => setSelectedFriends((p) => p.includes(f.uid) ? p.filter((x) => x !== f.uid) : [...p, f.uid])} className="w-4 h-4 text-blue-500 rounded" />
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-semibold">{f.displayName.charAt(0).toUpperCase()}</div>
                      <span className="text-sm text-white">{f.displayName}</span>
                    </label>
                  ))}
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setShowCreate(false)} className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 text-sm font-medium transition-all">{t('Cancel')}</button>
                  <button onClick={handleCreateGroup} disabled={!groupName.trim() || selectedFriends.length === 0 || creating} className="flex-1 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-400 text-white text-sm font-bold transition-all shadow-lg shadow-blue-500/30 disabled:opacity-50">
                    {creating ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : t('Create')}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
        <ChatThemePicker open={showThemePicker} onClose={() => setShowThemePicker(false)} />
      </div>
    );
  }

  // ── Group Chat View ──
  const members = currentGroup?.members || [];

  if (!currentGroup) return <div className="flex items-center justify-center h-screen" style={{ background: theme.gradient }}><Loader2 className="w-8 h-8 text-white/60 animate-spin" /></div>;

  return (
    <div className="flex h-full relative overflow-hidden" style={{ background: theme.gradient }}>
      {wallpaper && (
        <div className="absolute inset-0 opacity-15 pointer-events-none">
          {wallpaper.startsWith('linear-gradient') || wallpaper.startsWith('radial-gradient') ? (
            <div className="w-full h-full" style={{ background: wallpaper }} />
          ) : (
            <img src={wallpaper} alt="" className="w-full h-full object-cover" />
          )}
        </div>
      )}

      <div className="relative z-10 flex flex-col flex-1 min-w-0 min-h-0">
        {/* Header */}
        <div className={`${theme.headerBg} px-4 py-3 flex items-center gap-3 shrink-0`}>
          <button onClick={() => navigate('/groups-chat')} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
            <ArrowLeft className={`w-5 h-5 ${tc('text-gray-500', 'text-white/70')}`} />
          </button>
          <div className="flex items-center gap-3 flex-1">
            {currentGroup.photoURL ? (
              <img src={currentGroup.photoURL} alt="" className="w-10 h-10 rounded-full object-cover border-2 border-white/20 shadow-lg" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white shadow-lg"><Users className="w-5 h-5" /></div>
            )}
            <div>
              <p className={`text-sm font-bold ${theme.textColor}`}>{currentGroup.name}</p>
              {typingText ? (
                <p className="text-[11px] text-blue-400 font-medium">{typingText}</p>
              ) : (
                <p className={`text-[11px] ${tc('text-gray-400', 'text-white/50')}`}>{members.length} {t('members')}</p>
              )}
            </div>
          </div>
          <button onClick={() => navigate(`/groups-chat/${groupId}/settings`)} className="p-2 rounded-lg hover:bg-white/10 transition-colors">
            <Settings className={`w-5 h-5 ${tc('text-gray-500', 'text-white/70')}`} />
          </button>
          <button onClick={() => setShowThemePicker(true)} className="p-2 rounded-lg hover:bg-white/10 transition-colors">
            <Palette className={`w-5 h-5 ${tc('text-gray-500', 'text-white/70')}`} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4">
          <div className="space-y-3">
            {messages.map((msg, idx) => {
              const isOwn = msg.senderUid === uid;
              const prevMsg = idx > 0 ? messages[idx - 1] : null;
              const showAvatar = !prevMsg || prevMsg.senderUid !== msg.senderUid;
              const senderName = msg.senderName || 'Unknown';
              const isMedia = msg.type && msg.type !== 'text';
              const isEditing = editingMsg?.id === msg.id;
              const senderMember = members.find((m) => m.uid === msg.senderUid);

              return (
                <SwipeableMessage key={msg.id} isOwn={isOwn} onSwipeReply={() => handleReply(msg)}>
                <div className={`relative group ${isOwn ? 'flex justify-end' : 'flex justify-start'}`} style={{ marginBottom: showAvatar ? 16 : 2 }}>
                  {!isOwn && (
                    <div className="flex-shrink-0 self-end" style={{ width: 40, marginRight: -8, zIndex: 2 }}>
                      {showAvatar ? <UserAvatar photo={msg.senderPhoto || null} name={senderName} size={40} ring={theme.avatarRing} onClick={() => setProfileModal({ uid: msg.senderUid, name: senderName, photo: msg.senderPhoto || null, online: false })} /> : <div style={{ width: 40 }} />}
                    </div>
                  )}

                  <div className="relative max-w-[70%]">
                    {!isOwn && showAvatar && (
                      <p className={`text-[11px] font-bold ${theme.senderNameColor} mb-1 ml-3 uppercase tracking-wider cursor-pointer`} onClick={() => setProfileModal({ uid: msg.senderUid, name: senderName, photo: msg.senderPhoto || null, online: false })}>{senderName}</p>
                    )}

                    {isEditing ? (
                      <div className={`px-3 py-2 rounded-xl ${theme.bubbleOwn}`}>
                        <input type="text" value={editText} onChange={(e) => setEditText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleEditSave(); if (e.key === 'Escape') { setEditingMsg(null); setEditText(''); } }} className={`w-full bg-transparent text-[13px] outline-none ${theme.textColor}`} autoFocus />
                        <div className="flex items-center gap-2 mt-1">
                          <button onClick={handleEditSave} className="text-[11px] text-blue-400 font-medium">{t('Save')}</button>
                          <button onClick={() => { setEditingMsg(null); setEditText(''); }} className="text-[11px] text-white/40">{t('Cancel')}</button>
                        </div>
                      </div>
                    ) : (
                      <div
                        className={`relative ${isOwn ? theme.bubbleOwn : theme.bubbleReceived} ${isMedia ? 'px-2 py-2' : 'px-4 py-3'}`}
                        onContextMenu={(e) => handleContextMenu(msg, isOwn, e)}
                        onTouchStart={(e) => {
                          const timer = setTimeout(() => handleContextMenu(msg, isOwn, e), 500);
                          const cancel = () => { clearTimeout(timer); document.removeEventListener('touchend', cancel); };
                          document.addEventListener('touchend', cancel, { once: true });
                        }}
                      >
                        {/* Reply Quote */}
                        {msg.replyTo && (
                          <div className="mb-2 px-3 py-1.5 rounded-lg bg-white/5 border-l-2 border-indigo-400">
                            <p className="text-[10px] font-bold text-indigo-400">{msg.replyTo.senderName}</p>
                            <p className="text-[10px] text-white/40 truncate">{msg.replyTo.text}</p>
                          </div>
                        )}
                        {isMedia ? (
                          <MediaMessage type={msg.type!} mediaUrl={msg.mediaUrl} mediaType={msg.mediaType} fileName={msg.fileName} fileSize={msg.fileSize} contact={msg.contact} location={msg.location} isOwn={isOwn} />
                        ) : (
                          <TwemojiText className={`text-[13px] break-words leading-relaxed ${theme.textColor}`}>{msg.text}</TwemojiText>
                        )}
                        <div className="flex items-center justify-end gap-1 mt-1">
                          {msg.edited && <span className={`text-[9px] ${theme.timestampColor} italic`}>{t('edited')}</span>}
                          <p className={`text-[10px] ${theme.timestampColor}`}>{formatTime(msg.createdAt)}</p>
                          {isOwn && <span className={`text-[10px] ${msg.readBy.length > 1 ? 'text-blue-400' : theme.timestampColor}`}>{msg.readBy.length > 1 ? '✓✓' : '✓'}</span>}
                        </div>

                        {isOwn && msg.type === 'text' && (
                          <button onClick={() => { setEditingMsg(msg); setEditText(msg.text); }} className="absolute -right-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg hover:bg-white/10">
                            <Pencil className="w-3.5 h-3.5 text-white/40" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {isOwn && (
                    <div className="flex-shrink-0 self-end" style={{ width: 40, marginLeft: -8, zIndex: 2 }}>
                      {showAvatar ? <UserAvatar photo={user?.photoURL || null} name={user?.fullName || 'You'} size={40} ring={theme.avatarRing} /> : <div style={{ width: 40 }} />}
                    </div>
                  )}
                </div>
                </SwipeableMessage>
              );
            })}
          </div>
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className={`${theme.inputBg} px-3 py-2 shrink-0 safe-area-bottom`}>
          {!canSendMessages ? (
            <div className="flex items-center justify-center gap-2 py-2 text-white/40 text-sm">
              <Lock className="w-4 h-4" /> {t('Only admins can send messages')}
            </div>
          ) : (
            <ChatInputBar
              userPhoto={user?.photoURL || null}
              userName={user?.fullName || 'You'}
              onSend={async (msg) => { setNewMessage(msg); await doSend(msg); }}
              onSendMedia={async (type, mediaUrl, mediaType, fileName, fileSize) => { await doSend('', { type, mediaUrl, mediaType, fileName, fileSize }); }}
              onAttach={() => setShowAttach(!showAttach)}
              disabled={sending || !canSendMessages}
              sending={sending}
              replyTo={replyTo}
              onCancelReply={() => setReplyTo(null)}
            />
          )}
        </div>
      </div>

      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelected} />

      {/* Attachment menu */}
      {showAttach && <AttachmentMenu onSelect={handleAttachSelect} onClose={() => setShowAttach(false)} />}

      {/* Contact form */}
      {showContactForm && <ContactForm onSend={handleContactSend} onClose={() => setShowContactForm(false)} />}

      {/* Profile modal */}
      {profileModal && <ChatProfileModal uid={profileModal.uid} name={profileModal.name} photo={profileModal.photo} online={profileModal.online} onClose={() => setProfileModal(null)} />}

      {/* Context menu */}
      {contextMenu && (
        <MessageContextMenu
          isOwn={contextMenu.isOwn}
          messageText={contextMenu.msg.text}
          messageType={contextMenu.msg.type}
          readBy={contextMenu.msg.readBy}
          createdAt={contextMenu.msg.createdAt}
          isGroup
          isPinned={currentGroup?.pinnedMessageId === contextMenu.msg.id}
          onEdit={() => { setEditingMsg(contextMenu.msg); setEditText(contextMenu.msg.text); }}
          onPin={() => handlePin(contextMenu.msg)}
          onReply={() => handleReply(contextMenu.msg)}
          onClose={() => setContextMenu(null)}
        />
      )}

      <ChatThemePicker open={showThemePicker} onClose={() => setShowThemePicker(false)} />
    </div>
  );
}
