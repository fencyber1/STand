import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRightLeft, Calendar, Clock, CheckCircle, XCircle } from 'lucide-react';
import { storage } from '../../services/storage';
import type { SessionData } from '../../types';
import BorderGlow from '../ui/BorderGlow';

export default function SessionCompareScreen() {
  const navigate = useNavigate();
  const history = useMemo(() => storage.getHistory().slice().reverse(), []);
  const [leftId, setLeftId] = useState<string>('');
  const [rightId, setRightId] = useState<string>('');

  const left = history.find((h) => h.id === leftId);
  const right = history.find((h) => h.id === rightId);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const diff = (a: number, b: number) => {
    const d = a - b;
    if (d > 0) return `+${d}`;
    return String(d);
  };

  const diffColor = (a: number, b: number) => {
    if (a > b) return 'text-green-600 dark:text-green-400';
    if (a < b) return 'text-red-600 dark:text-red-400';
    return 'text-gray-500 dark:text-gray-400';
  };

  return (
    <div className="max-w-2xl mx-auto">
      <button onClick={() => navigate(-1)} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-sm mb-4 flex items-center gap-1">
        <ArrowLeft size={14} /> Back
      </button>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Compare Sessions</h1>
        <p className="text-gray-500 dark:text-gray-400">Pick two sessions to compare side by side</p>
      </div>

      {history.length < 2 ? (
        <div className="text-center py-16">
          <ArrowRightLeft size={40} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
          <p className="text-gray-500 dark:text-gray-400">Need at least 2 sessions to compare</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Session A</label>
              <select
                value={leftId}
                onChange={(e) => setLeftId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
              >
                <option value="">Select...</option>
                {history.map((h) => (
                  <option key={h.id} value={h.id}>{h.topic} ({h.score ?? 0}%)</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Session B</label>
              <select
                value={rightId}
                onChange={(e) => setRightId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
              >
                <option value="">Select...</option>
                {history.map((h) => (
                  <option key={h.id} value={h.id}>{h.topic} ({h.score ?? 0}%)</option>
                ))}
              </select>
            </div>
          </div>

          {left && right && (
            <BorderGlow
              backgroundColor="#1f2937"
              borderRadius={12}
              glowColor="220 80 70"
              glowRadius={20}
              glowIntensity={0.5}
              colors={['#6366f1', '#8b5cf6', '#3b82f6']}
            >
              <div className="p-6 dark:bg-gray-800">
                <div className="grid grid-cols-3 gap-2 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 mb-3 pb-2 border-b border-gray-200 dark:border-gray-700">
                  <div>Metric</div>
                  <div>Session A</div>
                  <div>Session B</div>
                </div>

                <CompareRow
                  label="Score"
                  a={left.score ?? 0}
                  b={right.score ?? 0}
                  suffix="%"
                  format={(v) => `${v}%`}
                />
                <CompareRow
                  label="Correct"
                  a={left.correctAnswers ?? 0}
                  b={right.correctAnswers ?? 0}
                  format={(v) => String(v)}
                />
                <CompareRow
                  label="Total"
                  a={left.totalQuestions ?? 0}
                  b={right.totalQuestions ?? 0}
                  format={(v) => String(v)}
                />
                <CompareRow
                  label="Accuracy"
                  a={left.totalQuestions ? Math.round(((left.correctAnswers ?? 0) / left.totalQuestions) * 100) : 0}
                  b={right.totalQuestions ? Math.round(((right.correctAnswers ?? 0) / right.totalQuestions) * 100) : 0}
                  format={(v) => `${v}%`}
                />
                <CompareRow
                  label="Topic"
                  aLabel={left.topic}
                  bLabel={right.topic}
                  isText
                />
                <CompareRow
                  label="Subject"
                  aLabel={left.sector}
                  bLabel={right.sector}
                  isText
                />
                <CompareRow
                  label="Date"
                  aLabel={formatDate(left.date)}
                  bLabel={formatDate(right.date)}
                  isText
                />

                <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-1">Verdict</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {(left.score ?? 0) > (right.score ?? 0)
                      ? `Session A (${left.topic}) scored ${diff(left.score ?? 0, right.score ?? 0)}% higher.`
                      : (left.score ?? 0) < (right.score ?? 0)
                      ? `Session B (${right.topic}) scored ${diff(right.score ?? 0, left.score ?? 0)}% higher.`
                      : 'Both sessions scored equally!'}
                  </p>
                </div>
              </div>
            </BorderGlow>
          )}
        </>
      )}
    </div>
  );
}

function CompareRow({ label, a, b, suffix = '', format, aLabel, bLabel, isText = false }: {
  label: string;
  a?: number;
  b?: number;
  suffix?: string;
  format?: (v: number) => string;
  aLabel?: string;
  bLabel?: string;
  isText?: boolean;
}) {
  return (
    <div className="grid grid-cols-3 gap-2 text-center py-2 border-b border-gray-100 dark:border-gray-700/50 last:border-0">
      <div className="text-sm text-gray-500 dark:text-gray-400">{label}</div>
      {isText ? (
        <>
          <div className="text-sm font-medium text-gray-800 dark:text-gray-100">{aLabel}</div>
          <div className="text-sm font-medium text-gray-800 dark:text-gray-100">{bLabel}</div>
        </>
      ) : (
        <>
          <div className="text-sm font-medium text-gray-800 dark:text-gray-100">{format ? format(a ?? 0) : a}</div>
          <div className="text-sm font-medium text-gray-800 dark:text-gray-100">{format ? format(b ?? 0) : b}</div>
        </>
      )}
    </div>
  );
}
