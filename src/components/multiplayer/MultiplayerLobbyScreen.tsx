import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Plus, LogIn, Users, Loader2, AlertCircle, CheckCircle, Copy,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { storage } from '../../services/storage';
import { createQuizRoom, joinQuizRoom, type QuizRoom } from '../../services/firebaseService';
import { generateQuestions } from '../../services/api';
import { SECTORS, LEVELS } from '../../constants';
import BorderGlow from '../ui/BorderGlow';

export default function MultiplayerLobbyScreen() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tab, setTab] = useState<'create' | 'join'>('create');
  const [topic, setTopic] = useState('');
  const [subject, setSubject] = useState('');
  const [questionCount, setQuestionCount] = useState(5);
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const userObj = {
    uid: user?.email || '',
    name: user?.fullName || 'Student',
    photoURL: user?.photoURL || null,
  };

  const handleCreate = async () => {
    if (!topic.trim()) { setError('Enter a topic'); return; }
    setLoading(true);
    setError('');
    try {
      const { questions } = await generateQuestions({
        topic: topic.trim(),
        sector: subject || 'General',
        level: 'intermediate',
        questionType: 'MCQ',
        count: questionCount,
      });
      const code = await createQuizRoom(userObj, { topic: topic.trim(), subject: subject || 'General', questionCount }, questions);
      navigate(`/multiplayer/${code}`);
    } catch (e: any) {
      setError(e.message || 'Failed to create room');
    }
    setLoading(false);
  };

  const handleJoin = async () => {
    if (!joinCode.trim()) { setError('Enter a room code'); return; }
    setLoading(true);
    setError('');
    try {
      const result = await joinQuizRoom(joinCode.trim().toUpperCase(), userObj);
      if (result.success && result.roomId) {
        navigate(`/multiplayer/${joinCode.trim().toUpperCase()}`);
      } else {
        setError(result.error || 'Failed to join');
      }
    } catch (e: any) {
      setError(e.message || 'Failed to join room');
    }
    setLoading(false);
  };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <button onClick={() => navigate(-1)} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-sm flex items-center gap-1">
        <ArrowLeft size={14} /> Back
      </button>

      <div className="text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-purple-100 dark:bg-purple-900/40 rounded-2xl mb-3">
          <Users size={28} className="text-purple-600 dark:text-purple-400" />
        </div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Multiplayer Quiz</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm">Compete head-to-head with friends</p>
      </div>

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm rounded-lg flex items-center gap-2">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      <div className="flex gap-2">
        {(['create', 'join'] as const).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setError(''); }}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition ${
              tab === t
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {t === 'create' ? 'Create Room' : 'Join Room'}
          </button>
        ))}
      </div>

      {tab === 'create' && (
        <BorderGlow backgroundColor={document.documentElement.classList.contains('dark') ? '#1f2937' : '#ffffff'} borderRadius={12} glowColor="280 80 70" glowIntensity={0.4} colors={['#a855f7', '#6366f1', '#3b82f6']}>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Topic *</label>
              <input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Photosynthesis, Python Loops"
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subject</label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 outline-none"
              >
                <option value="">General</option>
                {SECTORS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Questions</label>
              <div className="flex gap-2">
                {[3, 5, 7, 10].map((n) => (
                  <button
                    key={n}
                    onClick={() => setQuestionCount(n)}
                    className={`flex-1 py-2 rounded-lg text-sm font-semibold transition ${
                      questionCount === n
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleCreate}
              disabled={loading || !topic.trim()}
              className="w-full py-2.5 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 disabled:opacity-50 transition flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              {loading ? 'Generating Questions...' : 'Create Room'}
            </button>
          </div>
        </BorderGlow>
      )}

      {tab === 'join' && (
        <BorderGlow backgroundColor={document.documentElement.classList.contains('dark') ? '#1f2937' : '#ffffff'} borderRadius={12} glowColor="280 80 70" glowIntensity={0.4} colors={['#a855f7', '#6366f1', '#3b82f6']}>
          <div className="p-6 space-y-4">
            <h3 className="font-semibold text-gray-800 dark:text-gray-100">Join a Room</h3>
            <input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="Enter 6-letter room code"
              maxLength={6}
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-mono text-lg tracking-widest text-center focus:ring-2 focus:ring-purple-500 outline-none uppercase"
            />
            <button
              onClick={handleJoin}
              disabled={loading || joinCode.length < 6}
              className="w-full py-2.5 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 disabled:opacity-50 transition flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />}
              Join Room
            </button>
          </div>
        </BorderGlow>
      )}
    </div>
  );
}
