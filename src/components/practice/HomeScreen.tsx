import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Timer, Shuffle, Zap, BarChart3, Rocket, ChevronRight, ChevronLeft } from 'lucide-react';
import { SECTORS, LEVELS, QUESTION_TYPES, COUNT_OPTIONS } from '../../constants';
import { generateQuestions, setQuestionProgressCallback } from '../../services/api';
import { useLanguage } from '../../contexts/LanguageContext';

const TIMER_PRESETS = [
  { label: '5m', value: 300 },
  { label: '10m', value: 600 },
  { label: '15m', value: 900 },
  { label: '30m', value: 1800 },
  { label: '1h', value: 3600 },
  { label: '2h', value: 7200 },
];

function secondsToHms(total: number) {
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return { h, m, s };
}

function hmsToSeconds(h: number, m: number, s: number) {
  return h * 3600 + m * 60 + s;
}

export default function HomeScreen() {
  const { t, language } = useLanguage();
  const [step, setStep] = useState(1);
  const [topic, setTopic] = useState('');
  const [sector, setSector] = useState(SECTORS[0]);
  const [customSector, setCustomSector] = useState('');
  const [level, setLevel] = useState(LEVELS[0]);
  const [studentAge, setStudentAge] = useState('8');
  const [ageError, setAgeError] = useState('');
  const [questionType, setQuestionType] = useState(QUESTION_TYPES[0]);
  const [count, setCount] = useState(COUNT_OPTIONS[2]);
  const [timerH, setTimerH] = useState(0);
  const [timerM, setTimerM] = useState(10);
  const [timerS, setTimerS] = useState(0);
  const [useTimer, setUseTimer] = useState(true);
  const [shuffle, setShuffle] = useState(false);
  const [difficulty, setDifficulty] = useState('all');
  const [instantFeedback, setInstantFeedback] = useState(false);
  const [speedRound, setSpeedRound] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const timeLimit = useTimer ? hmsToSeconds(timerH, timerM, timerS) : 0;

  const applyPreset = (seconds: number) => {
    const { h, m, s } = secondsToHms(seconds);
    setTimerH(h);
    setTimerM(m);
    setTimerS(s);
    setUseTimer(true);
  };

  const handleNext = () => {
    if (!topic.trim()) {
      setError(t('Please enter a topic'));
      return;
    }
    if (sector === 'Other' && !customSector.trim()) {
      setError(t('Please enter your course name'));
      return;
    }
    setError('');
    setStep(2);
  };

  const handleGenerate = async () => {
    setError('');
    setLoading(true);
    setProgress(null);
    setQuestionProgressCallback((current, total) => setProgress({ current, total }));
    try {
      const actualSector = sector === 'Other' ? (customSector.trim() || 'General') : sector;
      const age = level === 'PRIMARY/BASIC' ? (Number(studentAge) || 8) : undefined;
      const result = await generateQuestions({
        topic,
        sector: actualSector,
        level,
        questionType: questionType.split(' ')[0],
        count,
        difficulty,
        studentAge: age && age >= 4 && age <= 12 ? age : undefined,
        language,
      });
      let questions = result.questions;
      if (shuffle) {
        questions = [...questions].sort(() => Math.random() - 0.5);
      }
      navigate('/quiz', {
        state: { questions, topic, sector, level, questionType, timeLimit, instantFeedback, speedRound },
      });
    } catch (err: any) {
      console.error('Question generation error:', err);
      setError(err.message || t('Failed to generate questions. Please try again.'));
    } finally {
      setQuestionProgressCallback(null);
      setProgress(null);
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{t('Practice Setup')}</h1>
        <p className="text-gray-500 dark:text-gray-400">{t('Configure your practice session')}</p>
      </div>

      <div className="flex items-center gap-2 mb-6">
        <div className={`flex-1 h-1.5 rounded-full transition-colors ${step >= 1 ? 'bg-primary-500' : 'bg-gray-200 dark:bg-gray-700'}`} />
        <div className={`flex-1 h-1.5 rounded-full transition-colors ${step >= 2 ? 'bg-primary-500' : 'bg-gray-200 dark:bg-gray-700'}`} />
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm rounded-lg">{error}</div>
      )}

      {step === 1 && (
        <div data-tour-id="tour-topic-input" className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 space-y-5 transition-colors">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('Topic')}</label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Photosynthesis, Python loops, The Human Heart"
              autoFocus
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('Course Sector')}</label>
            <select
              value={sector}
              onChange={(e) => setSector(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition"
            >
              {SECTORS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            {sector === 'Other' && (
              <input
                type="text"
                value={customSector}
                onChange={(e) => setCustomSector(e.target.value)}
                placeholder="e.g. Graphic Designing, Music, Catering..."
                autoFocus
                className="mt-2 w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition"
              />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('Education Level')}</label>
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition"
            >
              {LEVELS.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
            {level === 'PRIMARY/BASIC' && (
              <div className="mt-2">
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t("Student's Age (4–12)")}</label>
                <input
                  type="number"
                  min={4}
                  max={12}
                  value={studentAge}
                  onChange={(e) => { setStudentAge(e.target.value); setAgeError(''); }}
                  onBlur={() => {
                    const n = Number(studentAge);
                    if (!studentAge || isNaN(n)) { setStudentAge('8'); setAgeError(''); return; }
                    if (n < 4 || n > 12) { setAgeError(t('Age must be between 4 and 12')); setStudentAge(studentAge); return; }
                    setAgeError('');
                  }}
                  className={`w-full px-4 py-2.5 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition ${ageError ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                />
                {ageError ? (
                  <p className="text-xs text-red-500 dark:text-red-400 mt-1">{ageError}</p>
                ) : (
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{t('Questions will be tailored to this age group')}</p>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('Question Type')}</label>
            <select
              value={questionType}
              onChange={(e) => setQuestionType(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition"
            >
              {QUESTION_TYPES.map((qt) => (
                <option key={qt} value={qt}>{qt}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('Number of Questions')}</label>
            <select
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition"
            >
              {COUNT_OPTIONS.map((c) => (
                <option key={c} value={c}>{c} {t('questions')}</option>
              ))}
            </select>
          </div>

          <button
            onClick={handleNext}
            className="w-full py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition flex items-center justify-center gap-2"
          >
            {t('Next')}
            <ChevronRight size={18} />
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 space-y-5 transition-colors">
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 text-sm text-gray-600 dark:text-gray-400">
            <span className="font-medium text-gray-800 dark:text-gray-200">{topic}</span> &middot; {sector === 'Other' ? (customSector.trim() || 'General') : sector} &middot; {level}{level === 'PRIMARY/BASIC' ? ` (${t('Age')} ${studentAge})` : ''} &middot; {count} {t('questions')}
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Timer size={14} /> {t('Time Limit')}
            </label>
            <div className="flex items-center gap-2 mb-2">
              <button
                onClick={() => setUseTimer(!useTimer)}
                className={`relative w-11 h-6 rounded-full transition-colors ${useTimer ? 'bg-primary-500' : 'bg-gray-300 dark:bg-gray-600'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${useTimer ? 'translate-x-5' : ''}`} />
              </button>
              <span className="text-sm text-gray-600 dark:text-gray-400">{useTimer ? t('On') : t('Off (No Limit)')}</span>
            </div>
            {useTimer && (
              <>
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={0}
                      max={23}
                      value={timerH}
                      onChange={(e) => setTimerH(Math.min(23, Math.max(0, Number(e.target.value))))}
                      className="w-16 px-2 py-2 text-center border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition text-sm font-mono"
                    />
                    <span className="text-xs text-gray-500 dark:text-gray-400">h</span>
                  </div>
                  <span className="text-gray-400 dark:text-gray-500 font-bold">:</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={0}
                      max={59}
                      value={timerM}
                      onChange={(e) => setTimerM(Math.min(59, Math.max(0, Number(e.target.value))))}
                      className="w-16 px-2 py-2 text-center border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition text-sm font-mono"
                    />
                    <span className="text-xs text-gray-500 dark:text-gray-400">m</span>
                  </div>
                  <span className="text-gray-400 dark:text-gray-500 font-bold">:</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={0}
                      max={59}
                      value={timerS}
                      onChange={(e) => setTimerS(Math.min(59, Math.max(0, Number(e.target.value))))}
                      className="w-16 px-2 py-2 text-center border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition text-sm font-mono"
                    />
                    <span className="text-xs text-gray-500 dark:text-gray-400">s</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {TIMER_PRESETS.map((p) => (
                    <button
                      key={p.value}
                      onClick={() => applyPreset(p.value)}
                      className="px-2.5 py-1 rounded-md text-xs font-medium border border-gray-200 dark:border-gray-600 hover:border-primary-400 dark:hover:border-primary-500 text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
              <Shuffle size={14} /> {t('Shuffle Questions')}
            </label>
            <button
              onClick={() => setShuffle(!shuffle)}
              className={`relative w-11 h-6 rounded-full transition-colors ${shuffle ? 'bg-primary-500' : 'bg-gray-300 dark:bg-gray-600'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${shuffle ? 'translate-x-5' : ''}`} />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
              <Zap size={14} /> {t('Instant Feedback')}
            </label>
            <button
              onClick={() => setInstantFeedback(!instantFeedback)}
              className={`relative w-11 h-6 rounded-full transition-colors ${instantFeedback ? 'bg-primary-500' : 'bg-gray-300 dark:bg-gray-600'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${instantFeedback ? 'translate-x-5' : ''}`} />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
              <Rocket size={14} /> {t('Speed Round (30s/question)')}
            </label>
            <button
              onClick={() => setSpeedRound(!speedRound)}
              className={`relative w-11 h-6 rounded-full transition-colors ${speedRound ? 'bg-orange-500' : 'bg-gray-300 dark:bg-gray-600'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${speedRound ? 'translate-x-5' : ''}`} />
            </button>
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <BarChart3 size={14} /> {t('Difficulty')}
            </label>
            <div className="flex gap-2">
              {[
                { value: 'all', label: t('All Levels'), color: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300' },
                { value: 'easy', label: t('Easy'), color: 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300' },
                { value: 'medium', label: t('Medium'), color: 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300' },
                { value: 'hard', label: t('Hard'), color: 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300' },
              ].map((d) => (
                <button
                  key={d.value}
                  onClick={() => setDifficulty(d.value)}
                  className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium border-2 transition ${
                    difficulty === d.value
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                      : `border-transparent ${d.color} hover:opacity-80`
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep(1)}
              className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-200 dark:hover:bg-gray-600 transition flex items-center justify-center gap-2"
            >
              <ChevronLeft size={18} />
              {t('Back')}
            </button>
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="flex-1 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 disabled:opacity-50 transition flex items-center justify-center gap-2"
            >
              {loading && <Loader2 size={18} className="animate-spin" />}
              {loading ? (progress ? `${t('Generating...')} ${progress.current}/${progress.total}` : t('Generating...')) : t('Generate Questions')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
