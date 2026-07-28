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

export default function ChatScreen() {
  const { chatId } = useParams<{ chatId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const uid = user?.email || '';

  const [chats, setChats] = useState<ChatRoom[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [presenceMap, setPresenceMap] = useState<Record<string, Presence>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-2xl mx-auto p-4">
          <div className="flex items-center gap-3 mb-6">
            <MessageCircle className="w-6 h-6 text-primary-500" />
            <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Messages</h1>
          </div>
          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 text-primary-500 animate-spin" /></div>
          ) : chats.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
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
                    className="w-full bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex items-center gap-3 hover:border-primary-300 dark:hover:border-primary-600 transition-colors text-left"
                  >
                    <div className="relative flex-shrink-0">
                      {other.photo ? (
                        <img src={other.photo} alt="" className="w-12 h-12 rounded-full object-cover" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-primary-500 flex items-center justify-center text-white font-semibold">{other.name.charAt(0).toUpperCase()}</div>
                      )}
                      {online && <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-800" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center">
                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{other.name}</p>
                        {chat.lastMessageAt && <span className="text-xs text-gray-400">{timeAgo(chat.lastMessageAt)}</span>}
                      </div>
                      {chat.lastMessage && <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{chat.lastMessage}</p>}
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
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center gap-3 shrink-0">
        <button onClick={() => navigate('/chat')} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>
        {other && (
          <div className="flex items-center gap-3 flex-1">
            <div className="relative">
              {other.photo ? (
                <img src={other.photo} alt="" className="w-10 h-10 rounded-full object-cover" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-primary-500 flex items-center justify-center text-white font-semibold text-sm">{other.name.charAt(0).toUpperCase()}</div>
              )}
              {otherOnline && <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white dark:border-gray-800" />}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{other.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{otherOnline ? (otherTyping ? 'Typing...' : 'Online') : 'Offline'}</p>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg) => {
          const isOwn = msg.senderUid === uid;
          return (
            <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl ${isOwn ? 'bg-primary-600 text-white rounded-br-md' : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 border border-gray-200 dark:border-gray-700 rounded-bl-md'}`}>
                <p className="text-sm break-words">{msg.text}</p>
                <p className={`text-[10px] mt-1 ${isOwn ? 'text-primary-200' : 'text-gray-400'}`}>{formatTime(msg.createdAt)}</p>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-3 shrink-0">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={newMessage}
            onChange={(e) => { setNewMessage(e.target.value); handleTyping(); }}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
            placeholder="Type a message..."
            className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full px-4 py-2.5 text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:ring-2 focus:ring-primary-500"
            disabled={sending}
          />
          <button
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || sending}
            className="p-2.5 bg-primary-600 text-white rounded-full hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </div>
  );
}
