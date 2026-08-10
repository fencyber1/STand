import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Swords, Users, Trophy, Zap, Crown, Clock, Target,
  Flame, Timer, Award, TrendingUp, Play, Search, Plus,
  X, LogIn, UserCheck, AlertCircle, Eye, ChevronRight, Loader2,
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import BorderGlow from '../ui/BorderGlow';
import { SECTORS } from '../../constants';
import {
  subscribeToActiveGames,
  getAllGameModes,
  createGameRoom,
  joinGameRoom,
  joinByCode,
  getPlayerStats,
} from '../../services/multiplayer/multiplayerService';
import { subscribeToUserRanking, getRankIcon, getRankColor } from '../../services/rankingService';
import type { GameRoom, GameMode, PlayerStats, UserRanking } from '../../types';

export default function MultiplayerArena() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user } = useAuth();
  const [activeGames, setActiveGames] = useState<GameRoom[]>([]);
  const [playerStats, setPlayerStats] = useState<PlayerStats | null>(null);
  const [userRanking, setUserRanking] = useState<UserRanking | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoinCode, setShowJoinCode] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [lastMode, setLastMode] = useState<GameMode>('1v1');
  const [debug, setDebug] = useState('');
  const [selectedRoom, setSelectedRoom] = useState<GameRoom | null>(null);
  const [joining, setJoining] = useState(false);
  const [joinModalError, setJoinModalError] = useState('');
  const [hostLevels, setHostLevels] = useState<Record<string, number>>({});
  const [selectedMode, setSelectedMode] = useState<GameMode | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [specificTopic, setSpecificTopic] = useState('');

