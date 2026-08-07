import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Clock, CheckCircle, XCircle, Users, Crown, Trophy,
  Zap, MessageCircle, Send, Eye, RefreshCw, ArrowRight, Loader2, LogOut,
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { getDoc, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { generateQuestions, generateQuestionsProgressive } from '../../services/api';
import { getRankIcon, getRankColor } from '../../services/rankingService';
import {
  setPlayerReady,
  startGame,
  tickCountdown,
  submitAnswer,
  nextQuestion,
  leaveGame,
  sendChatMessage,
  addSpectator,
  removeSpectator,
  sendReaction,
} from '../../services/multiplayer/multiplayerService';
import type { GameRoom, Reaction } from '../../types';
import { SECTORS } from '../../constants';

export default function GameRoom() {
  const { code } = useParams<{ code: string }>();
  const roomId = code;
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user } = useAuth();
  const [room, setRoom] = useState<GameRoom | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [chatInput, setChatInput] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [pollCount, setPollCount] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [hasAnswered, setHasAnswered] = useState(false);
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState<boolean | null>(null);
  const [generating, setGenerating] = useState(false);
  const [genProgress, setGenProgress] = useState({ current: 0, total: 0 });

  const [searchParams] = useSearchParams();
  const isSpectator = searchParams.get('spectate') === 'true';
  const [spectatorChat, setSpectatorChat] = useState('');
  const [waitingChat, setWaitingChat] = useState('');
  const [playerLevels, setPlayerLevels] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!room?.players?.length) return;
    const fetchLevels = async () => {
      const levels: Record<string, number> = {};
      for (const player of room.players) {
        try {
          const snap = await getDoc(doc(db, 'rankings', player.uid));
          if (snap.exists()) {
            levels[player.uid] = snap.data().level || 1;
          }
        } catch {}
      }
      setPlayerLevels(levels);
    };
    fetchLevels();
  }, [room?.players]);

  const getPlayerRankIcon = (uid: string) => {
    const level = playerLevels[uid] || 1;
    return getRankIcon(level);
  };

  const getPlayerRankColor = (uid: string) => {
    const level = playerLevels[uid] || 1;
    return getRankColor(level);
  };
  const [floatingReactions, setFloatingReactions] = useState<Array<{ id: string; emoji: string; x: number }>>([]);
  const reactionEmojis = ['🔥', '❤️', '👏', '😂', '⚡', '🎉', '💪', '👀'];

  useEffect(() => {
    if (isSpectator && user?.uid && roomId) {
      addSpectator(roomId, user.uid);
      return () => {
        removeSpectator(roomId, user.uid);
      };
    }
  }, [isSpectator, user?.uid, roomId]);

  const handleSendReaction = async (emoji: string) => {
    if (!user || !roomId) return;
    await sendReaction(roomId, { uid: user.uid, name: user.fullName || 'Fan', emoji });
    const id = `float-${Date.now()}`;
    setFloatingReactions((prev) => [...prev, { id, emoji, x: Math.random() * 80 + 10 }]);
    setTimeout(() => {
      setFloatingReactions((prev) => prev.filter((r) => r.id !== id));
    }, 2000);
  };

  const handleSendSpectatorChat = async () => {
    if (!user || !roomId || !spectatorChat.trim()) return;
    await sendChatMessage(roomId, {
      uid: user.uid,
      name: user.fullName || 'Fan',
      text: spectatorChat.trim(),
      type: 'message',
    });
    setSpectatorChat('');
  };

  const handleSendWaitingChat = async () => {
    if (!user || !roomId || !waitingChat.trim()) return;
    await sendChatMessage(roomId, {
      uid: user.uid,
      name: user.fullName || 'Player',
      text: waitingChat.trim(),
      type: 'message',
    });
    setWaitingChat('');
    setTimeout(() => fetchRoom(), 500);
  };

  const fetchRoom = useCallback(async () => {
    if (!roomId) return;
    try {
      const snap = await getDoc(doc(db, 'gameRooms', roomId));
      if (snap.exists()) {
        const data = snap.data() as GameRoom;
        if (data.expiresAt && data.expiresAt < Date.now() && data.players.length < 2) {
          await deleteDoc(doc(db, 'gameRooms', roomId));
          setLoadError('This room expired because nobody joined within 2 minutes.');
          setLoading(false);
          return false;
        }
        setRoom(data);
        setLoadError('');
        setLoading(false);
        if (data?.status === 'finished') {
          setShowResults(true);
        }
        return true;
      } else {
        setLoadError('Room not found. It may have been deleted or expired.');
        setLoading(false);
        return false;
      }
    } catch (e: any) {
      console.error('[MP] Fetch error:', e);
      setLoadError(`Failed to load room: ${e.message}`);
      setLoading(false);
      return false;
    }
  }, [roomId]);

  useEffect(() => {
    if (room?.status === 'finished' && !showResults) {
      setShowResults(true);
    }
  }, [room?.status, showResults]);

  useEffect(() => {
    if (!roomId) return;
    setLoading(true);
    setPollCount(0);

    fetchRoom();

    const interval = room?.status === 'waiting' ? 2000 : 3000;
    pollRef.current = setInterval(async () => {
      setPollCount((c) => c + 1);
      await fetchRoom();
    }, interval);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [roomId, fetchRoom]);

  useEffect(() => {
    if (room?.status === 'starting' && (room.countdown ?? 0) > 0) {
      const timer = setInterval(async () => {
        await tickCountdown(roomId!);
        await fetchRoom();
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [room?.status, room?.countdown, roomId, fetchRoom]);

  const manualRefresh = async () => {
    setLoading(true);
    await fetchRoom();
  };

  useEffect(() => {
    if (!room || room.status !== 'in_progress') return;
    const currentQ = room.questions[room.currentQuestion];
    if (!currentQ) return;

    setTimeLeft(room.timePerQuestion);
    setSelectedAnswer(null);
    setHasAnswered(false);
    setLastAnswerCorrect(null);

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [room?.currentQuestion, room?.status]);

  const handleAnswer = async (answer: string) => {
    if (!roomId || !user || !room || hasAnswered) return;
    const currentPlayer = room.players.find((p) => p.uid === user.uid);
    if (currentPlayer?.eliminated) return;
    setSelectedAnswer(answer);
    setHasAnswered(true);

    const currentQ = room.questions[room.currentQuestion];
    if (!currentQ) return;

    const isCorrect = answer === (Array.isArray(currentQ.correctAnswer) ? currentQ.correctAnswer[0] : currentQ.correctAnswer);
    setLastAnswerCorrect(isCorrect);
    const timeSpent = room.timePerQuestion - timeLeft;

    await submitAnswer(roomId, user.uid, room.currentQuestion, answer, timeSpent, isCorrect);
  };

  const handleNextQuestion = async () => {
    if (!roomId) return;
    await nextQuestion(roomId);
    setSelectedAnswer(null);
    setHasAnswered(false);
    setLastAnswerCorrect(null);
    setTimeout(() => fetchRoom(), 500);
  };

  const handleReady = async () => {
    if (!roomId || !user) return;
    const player = room?.players.find((p) => p.uid === user.uid);
    await setPlayerReady(roomId, user.uid, !player?.ready);
    setTimeout(() => fetchRoom(), 500);
  };

const handleStartGame = async () => {
    if (!roomId || !room) return;
    setGenerating(true);
    setGenProgress({ current: 0, total: room.totalQuestions });
    try {
      const subjects = SECTORS.filter((s) => s !== 'Other');
      const randomSubject = subjects[Math.floor(Math.random() * subjects.length)];
      const topics = ['General', 'Fundamentals', 'Key Concepts', 'Applications', 'Advanced Topics'];
      const randomTopic = topics[Math.floor(Math.random() * topics.length)];

      const questionCount = room.totalQuestions;
      console.log('[MP] Generating questions:', { sector: randomSubject, topic: randomTopic, count: questionCount });

      await updateDoc(doc(db, 'gameRooms', roomId), {
        genProgress: { current: 0, total: questionCount },
      });

      const questions = await generateQuestionsProgressive({
        topic: randomTopic,
        sector: randomSubject,
        level: 'High School',
        questionType: 'MCQ Only',
        count: questionCount,
        difficulty: 'medium',
      }, (batch, progress) => {
        setGenProgress({ current: progress.current, total: progress.total });
        updateDoc(doc(db, 'gameRooms', roomId), {
          genProgress: { current: progress.current, total: progress.total },
        }).catch(() => {});
      });

      console.log('[MP] Questions generated:', questions.length);

      let formattedQuestions = questions.map((q, i) => ({
        ...q,
        id: q.id || `mp-q-${i}-${Date.now()}`,
        options: q.options && q.options.length >= 2 ? q.options : ['Option A', 'Option B', 'Option C', 'Option D'],
        correctAnswer: q.correctAnswer || 'Option A',
      }));

      if (formattedQuestions.length === 0) {
        throw new Error('No questions generated');
      }

      if (formattedQuestions.length < questionCount) {
        console.warn(`[MP] AI generated ${formattedQuestions.length}/${questionCount} questions, filling remaining`);
        const originalLen = formattedQuestions.length;
        for (let i = originalLen; i < questionCount; i++) {
          const existing = formattedQuestions[i % originalLen];
          formattedQuestions.push({
            ...existing,
            id: `mp-q-${i}-${Date.now()}`,
          });
        }
      }

      await startGame(roomId, formattedQuestions);
      fetchRoom();
    } catch (e: any) {
      console.error('[MP] Question generation failed:', e);
      alert(`Failed to generate questions: ${e.message}`);
    } finally {
      setGenerating(false);
      setGenProgress({ current: 0, total: 0 });
    }
  };

  const fallbackQuestions = (room: GameRoom) => {
    const subjects = SECTORS.filter((s) => s !== 'Other');
    const randomSubject = subjects[Math.floor(Math.random() * subjects.length)];
    const topics = ['General', 'Fundamentals', 'Key Concepts', 'Applications', 'Advanced Topics'];
    const randomTopic = topics[Math.floor(Math.random() * topics.length)];
    const count = Math.min(room.totalQuestions, 5);

    return Array.from({ length: count }, (_, i) => ({
      id: `q-${i}-${Date.now()}`,
      question: `${randomTopic} Question ${i + 1} (${randomSubject})`,
      type: 'MCQ' as const,
      options: ['Option A', 'Option B', 'Option C', 'Option D'],
      correctAnswer: 'Option A',
      explanation: 'Please wait for AI-generated questions or retry.',
      difficulty: 'medium' as const,
      subject: randomSubject,
      topic: randomTopic,
    }));
  };

  const handleLeave = async () => {
    if (!roomId || !user) return;
    await leaveGame(roomId, user.uid);
    navigate('/multiplayer');
  };

  const handleSpectate = async () => {
    if (!roomId || !user) return;
    await addSpectator(roomId, user.uid);
    navigate(`/multiplayer/${roomId}?spectate=true`);
  };

  const handleLeaveEliminated = async () => {
    if (!roomId || !user) return;
    await leaveGame(roomId, user.uid);
    navigate('/multiplayer');
  };

  const handleSendChat = async () => {
    if (!roomId || !user || !chatInput.trim()) return;
    await sendChatMessage(roomId, {
      uid: user.uid,
      name: user.fullName || 'Player',
      text: chatInput.trim(),
      type: 'message',
    });
    setChatInput('');
  };

  if (loading && !room) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 px-4">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-gray-500 dark:text-gray-400 text-sm">Loading room...</p>
        {pollCount > 0 && (
          <p className="text-gray-400 dark:text-gray-500 text-xs mt-2">Polling attempt #{pollCount}...</p>
        )}
        <button
          onClick={manualRefresh}
          className="mt-3 flex items-center gap-1 text-xs text-primary-600 dark:text-primary-400 hover:underline"
        >
          <RefreshCw size={12} /> Refresh now
        </button>
        <button
          onClick={() => navigate('/multiplayer')}
          className="mt-2 text-xs text-gray-500 dark:text-gray-400 hover:underline"
        >
          Back to Arena
        </button>
      </div>
    );
  }

  if (loadError && !room) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 px-4">
        <div className="text-center">
          <p className="text-red-500 dark:text-red-400 mb-3">{loadError}</p>
          <div className="flex gap-2 justify-center">
            <button
              onClick={manualRefresh}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition"
            >
              Retry
            </button>
            <button
              onClick={() => navigate('/multiplayer')}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition"
            >
              Back to Arena
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 px-4">
        <p className="text-gray-500 dark:text-gray-400 text-sm">Room not found</p>
        <button
          onClick={() => navigate('/multiplayer')}
          className="mt-2 text-xs text-primary-600 dark:text-primary-400 hover:underline"
        >
          Back to Arena
        </button>
      </div>
    );
  }

  const currentPlayer = room.players.find((p) => p.uid === user?.uid);
  const currentQ = room.questions[room.currentQuestion];
  const isHost = room.host === user?.uid;
  const roomIsFull = room.players.length >= room.maxPlayers;
  const hasOtherPlayers = room.players.length >= 2;
  const allReady = hasOtherPlayers && room.players.every((p) => p.ready);
  const readyCount = room.players.filter((p) => p.ready).length;

  if (showResults || room.status === 'finished') {
    return <GameResults room={room} onLeave={handleLeave} />;
  }

  if (room.status === 'waiting') {
    return (
      <div className="max-w-lg mx-auto px-4 py-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">Waiting Room</h1>
          <p className="text-gray-500 dark:text-gray-400">
            {room.isPrivate && room.roomCode && (
              <span className="font-mono text-lg tracking-widest bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded">{room.roomCode}</span>
            )}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="flex items-center justify-between flex-1">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Players ({room.players.length}/{room.maxPlayers})
            </span>
            <div className="flex items-center gap-2">
              {roomIsFull && (
                <span className="text-xs px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded font-bold">
                  Room Full!
                </span>
              )}
              <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded">{room.mode}</span>
            </div>
          </div>
        </div>

        {hasOtherPlayers && !allReady && (
          <div className="mb-3 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg flex items-center gap-2">
            <div className="w-3 h-3 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-yellow-600 dark:text-yellow-400">
              {isHost ? `Waiting for players to ready up... (${readyCount}/${room.players.length}) — You can start anytime!` : `Click Ready Up to let the host start! (${readyCount}/${room.players.length} ready)`}
            </span>
          </div>
        )}

        {allReady && (
          <div className="mb-3 p-2 bg-green-50 dark:bg-green-900/20 rounded-lg flex items-center gap-2">
            <CheckCircle size={14} className="text-green-500" />
            <span className="text-xs text-green-600 dark:text-green-400 font-medium">All players ready! Host can start the game.</span>
          </div>
        )}

        {!hasOtherPlayers && (
          <div className="mb-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center gap-2">
            <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-blue-600 dark:text-blue-400">Waiting for another player to join...</span>
          </div>
        )}
          <div className="space-y-2">
            {room.players.map((player) => (
              <div key={player.uid} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="relative">
                    {player.photoURL ? (
                      <img src={player.photoURL} alt="" className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-xs font-bold text-gray-600 dark:text-gray-300">
                        {player.displayName.charAt(0)}
                      </div>
                    )}
                    {player.eliminated && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[7px] font-bold flex items-center justify-center animate-pulse">
                        ✕
                      </span>
                    )}
                    <span
                      className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[8px] shadow-sm"
                      style={{ backgroundColor: getPlayerRankColor(player.uid), border: '1.5px solid white' }}
                    >
                      {getPlayerRankIcon(player.uid)}
                    </span>
                  </div>
                  <span className="font-medium text-gray-800 dark:text-gray-100 text-sm">{player.displayName}</span>
                  {player.uid === room.host && <Crown size={14} className="text-yellow-500" />}
                  {player.eliminated && <span className="text-xs text-red-500 font-bold ml-1">ELIMINATED</span>}
                </div>
                {player.ready ? (
                  <CheckCircle size={16} className="text-green-500" />
                ) : (
                  <div className="w-4 h-4 rounded-full border-2 border-gray-300 dark:border-gray-600" />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <MessageCircle size={14} className="text-gray-400" />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Chat</span>
          </div>
          <div className="max-h-40 overflow-y-auto mb-3 space-y-1 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2">
            {(room.liveChat || []).filter((m) => m.type === 'message').length === 0 ? (
              <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-2">No messages yet. Say hi!</p>
            ) : (
              room.liveChat.filter((m) => m.type === 'message').slice(-20).map((msg, i) => (
                <div key={i} className="text-xs">
                  <span className="font-medium text-primary-600 dark:text-primary-400">{msg.name}: </span>
                  <span className="text-gray-700 dark:text-gray-300">{msg.text}</span>
                </div>
              ))
            )}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={waitingChat}
              onChange={(e) => setWaitingChat(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendWaitingChat()}
              placeholder="Type a message..."
              className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:border-primary-500"
            />
            <button onClick={handleSendWaitingChat} className="px-3 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition">
              <Send size={14} />
            </button>
          </div>
        </div>

        {room.genProgress && room.genProgress.total > 0 && room.status === 'waiting' && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Generating Questions...</span>
              <span className="text-xs font-bold text-primary-600 dark:text-primary-400">
                {Math.round((room.genProgress.current / room.genProgress.total) * 100)}%
              </span>
            </div>
            <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary-500 to-purple-500 rounded-full transition-all duration-300"
                style={{ width: `${Math.round((room.genProgress.current / room.genProgress.total) * 100)}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 text-center">
              {room.genProgress.current}/{room.genProgress.total} questions
            </p>
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={handleReady}
            className={`flex-1 py-3 rounded-lg font-semibold text-sm transition ${
              currentPlayer?.ready
                ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            {currentPlayer?.ready ? 'Ready!' : 'Ready Up'}
          </button>
          {isHost && hasOtherPlayers && (
            <button
              onClick={handleStartGame}
              disabled={generating}
              className="flex-1 py-3 bg-primary-600 text-white rounded-lg font-semibold text-sm hover:bg-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {generating ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  {genProgress.total > 0
                    ? `Generating... ${genProgress.current}/${genProgress.total}`
                    : 'Generating...'}
                </>
              ) : (
                'Start Game'
              )}
            </button>
          )}
          <button
            onClick={handleLeave}
            className="px-4 py-3 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg font-semibold text-sm transition"
          >
            Leave
          </button>
        </div>
      </div>
    );
  }

  if (room.status === 'starting') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 px-4">
        <div className="text-center">
          <div className="text-8xl font-bold text-white mb-4 animate-pulse">
            {room.countdown ?? 5}
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Get Ready!</h2>
          <p className="text-white/70 text-sm">Game starting soon...</p>
          <div className="mt-6 flex items-center gap-2 justify-center">
            <Users size={16} className="text-white/50" />
            <span className="text-white/50 text-sm">{room.players.length} players</span>
            {room.spectators && room.spectators.length > 0 && (
              <>
                <span className="text-white/30">•</span>
                <Eye size={16} className="text-white/50" />
                <span className="text-white/50 text-sm">{room.spectators.length} watching</span>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (isSpectator && room.status === 'in_progress') {
    return (
      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Eye size={16} className="text-purple-500" />
            <span className="text-sm font-medium text-purple-600 dark:text-purple-400">SPECTATING</span>
          </div>
          <span className="text-xs text-gray-500 dark:text-gray-400">{room.spectators?.length || 1} watching</span>
        </div>

        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
            Q{room.currentQuestion + 1}/{room.totalQuestions}
          </span>
          <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-sm font-bold ${timeLeft <= 5 ? 'bg-red-100 dark:bg-red-900/30 text-red-600' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600'}`}>
            <Clock size={14} />
            {timeLeft}s
          </div>
        </div>

        {currentQ && (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 mb-4 relative overflow-hidden">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">{currentQ.question}</h2>
            <div className="space-y-2">
              {currentQ.options?.map((option, idx) => {
                const letter = String.fromCharCode(65 + idx);
                return (
                  <div key={idx} className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                    <span className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300">{letter}</span>
                    <span className="text-sm text-gray-800 dark:text-gray-100">{option}</span>
                  </div>
                );
              })}
            </div>
            {floatingReactions.map((r) => (
              <div key={r.id} className="absolute text-3xl animate-bounce pointer-events-none" style={{ left: `${r.x}%`, bottom: '20%' }}>
                {r.emoji}
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-1 mb-4 flex-wrap">
          {reactionEmojis.map((emoji) => (
            <button key={emoji} onClick={() => handleSendReaction(emoji)} className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition text-lg flex items-center justify-center">
              {emoji}
            </button>
          ))}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-200 dark:border-gray-700 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Users size={14} className="text-gray-400" />
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Live Scores</span>
          </div>
          <div className="space-y-1">
            {[...room.players].sort((a, b) => b.score - a.score).map((p, i) => {
              const level = playerLevels[p.uid] || 1;
              return (
                <div key={p.uid} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">#{i + 1}</span>
                    <span
                      className="w-4 h-4 rounded-full flex items-center justify-center text-[8px]"
                      style={{ backgroundColor: getRankColor(level), border: '1px solid white' }}
                    >
                      {getRankIcon(level)}
                    </span>
                    <span className="text-sm text-gray-800 dark:text-gray-100">{p.displayName}</span>
                    {p.eliminated && <span className="text-xs text-red-500 font-bold">ELIMINATED</span>}
                  </div>
                  <span className="text-sm font-bold text-purple-600 dark:text-purple-400">{p.score} pts</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-200 dark:border-gray-700">
          <div className="max-h-32 overflow-y-auto mb-2 space-y-1">
            {room.liveChat?.filter((m) => m.type === 'message').slice(-10).map((msg, i) => (
              <div key={i} className="text-xs">
                <span className="font-medium text-purple-600 dark:text-purple-400">{msg.name}: </span>
                <span className="text-gray-700 dark:text-gray-300">{msg.text}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={spectatorChat}
              onChange={(e) => setSpectatorChat(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendSpectatorChat()}
              placeholder="Cheer for your player..."
              className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:border-purple-500"
            />
            <button onClick={handleSendSpectatorChat} className="px-3 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition">
              <Send size={14} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (room.status === 'in_progress' && currentPlayer?.eliminated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-red-900 via-gray-900 to-black px-4">
        <div className="text-center max-w-sm">
          <div className="text-6xl mb-4">💀</div>
          <h2 className="text-2xl font-bold text-white mb-2">ELIMINATED!</h2>
          <p className="text-white/60 text-sm mb-6">You got a wrong answer in Survival mode. What would you like to do?</p>
          <div className="space-y-3">
            <button
              onClick={handleSpectate}
              className="w-full py-3 bg-purple-600 text-white rounded-lg font-semibold text-sm hover:bg-purple-700 transition flex items-center justify-center gap-2"
            >
              <Eye size={16} /> SPECTATE
            </button>
            <button
              onClick={handleLeaveEliminated}
              className="w-full py-3 bg-gray-700 text-white rounded-lg font-semibold text-sm hover:bg-gray-600 transition flex items-center justify-center gap-2"
            >
              <LogOut size={16} /> LEAVE ROOM
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (room.status === 'in_progress' && currentQ) {
    return (
      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Q{room.currentQuestion + 1}/{room.totalQuestions}
            </span>
          </div>
          <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-sm font-bold ${
            timeLeft <= 5 ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
          }`}>
            <Clock size={14} />
            {timeLeft}s
          </div>
        </div>

        <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-6">
          <div
            className={`h-full rounded-full transition-all ${timeLeft <= 5 ? 'bg-red-500' : 'bg-blue-500'}`}
            style={{ width: `${(timeLeft / room.timePerQuestion) * 100}%` }}
          />
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 mb-4">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">{currentQ.question}</h2>
          <div className="space-y-2">
            {currentQ.options?.map((option, idx) => {
              const isSelected = selectedAnswer === option;
              const isCorrectAnswer = option === (Array.isArray(currentQ.correctAnswer) ? currentQ.correctAnswer[0] : currentQ.correctAnswer);
              const letter = String.fromCharCode(65 + idx);

              let borderColor = 'border-gray-200 dark:border-gray-700';
              let bgColor = 'bg-gray-100 dark:bg-gray-700';
              let textColor = 'text-gray-600 dark:text-gray-400';

              if (hasAnswered) {
                if (isSelected && isCorrectAnswer) {
                  borderColor = 'border-green-500';
                  bgColor = 'bg-green-500';
                  textColor = 'text-white';
                } else if (isSelected && !isCorrectAnswer) {
                  borderColor = 'border-red-500';
                  bgColor = 'bg-red-500';
                  textColor = 'text-white';
                } else if (isCorrectAnswer) {
                  borderColor = 'border-green-500';
                  bgColor = 'bg-green-100 dark:bg-green-900/30';
                  textColor = 'text-green-700 dark:text-green-300';
                }
              } else if (isSelected) {
                borderColor = 'border-primary-500';
                bgColor = 'bg-primary-500';
                textColor = 'text-white';
              }

              return (
                <button
                  key={idx}
                  onClick={() => handleAnswer(option)}
                  disabled={hasAnswered}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border transition text-left ${borderColor} ${isSelected || (hasAnswered && isCorrectAnswer) ? (isSelected && isCorrectAnswer ? 'bg-green-50 dark:bg-green-900/20' : hasAnswered && isCorrectAnswer ? 'bg-green-50 dark:bg-green-900/20' : isSelected && !isCorrectAnswer ? 'bg-red-50 dark:bg-red-900/20' : '') : 'hover:border-primary-300 dark:hover:border-primary-600'}`}
                >
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${bgColor} ${textColor}`}>
                    {hasAnswered && isCorrectAnswer ? <CheckCircle size={16} /> : hasAnswered && isSelected && !isCorrectAnswer ? <XCircle size={16} /> : letter}
                  </span>
                  <span className="text-sm text-gray-800 dark:text-gray-100 flex-1">{option}</span>
                  {hasAnswered && isCorrectAnswer && (
                    <CheckCircle size={16} className="text-green-500" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {hasAnswered && lastAnswerCorrect !== null && (
          <div className={`mb-4 p-3 rounded-lg ${lastAnswerCorrect ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
            <div className="flex items-center gap-2">
              {lastAnswerCorrect ? (
                <>
                  <CheckCircle size={16} className="text-green-500" />
                  <span className="text-sm font-medium text-green-600 dark:text-green-400">Correct! +100 points</span>
                </>
              ) : (
                <>
                  <XCircle size={16} className="text-red-500" />
                  <span className="text-sm font-medium text-red-600 dark:text-red-400">
                    Wrong! The answer was: {Array.isArray(currentQ.correctAnswer) ? currentQ.correctAnswer[0] : currentQ.correctAnswer}
                  </span>
                </>
              )}
            </div>
            {currentQ.explanation && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-6">{currentQ.explanation}</p>
            )}
          </div>
        )}

        {hasAnswered && (
          <button
            onClick={handleNextQuestion}
            className="w-full py-3 bg-primary-600 text-white rounded-lg font-semibold text-sm hover:bg-primary-700 transition flex items-center justify-center gap-2"
          >
            {room.currentQuestion + 1 >= room.totalQuestions ? 'See Results' : 'NEXT QUESTION'}
            <ArrowRight size={16} />
          </button>
        )}

        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <Users size={14} />
            <span>{room.players.length} players</span>
          </div>
          <div className="flex items-center gap-4">
            {room.players
              .sort((a, b) => b.score - a.score)
              .slice(0, 3)
              .map((p, i) => (
                <div key={p.uid} className="flex items-center gap-1">
                  <span className="text-xs text-gray-400">#{i + 1}</span>
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{p.displayName}</span>
                  <span className="text-xs font-bold text-purple-600 dark:text-purple-400">{p.score}</span>
                </div>
              ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
      <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function GameResults({ room, onLeave }: { room: GameRoom; onLeave: () => void }) {
  const { user } = useAuth();
  const sortedPlayers = [...room.players].sort((a, b) => b.score - a.score);
  const winner = sortedPlayers[0];
  const isWinner = winner?.uid === user?.uid;
  const [playerLevels, setPlayerLevels] = useState<Record<string, number>>({});

  useEffect(() => {
    const fetchLevels = async () => {
      const levels: Record<string, number> = {};
      for (const player of sortedPlayers) {
        try {
          const snap = await getDoc(doc(db, 'rankings', player.uid));
          if (snap.exists()) {
            levels[player.uid] = snap.data().level || 1;
          }
        } catch {}
      }
      setPlayerLevels(levels);
    };
    fetchLevels();
  }, []);

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <div className="text-center mb-6">
        <div className="inline-flex p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-full mb-3">
          <Trophy size={40} className="text-yellow-500" />
        </div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
          {isWinner ? 'Victory!' : 'Game Over'}
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          {winner?.displayName} wins with {winner?.score} points!
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 mb-4">
        <div className="space-y-2">
          {sortedPlayers.map((player, idx) => {
            const level = playerLevels[player.uid] || 1;
            return (
              <div
                key={player.uid}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  idx === 0 ? 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800' : 'bg-gray-50 dark:bg-gray-700/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`text-lg font-bold ${idx === 0 ? 'text-yellow-500' : 'text-gray-400'}`}>
                    #{idx + 1}
                  </span>
                  <div className="relative">
                    {player.photoURL ? (
                      <img src={player.photoURL} alt="" className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-xs font-bold text-gray-600 dark:text-gray-300">
                        {player.displayName.charAt(0)}
                      </div>
                    )}
                    <span
                      className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[8px] shadow-sm"
                      style={{ backgroundColor: getRankColor(level), border: '1.5px solid white' }}
                    >
                      {getRankIcon(level)}
                    </span>
                  </div>
                  <div>
                    <div className="font-medium text-gray-800 dark:text-gray-100 text-sm">{player.displayName}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {player.correctAnswers}/{player.totalAnswers} correct
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-purple-600 dark:text-purple-400">{player.score} pts</div>
                  <div className="text-xs text-gray-400">🔥 {player.bestStreak} streak</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {isWinner && (
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-xl p-4 border border-purple-200 dark:border-purple-800 mb-4 text-center">
          <Zap size={24} className="mx-auto mb-1 text-purple-500" />
          <p className="font-bold text-purple-600 dark:text-purple-400">+{room.rewards.xp} XP + {room.rewards.coins} Coins</p>
        </div>
      )}

      <button
        onClick={onLeave}
        className="w-full py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition"
      >
        Back to Arena
      </button>
    </div>
  );
}
