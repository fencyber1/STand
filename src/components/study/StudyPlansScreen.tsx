import { useState, useEffect } from 'react';
import { storage } from '../../services/storage';
import { Plus, Trash2, CalendarDays, Target, Flame } from 'lucide-react';
import { SECTORS } from '../../constants';

interface StudyPlan {
  id: string;
  goal: string;
  targetDate: string;
  dailyGoal: number;
  currentStreak: number;
  completedDays: number;
  totalDays: number;
  subjects: string[];
}

export default function StudyPlansScreen() {
  const [plans, setPlans] = useState<StudyPlan[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [goal, setGoal] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [dailyGoal, setDailyGoal] = useState(30);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);

  useEffect(() => {
    setPlans(storage.getStudyPlans());
  }, []);

  const handleCreate = () => {
    if (!goal || !targetDate || selectedSubjects.length === 0) return;

    const start = new Date();
    const end = new Date(targetDate);
    const totalDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));

    const newPlan: StudyPlan = {
      id: Date.now().toString(),
      goal,
      targetDate,
      dailyGoal,
      currentStreak: 0,
      completedDays: 0,
      totalDays,
      subjects: selectedSubjects,
    };

    storage.saveStudyPlan(newPlan);
    setPlans(storage.getStudyPlans());
    setShowForm(false);
    setGoal('');
    setTargetDate('');
    setDailyGoal(30);
    setSelectedSubjects([]);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Delete this study plan?')) {
      storage.deleteStudyPlan(id);
      setPlans(storage.getStudyPlans());
    }
  };

  const toggleSubject = (s: string) => {
    setSelectedSubjects((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Study Plans</h1>
          <p className="text-gray-500 dark:text-gray-400">Set goals and track your study streaks</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition"
        >
          <Plus size={16} />
          New Plan
        </button>
      </div>

      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 mb-6 space-y-4 transition-colors">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Goal</label>
            <input
              type="text"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="e.g. Ace my WAEC Mathematics exam"
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Target Date</label>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Daily Goal (min)</label>
              <input
                type="number"
                value={dailyGoal}
                onChange={(e) => setDailyGoal(Number(e.target.value))}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Subjects</label>
            <div className="flex flex-wrap gap-2">
              {SECTORS.slice(0, 8).map((s) => (
                <button
                  key={s}
                  onClick={() => toggleSubject(s)}
                  className={`px-3 py-1.5 text-xs rounded-full font-medium transition ${
                    selectedSubjects.includes(s)
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleCreate}
            disabled={!goal || !targetDate || selectedSubjects.length === 0}
            className="w-full py-2.5 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 disabled:opacity-50 transition"
          >
            Create Study Plan
          </button>
        </div>
      )}

      {plans.length === 0 ? (
        <div className="text-center py-16">
          <CalendarDays size={40} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
          <p className="text-gray-500 dark:text-gray-400">No study plans yet</p>
          <p className="text-sm text-gray-400 dark:text-gray-500">Create a plan to set goals and track progress</p>
        </div>
      ) : (
        <div className="space-y-4">
          {plans.map((plan) => {
            const progress = plan.totalDays > 0 ? (plan.completedDays / plan.totalDays) * 100 : 0;
            return (
              <div key={plan.id} className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-800 dark:text-gray-100">{plan.goal}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Target: {new Date(plan.targetDate).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(plan.id)}
                    className="text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="flex gap-6 mb-3">
                  <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
                    <Flame size={14} className="text-orange-500" />
                    {plan.currentStreak} day streak
                  </div>
                  <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
                    <Target size={14} className="text-primary-500" />
                    {plan.dailyGoal} min/day
                  </div>
                </div>

                <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-2">
                  <div
                    className="h-full bg-primary-500 rounded-full transition-all"
                    style={{ width: `${Math.min(progress, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  {plan.completedDays} / {plan.totalDays} days completed
                </p>

                <div className="flex flex-wrap gap-1.5 mt-3">
                  {plan.subjects.map((s) => (
                    <span key={s} className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded-full">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
