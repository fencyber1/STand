import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Plus, LogIn, Users, Loader2, AlertCircle, CheckCircle, Copy,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { storage } from '../../services/storage';
import { createQuizRoom, joinQuizRoom, type QuizRoom } from '../../services/firebaseService';
import { generateQuestionsProgressive } from '../../services/api';
import { SECTORS, LEVELS, DIFFICULTY_LEVELS } from '../../constants';
import BorderGlow from '../ui/BorderGlow';

export default function MultiplayerLobbyScreen() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const [tab, setTab] = useState<'create' | 'join'>('create');
  const [topic, setTopic] = useState('');
  const [subject, setSubject] = useState('');
  const [customSubject, setCustomSubject] = useState('');
  const [questionCount, setQuestionCount] = useState(5);
  const [difficulty, setDifficulty] = useState<string>('medium');
  const [level, setLevel] = useState<string>(LEVELS[0]);
  const [studentAge, setStudentAge] = useState('8');
  const [ageError, setAgeError] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [error, setError] = useState('');

  const userObj = {
    uid: user?.uid || '',
    name: user?.fullName || 'Student',
    photoURL: user?.photoURL || null,
  };

  const handleCreate = async () => {
    if (!topic.trim()) { setError('Enter a topic'); return; }
    if (subject === 'Other' && !customSubject.trim()) { setError('Enter your course name'); return; }
    if (level === 'PRIMARY/BASIC') {
      const n = Number(studentAge);
      if (!studentAge || isNaN(n) || n < 4 || n > 12) { setAgeError('Age must be between 4 and 12'); return; }
    }
    setLoading(true);
    setError('');
    setProgress(null);
    try {
      const actualSubject = subject === 'Other' ? (customSubject.trim() || 'General') : (subject || 'General');
      const age = level === 'PRIMARY/BASIC' ? (Number(studentAge) || 8) : undefined;
      const questions = await generateQuestionsProgressive({
        topic: topic.trim(),
        sector: actualSubject,
        level,
        questionType: 'MCQ',
        count: questionCount,
        difficulty,
        studentAge: age && age >= 4 && age <= 12 ? age : undefined,
        language,
      }, (batch, p) => setProgress(p));
      const code = await createQuizRoom(userObj, { topic: topic.trim(), subject: actualSubject, level, difficulty, questionCount }, questions);
      navigate(`/multiplayer/${code}`);
    } catch (e: any) {
      setError('Failed to create room. Please try again.');
    }
    setProgress(null);
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
      setError('Failed to join room. Please try again.');
    }
    setLoading(false);
  };

  return (
    <div className="max-w-lg mx-auto px-4 space-y-6">
      <button onClick={() => navigate(-1)} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-sm flex items-center gap-1">
        <ArrowLeft size={14} /> {t('Back')}
      </button>

      <div className="text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-purple-100 dark:bg-purple-900/40 rounded-2xl mb-3">
          <Users size={28} className="text-purple-600 dark:text-purple-400" />
        </div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{t('Multiplayer Quiz')}</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm">{t('Compete head-to-head with friends')}</p>
      </div>

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm rounded-lg flex items-center gap-2">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      <div className="flex gap-2">
        {(['create', 'join'] as const).map((tabKey) => (
          <button
            key={tabKey}
            onClick={() => { setTab(tabKey); setError(''); }}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition ${
              tab === tabKey
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {tabKey === 'create' ? t('Create Room') : t('Join Room')}
          </button>
        ))}
      </div>

      {tab === 'create' && (
        <BorderGlow backgroundColor={document.documentElement.classList.contains('dark') ? '#1f2937' : '#ffffff'} borderRadius={12} glowColor="280 80 70" glowIntensity={0.7} colors={['#a855f7', '#6366f1', '#3b82f6']}>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('Topic')} *</label>
              <input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder={t('e.g. Photosynthesis, Python Loops')}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('Subject')}</label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 outline-none"
              >
                <option value="">{t('General')}</option>
                {SECTORS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              {subject === 'Other' && (
                <input
                  type="text"
                  value={customSubject}
                  onChange={(e) => setCustomSubject(e.target.value)}
                  placeholder={t('e.g. Graphic Designing, Music...')}
                  className="mt-2 w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-purple-500 outline-none"
                />
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('Education Level')}</label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 outline-none"
              >
                {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
              {level === 'PRIMARY/BASIC' && (
                <div className="mt-2">
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t("Student's Age")} (4–12)</label>
                  <input
                    type="number"
                    min={4}
                    max={12}
                    value={studentAge}
                    onChange={(e) => { setStudentAge(e.target.value); setAgeError(''); }}
                    onBlur={() => {
                      const n = Number(studentAge);
                      if (!studentAge || isNaN(n)) { setStudentAge('8'); setAgeError(''); return; }
                      if (n < 4 || n > 12) { setAgeError('Age must be between 4 and 12'); setStudentAge(studentAge); return; }
                      setAgeError('');
                    }}
                    className={`w-full px-4 py-2.5 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 outline-none transition ${ageError ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                  />
                  {ageError ? (
                    <p className="text-xs text-red-500 dark:text-red-400 mt-1">{ageError}</p>
                  ) : (
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{t('Questions tailored for this age')}</p>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('Difficulty')}</label>
              <div className="flex gap-2">
                {DIFFICULTY_LEVELS.map((d) => (
                  <button
                    key={d}
                    onClick={() => setDifficulty(d)}
                    className={`flex-1 py-2 rounded-lg text-sm font-semibold capitalize transition ${
                      difficulty === d
                        ? d === 'easy' ? 'bg-green-500 text-white' : d === 'hard' ? 'bg-red-500 text-white' : 'bg-yellow-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('Questions')}: <span className="text-purple-600 dark:text-purple-400 font-bold">{questionCount}</span>
              </label>
              <input
                type="range"
                min={1}
                max={50}
                value={questionCount}
                onChange={(e) => setQuestionCount(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-600"
              />
              <div className="flex justify-between items-center mt-1.5">
                <span className="text-xs text-gray-400">1</span>
                <div className="flex gap-1.5">
                  {[5, 10, 15, 20, 30, 50].map((n) => (
                    <button
                      key={n}
                      onClick={() => setQuestionCount(n)}
                      className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
                        questionCount === n
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <span className="text-xs text-gray-400">50</span>
              </div>
            </div>

            <button
              onClick={handleCreate}
              disabled={loading || !topic.trim()}
              className="w-full py-2.5 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 disabled:opacity-50 transition flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              {loading ? (progress ? `${t('Generating Questions...')} ${progress.current}/${progress.total}` : t('Generating Questions...')) : t('Create Room')}
            </button>
          </div>
        </BorderGlow>
      )}

      {tab === 'join' && (
        <BorderGlow backgroundColor={document.documentElement.classList.contains('dark') ? '#1f2937' : '#ffffff'} borderRadius={12} glowColor="280 80 70" glowIntensity={0.7} colors={['#a855f7', '#6366f1', '#3b82f6']}>
          <div className="p-6 space-y-4">
            <h3 className="font-semibold text-gray-800 dark:text-gray-100">{t('Join a Room')}</h3>
            <input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder={t('Enter 6-letter room code')}
              maxLength={6}
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-mono text-lg tracking-widest text-center focus:ring-2 focus:ring-purple-500 outline-none uppercase"
            />
            <button
              onClick={handleJoin}
              disabled={loading || joinCode.length < 6}
              className="w-full py-2.5 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 disabled:opacity-50 transition flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />}
              {t('Join Room')}
            </button>
          </div>
        </BorderGlow>
      )}
    </div>
  );
}
