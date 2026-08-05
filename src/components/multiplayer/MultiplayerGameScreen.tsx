import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Loader2, Users, Clock, Trophy, CheckCircle, XCircle, Copy, Play, ArrowLeft,
  Crown, CircleDot,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
  subscribeToQuizRoom, startQuizRoom, submitAnswer, finishPlayer,
  type QuizRoom, type QuizPlayer,
} from '../../services/firebaseService';

export default function MultiplayerGameScreen() {
  const { code } = useParams();
  const roomCode = typeof code === 'string' ? code : '';
  const navigate = useNavigate();
  const { user } = useAuth();
  const [room, setRoom] = useState<QuizRoom | null>(null);
  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [startTime, setStartTime] = useState(0);
  const [copiedCode, setCopiedCode] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const prevStatusRef = useRef<string>('waiting');

  const uid = user?.uid || '';

  useEffect(() => {
    if (!roomCode) return;
    const unsub = subscribeToQuizRoom(roomCode, (r) => setRoom(r));
    return unsub;
  }, [roomCode]);

  // Detect game start and initialize timer
  useEffect(() => {
    if (room?.status === 'playing' && prevStatusRef.current === 'waiting') {
      setStartTime(Date.now());
      setCurrentQ(0);
      setSelected('');
      setSubmitted(false);
      setElapsed(0);
    }
    prevStatusRef.current = room?.status || 'waiting';
  }, [room?.status]);

  const isHost = room?.createdBy === uid;
  const me = room?.players.find((p) => p.uid === uid);
  const opponent = room?.players.find((p) => p.uid !== uid);

  // Timer
  useEffect(() => {
    if (room?.status !== 'playing' || me?.finished || startTime === 0) return;
    timerRef.current = setInterval(() => {
      setElapsed(Date.now() - startTime);
    }, 100);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [room?.status, me?.finished, startTime]);

  const handleStart = async () => {
    if (!room || !isHost) return;
    await startQuizRoom(room.id);
  };

  const handleAnswer = async () => {
    if (!room || !me || !selected || submitted) return;
    const q = room.questions[currentQ];
    const correctAns = Array.isArray(q.correctAnswer) ? q.correctAnswer[0] : q.correctAnswer;
    const correct = selected === correctAns || selected === correctAns.replace(/^[A-Za-z][.\s]+/, '').trim();
    const timeMs = Date.now() - startTime;
    setSubmitted(true);
    await submitAnswer(room.id, uid, {
      questionId: q.id,
      answer: selected,
      correct,
      timeMs,
    }, room.players);
  };

  const handleNext = () => {
    if (!room) return;
    if (currentQ < room.questions.length - 1) {
      setCurrentQ((c) => c + 1);
      setSelected('');
      setSubmitted(false);
      setStartTime(Date.now());
    }
  };

  const handleFinish = async () => {
    if (!room || !me) return;
    await finishPlayer(room.id, uid, room.players);
  };

  const copyCode = () => {
    navigator.clipboard.writeText(room?.code || '');
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const formatTime = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    return `${m}:${String(s % 60).padStart(2, '0')}`;
  };

  const stripPrefix = (s: string) => s.replace(/^[A-Za-z][.\s]+/, '').trim();

  // ── Waiting Room ──
  if (!room || room.status === 'waiting') {
    return (
      <div className="max-w-lg mx-auto space-y-6">
        <button onClick={() => navigate('/multiplayer')} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-sm flex items-center gap-1">
          <ArrowLeft size={14} /> Back to Lobby
        </button>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 text-center">
          <Loader2 size={32} className="animate-spin mx-auto text-purple-500 mb-3" />
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-1">Waiting for opponent...</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">Share this code with a friend</p>

          <button onClick={copyCode} className="inline-flex items-center gap-2 px-4 py-2 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg font-mono font-bold text-lg tracking-widest hover:bg-purple-100 dark:hover:bg-purple-900/50 transition">
            {room?.code || roomCode}
            {copiedCode ? <CheckCircle size={16} /> : <Copy size={16} />}
          </button>

          <div className="flex flex-wrap justify-center gap-2 mt-4">
            <span className="text-xs px-2.5 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium">{room?.subject || 'General'}</span>
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
              room?.difficulty === 'easy' ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' :
              room?.difficulty === 'hard' ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' :
              'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400'
            }`}>{room?.difficulty || 'medium'}</span>
            {room?.level && <span className="text-xs px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 font-medium">{room.level}</span>}
          </div>

          <div className="mt-6 space-y-2">
            {room?.players.map((p) => (
              <div key={p.uid} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                {p.photoURL ? (
                  <img src={p.photoURL} alt="" className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center text-purple-600 dark:text-purple-400 font-bold text-sm">
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{p.name}</span>
                {p.uid === room?.createdBy && <Crown size={14} className="text-yellow-500" />}
              </div>
            ))}
          </div>

          {isHost && (
            <button
              onClick={handleStart}
              disabled={!room || room.players.length < 2}
              className="mt-6 w-full py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 disabled:opacity-50 transition flex items-center justify-center gap-2"
            >
              <Play size={18} /> Start Quiz
            </button>
          )}
          {room && room.players.length < 2 && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Waiting for another player to join...</p>
          )}
        </div>
      </div>
    );
  }

  // ── Game Over / Results ──
  if (room.status === 'finished') {
    const sorted = [...room.players].sort((a, b) => b.score - a.score);
    const winner = sorted[0];
    return (
      <div className="max-w-lg mx-auto space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 text-center">
          <div className="text-5xl mb-3">{winner.uid === uid ? '🏆' : '🥈'}</div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-1">
            {winner.uid === uid ? 'You Won!' : `${winner.name} Won!`}
          </h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">{room.topic} • {room.subject} • {room.difficulty || 'medium'} • {room.level || ''}</p>

          <div className="space-y-3">
            {sorted.map((p, i) => (
              <div key={p.uid} className={`flex items-center gap-3 p-4 rounded-xl ${i === 0 ? 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800' : 'bg-gray-50 dark:bg-gray-700/50'}`}>
                <span className="text-lg font-bold text-gray-500 dark:text-gray-400 w-6">#{i + 1}</span>
                {p.photoURL ? (
                  <img src={p.photoURL} alt="" className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center text-primary-600 dark:text-primary-400 font-bold">
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 text-left">
                  <div className="font-semibold text-gray-800 dark:text-gray-100">{p.name}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {p.answers.filter((a) => a.correct).length}/{room.questions.length} correct
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-primary-600 dark:text-primary-400">{p.score}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    avg {p.answers.length > 0 ? formatTime(p.answers.reduce((s, a) => s + a.timeMs, 0) / p.answers.length) : '0:00'}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button onClick={() => navigate('/multiplayer')} className="mt-6 w-full py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition">
            Back to Lobby
          </button>
        </div>
      </div>
    );
  }

  // ── In-Game ──
  const q = room.questions[currentQ];
  if (!q) return null;
  const progress = ((currentQ + 1) / room.questions.length) * 100;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Q{currentQ + 1}/{room.questions.length}
          </div>
          <div className="w-32 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div className="h-full bg-purple-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
            <Clock size={14} /> {formatTime(elapsed)}
          </div>
          <div className="flex items-center gap-1.5 text-sm font-semibold text-primary-600 dark:text-primary-400">
            <Trophy size={14} /> {me?.score || 0}
          </div>
        </div>
      </div>

      {/* Opponent bar */}
      {opponent && (
        <div className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
          {opponent.photoURL ? (
            <img src={opponent.photoURL} alt="" className="w-7 h-7 rounded-full object-cover" />
          ) : (
            <div className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-500 font-bold text-xs">
              {opponent.name.charAt(0).toUpperCase()}
            </div>
          )}
          <span className="text-sm text-gray-600 dark:text-gray-400 flex-1">{opponent.name}</span>
          <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{opponent.score} pts</span>
          {opponent.finished && <CheckCircle size={14} className="text-green-500" />}
        </div>
      )}

      {/* Question */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider font-medium">{q.subject || q.topic || 'Question'}</p>
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-5">{q.question}</h3>

        <div className="space-y-2.5">
          {q.options?.map((opt, i) => {
            const val = stripPrefix(opt);
            const letter = opt.match(/^([A-Za-z])[.\s]/)?.[1] || String.fromCharCode(65 + i);
            const isSelected = selected === val || selected === opt;
            const correctAns = Array.isArray(q.correctAnswer) ? q.correctAnswer[0] : q.correctAnswer;
            const isCorrect = val === stripPrefix(correctAns) || opt === correctAns;
            const showResult = submitted;

            return (
              <button
                key={i}
                onClick={() => { if (!submitted) setSelected(val); }}
                disabled={submitted}
                className={`w-full text-left p-4 rounded-xl border-2 transition font-medium ${
                  showResult && isCorrect
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                    : showResult && isSelected && !isCorrect
                    ? 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                    : isSelected
                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300'
                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 text-gray-700 dark:text-gray-300'
                }`}
              >
                <span className="mr-2 text-gray-500 dark:text-gray-400">{letter}.</span> {val}
                {showResult && isCorrect && <CheckCircle size={16} className="inline ml-2 text-green-500" />}
                {showResult && isSelected && !isCorrect && <XCircle size={16} className="inline ml-2 text-red-500" />}
              </button>
            );
          })}
        </div>

        {submitted && q.explanation && (
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm text-blue-700 dark:text-blue-300">
            {q.explanation}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        {!submitted ? (
          <button
            onClick={handleAnswer}
            disabled={!selected}
            className="flex-1 py-3 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 disabled:opacity-50 transition"
          >
            Submit Answer
          </button>
        ) : currentQ < room.questions.length - 1 ? (
          <button
            onClick={handleNext}
            className="flex-1 py-3 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 transition"
          >
            Next Question
          </button>
        ) : (
          <button
            onClick={handleFinish}
            className="flex-1 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition flex items-center justify-center gap-2"
          >
            <CheckCircle size={18} /> Finish Quiz
          </button>
        )}
      </div>
    </div>
  );
}
