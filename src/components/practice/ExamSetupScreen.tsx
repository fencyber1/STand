import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Shield, Timer, AlertTriangle } from 'lucide-react';
import { SECTORS, LEVELS, COUNT_OPTIONS } from '../../constants';
import { generateQuestions } from '../../services/api';

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

export default function ExamSetupScreen() {
  const navigate = useNavigate();
  const [topic, setTopic] = useState('');
  const [sector, setSector] = useState(SECTORS[0]);
  const [customSector, setCustomSector] = useState('');
  const [level, setLevel] = useState(LEVELS[0]);
  const [studentAge, setStudentAge] = useState('8');
  const [ageError, setAgeError] = useState('');
  const [count, setCount] = useState(20);
  const [timerH, setTimerH] = useState(0);
  const [timerM, setTimerM] = useState(30);
  const [timerS, setTimerS] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const timeLimit = hmsToSeconds(timerH, timerM, timerS);

  const applyPreset = (seconds: number) => {
    const { h, m, s } = secondsToHms(seconds);
    setTimerH(h);
    setTimerM(m);
    setTimerS(s);
  };

  const handleStart = async () => {
    setError('');
    if (!topic.trim()) {
      setError('Please enter a topic');
      return;
    }
    if (sector === 'Other' && !customSector.trim()) {
      setError('Please enter your course name');
      return;
    }
    if (timeLimit <= 0) {
      setError('Please set a time limit');
      return;
    }

    setLoading(true);
    try {
      const actualSector = sector === 'Other' ? (customSector.trim() || 'General') : sector;
      const age = level === 'PRIMARY/BASIC' ? (Number(studentAge) || 8) : undefined;
      const result = await generateQuestions({
        topic,
        sector: actualSector,
        level,
        questionType: 'MCQ',
        count,
        studentAge: age && age >= 4 && age <= 12 ? age : undefined,
      });
      navigate('/exam', {
        state: { questions: result.questions, topic, sector: actualSector, level, timeLimit },
      });
    } catch (err: any) {
      setError(err.message || 'Failed to generate questions.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Shield size={24} className="text-orange-600 dark:text-orange-400" />
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Exam Simulation</h1>
        </div>
        <p className="text-gray-500 dark:text-gray-400">Strict timed exam with no interruptions</p>
      </div>

      <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl p-4 mb-6">
        <div className="flex items-start gap-3">
          <AlertTriangle size={18} className="text-orange-600 dark:text-orange-400 mt-0.5 shrink-0" />
          <div className="text-sm text-orange-800 dark:text-orange-300">
            <p className="font-semibold mb-1">Exam Mode Rules:</p>
            <ul className="list-disc list-inside space-y-0.5 text-orange-700 dark:text-orange-400">
              <li>Strict countdown timer — cannot be paused</li>
              <li>No explanations shown during the exam</li>
              <li>Results revealed only after submission</li>
              <li>Unanswered questions marked wrong on expiry</li>
            </ul>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm rounded-lg">{error}</div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 space-y-5 transition-colors">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Topic</label>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. Database Systems, Organic Chemistry, Constitutional Law"
            className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Course Sector</label>
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
                placeholder="e.g. Graphic Designing, Music..."
                autoFocus
                className="mt-2 w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition"
              />
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Education Level</label>
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
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Student's Age (4–12)</label>
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
                  className={`w-full px-4 py-2.5 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition ${ageError ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                />
                {ageError ? (
                  <p className="text-xs text-red-500 dark:text-red-400 mt-1">{ageError}</p>
                ) : (
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Questions tailored for this age</p>
                )}
              </div>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Number of Questions</label>
          <select
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition"
          >
            {[10, 15, 20, 25, 30, 40, 50].map((c) => (
              <option key={c} value={c}>{c} questions</option>
            ))}
          </select>
        </div>

        <div>
          <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            <Timer size={14} /> Time Limit (required)
          </label>
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
        </div>

        <button
          onClick={handleStart}
          disabled={loading || timeLimit <= 0}
          className="w-full py-3 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 disabled:opacity-50 transition flex items-center justify-center gap-2"
        >
          {loading && <Loader2 size={18} className="animate-spin" />}
          {loading ? 'Generating Exam...' : 'Start Exam'}
        </button>
      </div>
    </div>
  );
}
