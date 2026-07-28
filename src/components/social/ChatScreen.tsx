import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  subscribeToUserChats,
  subscribeToChatMessages,
  sendChatMessage,
  markChatRead,
  subscribeToPresence,
  setTyping,
} from '../../services/socialService';
import type { ChatRoom, ChatMessage, Presence } from '../../types';
import { Send, ArrowLeft, MessageCircle, Loader2 } from 'lucide-react';

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

function Avatar({ photo, name, size = 'w-10 h-10' }: { photo: string | null; name: string; size?: string }) {
  if (photo) {
    return <img src={photo} alt="" className={`${size} rounded-full object-cover ring-2 ring-white dark:ring-gray-800 shadow-md`} />;
  }
  return (
    <div className={`${size} rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold shadow-md ring-2 ring-white dark:ring-gray-800`}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

export default function ChatScreen() {
  const { chatId } = useParams<{ chatId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const uid = user?.uid || '';

  const [chats, setChats] = useState<ChatRoom[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [presenceMap, setPresenceMap] = useState<Record<string, Presence>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  useEffect(() => {
    return () => { if (uid) setTyping(uid, null); };
  }, [uid]);

  const handleTyping = useCallback(() => {
    if (!chatId || !uid) return;
    setTyping(uid, chatId);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => setTyping(uid, null), 2000);
  }, [chatId, uid]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !chatId || !uid || sending) return;
    const text = newMessage.trim();
    setNewMessage('');
    setSending(true);
    try {
      await sendChatMessage(chatId, { uid, name: user?.fullName || 'Student', photo: user?.photoURL || null }, text);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      setTyping(uid, null);
    } catch {
      setNewMessage(text);
    } finally {
      setSending(false);
    }
  };

  const getOtherInfo = (chat: ChatRoom) => {
    const other = chat.members.find((m) => m !== uid);
    return {
      uid: other || '',
      name: chat.memberNames?.[other || ''] || 'Unknown',
      photo: chat.memberPhotos?.[other || ''] || null,
    };
  };

  if (!uid) return <div className="flex items-center justify-center h-full bg-gray-100 dark:bg-gray-900 text-gray-500">Please log in.</div>;

  if (!chatId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 dark:from-gray-900 dark:to-gray-800">
        <div className="max-w-2xl mx-auto p-4">
          <div className="flex items-center gap-3 mb-6">
            <MessageCircle className="w-6 h-6 text-blue-500" />
            <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Messages</h1>
          </div>
          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 text-blue-500 animate-spin" /></div>
          ) : chats.length === 0 ? (
            <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur rounded-2xl border border-gray-200/50 dark:border-gray-700/50 p-12 text-center shadow-lg">
              <MessageCircle className="w-14 h-14 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">No conversations yet</p>
              <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">Start a chat from a friend's profile</p>
            </div>
          ) : (
            <div className="space-y-2">
              {chats.map((chat) => {
                const other = getOtherInfo(chat);
                const online = presenceMap[other.uid]?.online;
                return (
                  <button
                    key={chat.id}
                    onClick={() => navigate(`/chat/${chat.id}`)}
                    className="w-full bg-white/70 dark:bg-gray-800/70 backdrop-blur rounded-2xl border border-gray-200/50 dark:border-gray-700/50 p-4 flex items-center gap-4 hover:border-blue-300 dark:hover:border-blue-600 transition-all shadow-sm hover:shadow-md text-left"
                  >
                    <div className="relative flex-shrink-0">
                      <Avatar photo={other.photo} name={other.name} size="w-14 h-14" />
                      {online && <span className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white dark:border-gray-800" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center">
                        <p className="text-sm font-bold text-gray-800 dark:text-gray-100 truncate">{other.name}</p>
                        {chat.lastMessageAt && <span className="text-[10px] text-gray-400">{timeAgo(chat.lastMessageAt)}</span>}
                      </div>
                      {chat.lastMessage && <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">{chat.lastMessage}</p>}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  const currentChat = chats.find((c) => c.id === chatId);
  const other = currentChat ? getOtherInfo(currentChat) : null;
  const otherOnline = other ? presenceMap[other.uid]?.online : false;
  const otherTyping = other ? presenceMap[other.uid]?.typingIn === chatId : false;

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-blue-50 via-blue-100 to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur border-b border-gray-200/50 dark:border-gray-700/50 px-4 py-3 flex items-center gap-3 shrink-0 shadow-sm">
        <button onClick={() => navigate('/chat')} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>
        {other && (
          <div className="flex items-center gap-3 flex-1">
            <div className="relative">
              <Avatar photo={other.photo} name={other.name} size="w-10 h-10" />
              {otherOnline && <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white dark:border-gray-800" />}
            </div>
            <div>
              <p className="text-sm font-bold text-gray-800 dark:text-gray-100">{other.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{otherOnline ? (otherTyping ? 'Typing...' : 'Online') : 'Offline'}</p>
            </div>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
        {messages.map((msg, idx) => {
          const isOwn = msg.senderUid === uid;
          const prevMsg = idx > 0 ? messages[idx - 1] : null;
          const showSender = !isOwn && (!prevMsg || prevMsg.senderUid !== msg.senderUid);
          const senderName = msg.senderName || 'Unknown';

          return (
            <div key={msg.id} className={`flex items-end gap-2 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
              {/* Avatar */}
              <div className="flex-shrink-0 mb-1" style={{ width: 36, height: 36 }}>
                {(showSender || isOwn) ? (
                  <Avatar
                    photo={isOwn ? (user?.photoURL || null) : (other?.photo || null)}
                    name={isOwn ? (user?.fullName || 'You') : senderName}
                    size="w-9 h-9"
                  />
                ) : null}
              </div>

              {/* Bubble */}
              <div className={`max-w-[70%] group ${isOwn ? 'items-end' : 'items-start'}`}>
                {showSender && !isOwn && (
                  <p className="text-[11px] font-bold text-blue-500 dark:text-blue-400 mb-1 ml-4 uppercase tracking-wide">{senderName}</p>
                )}
                <div className={`relative px-4 py-3 shadow-sm ${
                  isOwn
                    ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl rounded-br-md'
                    : 'bg-white/80 dark:bg-gray-800/80 backdrop-blur text-gray-800 dark:text-gray-100 border border-gray-200/50 dark:border-gray-700/50 rounded-2xl rounded-bl-md'
                }`}>
                  <p className="text-sm break-words leading-relaxed">{msg.text}</p>
                  <p className={`text-[10px] mt-1.5 ${isOwn ? 'text-blue-200' : 'text-gray-400 dark:text-gray-500'} text-right`}>{formatTime(msg.createdAt)}</p>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur border-t border-gray-200/50 dark:border-gray-700/50 p-3 shrink-0">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => { setNewMessage(e.target.value); handleTyping(); }}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
            placeholder="Type a message..."
            className="flex-1 bg-gray-100 dark:bg-gray-700/50 rounded-full px-4 py-2.5 text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:ring-2 focus:ring-blue-500"
            disabled={sending}
          />
          <button
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || sending}
            className="p-2.5 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-full hover:from-blue-600 hover:to-blue-700 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </div>
  );
}