const MODE_COLORS: Record<string, { gradient: string; glow: string; glowColor: string; colors: string[]; text: string }> = {
  '1v1':      { gradient: 'from-red-500 to-red-600', glow: 'shadow-red-500/25', glowColor: '0 80 65', text: 'text-red-400', colors: ['#ef4444', '#f87171', '#dc2626'] },
  'team':     { gradient: 'from-blue-500 to-blue-600', glow: 'shadow-blue-500/25', glowColor: '220 80 65', text: 'text-blue-400', colors: ['#3b82f6', '#60a5fa', '#2563eb'] },
  'tournament': { gradient: 'from-yellow-500 to-amber-600', glow: 'shadow-yellow-500/25', glowColor: '45 90 60', text: 'text-yellow-400', colors: ['#f59e0b', '#fbbf24', '#f97316'] },
  'blitz':    { gradient: 'from-purple-500 to-purple-600', glow: 'shadow-purple-500/25', glowColor: '270 80 65', text: 'text-purple-400', colors: ['#a855f7', '#c084fc', '#7c3aed'] },
  'marathon': { gradient: 'from-green-500 to-emerald-600', glow: 'shadow-green-500/25', glowColor: '142 80 65', text: 'text-green-400', colors: ['#22c55e', '#4ade80', '#16a34a'] },
  'survival': { gradient: 'from-orange-500 to-red-600', glow: 'shadow-orange-500/25', glowColor: '25 85 60', text: 'text-orange-400', colors: ['#f97316', '#fb923c', '#ef4444'] },
  'speedrun': { gradient: 'from-cyan-500 to-sky-600', glow: 'shadow-cyan-500/25', glowColor: '190 90 55', text: 'text-cyan-400', colors: ['#06b6d4', '#22d3ee', '#0ea5e9'] },
};

  const gameModes = getAllGameModes();

  useEffect(() => {
    if (!activeGames.length) return;
    const fetchHostLevels = async () => {
      const levels: Record<string, number> = {};
      for (const game of activeGames) {
        if (game.host && !levels[game.host]) {
          try {
            const { getDoc, doc } = await import('firebase/firestore');
            const { db: firestoreDb } = await import('../../services/firebase');
            const snap = await getDoc(doc(firestoreDb, 'rankings', game.host));
            if (snap.exists()) {
              levels[game.host] = snap.data().level || 1;
            }
          } catch {}
        }
      }
      setHostLevels(levels);
    };
    fetchHostLevels();
  }, [activeGames]);

  useEffect(() => {
    const unsub = subscribeToActiveGames((rooms) => {
      console.log('[MP] Active games received:', rooms.length);
      setActiveGames(rooms);
      setDebug(`Last update: ${new Date().toLocaleTimeString()} | Games: ${rooms.length}`);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user?.uid) return;
    getPlayerStats(user.uid).then(setPlayerStats);
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) return;
    const unsub = subscribeToUserRanking(user.uid, setUserRanking);
    return () => unsub();
  }, [user?.uid]);

  const handleCreateGame = async (mode: GameMode) => {
    if (!user) {
      setCreateError('Please log in to create a game room');
      return;
    }
    setLastMode(mode);
    setSelectedMode(mode);
    setSelectedSubject('');
    setSpecificTopic('');
  };

  const handleConfirmCreate = async () => {
    if (!user || !selectedMode) return;
    setCreating(true);
    setCreateError('');
    try {
      const subject = selectedSubject || 'General Knowledge';
      const topic = specificTopic.trim() || subject;
      console.log('[MP] Creating room with mode:', selectedMode, 'subject:', subject, 'topic:', topic);
      const roomId = await createGameRoom({
        host: { uid: user.uid, name: user.fullName || 'Player', photo: user.photoURL },
        mode: selectedMode,
        subject,
        topic,
        difficulty: 'mixed',
        isPrivate: selectedMode === '1v1',
      });
      console.log('[MP] Room created:', roomId);
      if (roomId) {
        setSelectedMode(null);
        setSelectedSubject('');
        setSpecificTopic('');
        console.log('[MP] Navigating to:', `/multiplayer/${roomId}`);
        navigate(`/multiplayer/${roomId}`);
        setTimeout(() => {
          if (window.location.pathname === '/multiplayer') {
            console.log('[MP] Navigation failed, using href fallback');
            window.location.href = `/multiplayer/${roomId}`;
          }
        }, 1000);
      } else {
        setCreateError('Failed to create room. Please try again.');
      }
    } catch (e: any) {
      console.error('[MP] Create room error:', e);
      setCreateError(e.message || 'Failed to create room');
    } finally {
      setCreating(false);
    }
  };

  const handleJoinWithCode = async () => {
    if (!user || !joinCode.trim()) return;
    setJoinError('');
    const result = await joinByCode(joinCode.trim().toUpperCase(), {
      uid: user.uid,
      name: user.fullName || 'Player',
      photo: user.photoURL,
    });
    if (result.success && result.roomId) {
      navigate(`/multiplayer/${result.roomId}`);
    } else {
      setJoinError(result.error || 'Failed to join');
    }
  };

  const handleJoinRoom = async () => {
    if (!user || !selectedRoom) return;
    setJoining(true);
    setJoinModalError('');
    try {
      const result = await joinGameRoom(selectedRoom.id, {
        uid: user.uid,
        name: user.fullName || 'Player',
        photo: user.photoURL,
      });
      if (result.success) {
        navigate(`/multiplayer/${selectedRoom.id}`);
      } else {
        setJoinModalError(result.error || 'Failed to join room');
      }
    } catch (e: any) {
      setJoinModalError(e.message || 'Failed to join room');
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="min-h-screen px-4 py-4 pb-24 lg:pb-6 max-w-2xl mx-auto" style={{ background: '#0e1627' }}>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-white">Multiplayer Arena</h1>
        <button onClick={() => navigate(-1)} className="text-gray-400 text-sm">
          {t('Back')}
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <BorderGlow backgroundColor="#141e35" borderRadius={14} glowColor="220 60 60" glowRadius={16} glowIntensity={0.7} edgeSensitivity={28} colors={['#6366f1', '#818cf8', '#4f46e5']}>
          <div className="p-3 text-center">
            <div className="text-xl font-bold text-white">{playerStats?.matchesPlayed || 0}</div>
            <div className="text-xs text-gray-400">Matches</div>
          </div>
        </BorderGlow>
        <BorderGlow backgroundColor="#141e35" borderRadius={14} glowColor="142 80 60" glowRadius={16} glowIntensity={0.7} edgeSensitivity={28} colors={['#22c55e', '#4ade80', '#16a34a']}>
          <div className="p-3 text-center">
            <div className="text-xl font-bold text-green-400">{playerStats?.wins || 0}</div>
            <div className="text-xs text-gray-400">Wins</div>
          </div>
        </BorderGlow>
        <BorderGlow backgroundColor="#141e35" borderRadius={14} glowColor="270 80 60" glowRadius={16} glowIntensity={0.7} edgeSensitivity={28} colors={['#a855f7', '#c084fc', '#7c3aed']}>
          <div className="p-3 text-center">
            <div className="text-xl font-bold text-purple-400">{playerStats?.winRate || 0}%</div>
            <div className="text-xs text-gray-400">Win Rate</div>
          </div>
        </BorderGlow>
      </div>

      {creating && (
        <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-blue-400">Creating room...</span>
        </div>
      )}

      {createError && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
          <span className="text-sm text-red-400">{createError}</span>
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => setCreateError('')}
              className="text-xs px-2 py-1 bg-white/10 text-gray-300 rounded"
            >
              Dismiss
            </button>
            <button
              onClick={() => handleCreateGame(lastMode)}
              className="text-xs px-2 py-1 bg-violet-600 text-white rounded"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      <div className="mb-6">
        <h3 className="font-semibold text-white mb-3">Quick Play</h3>
        <div className="grid grid-cols-2 gap-3">
          {gameModes.map(({ mode, label, icon, description, questions, time, xpReward }) => {
            const colors = MODE_COLORS[mode] || MODE_COLORS['1v1'];
            return (
              <BorderGlow key={mode} backgroundColor="#141e35" borderRadius={16} glowColor={colors.glowColor} glowRadius={20}
                glowIntensity={0.8} edgeSensitivity={35} colors={colors.colors}>
                <button
                  onClick={() => handleCreateGame(mode)}
                  disabled={creating}
                  className="relative group p-4 overflow-hidden block w-full text-left disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${colors.gradient} opacity-[0.06] group-hover:opacity-[0.12] transition-opacity`} />
                  <div className="relative">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colors.gradient} flex items-center justify-center mb-3 shadow-lg ${colors.glow}`}>
                      <span className="text-white text-lg leading-none">{icon}</span>
                    </div>
                    <p className={`font-semibold text-sm ${colors.text}`}>{label}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{description}</p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                      <span>{questions}Q</span>
                      <span>{time}s</span>
                      <span className={`font-bold ${colors.text}`}>+{xpReward} XP</span>
                    </div>
                  </div>
                  <ChevronRight size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 group-hover:text-gray-400 transition-colors" />
                </button>
              </BorderGlow>
            );
          })}
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => { setShowJoinCode(true); setShowCreate(false); setJoinError(''); }}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm font-medium text-white hover:border-violet-400/40 transition"
        >
          <Search size={16} /> Join with Code
        </button>
        <button
          onClick={() => { setShowCreate(true); setShowJoinCode(false); }}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 transition"
        >
          <Plus size={16} /> Create Room
        </button>
      </div>

      {showJoinCode && (
        <BorderGlow backgroundColor="#141e35" borderRadius={16} glowColor="220 60 60" glowRadius={20} glowIntensity={0.7} edgeSensitivity={30} colors={['#6366f1', '#818cf8', '#4f46e5']}>
          <div className="p-4 mb-6">
            <h3 className="font-semibold text-white mb-3">Enter Room Code</h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="ABC123"
                maxLength={6}
                className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-center text-lg font-mono tracking-widest text-white placeholder-gray-500 focus:outline-none focus:border-violet-500"
              />
              <button
                onClick={handleJoinWithCode}
                className="px-4 py-2 bg-violet-600 text-white rounded-lg font-medium hover:bg-violet-700 transition"
              >
                Join
              </button>
            </div>
            {joinError && <p className="text-red-400 text-xs mt-2">{joinError}</p>}
          </div>
        </BorderGlow>
      )}

      {showCreate && (
        <div className="mb-6">
          <h3 className="font-semibold text-white mb-3">Create Game Room</h3>
          {!selectedMode ? (
            <div className="space-y-3">
              {gameModes.map(({ mode, label, icon, questions, time, maxPlayers, xpReward }) => {
                const colors = MODE_COLORS[mode] || MODE_COLORS['1v1'];
                return (
                  <BorderGlow key={mode} backgroundColor="#141e35" borderRadius={16} glowColor={colors.glowColor} glowRadius={20}
                    glowIntensity={0.8} edgeSensitivity={35} colors={colors.colors}>
                    <button
                      onClick={() => handleCreateGame(mode)}
                      className="relative group w-full flex items-center justify-between p-4 overflow-hidden text-left"
                    >
                      <div className={`absolute inset-0 bg-gradient-to-br ${colors.gradient} opacity-[0.06] group-hover:opacity-[0.12] transition-opacity`} />
                      <div className="relative flex items-center gap-3">
                        <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${colors.gradient} flex items-center justify-center shrink-0 shadow-lg ${colors.glow}`}>
                          <span className="text-white text-lg leading-none">{icon}</span>
                        </div>
                        <div>
                          <div className={`font-semibold text-sm ${colors.text}`}>{label}</div>
                          <div className="text-xs text-gray-400 mt-0.5">{questions} questions, {time}s each, {maxPlayers} players</div>
                        </div>
                      </div>
                      <div className="relative flex items-center gap-1">
                        <span className={`text-xs font-bold ${colors.text}`}>+{xpReward} XP</span>
                        <ChevronRight size={14} className="text-gray-600 group-hover:text-gray-400 transition-colors" />
                      </div>
                    </button>
                  </BorderGlow>
                );
              })}
            </div>
          ) : (
            <BorderGlow backgroundColor="#141e35" borderRadius={16} glowColor="270 80 60" glowRadius={20} glowIntensity={0.8} edgeSensitivity={35} colors={['#a855f7', '#c084fc', '#7c3aed']}>
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <button onClick={() => setSelectedMode(null)} className="text-gray-400 hover:text-white text-sm flex items-center gap-1">← Back</button>
                  <span className="text-xs text-gray-400">{MODE_COLORS[selectedMode]?.text && <span className={MODE_COLORS[selectedMode].text}>{gameModes.find(m => m.mode === selectedMode)?.label}</span>}</span>
                </div>
                <p className="text-xs text-gray-400 mb-2">Select a subject:</p>
                <div className="flex flex-wrap gap-2 mb-4">
                  <button onClick={() => setSelectedSubject('General Knowledge')} className={`px-3 py-1.5 text-xs rounded-full font-medium transition ${selectedSubject === 'General Knowledge' ? 'bg-violet-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>General Knowledge</button>
                  {SECTORS.filter(s => s !== 'Other').map((s) => (
                    <button key={s} onClick={() => setSelectedSubject(s)} className={`px-3 py-1.5 text-xs rounded-full font-medium transition ${selectedSubject === s ? 'bg-violet-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>{s}</button>
                  ))}
                </div>
                {selectedSubject && selectedSubject !== 'General Knowledge' && (
                  <div className="mb-4">
                    <label className="block text-xs text-gray-400 mb-1">Specific topic (optional)</label>
                    <input type="text" value={specificTopic} onChange={(e) => setSpecificTopic(e.target.value)} placeholder={`e.g. Photosynthesis, Newton's Laws...`} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-white/30 outline-none focus:border-violet-500 transition" />
                    <p className="text-[10px] text-gray-500 mt-1">Leave empty for general {selectedSubject} questions</p>
                  </div>
                )}
                <button onClick={handleConfirmCreate} disabled={!selectedSubject || creating} className="w-full py-2.5 bg-violet-600 text-white rounded-lg font-semibold text-sm hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center justify-center gap-2">
                  {creating ? <><Loader2 size={16} className="animate-spin" /> Creating...</> : 'Create Room'}
                </button>
              </div>
            </BorderGlow>
          )}
        </div>
      )}

