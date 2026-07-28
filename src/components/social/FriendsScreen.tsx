import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  subscribeToFriends,
  subscribeToFriendRequests,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  removeFriend,
  searchUsers,
  getSuggestedUsers,
  subscribeToPresence,
  findOrCreateChatRoom,
} from '../../services/socialService';
import {
  UserPlus,
  Check,
  X,
  Search,
  MessageCircle,
  Users,
  Trash2,
  Clock,
  Wifi,
  WifiOff,
  Loader2,
} from 'lucide-react';

interface Friend {
  uid: string;
  displayName: string;
  photoURL: string | null;
  status: string;
  online: boolean;
  lastSeen: string;
}

interface FriendRequest {
  id: string;
  from: string;
  fromName: string;
  fromPhoto: string | null;
  to: string;
  toName: string;
  toPhoto: string | null;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
}

interface UserProfile {
  uid: string;
  displayName: string;
  photoURL: string | null;
  status?: string;
  online?: boolean;
  lastSeen?: string;
}

interface Presence {
  uid: string;
  online: boolean;
  lastSeen: string;
  typingIn: string | null;
}

type Tab = 'friends' | 'requests' | 'find';

export default function FriendsScreen() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const uid = user?.uid || '';

  const [activeTab, setActiveTab] = useState<Tab>('friends');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<FriendRequest[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [suggested, setSuggested] = useState<UserProfile[]>([]);
  const [searching, setSearching] = useState(false);
  const [presenceMap, setPresenceMap] = useState<Record<string, Presence>>({});
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  useEffect(() => {
    if (!uid) return;
    const unsubFriends = subscribeToFriends(uid, (list) => setFriends(list));
    const unsubRequests = subscribeToFriendRequests(uid, (requests) => {
      setIncomingRequests(requests.filter((r) => r.to === uid && r.status === 'pending'));
      setOutgoingRequests(requests.filter((r) => r.from === uid && r.status === 'pending'));
    });
    return () => {
      unsubFriends();
      unsubRequests();
    };
  }, [uid]);

  useEffect(() => {
    if (!uid || friends.length === 0) return;
    const friendUids = friends.map((f) => f.uid);
    const unsubPresence = subscribeToPresence(friendUids, (map) => setPresenceMap(map));
    return () => unsubPresence();
  }, [uid, friends]);

  useEffect(() => {
    if (!uid) return;
    getSuggestedUsers(uid, 10).then(setSuggested).catch(() => {});
  }, [uid, friends]);

  const handleSearch = useCallback(async () => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const results = await searchUsers(searchTerm.trim(), uid);
      setSearchResults(results);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, [searchTerm, uid]);

  const handleSendRequest = async (target: UserProfile) => {
    setLoadingAction(`send-${target.uid}`);
    try {
      await sendFriendRequest(
        { uid, name: user?.fullName || '', photo: user?.photoURL || null },
        { uid: target.uid, name: target.displayName, photo: target.photoURL }
      );
      setSearchResults((prev) => prev.filter((r) => r.uid !== target.uid));
    } finally {
      setLoadingAction(null);
    }
  };

  const handleAccept = async (requestId: string) => {
    setLoadingAction(`accept-${requestId}`);
    try {
      await acceptFriendRequest(requestId);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleReject = async (requestId: string) => {
    setLoadingAction(`reject-${requestId}`);
    try {
      await rejectFriendRequest(requestId);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleRemove = async (friendUid: string) => {
    setLoadingAction(`remove-${friendUid}`);
    try {
      await removeFriend(uid, friendUid);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleMessage = async (friendUid: string, friendName: string, friendPhoto: string | null) => {
    setLoadingAction(`msg-${friendUid}`);
    try {
      const chatId = await findOrCreateChatRoom(
        uid, friendUid,
        { name: user?.fullName || '', photo: user?.photoURL || null },
        { name: friendName, photo: friendPhoto }
      );
      navigate(`/chat/${chatId}`);
    } finally {
      setLoadingAction(null);
    }
  };

  const getAvatar = (photoURL: string | null, name: string) => {
    if (photoURL) {
      return <img src={photoURL} alt="" className="w-10 h-10 rounded-full object-cover" />;
    }
    return (
      <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center text-white text-sm font-semibold">
        {name.charAt(0).toUpperCase()}
      </div>
    );
  };

  const isOnline = (friendUid: string) => presenceMap[friendUid]?.online ?? false;

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: 'friends', label: 'Friends', count: friends.length },
    { key: 'requests', label: 'Requests', count: incomingRequests.length },
    { key: 'find', label: 'Find' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Users className="w-6 h-6 text-indigo-500" />
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Friends</h1>
      </div>

      <div className="flex gap-1 mb-4 bg-gray-200 dark:bg-gray-700 rounded-xl p-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className="ml-1.5 bg-indigo-500 text-white text-xs rounded-full px-1.5 py-0.5">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {activeTab === 'friends' && (
        <div className="space-y-2">
          {friends.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center">
              <Users className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                No friends yet. Go to the Find tab to add some!
              </p>
            </div>
          ) : (
            friends.map((friend) => (
              <div
                key={friend.uid}
                className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 flex items-center gap-3"
              >
                <div className="relative flex-shrink-0">
                  {getAvatar(friend.photoURL, friend.displayName)}
                  {isOnline(friend.uid) && (
                    <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-800" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">
                      {friend.displayName}
                    </p>
                    {isOnline(friend.uid) ? (
                      <Wifi className="w-3 h-3 text-green-500 flex-shrink-0" />
                    ) : (
                      <WifiOff className="w-3 h-3 text-gray-400 flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {friend.status || 'No status'}
                  </p>
                </div>
                <div className="flex gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => handleMessage(friend.uid, friend.displayName, friend.photoURL)}
                    disabled={loadingAction === `msg-${friend.uid}`}
                    className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors disabled:opacity-50"
                    title="Message"
                  >
                    {loadingAction === `msg-${friend.uid}` ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <MessageCircle className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => handleRemove(friend.uid)}
                    disabled={loadingAction === `remove-${friend.uid}`}
                    className="p-2 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors disabled:opacity-50"
                    title="Remove friend"
                  >
                    {loadingAction === `remove-${friend.uid}` ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'requests' && (
        <div className="space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2 px-1">
              Incoming Requests
            </h2>
            {incomingRequests.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 text-center">
                <UserPlus className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                <p className="text-gray-500 dark:text-gray-400 text-sm">No incoming requests</p>
              </div>
            ) : (
              <div className="space-y-2">
                {incomingRequests.map((req) => (
                  <div
                    key={req.id}
                    className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 flex items-center gap-3"
                  >
                    <div className="flex-shrink-0">
                      {getAvatar(req.fromPhoto, req.fromName)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">
                        {req.fromName}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Wants to be your friend</p>
                    </div>
                    <div className="flex gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => handleAccept(req.id)}
                        disabled={loadingAction === `accept-${req.id}`}
                        className="p-2 rounded-lg bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors disabled:opacity-50"
                        title="Accept"
                      >
                        {loadingAction === `accept-${req.id}` ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Check className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => handleReject(req.id)}
                        disabled={loadingAction === `reject-${req.id}`}
                        className="p-2 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors disabled:opacity-50"
                        title="Reject"
                      >
                        {loadingAction === `reject-${req.id}` ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <X className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h2 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2 px-1">
              Outgoing Requests
            </h2>
            {outgoingRequests.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 text-center">
                <Clock className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                <p className="text-gray-500 dark:text-gray-400 text-sm">No pending requests</p>
              </div>
            ) : (
              <div className="space-y-2">
                {outgoingRequests.map((req) => (
                  <div
                    key={req.id}
                    className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 flex items-center gap-3"
                  >
                    <div className="flex-shrink-0">
                      {getAvatar(req.toPhoto, req.toName)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">
                        {req.toName}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Request pending
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'find' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 flex items-center gap-2">
            <Search className="w-5 h-5 text-gray-400 flex-shrink-0" />
            <input
              type="text"
              placeholder="Search users by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1 bg-transparent text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 outline-none"
            />
            <button
              onClick={handleSearch}
              disabled={searching || !searchTerm.trim()}
              className="px-3 py-1.5 rounded-lg bg-indigo-500 text-white text-sm font-medium hover:bg-indigo-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
            </button>
          </div>

          <div className="space-y-2">
            {searchResults.length === 0 && !searching && searchTerm.trim() && (
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 px-1">No results for "{searchTerm}"</p>
                {suggested.length > 0 && (
                  <>
                    <p className="text-xs font-medium text-indigo-500 dark:text-indigo-400 mb-2 px-1">Suggested friends</p>
                    {suggested.map((profile) => (
                      <div key={profile.uid} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 flex items-center gap-3 mb-2">
                        <div className="flex-shrink-0">{getAvatar(profile.photoURL, profile.displayName)}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{profile.displayName}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{profile.status || 'No status'}</p>
                        </div>
                        <button onClick={() => handleSendRequest(profile)} disabled={loadingAction === `send-${profile.uid}`} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500 text-white text-xs font-medium hover:bg-indigo-600 transition-colors disabled:opacity-50 flex-shrink-0">
                          {loadingAction === `send-${profile.uid}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
                          Add
                        </button>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}

            {!searchTerm.trim() && (
              <div>
                {suggested.length === 0 ? (
                  <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 text-center">
                    <UserPlus className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                    <p className="text-gray-500 dark:text-gray-400 text-sm">Search for users to add as friends</p>
                  </div>
                ) : (
                  <>
                    <p className="text-xs font-medium text-indigo-500 dark:text-indigo-400 mb-2 px-1">Suggested friends</p>
                    {suggested.map((profile) => (
                      <div key={profile.uid} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 flex items-center gap-3 mb-2">
                        <div className="flex-shrink-0">{getAvatar(profile.photoURL, profile.displayName)}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{profile.displayName}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{profile.status || 'No status'}</p>
                        </div>
                        <button onClick={() => handleSendRequest(profile)} disabled={loadingAction === `send-${profile.uid}`} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500 text-white text-xs font-medium hover:bg-indigo-600 transition-colors disabled:opacity-50 flex-shrink-0">
                          {loadingAction === `send-${profile.uid}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
                          Add
                        </button>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}

            {searchResults.map((profile) => (
              <div
                key={profile.uid}
                className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 flex items-center gap-3"
              >
                <div className="flex-shrink-0">
                  {getAvatar(profile.photoURL, profile.displayName)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">
                    {profile.displayName}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{profile.status || 'No status'}</p>
                </div>
                <button
                  onClick={() => handleSendRequest(profile)}
                  disabled={loadingAction === `send-${profile.uid}`}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500 text-white text-xs font-medium hover:bg-indigo-600 transition-colors disabled:opacity-50 flex-shrink-0"
                >
                  {loadingAction === `send-${profile.uid}` ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <UserPlus className="w-3.5 h-3.5" />
                  )}
                  Add
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
