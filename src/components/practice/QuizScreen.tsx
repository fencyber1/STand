import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCircle } from 'lucide-react';
import type { Question } from '../../types';

interface QuizState {
  questions: Question[];
  topic: string;
  sector: string;
  level: string;
  questionType: string;
}

interface Result {
  questionId: string;
  userAnswer: string | string[];
  correct: boolean | null;
  explanation: string;
  score?: number;
}

export default function QuizScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as QuizState | null;

  if (!state?.questions?.length) {
    navigate('/practice');
    return null;
  }

  const { questions, topic, sector, level } = state;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | string[] | null>(null);
  const [textAnswer, setTextAnswer] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [results, setResults] = useState<Result[]>([]);

  const current = questions[currentIndex];
  const isLast = currentIndex === questions.length - 1;
  const progress = ((currentIndex + 1) / questions.length) * 100;

  const handleSubmit = () => {
    let result: Result;

    if (current.type === 'MCQ') {
      const isCorrect = selectedAnswer === current.correctAnswer;
      result = {
        questionId: current.id,
        userAnswer: selectedAnswer || '',
        correct: isCorrect,
        explanation: current.explanation,
      };
    } else if (current.type === 'Theory') {
      const score = Math.min(100, Math.max(40, textAnswer.length * 2));
      result = {
        questionId: current.id,
        userAnswer: textAnswer,
        correct: null,
        explanation: current.explanation,
        score,
      };
    } else if (current.type === 'TrueFalse') {
      const isCorrect = selectedAnswer === current.correctAnswer;
      result = {
        questionId: current.id,
        userAnswer: selectedAnswer || '',
        correct: isCorrect,
        explanation: current.explanation,
      };
    } else {
      const isCorrect = textAnswer.trim().toLowerCase() === (current.correctAnswer as string).toLowerCase();
      result = {
        questionId: current.id,
        userAnswer: textAnswer,
        correct: isCorrect,
        explanation: current.explanation,
      };
    }

    setResults((prev) => [...prev, result]);
    setShowResult(true);
  };

  const handleNext = () => {
    if (isLast) {
      const allResults = [...results];
      if (!showResult) return;
      const correctCount = allResults.filter((r) => r.correct === true).length;
      const totalScore = allResults.reduce((s, r) => s + (r.score || (r.correct ? 100 : 0)), 0);
      navigate('/results', {
        state: { topic, sector, level, results: allResults, correctCount, totalCount: questions.length, totalScore },
      });
    } else {
      setCurrentIndex((i) => i + 1);
      setSelectedAnswer(null);
      setTextAnswer('');
      setShowResult(false);
    }
  };

  const handleMCQSelect = (option: string) => {
    if (showResult) return;
    setSelectedAnswer(option);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-4">
        <button onClick={() => navigate('/practice')} className="text-gray-500 hover:text-gray-700 text-sm mb-2 flex items-center gap-1">
          <ArrowLeft size={14} /> Back to Practice
        </button>
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-lg font-semibold text-gray-800 truncate">{topic}</h2>
          <span className="text-sm text-gray-500 whitespace-nowrap ml-2">
            {currentIndex + 1} / {questions.length}
          </span>
        </div>
        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full bg-primary-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="mb-4">
          <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded ${
            current.type === 'MCQ' ? 'bg-blue-100 text-blue-700' :
            current.type === 'Theory' ? 'bg-purple-100 text-purple-700' :
            current.type === 'TrueFalse' ? 'bg-green-100 text-green-700' :
            'bg-orange-100 text-orange-700'
          }`}>
            {current.type}
          </span>
          <span className={`ml-2 inline-block px-2 py-0.5 text-xs font-medium rounded ${
            current.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
            current.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' :
            'bg-red-100 text-red-700'
          }`}>
            {current.difficulty}
          </span>
        </div>

        <p className="text-gray-800 text-lg mb-6 leading-relaxed">{current.question}</p>

        {current.type === 'MCQ' && current.options && (
          <div className="space-y-3 mb-6">
            {current.options.map((opt, i) => (
              <button
                key={i}
                onClick={() => handleMCQSelect(opt)}
                disabled={showResult}
                className={`w-full text-left p-4 rounded-lg border-2 transition ${
                  showResult && opt === current.correctAnswer
                    ? 'border-green-500 bg-green-50 text-green-800'
                    : showResult && selectedAnswer === opt && opt !== current.correctAnswer
                    ? 'border-red-500 bg-red-50 text-red-800'
                    : selectedAnswer === opt
                    ? 'border-primary-500 bg-primary-50 text-primary-800'
                    : 'border-gray-200 hover:border-gray-300 text-gray-700'
                }`}
              >
                <span className="font-medium">{String.fromCharCode(65 + i)}.</span> {opt}
              </button>
            ))}
          </div>
        )}

        {current.type === 'TrueFalse' && (
          <div className="flex gap-4 mb-6">
            {['True', 'False'].map((opt) => (
              <button
                key={opt}
                onClick={() => handleMCQSelect(opt)}
                disabled={showResult}
                className={`flex-1 p-4 rounded-lg border-2 text-center font-medium transition ${
                  showResult && opt === current.correctAnswer
                    ? 'border-green-500 bg-green-50 text-green-800'
                    : showResult && selectedAnswer === opt && opt !== current.correctAnswer
                    ? 'border-red-500 bg-red-50 text-red-800'
                    : selectedAnswer === opt
                    ? 'border-primary-500 bg-primary-50 text-primary-800'
                    : 'border-gray-200 hover:border-gray-300 text-gray-700'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        )}

        {(current.type === 'Theory' || current.type === 'FillBlank' || current.type === 'Matching') && (
          <div className="mb-6">
            <textarea
              value={textAnswer}
              onChange={(e) => setTextAnswer(e.target.value)}
              disabled={showResult}
              placeholder={current.type === 'Theory' ? 'Type your answer here...' : 'Enter your answer...'}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition resize-none h-32"
            />
          </div>
        )}

        {showResult && (
          <div className="mb-6 p-4 bg-blue-50 border-l-4 border-primary-500 rounded-lg">
            <p className="text-sm font-semibold text-primary-700 mb-1">Explanation</p>
            <p className="text-gray-700 text-sm leading-relaxed">{current.explanation}</p>
            {current.type === 'Theory' && results[results.length - 1]?.score != null && (
              <p className="mt-2 font-semibold text-primary-700">
                Score: {results[results.length - 1].score}/100
              </p>
            )}
            {current.correctAnswer && current.type !== 'Theory' && (
              <p className="mt-2 text-sm text-green-700 font-medium">
                Correct Answer: {Array.isArray(current.correctAnswer) ? current.correctAnswer.join(', ') : current.correctAnswer}
              </p>
            )}
          </div>
        )}

        <div className="flex gap-3">
          {!showResult ? (
            <button
              onClick={handleSubmit}
              disabled={
                (current.type === 'MCQ' || current.type === 'TrueFalse') && !selectedAnswer
              }
              className="flex-1 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 disabled:opacity-50 transition flex items-center justify-center gap-2"
            >
              <CheckCircle size={18} />
              Submit Answer
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="flex-1 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition flex items-center justify-center gap-2"
            >
              {isLast ? 'View Results' : 'Next Question'}
              <ArrowRight size={18} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