<div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-white">Active Games</h3>
          <button onClick={() => { setActiveGames([]); setDebug('Refreshing...'); }} className="text-xs text-violet-400 hover:text-violet-300">Refresh</button>
        </div>
        {debug && <p className="text-xs text-gray-500 mb-2">{debug}</p>}
        {activeGames.length === 0 ? (
          <BorderGlow backgroundColor="#141e35" borderRadius={16} glowColor="220 60 65" glowRadius={20} glowIntensity={0.6} edgeSensitivity={30} colors={['#6366f1', '#818cf8', '#4f46e5']}>
            <div className="p-8 text-center">
              <Swords size={32} className="mx-auto mb-2 text-gray-600" />
              <p className="text-gray-500 text-sm">No active games. Create one!</p>
            </div>
          </BorderGlow>
        ) : (
           <div className="space-y-3">
             {activeGames.slice(0, 10).map((game) => {
               const isFull = game.players.length >= game.maxPlayers;
               const isLive = game.status === 'in_progress' || game.status === 'finished';
               const spectatorCount = game.spectators?.length || 0;
               const hostLevel = hostLevels[game.host] || 1;
               const colors = MODE_COLORS[game.mode] || MODE_COLORS['1v1'];

               return (
                 <BorderGlow key={game.id} backgroundColor="#141e35" borderRadius={16} glowColor={colors.glowColor} glowRadius={18}
                   glowIntensity={0.75} edgeSensitivity={30} colors={colors.colors}>
                   <button
                     onClick={() => { setSelectedRoom(game); setJoinModalError(''); }}
                     className="relative group w-full flex items-center justify-between p-4 overflow-hidden text-left"
                   >
                     <div className={`absolute inset-0 bg-gradient-to-br ${colors.gradient} opacity-[0.05] group-hover:opacity-[0.1] transition-opacity`} />
                     <div className="relative flex items-center gap-3 min-w-0">
                       <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colors.gradient} flex items-center justify-center shrink-0 shadow-lg ${colors.glow}`}>
                         {isLive ? <Zap size={18} className="text-white" /> : <Swords size={18} className="text-white" />}
                       </div>
                       <div className="min-w-0">
                         <div className="flex items-center gap-1.5">
                           <span
                             className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] shrink-0"
                             style={{ backgroundColor: getRankColor(hostLevel), border: '1px solid white' }}
                           >
                             {getRankIcon(hostLevel)}
                           </span>
                           <span className="font-medium text-white text-sm truncate">
                             {game.hostName}'s Game
                             {isLive && <span className="ml-1 text-xs text-yellow-400">● LIVE</span>}
                           </span>
                         </div>
                         <div className="text-xs text-gray-400 mt-0.5">
                           <span className="capitalize">{game.mode}</span> • {game.players.length}/{game.maxPlayers} players
                           {spectatorCount > 0 && <span className="ml-1 text-purple-400">• {spectatorCount} watching</span>}
                         </div>
                       </div>
                     </div>
                     <div className={`relative flex items-center gap-1 shrink-0 text-xs font-medium ${game.status === 'waiting' ? (isFull ? 'text-amber-400' : 'text-green-400') : game.status === 'in_progress' ? 'text-yellow-400' : 'text-gray-500'}`}>
                       {game.status === 'waiting' ? (isFull ? 'Full' : 'Waiting') : game.status === 'in_progress' ? 'In Progress' : 'Finished'}
                     </div>
                   </button>
                 </BorderGlow>
               );
             })}
         </div>
        )}
      </div>

      {selectedRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4" onClick={() => setSelectedRoom(null)}>
          <BorderGlow backgroundColor="#141e35" borderRadius={16} glowColor={(() => { const c = MODE_COLORS[selectedRoom.mode] || MODE_COLORS['1v1']; return c.glowColor; })()} glowRadius={25} glowIntensity={0.9} edgeSensitivity={35} colors={(() => { const c = MODE_COLORS[selectedRoom.mode] || MODE_COLORS['1v1']; return c.colors; })()}>
          <div className="p-6 w-full max-w-sm shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Game Room</h3>
              <button onClick={() => setSelectedRoom(null)} className="text-gray-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3 mb-5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Host</span>
                <span className="text-sm font-medium text-white">{selectedRoom.hostName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Mode</span>
                <span className={`text-sm font-medium capitalize ${(() => { const c = MODE_COLORS[selectedRoom.mode] || MODE_COLORS['1v1']; return c.text; })()}`}>{selectedRoom.mode}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Players</span>
                <span className="text-sm font-medium text-white">{selectedRoom.players.length}/{selectedRoom.maxPlayers}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Status</span>
                <span className={`text-sm font-medium ${selectedRoom.status === 'waiting' ? 'text-green-400' : 'text-yellow-400'}`}>
                  {selectedRoom.status === 'waiting' ? 'Waiting' : 'In Progress'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Subject</span>
                <span className="text-sm font-medium text-white">{selectedRoom.subject}</span>
              </div>
              {selectedRoom.roomCode && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Room Code</span>
                  <span className="text-sm font-mono font-bold text-violet-400">{selectedRoom.roomCode}</span>
                </div>
              )}
            </div>

            {joinModalError && (
              <div className="mb-3 p-2 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2">
                <AlertCircle size={14} className="text-red-400 shrink-0" />
                <span className="text-xs text-red-400">{joinModalError}</span>
              </div>
            )}

            {selectedRoom.host === user?.uid ? (
              <div className="space-y-2">
                <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-center gap-2">
                  <UserCheck size={14} className="text-blue-400 shrink-0" />
                  <span className="text-xs text-blue-300">This is your room (host)</span>
                </div>
                <button
                  onClick={() => navigate(`/multiplayer/${selectedRoom.id}`)}
                  className="w-full py-2.5 bg-violet-600 text-white rounded-lg font-semibold text-sm hover:bg-violet-700 transition flex items-center justify-center gap-2"
                >
                  <Play size={16} /> Enter Room
                </button>
              </div>
            ) : selectedRoom.players.some((p) => p.uid === user?.uid) ? (
              <div className="space-y-2">
                <div className="p-2 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center gap-2">
                  <UserCheck size={14} className="text-green-400 shrink-0" />
                  <span className="text-xs text-green-300">You're already in this room</span>
                </div>
                <button
                  onClick={() => navigate(`/multiplayer/${selectedRoom.id}`)}
                  className="w-full py-2.5 bg-violet-600 text-white rounded-lg font-semibold text-sm hover:bg-violet-700 transition flex items-center justify-center gap-2"
                >
                  <Play size={16} /> Enter Room
                </button>
              </div>
            ) : selectedRoom.status === 'waiting' && selectedRoom.players.length >= selectedRoom.maxPlayers ? (
              <div className="space-y-2">
                <div className="p-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg flex items-center gap-2">
                  <AlertCircle size={14} className="text-yellow-400 shrink-0" />
                  <span className="text-xs text-yellow-300">Room is full — Spectate instead!</span>
                </div>
                <button
                  onClick={() => navigate(`/multiplayer/${selectedRoom.id}?spectate=true`)}
                  className="w-full py-2.5 bg-purple-600 text-white rounded-lg font-semibold text-sm hover:bg-purple-700 transition flex items-center justify-center gap-2"
                >
                  <Eye size={16} /> SPECTATE
                </button>
              </div>
            ) : selectedRoom.status !== 'waiting' ? (
              <div className="space-y-2">
                <div className="p-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg flex items-center gap-2">
                  <AlertCircle size={14} className="text-yellow-400 shrink-0" />
                  <span className="text-xs text-yellow-300">Game in progress — Watch live!</span>
                </div>
                <button
                  onClick={() => navigate(`/multiplayer/${selectedRoom.id}?spectate=true`)}
                  className="w-full py-2.5 bg-purple-600 text-white rounded-lg font-semibold text-sm hover:bg-purple-700 transition flex items-center justify-center gap-2"
                >
                  <Eye size={16} /> SPECTATE LIVE
                </button>
              </div>
            ) : (
              <button
                onClick={handleJoinRoom}
                disabled={joining}
                className="w-full py-2.5 bg-green-600 text-white rounded-lg font-semibold text-sm hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {joining ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Joining...
                  </>
                ) : (
                  <>
                    <LogIn size={16} /> JOIN GAME
                  </>
                )}
              </button>
            )}
          </div>
          </BorderGlow>
        </div>
      )}
    </div>
  );
}
