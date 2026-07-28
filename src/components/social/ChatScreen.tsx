import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useChatTheme } from '../../contexts/ChatThemeContext';
import {
  subscribeToUserChats,
  subscribeToChatMessages,
  sendChatMessage,
  markChatRead,
  subscribeToPresence,
  setTyping,
} from '../../services/socialService';
import type { ChatRoom, ChatMessage, Presence } from '../../types';
import { Send, ArrowLeft, MessageCircle, Loader2, Palette, Smile, Paperclip } from 'lucide-react';
import ChatThemePicker from './ChatThemePicker';
import EmojiPicker from './EmojiPicker';
import AttachmentMenu from './AttachmentMenu';
import ContactForm from './ContactForm';
import MediaMessage from './MediaMessage';
import TwemojiText from './TwemojiText';

function formatTime(dateStr: string): string {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function timeAgo(dateStr: string): string {
  if (!dateStr) return '';
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(dateStr).toLocaleDateString();
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

export default function ChatScreen() {
  const { chatId } = useParams<{ chatId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const uid = user?.uid || '';
  const { theme, wallpaper } = useChatTheme();
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showAttach, setShowAttach] = useState(false);
  const [showContactForm, setShowContactForm] = useState(false);

  const [chats, setChats] = useState<ChatRoom[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
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
    const unsub = subscribeToUserChats(uid, (list) => { setChats(list); setLoading(false); });
    return unsub;
  }, [uid]);

  useEffect(() => {
    if (!chatId || !uid) { setMessages([]); return; }
    const unsubMsgs = subscribeToChatMessages(chatId, (msgs) => setMessages(msgs));
    markChatRead(chatId, uid).catch(() => {});
    return unsubMsgs;
  }, [chatId, uid]);

  useEffect(() => {
    if (!chatId) return;
    const currentChat = chats.find((c) => c.id === chatId);
    if (!currentChat) return;
    const otherUids = currentChat.members.filter((m) => m !== uid);
    if (otherUids.length === 0) return;
    const unsub = subscribeToPresence(otherUids, (map) => setPresenceMap(map));
    return unsub;
  }, [chatId, chats, uid]);

  useEffect(() => { return () => { if (uid) setTyping(uid, null); }; }, [uid]);

  const handleTyping = useCallback(() => {
    if (!chatId || !uid) return;
    setTyping(uid, chatId);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => setTyping(uid, null), 2000);
  }, [chatId, uid]);

  const doSend = useCallback(async (text: string, media?: { type: string; mediaUrl: string; mediaType?: string; fileName?: string; fileSize?: number; contact?: { name: string; phone: string; email: string }; location?: { lat: number; lng: number; name: string } }) => {
    if (!chatId || !uid || sending) return;
    setSending(true);
    try {
      await sendChatMessage(chatId, { uid, name: user?.fullName || 'Student', photo: user?.photoURL || null }, text, media);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      setTyping(uid, null);
    } catch { } finally { setSending(false); }
  }, [chatId, uid, user, sending]);

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

  const handleSendText = () => { handleSendMessage(); };

  const getOtherInfo = (chat: ChatRoom) => {
    const other = chat.members.find((m) => m !== uid);
    return { uid: other || '', name: chat.memberNames?.[other || ''] || 'Unknown', photo: chat.memberPhotos?.[other || ''] || null };
  };

  if (!uid) return <div className="flex items-center justify-center h-full bg-gray-900 text-white">Please log in.</div>;

  // ── Chat List ──
  if (!chatId) {
    return (
      <div className="min-h-[100dvh] min-h-screen relative" style={{ background: theme.gradient }}>
        {wallpaper && <div className="fixed inset-0 opacity-20 pointer-events-none"><img src={wallpaper} alt="" className="w-full h-full object-cover" /></div>}
        <div className="relative max-w-2xl mx-auto p-4">
          <div className="flex items-center justify-between mb-6 pt-2">
            <div className="flex items-center gap-3">
              <MessageCircle className="w-6 h-6 text-white/80" />
              <h1 className="text-2xl font-bold text-white">Messages</h1>
            </div>
            <button onClick={() => setShowThemePicker(true)} className="p-2 bg-white/10 hover:bg-white/20 backdrop-blur border border-white/10 rounded-xl transition-all">
              <Palette className="w-5 h-5 text-white/70" />
            </button>
          </div>
          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 text-white/60 animate-spin" /></div>
          ) : chats.length === 0 ? (
            <div className="backdrop-blur-xl bg-white/10 rounded-2xl border border-white/10 p-12 text-center">
              <MessageCircle className="w-14 h-14 text-white/30 mx-auto mb-3" />
              <p className="text-white/50 text-sm font-medium">No conversations yet</p>
              <p className="text-white/30 text-xs mt-1">Start a chat from a friend's profile</p>
            </div>
          ) : (
            <div className="space-y-2">
              {chats.map((chat) => {
                const other = getOtherInfo(chat);
                const online = presenceMap[other.uid]?.online;
                return (
                  <button key={chat.id} onClick={() => navigate(`/chat/${chat.id}`)} className="w-full backdrop-blur-xl bg-white/10 rounded-2xl border border-white/10 p-4 flex items-center gap-4 hover:bg-white/20 transition-all text-left">
                    <div className="relative flex-shrink-0">
                      <UserAvatar photo={other.photo} name={other.name} size={52} ring={theme.avatarRing} />
                      {online && <span className={`absolute bottom-0.5 right-0.5 w-3.5 h-3.5 ${theme.onlineIndicator} rounded-full border-2 border-[#1a2a6c]`} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center">
                        <p className={`text-sm font-bold ${theme.textColor} truncate`}>{other.name}</p>
                        {chat.lastMessageAt && <span className={`text-[10px] ${theme.timestampColor}`}>{timeAgo(chat.lastMessageAt)}</span>}
                      </div>
                      {chat.lastMessage && <p className={`text-xs ${theme.textColor === 'text-white' ? 'text-white/50' : 'text-gray-400'} truncate mt-1`}>{chat.lastMessage}</p>}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <ChatThemePicker open={showThemePicker} onClose={() => setShowThemePicker(false)} />
      </div>
    );
  }

  // ── Chat View ──
  const currentChat = chats.find((c) => c.id === chatId);
  const other = currentChat ? getOtherInfo(currentChat) : null;
  const otherOnline = other ? presenceMap[other.uid]?.online : false;
  const otherTyping = other ? presenceMap[other.uid]?.typingIn === chatId : false;

  return (
    <div className="flex flex-col h-[100dvh] h-screen relative overflow-hidden" style={{ background: theme.gradient }}>
      {wallpaper && <div className="absolute inset-0 opacity-15 pointer-events-none"><img src={wallpaper} alt="" className="w-full h-full object-cover" /></div>}

      {/* Header */}
      <div className={`relative z-10 ${theme.headerBg} px-4 py-3 flex items-center gap-3 shrink-0`}>
        <button onClick={() => navigate('/chat')} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
          <ArrowLeft className={`w-5 h-5 ${theme.textColor === 'text-white' ? 'text-white/70' : 'text-gray-500'}`} />
        </button>
        {other && (
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="relative shrink-0">
              <UserAvatar photo={other.photo} name={other.name} size={40} ring={theme.avatarRing} />
              {otherOnline && <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 ${theme.onlineIndicator} rounded-full border-2 border-[#1a2a6c]`} />}
            </div>
            <div className="min-w-0">
              <p className={`text-sm font-bold ${theme.textColor} truncate`}>{other.name}</p>
              <p className={`text-[11px] ${theme.textColor === 'text-white' ? 'text-white/50' : 'text-gray-400'}`}>{otherOnline ? (otherTyping ? 'Typing...' : 'Online') : 'Offline'}</p>
            </div>
          </div>
        )}
        <button onClick={() => setShowThemePicker(true)} className="p-2 rounded-lg hover:bg-white/10 transition-colors shrink-0">
          <Palette className={`w-5 h-5 ${theme.textColor === 'text-white' ? 'text-white/70' : 'text-gray-500'}`} />
        </button>
      </div>

      {/* Messages */}
      <div className="relative z-10 flex-1 min-h-0 overflow-y-auto px-4 py-4" onClick={() => { if (showEmoji) setShowEmoji(false); }}>
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
                    {showAvatar ? <UserAvatar photo={other?.photo || null} name={senderName} size={40} ring={theme.avatarRing} /> : <div style={{ width: 40 }} />}
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
      <div className={`relative z-10 ${theme.inputBg} px-3 py-2 shrink-0 safe-area-bottom`}>
        <div className="flex items-center gap-2">
          <button onClick={() => { setShowEmoji(!showEmoji); setShowAttach(false); }} className={`p-2 rounded-full transition-colors ${showEmoji ? 'bg-white/20' : 'hover:bg-white/10'}`}>
            <Smile className={`w-5 h-5 ${theme.textColor === 'text-white' ? 'text-white/60' : 'text-gray-400'}`} />
          </button>
          <button onClick={() => { setShowAttach(!showAttach); setShowEmoji(false); }} className={`p-2 rounded-full transition-colors ${showAttach ? 'bg-white/20' : 'hover:bg-white/10'}`}>
            <Paperclip className={`w-5 h-5 ${theme.textColor === 'text-white' ? 'text-white/60' : 'text-gray-400'}`} />
          </button>
          <input
            ref={inputRef}
            type="text"
            value={newMessage}
            onChange={(e) => { setNewMessage(e.target.value); handleTyping(); }}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendText(); } }}
            placeholder="Type a message..."
            className={`flex-1 ${theme.inputField} ${theme.textColor}`}
            disabled={sending}
          />
          <button onClick={handleSendText} disabled={!newMessage.trim() || sending} className={`p-2.5 ${theme.sendButton} disabled:opacity-50 disabled:cursor-not-allowed`}>
            {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        </div>
      </div>

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
