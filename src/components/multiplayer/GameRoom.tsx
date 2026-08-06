import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Clock, CheckCircle, XCircle, Users, Crown, Trophy,
  Zap, MessageCircle, Send, Eye, RefreshCw,
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { getDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import {
  setPlayerReady,
  startGame,
  submitAnswer,
  nextQuestion,
  leaveGame,
  sendChatMessage,
  addSpectator,
} from '../../services/multiplayer/multiplayerService';
import type { GameRoom } from '../../types';

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
    if (!roomId) return;
    setLoading(true);
    setPollCount(0);

    fetchRoom();

    pollRef.current = setInterval(async () => {
      setPollCount((c) => c + 1);
      await fetchRoom();
    }, 3000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [roomId, fetchRoom]);

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
    if (!roomId || !user || !room || selectedAnswer) return;
    setSelectedAnswer(answer);

    const currentQ = room.questions[room.currentQuestion];
    if (!currentQ) return;

    const isCorrect = answer === (Array.isArray(currentQ.correctAnswer) ? currentQ.correctAnswer[0] : currentQ.correctAnswer);
    const timeSpent = room.timePerQuestion - timeLeft;

    await submitAnswer(roomId, user.uid, room.currentQuestion, answer, timeSpent, isCorrect);
  };

  const handleReady = async () => {
    if (!roomId || !user) return;
    const player = room?.players.find((p) => p.uid === user.uid);
    await setPlayerReady(roomId, user.uid, !player?.ready);
  };

  const handleStartGame = async () => {
    if (!roomId || !room) return;
    const sampleQuestions = Array.from({ length: room.totalQuestions }, (_, i) => ({
      id: `q-${i}`,
      question: `Sample Question ${i + 1}`,
      type: 'MCQ' as const,
      options: ['Option A', 'Option B', 'Option C', 'Option D'],
      correctAnswer: 'Option A',
      explanation: 'This is a sample explanation.',
      difficulty: 'medium' as const,
      subject: room.subject,
      topic: room.topic,
    }));
    await startGame(roomId, sampleQuestions);
  };

  const handleLeave = async () => {
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
  const allReady = room.players.length >= 2 && room.players.every((p) => p.ready);

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
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Players ({room.players.length}/{room.maxPlayers})</span>
            <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded">{room.mode}</span>
          </div>
          <div className="space-y-2">
            {room.players.map((player) => (
              <div key={player.uid} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="flex items-center gap-2">
                  {player.photoURL ? (
                    <img src={player.photoURL} alt="" className="w-8 h-8 rounded-full object-cover" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-xs font-bold text-gray-600 dark:text-gray-300">
                      {player.displayName.charAt(0)}
                    </div>
                  )}
                  <span className="font-medium text-gray-800 dark:text-gray-100 text-sm">{player.displayName}</span>
                  {player.uid === room.host && <Crown size={14} className="text-yellow-500" />}
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
          {isHost && allReady && (
            <button
              onClick={handleStartGame}
              className="flex-1 py-3 bg-primary-600 text-white rounded-lg font-semibold text-sm hover:bg-primary-700 transition"
            >
              Start Game
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
              const letter = String.fromCharCode(65 + idx);
              return (
                <button
                  key={idx}
                  onClick={() => handleAnswer(option)}
                  disabled={!!selectedAnswer}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border transition text-left ${
                    isSelected
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : selectedAnswer
                      ? 'border-gray-200 dark:border-gray-700 opacity-50'
                      : 'border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-600'
                  }`}
                >
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                    isSelected ? 'bg-primary-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                  }`}>
                    {letter}
                  </span>
                  <span className="text-sm text-gray-800 dark:text-gray-100">{option}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between">
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
          {sortedPlayers.map((player, idx) => (
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
          ))}
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
