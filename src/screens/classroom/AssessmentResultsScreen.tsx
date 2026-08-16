import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useClassroom } from '../../contexts/ClassroomContext';
import { classroomService } from '../../services/classroomService';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Award,
  Clock,
  Brain,
  BookOpen,
  TrendingUp,
  Download,
} from 'lucide-react';
import { Assessment, Question, Submission } from '../../types/classroom';

export default function AssessmentResultsScreen() {
  const { roomId, assessmentId } = useParams<{ roomId: string; assessmentId: string }>();
  const navigate = useNavigate();
  const { currentRoom, loadRoom, subscribeToCurrentRoom } = useClassroom();
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (roomId && assessmentId) {
      loadRoom(roomId);
      loadResults();
    }

    const unsub = subscribeToCurrentRoom();
    return () => { if (unsub) unsub(); };
  }, [roomId, assessmentId, loadRoom]);

  const loadResults = async () => {
    if (!roomId || !assessmentId) return;
    setLoading(true);
    try {
      const { getAuth } = await import('firebase/auth');
      const user = getAuth().currentUser;
      if (!user) throw new Error('Not authenticated');

      const [assessmentData, submissionData] = await Promise.all([
        classroomService.getAssessmentById(assessmentId),
        classroomService.getStudentSubmission(roomId, assessmentId, user.uid),
      ]);

      if (!assessmentData) {
        setError('Assessment not found');
        return;
      }

      setAssessment(assessmentData);
      setSubmission(submissionData);
    } catch (err: any) {
      setError(err.message || 'Failed to load results');
    } finally {
      setLoading(false);
    }
  };

  const toggleQuestion = (questionId: string) => {
    setExpandedQuestions((prev) => {
      const next = new Set(prev);
      if (next.has(questionId)) next.delete(questionId);
      else next.add(questionId);
      return next;
    });
  };

  const getQuestionResult = (question: Question, answer: any) => {
    if (question.type === 'multiple_choice' || question.type === 'true_false') {
      const isCorrect = answer === question.correctAnswer;
      return { isCorrect, correctAnswer: question.correctAnswer };
    }
    if (question.type === 'short_answer') {
      const studentAns = (answer || '').toLowerCase().trim();
      const correctAns = (question.correctAnswer || '').toLowerCase().trim();
      const isCorrect = studentAns === correctAns;
      return { isCorrect, correctAnswer: question.correctAnswer };
    }
    return { isCorrect: false, correctAnswer: question.correctAnswer };
  };

  const formatAnswer = (question: Question, answer: any): string => {
    if (!answer && answer !== 0) return 'Not answered';

    if (question.type === 'multiple_choice' && question.options) {
      const idx = Number(answer);
      if (!isNaN(idx) && question.options[idx]) {
        return `${String.fromCharCode(65 + idx)}. ${question.options[idx]}`;
      }
    }
    if (question.type === 'true_false') {
      return answer === 0 ? 'True' : answer === 1 ? 'False' : String(answer);
    }
    return String(answer);
  };

  const renderQuestionReview = (question: Question, idx: number, answer: any, isCorrect: boolean, isExpanded: boolean) => {
    const isAnswered = answer !== undefined && answer !== null && answer !== '';

    return (
      <Card
        key={question.id}
        className={`bg-slate-800 border-slate-700 ${
          isAnswered ? (isCorrect ? 'border-green-500/30' : 'border-red-500/30') : 'border-slate-700'
        }`}
      >
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                isAnswered ? (isCorrect ? 'bg-green-500 text-white' : 'bg-red-500 text-white') : 'bg-slate-700 text-slate-400'
              }`}>
                {idx + 1}
              </span>
              <div>
                <h3 className="font-medium text-white">Question {idx + 1}</h3>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Badge variant={question.difficulty === 'easy' ? 'default' : question.difficulty === 'medium' ? 'secondary' : 'destructive'}>
                    {question.difficulty}
                  </Badge>
                  <span>{question.marks} marks</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isAnswered && (
                <Badge variant={isCorrect ? 'default' : 'destructive'}>
                  {isCorrect ? <CheckCircle className="w-3 h-3 mr-1" /> : <XCircle className="w-3 h-3 mr-1" />}
                  {isCorrect ? 'Correct' : 'Incorrect'}
                </Badge>
              )}
              {isAnswered && !isCorrect && question.explanation && (
                <Badge variant="outline" className="text-slate-400" onClick={() => toggleQuestion(question.id)}>
                  <Brain className="w-3 h-3 mr-1" /> Explanation
                </Badge>
              )}
              <Button variant="ghost" size="sm" onClick={() => toggleQuestion(question.id)} className="text-slate-400 hover:text-white">
                {isExpanded ? 'Hide' : 'Show'} Answer
              </Button>
            </div>
          </div>

          <p className="text-slate-300 mb-3">{question.text}</p>

          {isAnswered && (
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-700">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-medium text-slate-400">Your Answer:</span>
                  <Badge variant={isCorrect ? 'default' : 'destructive'}>
                    {isCorrect ? <CheckCircle className="w-3 h-3 mr-1" /> : <XCircle className="w-3 h-3 mr-1" />}
                    {isCorrect ? 'Correct' : 'Incorrect'}
                  </Badge>
                </div>
                <p className="text-white">{formatAnswer(question, answer)}</p>
              </div>

              {(!isCorrect || expandedQuestions.has(question.id)) && question.correctAnswer && (
                <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-green-400">Correct Answer:</span>
                    <Badge variant="default">Correct</Badge>
                  </div>
                  <p className="text-green-300">{formatAnswer(question, question.correctAnswer)}</p>
                </div>
              )}

              {question.explanation && isExpanded && (
                <div className="p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/30">
                  <div className="flex items-center gap-2 mb-1">
                    <Brain className="w-4 h-4 text-indigo-400" />
                    <span className="text-sm font-medium text-indigo-300">Explanation</span>
                  </div>
                  <p className="text-slate-300">{question.explanation}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-slate-400">Loading results...</div>
      </div>
    );
  }

  if (!assessment || error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center text-slate-400">
          <p className="text-xl font-medium text-white mb-2">Results Unavailable</p>
          <p>{error || 'Could not load assessment results.'}</p>
          <Button onClick={() => navigate(`/classroom/${roomId}/learn`)} className="mt-4">
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center text-slate-400">
          <p className="text-xl font-medium text-white mb-2">No Submission Found</p>
          <p>You haven't taken this assessment yet.</p>
          <Button onClick={() => navigate(`/classroom/${roomId}/learn/assessments/${assessmentId}`)} className="mt-4">
            Take Assessment
          </Button>
        </div>
      </div>
    );
  }

  const totalQuestions = assessment.questions?.length || 0;
  const correctCount = assessment.questions?.reduce((acc, q) => {
    const answer = submission.answers?.[q.id];
    if (!answer) return acc;
    const { isCorrect } = getQuestionResult(q, answer);
    return isCorrect ? acc + 1 : acc;
  }, 0) || 0;

  const percentage = submission.percentage ?? (totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0);
  const passed = percentage >= (assessment.passingScore || 50);
  const timeSpent = submission.submittedAt && submission.startedAt
    ? Math.round((new Date(submission.submittedAt).getTime() - new Date(submission.startedAt).getTime()) / 60000)
    : 0;

  const statusColor = passed ? 'bg-green-600' : 'bg-red-600';
  const statusText = passed ? 'PASSED' : 'NEEDS IMPROVEMENT';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col">
      <div className="border-b border-slate-700 px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate(`/classroom/${roomId}/learn`)}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-white">{assessment.title}</h1>
              <p className="text-sm text-slate-400">
                Submitted {new Date(submission.submittedAt!).toLocaleDateString()} · {timeSpent} min
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant={passed ? 'default' : 'destructive'} className="text-sm px-3 py-1">
              {statusText}
            </Badge>
            <Badge variant="secondary" className="text-sm px-3 py-1">
              {percentage}% ({correctCount}/{totalQuestions})
            </Badge>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6 flex-1 overflow-y-auto w-full">
        <section className="mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card className="bg-slate-800 border-slate-700 p-6 text-center">
              <div className={`w-16 h-16 rounded-2xl ${statusColor}/20 flex items-center justify-center mx-auto mb-3`}>
                {passed ? <CheckCircle className="w-8 h-8 text-green-400" /> : <XCircle className="w-8 h-8 text-red-400" />}
              </div>
              <p className="text-3xl font-bold text-white">{percentage}%</p>
              <p className="text-sm text-slate-400">Overall Score</p>
            </Card>

            <Card className="bg-slate-800 border-slate-700 p-6 text-center">
              <div className="w-16 h-16 rounded-2xl bg-blue-600/20 flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="w-8 h-8 text-blue-400" />
              </div>
              <p className="text-3xl font-bold text-white">{correctCount}</p>
              <p className="text-sm text-slate-400">Correct</p>
            </Card>

            <Card className="bg-slate-800 border-slate-700 p-6 text-center">
              <div className="w-16 h-16 rounded-2xl bg-yellow-600/20 flex items-center justify-center mx-auto mb-3">
                <XCircle className="w-8 h-8 text-yellow-400" />
              </div>
              <p className="text-3xl font-bold text-white">{totalQuestions - correctCount}</p>
              <p className="text-sm text-slate-400">Incorrect</p>
            </Card>

            <Card className="bg-slate-800 border-slate-700 p-6 text-center">
              <div className="w-16 h-16 rounded-2xl bg-purple-600/20 flex items-center justify-center mx-auto mb-3">
                <Clock className="w-8 h-8 text-purple-400" />
              </div>
              <p className="text-3xl font-bold text-white">{timeSpent}</p>
              <p className="text-sm text-slate-400">Minutes</p>
            </Card>
          </div>

          <div className="bg-slate-700 rounded-full h-4">
            <div
              className={`h-4 rounded-full transition-all duration-700 ${
                passed ? 'bg-gradient-to-r from-green-500 to-emerald-500' : 'bg-gradient-to-r from-red-500 to-orange-500'
              }`}
              style={{ width: `${percentage}%` }}
            />
          </div>
          <div className="flex justify-between text-sm text-slate-400 mt-2">
            <span>0%</span>
            <span className="font-semibold text-white">{percentage}%</span>
            <span>100%</span>
          </div>
          <p className="text-center text-sm text-slate-400 mt-2">
            Passing score: {assessment.passingScore}% · {passed ? 'Congratulations!' : 'Keep practicing to improve.'}
          </p>
        </section>

        {error && (
          <div className="bg-red-900/30 border border-red-800 text-red-300 p-3 rounded-md mb-4">
            {error}
          </div>
        )}

        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              Question Review
            </h2>
            <Badge variant="secondary" className="text-sm">
              {assessment.questions?.length} Questions
            </Badge>
          </div>

          <div className="space-y-3">
            {assessment.questions?.map((question, idx) => {
              const answer = submission.answers?.[question.id];
              const isAnswered = answer !== undefined && answer !== null && answer !== '';
              const { isCorrect } = getQuestionResult(question, answer);
              const isExpanded = expandedQuestions.has(question.id);

              return renderQuestionReview(question, idx, answer, isCorrect, isExpanded);
            })}
          </div>
        </section>

        <div className="flex justify-center gap-4 mt-8 pt-6 border-t border-slate-700">
          <Button variant="outline" onClick={() => navigate(`/classroom/${roomId}/learn`)}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
          </Button>
          <Button variant="outline" onClick={() => navigate(`/classroom/${roomId}/learn/assessments/${assessmentId}`)}>
            <Brain className="w-4 h-4 mr-2" /> Retake Assessment
          </Button>
        </div>
      </div>
    </div>
  );
}