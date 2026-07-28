import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useChatTheme } from '../../contexts/ChatThemeContext';
import {
  subscribeToUserGroups,
  subscribeToGroupMessages,
  sendGroupMessage,
  createChatGroup,
  subscribeToFriends,
  subscribeToPresence,
  setTyping,
} from '../../services/socialService';
import type { ChatGroup, GroupMessage, Friend, Presence } from '../../types';
import { Send, ArrowLeft, Users, Plus, X, Loader2, Crown, Palette, Smile, Paperclip } from 'lucide-react';
import ChatThemePicker from './ChatThemePicker';
import EmojiPicker from './EmojiPicker';
import AttachmentMenu from './AttachmentMenu';
import ContactForm from './ContactForm';
import MediaMessage from './MediaMessage';
import TwemojiText from './TwemojiText';

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

function UserAvatar({ photo, name, size = 48, ring }: { photo: string | null; name: string; size?: number; ring?: string }) {
  const ringClass = ring || '';
  if (photo) {
    return <img src={photo} alt="" style={{ width: size, height: size }} className={`rounded-full object-cover ${ringClass}`} />;
  }
  return (
    <div className={`rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold shadow-lg ${ringClass}`} style={{ width: size, height: size }}>
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
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showAttach, setShowAttach] = useState(false);
  const [showContactForm, setShowContactForm] = useState(false);

  const [groups, setGroups] = useState<ChatGroup[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [presenceMap, setPresenceMap] = useState<Record<string, Presence>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingAttachRef = useRef<{ type: string; file?: File } | null>(null);

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

  const doSend = useCallback(async (text: string, media?: { type: string; mediaUrl: string; mediaType?: string; fileName?: string; fileSize?: number; contact?: { name: string; phone: string; email: string }; location?: { lat: number; lng: number; name: string } }) => {
    if (!groupId || !uid || sending) return;
    setSending(true);
    try {
      await sendGroupMessage(groupId, { uid, name: user?.fullName || 'Student', photo: user?.photoURL || null }, text, media);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      setTyping(uid, null);
    } catch { } finally { setSending(false); }
  }, [groupId, uid, user, sending]);

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    const text = newMessage.trim();
    setNewMessage('');
    setShowEmoji(false);
    await doSend(text);
  };

  const handleEmojiSelect = (emoji: string) => {
    setNewMessage((prev) => prev + emoji);
    inputRef.current?.focus();
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

  if (!uid) return <div className="flex items-center justify-center h-full bg-gray-900 text-white">Please log in.</div>;

  // ── Group List ──
  if (!groupId) {
    return (
      <div className="min-h-[100dvh] min-h-screen relative" style={{ background: theme.gradient }}>
        {wallpaper && <div className="fixed inset-0 opacity-20 pointer-events-none"><img src={wallpaper} alt="" className="w-full h-full object-cover" /></div>}
        <div className="relative max-w-2xl mx-auto p-4">
          <div className="flex items-center justify-between mb-6 pt-2">
            <div className="flex items-center gap-3">
              <Users className={`w-6 h-6 ${tc('text-primary-500', 'text-white/80')}`} />
              <h1 className={`text-2xl font-bold ${theme.textColor}`}>Group Chats</h1>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowThemePicker(true)} className="p-2 bg-white/10 hover:bg-white/20 backdrop-blur border border-white/10 rounded-xl transition-all">
                <Palette className="w-5 h-5 text-white/70" />
              </button>
              <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur border border-white/10 rounded-xl text-white text-sm font-medium transition-all">
                <Plus className="w-4 h-4" /> New Group
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 text-white/60 animate-spin" /></div>
          ) : groups.length === 0 ? (
            <div className="backdrop-blur-xl bg-white/10 rounded-2xl border border-white/10 p-12 text-center">
              <Users className="w-14 h-14 text-white/30 mx-auto mb-3" />
              <p className="text-white/50 text-sm font-medium">No groups yet</p>
              <p className="text-white/30 text-xs mt-1">Create a group to start chatting</p>
            </div>
          ) : (
            <div className="space-y-2">
              {groups.map((group) => (
                <button key={group.id} onClick={() => navigate(`/groups-chat/${group.id}`)} className="w-full backdrop-blur-xl bg-white/10 rounded-2xl border border-white/10 p-4 flex items-center gap-4 hover:bg-white/20 transition-all text-left">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white shadow-lg"><Users className="w-6 h-6" /></div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-bold ${theme.textColor} truncate`}>{group.name}</p>
                    <p className={`text-xs ${tc('text-gray-500', 'text-white/40')} mt-0.5`}>{group.members.length} members</p>
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
                  <h3 className={`text-lg font-bold ${theme.textColor}`}>Create Group</h3>
                  <button onClick={() => setShowCreate(false)} className="p-1.5 rounded-lg hover:bg-white/10"><X className="w-5 h-5 text-white/60" /></button>
                </div>
                <input type="text" value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="Group name" className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 outline-none mb-4" autoFocus />
                <p className="text-xs font-medium text-white/40 mb-2">Add friends ({selectedFriends.length} selected)</p>
                <div className="max-h-48 overflow-y-auto space-y-1 mb-4">
                  {friends.length === 0 ? <p className="text-xs text-white/30">No friends to add</p> : friends.map((f) => (
                    <label key={f.uid} className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/10 cursor-pointer">
                      <input type="checkbox" checked={selectedFriends.includes(f.uid)} onChange={() => setSelectedFriends((p) => p.includes(f.uid) ? p.filter((x) => x !== f.uid) : [...p, f.uid])} className="w-4 h-4 text-blue-500 rounded" />
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-semibold">{f.displayName.charAt(0).toUpperCase()}</div>
                      <span className="text-sm text-white">{f.displayName}</span>
                    </label>
                  ))}
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setShowCreate(false)} className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 text-sm font-medium transition-all">Cancel</button>
                  <button onClick={handleCreateGroup} disabled={!groupName.trim() || selectedFriends.length === 0 || creating} className="flex-1 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-400 text-white text-sm font-bold transition-all shadow-lg shadow-blue-500/30 disabled:opacity-50">
                    {creating ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Create'}
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
    <div className="flex h-[100dvh] h-screen relative overflow-hidden" style={{ background: theme.gradient }}>
      {wallpaper && <div className="absolute inset-0 opacity-15 pointer-events-none"><img src={wallpaper} alt="" className="w-full h-full object-cover" /></div>}

      <div className="relative z-10 flex flex-col flex-1 min-w-0 min-h-0">
        {/* Header */}
        <div className={`${theme.headerBg} px-4 py-3 flex items-center gap-3 shrink-0`}>
          <button onClick={() => navigate('/groups-chat')} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
            <ArrowLeft className={`w-5 h-5 ${tc('text-gray-500', 'text-white/70')}`} />
          </button>
          <div className="flex items-center gap-3 flex-1">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white shadow-lg"><Users className="w-5 h-5" /></div>
            <div>
              <p className={`text-sm font-bold ${theme.textColor}`}>{currentGroup.name}</p>
              <p className={`text-[11px] ${tc('text-gray-400', 'text-white/50')}`}>{members.length} members</p>
            </div>
          </div>
          <button onClick={() => setShowMembers(!showMembers)} className={`p-2 rounded-lg transition-colors ${showMembers ? 'bg-white/20' : 'hover:bg-white/10'}`}>
            <Users className={`w-5 h-5 ${tc('text-gray-500', 'text-white/70')}`} />
          </button>
          <button onClick={() => setShowThemePicker(true)} className="p-2 rounded-lg hover:bg-white/10 transition-colors">
            <Palette className={`w-5 h-5 ${tc('text-gray-500', 'text-white/70')}`} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4" onClick={() => { if (showEmoji) setShowEmoji(false); }}>
          <div className="space-y-3">
            {messages.map((msg, idx) => {
              const isOwn = msg.senderUid === uid;
              const prevMsg = idx > 0 ? messages[idx - 1] : null;
              const showAvatar = !prevMsg || prevMsg.senderUid !== msg.senderUid;
              const senderName = msg.senderName || 'Unknown';
              const isMedia = msg.type && msg.type !== 'text';

              return (
                <div key={msg.id} className={`relative ${isOwn ? 'flex justify-end' : 'flex justify-start'}`} style={{ marginBottom: showAvatar ? 16 : 2 }}>
                  {!isOwn && (
                    <div className="flex-shrink-0 self-end" style={{ width: 40, marginRight: -8, zIndex: 2 }}>
                      {showAvatar ? <UserAvatar photo={msg.senderPhoto || null} name={senderName} size={40} ring={theme.avatarRing} /> : <div style={{ width: 40 }} />}
                    </div>
                  )}

                  <div className="relative max-w-[70%]">
                    {!isOwn && showAvatar && (
                      <p className={`text-[11px] font-bold ${theme.senderNameColor} mb-1 ml-3 uppercase tracking-wider`}>{senderName}</p>
                    )}

                    <div className={`relative ${isOwn ? theme.bubbleOwn : theme.bubbleReceived} ${isMedia ? 'px-2 py-2' : 'px-4 py-3'}`}>
                      {isMedia ? (
                        <MediaMessage type={msg.type!} mediaUrl={msg.mediaUrl} mediaType={msg.mediaType} fileName={msg.fileName} fileSize={msg.fileSize} contact={msg.contact} location={msg.location} isOwn={isOwn} />
                      ) : (
                        <TwemojiText className={`text-[13px] break-words leading-relaxed ${theme.textColor}`}>{msg.text}</TwemojiText>
                      )}
                      <p className={`text-[10px] mt-1 text-right ${theme.timestampColor}`}>{formatTime(msg.createdAt)}</p>
                    </div>
                  </div>

                  {isOwn && (
                    <div className="flex-shrink-0 self-end" style={{ width: 40, marginLeft: -8, zIndex: 2 }}>
                      {showAvatar ? <UserAvatar photo={user?.photoURL || null} name={user?.fullName || 'You'} size={40} ring={theme.avatarRing} /> : <div style={{ width: 40 }} />}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div ref={messagesEndRef} />
        </div>

        {/* Emoji Picker */}
        {showEmoji && (
          <div className="absolute bottom-[60px] left-0 right-0 z-30 px-3">
            <EmojiPicker onSelect={handleEmojiSelect} onClose={() => setShowEmoji(false)} />
          </div>
        )}

        {/* Input */}
        <div className={`${theme.inputBg} px-3 py-2 shrink-0 safe-area-bottom`}>
          <div className="flex items-center gap-2">
            <button onClick={() => { setShowEmoji(!showEmoji); setShowAttach(false); }} className={`p-2 rounded-full transition-colors ${showEmoji ? 'bg-white/20' : 'hover:bg-white/10'}`}>
              <Smile className={`w-5 h-5 ${tc('text-gray-400', 'text-white/60')}`} />
            </button>
            <button onClick={() => { setShowAttach(!showAttach); setShowEmoji(false); }} className={`p-2 rounded-full transition-colors ${showAttach ? 'bg-white/20' : 'hover:bg-white/10'}`}>
              <Paperclip className={`w-5 h-5 ${tc('text-gray-400', 'text-white/60')}`} />
            </button>
            <input
              ref={inputRef}
              type="text"
              value={newMessage}
              onChange={(e) => { setNewMessage(e.target.value); handleTyping(); }}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
              placeholder="Type a message..."
              className={`flex-1 ${theme.inputField} ${theme.textColor}`}
              disabled={sending}
            />
            <button onClick={handleSendMessage} disabled={!newMessage.trim() || sending} className={`p-2.5 ${theme.sendButton} disabled:opacity-50 disabled:cursor-not-allowed`}>
              {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Members Panel */}
      {showMembers && (
        <div className="relative z-10 w-64 backdrop-blur-xl bg-black/20 border-l border-white/10 overflow-y-auto shrink-0">
          <div className="p-4">
            <h3 className={`text-sm font-bold ${tc('text-gray-800', 'text-white/80')} mb-3`}>Members ({members.length})</h3>
            <div className="space-y-3">
              {members.map((member) => {
                const online = presenceMap[member.uid]?.online;
                return (
                  <div key={member.uid} className="flex items-center gap-3">
                    <div className="relative">
                      <UserAvatar photo={member.photoURL || null} name={member.name} size={36} ring={theme.avatarRing} />
                      {online && <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 ${theme.onlineIndicator} rounded-full border-2 border-[#1a2a6c]`} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <p className={`text-sm ${theme.textColor} truncate`}>{member.name}</p>
                        {member.role === 'admin' && <Crown className="w-3 h-3 text-yellow-400 flex-shrink-0" />}
                      </div>
                      <p className={`text-[11px] ${tc('text-gray-400', 'text-white/40')}`}>{online ? 'Online' : 'Offline'}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelected} />

      {/* Attachment menu */}
      {showAttach && <AttachmentMenu onSelect={handleAttachSelect} onClose={() => setShowAttach(false)} />}

      {/* Contact form */}
      {showContactForm && <ContactForm onSend={handleContactSend} onClose={() => setShowContactForm(false)} />}

      <ChatThemePicker open={showThemePicker} onClose={() => setShowThemePicker(false)} />
    </div>
  );
}
