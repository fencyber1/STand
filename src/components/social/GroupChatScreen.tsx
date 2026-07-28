import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  subscribeToUserGroups,
  subscribeToGroupMessages,
  sendGroupMessage,
  createChatGroup,
  addGroupMember,
  subscribeToFriends,
  subscribeToPresence,
  setTyping,
} from '../../services/socialService';
import type { ChatGroup, GroupMessage, Friend, Presence } from '../../types';
import { Send, ArrowLeft, Users, Plus, X, Loader2, Crown } from 'lucide-react';

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

export default function GroupChatScreen() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const uid = user?.email || '';

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

  const currentGroup = groups.find((g) => g.id === groupId);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !groupId || !uid || sending) return;
    const text = newMessage.trim();
    setNewMessage('');
    setSending(true);
    try {
      await sendGroupMessage(groupId, { uid, name: user?.fullName || 'Student', photo: user?.photoURL || null }, text);
    } catch {
      setNewMessage(text);
    } finally {
      setSending(false);
    }
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
    } finally {
      setCreating(false);
    }
  };

  if (!uid) return <div className="flex items-center justify-center h-full bg-gray-100 dark:bg-gray-900 text-gray-500">Please log in.</div>;

  if (!groupId) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-2xl mx-auto p-4">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Users className="w-6 h-6 text-primary-500" />
              <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Group Chats</h1>
            </div>
            <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors">
              <Plus className="w-4 h-4" /> New Group
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 text-primary-500 animate-spin" /></div>
          ) : groups.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
              <Users className="w-14 h-14 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">No groups yet</p>
              <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">Create a group to start chatting with friends</p>
            </div>
          ) : (
            <div className="space-y-2">
              {groups.map((group) => (
                <button key={group.id} onClick={() => navigate(`/groups-chat/${group.id}`)} className="w-full bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex items-center gap-3 hover:border-primary-300 dark:hover:border-primary-600 transition-colors text-left">
                  <div className="w-12 h-12 rounded-full bg-primary-500 flex items-center justify-center text-white flex-shrink-0">
                    <Users className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{group.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {group.lastMessage ? `${group.lastMessage}` : `${group.members.length} members`}
                    </p>
                  </div>
                  {group.lastMessageAt && <span className="text-xs text-gray-400 flex-shrink-0">{timeAgo(group.lastMessageAt)}</span>}
                </button>
              ))}
            </div>
          )}

          {showCreate && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowCreate(false)}>
              <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">Create Group</h3>
                  <button onClick={() => setShowCreate(false)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"><X className="w-5 h-5 text-gray-500" /></button>
                </div>
                <input type="text" value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="Group name" className="w-full bg-gray-100 dark:bg-gray-700 rounded-lg px-4 py-2.5 text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 outline-none focus:ring-2 focus:ring-primary-500 mb-4" autoFocus />
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Add friends ({selectedFriends.length} selected)</p>
                <div className="max-h-48 overflow-y-auto space-y-1 mb-4">
                  {friends.length === 0 ? <p className="text-xs text-gray-400">No friends to add</p> : friends.map((f) => (
                    <label key={f.uid} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">
                      <input type="checkbox" checked={selectedFriends.includes(f.uid)} onChange={() => setSelectedFriends((p) => p.includes(f.uid) ? p.filter((x) => x !== f.uid) : [...p, f.uid])} className="w-4 h-4 text-primary-600 rounded" />
                      <div className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">{f.displayName.charAt(0).toUpperCase()}</div>
                      <span className="text-sm text-gray-800 dark:text-gray-100">{f.displayName}</span>
                    </label>
                  ))}
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setShowCreate(false)} className="flex-1 py-2.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">Cancel</button>
                  <button onClick={handleCreateGroup} disabled={!groupName.trim() || selectedFriends.length === 0 || creating} className="flex-1 py-2.5 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors disabled:opacity-50">
                    {creating ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Create'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  const members = currentGroup?.members || [];

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center gap-3 shrink-0">
        <button onClick={() => navigate('/groups-chat')} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{currentGroup?.name || 'Group'}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{members.length} members</p>
        </div>
        <button onClick={() => setShowMembers(!showMembers)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
          <Users className="w-5 h-5 text-gray-500 dark:text-gray-400" />
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 flex flex-col">
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg) => {
              const isOwn = msg.senderUid === uid;
              return (
                <div key={msg.id} className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                  {!isOwn && <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 ml-1">{msg.senderName}</p>}
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
              <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }} placeholder="Type a message..." className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full px-4 py-2.5 text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 outline-none focus:ring-2 focus:ring-primary-500" disabled={sending} />
              <button onClick={handleSendMessage} disabled={!newMessage.trim() || sending} className="p-2.5 bg-primary-600 text-white rounded-full hover:bg-primary-700 transition-colors disabled:opacity-50">
                {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {showMembers && (
          <div className="w-64 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 overflow-y-auto shrink-0">
            <div className="p-4">
              <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100 mb-3">Members ({members.length})</h3>
              <div className="space-y-3">
                {members.map((member) => {
                  const online = presenceMap[member.uid]?.online;
                  return (
                    <div key={member.uid} className="flex items-center gap-3">
                      <div className="relative">
                        {member.photoURL ? (
                          <img src={member.photoURL} alt="" className="w-9 h-9 rounded-full object-cover" />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-primary-500 flex items-center justify-center text-white text-xs font-semibold">{member.name.charAt(0).toUpperCase()}</div>
                        )}
                        {online && <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white dark:border-gray-800" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <p className="text-sm text-gray-800 dark:text-gray-100 truncate">{member.name}</p>
                          {member.role === 'admin' && <Crown className="w-3 h-3 text-yellow-500 flex-shrink-0" />}
                        </div>
                        <p className="text-xs text-gray-400">{online ? 'Online' : 'Offline'}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
