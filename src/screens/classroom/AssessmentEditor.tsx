import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useClassroom } from '../../contexts/ClassroomContext';
import { classroomService } from '../../services/classroomService';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  Loader2,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { Assessment, Question } from '../../types/classroom';

type QType = Question['type'];

const nextId = () =>
  `q_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

function blankQuestion(type: QType): Question {
  return {
    id: nextId(),
    text: '',
    type,
    options: type === 'multiple_choice' ? ['', '', '', ''] : undefined,
    correctAnswer: type === 'multiple_choice' || type === 'true_false' ? 0 : '',
    explanation: '',
    difficulty: 'medium',
    marks: 1,
    order: 0,
    source: 'manual',
    createdAt: new Date(),
  };
}

/**
 * Teacher editor for an assessment: settings + full question builder.
 * Fills the previously dead-end "Edit" action in the assessments list.
 */
export default function AssessmentEditor() {
  const { roomId, assessmentId } = useParams<{ roomId: string; assessmentId: string }>();
  const navigate = useNavigate();
  const { currentRoom, loadRoom } = useClassroom();

  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [passingScore, setPassingScore] = useState(50);
  const [maxAttempts, setMaxAttempts] = useState(1);
  const [status, setStatus] = useState<Assessment['status']>('draft');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (roomId) loadRoom(roomId);
    if (assessmentId) loadAssessment();
  }, [roomId, assessmentId]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadAssessment = async () => {
    if (!assessmentId) return;
    setLoading(true);
    try {
      const data = await classroomService.getAssessmentById(assessmentId);
      if (!data) {
        setError('Assessment not found');
        return;
      }
      setAssessment(data);
      setTitle(data.title);
      setDescription(data.description || '');
      setDurationMinutes(data.durationMinutes || 60);
      setPassingScore(data.passingScore ?? 50);
      setMaxAttempts(data.maxAttempts || 1);
      setStatus(data.status);
      setStartsAt(data.startsAt ? toLocalInput(new Date(data.startsAt)) : '');
      setEndsAt(data.endsAt ? toLocalInput(new Date(data.endsAt)) : '');
      setQuestions([...(data.questions || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)));
    } catch (err: any) {
      setError(err.message || 'Failed to load assessment');
    } finally {
      setLoading(false);
    }
  };

  const toLocalInput = (d: Date) => {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const updateQuestion = (id: string, patch: Partial<Question>) => {
    setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, ...patch } : q)));
  };

  const updateOption = (id: string, idx: number, value: string) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== id) return q;
        const options = [...(q.options || [])];
        options[idx] = value;
        return { ...q, options };
      })
    );
  };

  const addQuestion = (type: QType) => setQuestions((prev) => [...prev, blankQuestion(type)]);

  const removeQuestion = (id: string) =>
    setQuestions((prev) => prev.filter((q) => q.id !== id));

  const moveQuestion = (id: string, dir: -1 | 1) => {
    setQuestions((prev) => {
      const i = prev.findIndex((q) => q.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  };

  const handleSave = async () => {
    if (!assessmentId || !roomId) return;
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    // Drop empty questions, then re-number order + auto-sync counts
    const cleaned = questions
      .filter((q) => q.text.trim().length > 0)
      .map((q, i) => ({ ...q, order: i }));
    const totalMarks = cleaned.reduce((sum, q) => sum + (Number(q.marks) || 0), 0);

    setSaving(true);
    setError('');
    try {
      await classroomService.updateAssessment(assessmentId, {
        title: title.trim(),
        description: description || undefined,
        durationMinutes: Math.max(1, Number(durationMinutes) || 60),
        passingScore: Math.min(100, Math.max(0, Number(passingScore) || 0)),
        maxAttempts: Math.max(1, Number(maxAttempts) || 1),
        status,
        startsAt: startsAt ? new Date(startsAt) : undefined,
        endsAt: endsAt ? new Date(endsAt) : undefined,
        questions: cleaned,
        questionCount: cleaned.length,
        totalMarks,
      });
      navigate(`/classroom/${roomId}/assessments`);
    } catch (err: any) {
      setError(err.message || 'Failed to save assessment');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-slate-400">Loading assessment...</div>
      </div>
    );
  }

  if (!assessment && !loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center text-slate-400">
          <p className="text-xl font-medium text-white mb-2">Assessment not found</p>
          <Button onClick={() => navigate(`/classroom/${roomId}/assessments`)} className="mt-4">Back</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="border-b border-slate-700 px-6 py-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/classroom/${roomId}/assessments`)}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-white">Edit Assessment</h1>
            <p className="text-slate-400">{currentRoom?.name}</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {error && (
          <div className="bg-red-900/30 border border-red-800 text-red-300 p-3 rounded-md">{error}</div>
        )}

        <Card className="bg-slate-800 border-slate-700">
          <div className="p-6 space-y-4">
            <h2 className="text-lg font-semibold text-white">Settings</h2>
            <div>
              <Label htmlFor="aTitle">Title *</Label>
              <Input id="aTitle" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Midterm Exam" />
            </div>
            <div>
              <Label htmlFor="aDesc">Description</Label>
              <Textarea id="aDesc" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="aDur">Duration (min)</Label>
                <Input id="aDur" type="number" min={1} value={durationMinutes} onChange={(e) => setDurationMinutes(Number(e.target.value))} />
              </div>
              <div>
                <Label htmlFor="aPass">Passing %</Label>
                <Input id="aPass" type="number" min={0} max={100} value={passingScore} onChange={(e) => setPassingScore(Number(e.target.value))} />
              </div>
              <div>
                <Label htmlFor="aAtt">Max attempts</Label>
                <Input id="aAtt" type="number" min={1} value={maxAttempts} onChange={(e) => setMaxAttempts(Number(e.target.value))} />
              </div>
              <div>
                <Label htmlFor="aStatus">Status</Label>
                <select
                  id="aStatus"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as Assessment['status'])}
                  className="w-full mt-1 bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white"
                >
                  {(['draft', 'scheduled', 'live', 'closed', 'graded', 'released'] as const).map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="aStart">Starts at (optional)</Label>
                <Input id="aStart" type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="aEnd">Ends at (optional)</Label>
                <Input id="aEnd" type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
              </div>
            </div>
          </div>
        </Card>

        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Questions ({questions.length})</h2>
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" variant="outline" onClick={() => addQuestion('multiple_choice')}><Plus className="w-4 h-4 mr-1" /> MCQ</Button>
            <Button size="sm" variant="outline" onClick={() => addQuestion('true_false')}><Plus className="w-4 h-4 mr-1" /> True/False</Button>
            <Button size="sm" variant="outline" onClick={() => addQuestion('short_answer')}><Plus className="w-4 h-4 mr-1" /> Short answer</Button>
            <Button size="sm" variant="outline" onClick={() => addQuestion('essay')}><Plus className="w-4 h-4 mr-1" /> Essay</Button>
          </div>
        </div>

        {questions.length === 0 && (
          <Card className="bg-slate-800 border-slate-700 p-8 text-center">
            <p className="text-slate-400">No questions yet. Add the first one above — students will see them in order.</p>
          </Card>
        )}

        <div className="space-y-4">
          {questions.map((q, idx) => (
            <Card key={q.id} className="bg-slate-800 border-slate-700">
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-300">Q{idx + 1} · {q.type.replace('_', ' ')}</span>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => moveQuestion(q.id, -1)} disabled={idx === 0} title="Move up"><ChevronUp className="w-4 h-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => moveQuestion(q.id, 1)} disabled={idx === questions.length - 1} title="Move down"><ChevronDown className="w-4 h-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => removeQuestion(q.id)} className="text-red-400 hover:text-red-300" title="Delete"><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </div>
                <Textarea
                  value={q.text}
                  onChange={(e) => updateQuestion(q.id, { text: e.target.value })}
                  placeholder="Question text..."
                  rows={2}
                />
                {q.type === 'multiple_choice' && (
                  <div className="space-y-2">
                    {(q.options || []).map((opt, oi) => (
                      <div key={oi} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name={`correct_${q.id}`}
                          checked={Number(q.correctAnswer) === oi}
                          onChange={() => updateQuestion(q.id, { correctAnswer: oi })}
                          title="Mark as correct"
                        />
                        <span className="text-slate-400 text-sm w-5">{String.fromCharCode(65 + oi)}.</span>
                        <Input
                          value={opt}
                          onChange={(e) => updateOption(q.id, oi, e.target.value)}
                          placeholder={`Option ${String.fromCharCode(65 + oi)}`}
                        />
                      </div>
                    ))}
                    <p className="text-xs text-slate-500">Select the radio of the correct option.</p>
                  </div>
                )}
                {q.type === 'true_false' && (
                  <div className="flex gap-4">
                    {['True', 'False'].map((label, oi) => (
                      <label key={label} className="flex items-center gap-2 text-slate-300 text-sm">
                        <input
                          type="radio"
                          name={`correct_${q.id}`}
                          checked={Number(q.correctAnswer) === oi}
                          onChange={() => updateQuestion(q.id, { correctAnswer: oi })}
                        />
                        {label} (correct)
                      </label>
                    ))}
                  </div>
                )}
                {(q.type === 'short_answer') && (
                  <div>
                    <Label>Expected answer (auto-graded, case-insensitive)</Label>
                    <Input
                      value={String(q.correctAnswer ?? '')}
                      onChange={(e) => updateQuestion(q.id, { correctAnswer: e.target.value })}
                      placeholder="Expected answer"
                    />
                  </div>
                )}
                {(q.type === 'essay' || q.type === 'case_study') && (
                  <p className="text-xs text-slate-500">Essay answers are graded manually by the teacher after submission.</p>
                )}
                <div>
                  <Label>Explanation (shown after submission)</Label>
                  <Input
                    value={q.explanation || ''}
                    onChange={(e) => updateQuestion(q.id, { explanation: e.target.value })}
                    placeholder="Why is the answer correct?"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Marks</Label>
                    <Input type="number" min={0} value={q.marks} onChange={(e) => updateQuestion(q.id, { marks: Number(e.target.value) })} />
                  </div>
                  <div>
                    <Label>Difficulty</Label>
                    <select
                      value={q.difficulty}
                      onChange={(e) => updateQuestion(q.id, { difficulty: e.target.value as Question['difficulty'] })}
                      className="w-full mt-1 bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white"
                    >
                      <option value="easy">easy</option>
                      <option value="medium">medium</option>
                      <option value="hard">hard</option>
                    </select>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => navigate(`/classroom/${roomId}/assessments`)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700">
            {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : <><Save className="w-4 h-4 mr-2" /> Save Assessment</>}
          </Button>
        </div>
      </div>
    </div>
  );
}
