import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Trophy, CheckCircle, XCircle, Home, RotateCcw } from 'lucide-react';
import { storage } from '../../services/storage';
import { useEffect } from 'react';

interface ResultsState {
  topic: string;
  sector: string;
  level: string;
  results: Array<{
    questionId: string;
    userAnswer: string | string[];
    correct: boolean | null;
    explanation: string;
    score?: number;
  }>;
  correctCount: number;
  totalCount: number;
  totalScore: number;
}

export default function ResultsScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as ResultsState | null;

  useEffect(() => {
    if (state) {
      const percentage = Math.round((state.correctCount / state.totalCount) * 100);
      storage.saveSession({
        id: Date.now().toString(),
        topic: state.topic,
        sector: state.sector,
        level: state.level,
        questionType: 'Mixed',
        date: new Date().toISOString(),
        score: percentage,
        totalQuestions: state.totalCount,
        correctAnswers: state.correctCount,
      });
    }
  }, []);

  if (!state) {
    navigate('/practice');
    return null;
  }

  const { topic, results, correctCount, totalCount } = state;
  const percentage = Math.round((correctCount / totalCount) * 100);
  const avgTheoryScore = results
    .filter((r) => r.score != null)
    .reduce((s, r, _, arr) => s + (r.score || 0) / (arr.length || 1), 0);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center">
        <div className="inline-flex p-4 bg-primary-50 rounded-full mb-3">
          <Trophy size={32} className="text-primary-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-800">Results</h1>
        <p className="text-gray-500">{topic}</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
          <p className={`text-3xl font-bold ${percentage >= 70 ? 'text-green-600' : percentage >= 50 ? 'text-orange-600' : 'text-red-600'}`}>
            {percentage}%
          </p>
          <p className="text-sm text-gray-500 mt-1">Score</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
          <p className="text-3xl font-bold text-primary-600">
            {correctCount}/{totalCount}
          </p>
          <p className="text-sm text-gray-500 mt-1">Correct</p>
        </div>
        {avgTheoryScore > 0 && (
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
            <p className="text-3xl font-bold text-purple-600">{Math.round(avgTheoryScore)}</p>
            <p className="text-sm text-gray-500 mt-1">Avg Theory</p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h3 className="font-semibold text-gray-800 mb-2">Performance Summary</h3>
        <p className={`text-sm ${
          percentage >= 80 ? 'text-green-600' : percentage >= 60 ? 'text-orange-600' : 'text-red-600'
        }`}>
          {percentage >= 80
            ? 'Excellent work! You have a strong understanding of this topic.'
            : percentage >= 60
            ? 'Good effort! Consider reviewing some areas for improvement.'
            : 'Keep practicing! Review the material and try again.'}
        </p>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h3 className="font-semibold text-gray-800 mb-4">Question Details</h3>
        <div className="space-y-4">
          {results.map((r, i) => (
            <div key={r.questionId} className="p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                {r.correct === true ? (
                  <CheckCircle size={16} className="text-green-600" />
                ) : r.correct === false ? (
                  <XCircle size={16} className="text-red-600" />
                ) : (
                  <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded font-medium">
                    Score: {r.score}
                  </span>
                )}
                <span className="text-sm font-medium text-gray-700">Question {i + 1}</span>
              </div>
              <p className="text-sm text-gray-600">{r.explanation}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <Link
          to="/practice"
          className="flex-1 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition flex items-center justify-center gap-2"
        >
          <Home size={18} />
          New Topic
        </Link>
        <button
          onClick={() => navigate(-1)}
          className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition flex items-center justify-center gap-2"
        >
          <RotateCcw size={18} />
          Try Again
        </button>
      </div>
    </div>
  );
}
