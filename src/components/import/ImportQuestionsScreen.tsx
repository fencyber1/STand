import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, FileText, AlertCircle, CheckCircle, Trash2 } from 'lucide-react';
import type { Question } from '../../types';
import { storage } from '../../services/storage';
import BorderGlow from '../ui/BorderGlow';

function parseCSV(text: string): Question[] {
  const lines = text.split('\n').filter((l) => l.trim());
  if (lines.length < 2) return [];
  const questions: Question[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].match(/(".*?"|[^,]+)/g);
    if (!cols || cols.length < 4) continue;
    const clean = (s: string) => s.replace(/^"|"$/g, '').trim();
    const q = clean(cols[0]);
    const type = (clean(cols[1]) || 'MCQ') as Question['type'];
    const correctAnswer = clean(cols[2]);
    const explanation = clean(cols[3]);
    const optionsRaw = cols[4] ? clean(cols[4]) : '';
    const options = optionsRaw ? optionsRaw.split('|').map((s) => s.trim()).filter(Boolean) : undefined;
    if (!q) continue;
    questions.push({
      id: `imported-${Date.now()}-${i}`,
      question: q,
      type: (['MCQ', 'Theory', 'TrueFalse', 'FillBlank'].includes(type) ? type : 'MCQ') as Question['type'],
      options: options && options.length > 1 ? options : type === 'MCQ' ? options : undefined,
      correctAnswer: type === 'TrueFalse' ? (correctAnswer.toLowerCase().startsWith('t') ? 'True' : 'False') : correctAnswer,
      explanation: explanation || 'No explanation provided.',
      difficulty: (['easy', 'medium', 'hard'].includes(clean(cols[5])) ? clean(cols[5]) : 'medium') as Question['difficulty'],
      subject: clean(cols[6]) || 'General',
      topic: clean(cols[7]) || 'Imported',
    });
  }
  return questions;
}

function parseTextBlock(text: string): Question[] {
  const blocks = text.split(/\n\s*\n/).filter((b) => b.trim());
  const questions: Question[] = [];
  for (let i = 0; i < blocks.length; i++) {
    const lines = blocks[i].split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length < 2) continue;
    const questionLine = lines.find((l) => /^(Q|Question|\d+[.)])\s*/i.test(l));
    const q = questionLine ? questionLine.replace(/^(Q|Question|\d+[.)])\s*/i, '').trim() : lines[0];
    const optionLines = lines.filter((l) => /^[A-Da-d][.)]\s*/.test(l));
    const answerLine = lines.find((l) => /^(A|Answer|Correct)[:\s]/i.test(l));
    const explainLine = lines.find((l) => /^(E|Explanation|Why)[:\s]/i.test(l));
    const options = optionLines.map((l) => l.replace(/^[A-Da-d][.)]\s*/, '').trim());
    const answer = answerLine ? answerLine.replace(/^(A|Answer|Correct)[:\s]*/i, '').trim() : '';
    const explanation = explainLine ? explainLine.replace(/^(E|Explanation|Why)[:\s]*/i, '').trim() : '';
    if (!q) continue;
    questions.push({
      id: `imported-${Date.now()}-${i}`,
      question: q,
      type: options.length >= 2 ? 'MCQ' : 'Theory',
      options: options.length >= 2 ? options : undefined,
      correctAnswer: answer,
      explanation: explanation || 'Imported question.',
      difficulty: 'medium',
      subject: 'General',
      topic: 'Imported',
    });
  }
  return questions;
}

function parseSingleLine(text: string): Question[] {
  const lines = text.split('\n').filter((l) => l.trim());
  const questions: Question[] = [];
  for (let i = 0; i < lines.length; i++) {
    const parts = lines[i].split('|').map((s) => s.trim()).filter(Boolean);
    if (parts.length < 2) continue;
    questions.push({
      id: `imported-${Date.now()}-${i}`,
      question: parts[0],
      type: parts.length >= 3 && ['True', 'False'].includes(parts[2]) ? 'TrueFalse' : 'Theory',
      options: parts.length >= 3 && parts[1].includes(';') ? parts[1].split(';').map((s) => s.trim()) : undefined,
      correctAnswer: parts[2] || parts[1],
      explanation: parts[3] || 'Imported question.',
      difficulty: 'medium',
      subject: 'General',
      topic: 'Imported',
    });
  }
  return questions;
}

export default function ImportQuestionsScreen() {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [subject, setSubject] = useState('General');
  const [topic, setTopic] = useState('Imported');

  const handleFile = (file: File) => {
    setError('');
    setSuccess('');
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      let parsed: Question[] = [];
      if (file.name.endsWith('.csv')) {
        parsed = parseCSV(text);
      } else if (text.includes('\n\n')) {
        parsed = parseTextBlock(text);
      } else {
        parsed = parseSingleLine(text);
      }
      if (parsed.length === 0) {
        setError('Could not parse any questions. Check the format.');
        return;
      }
      setQuestions(parsed);
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleSave = () => {
    if (questions.length === 0) return;
    const updated = questions.map((q) => ({ ...q, subject, topic }));
    const existing = storage.getImportedQuestions();
    const merged = [...existing, ...updated];
    storage.saveImportedQuestions(merged);
    setSuccess(`${updated.length} questions saved! You can now use them in Practice.`);
    setTimeout(() => navigate('/practice'), 1500);
  };

  const handleClear = () => {
    setQuestions([]);
    setFileName('');
    setError('');
    setSuccess('');
  };

  return (
    <div className="max-w-2xl mx-auto">
      <button onClick={() => navigate(-1)} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-sm mb-4 flex items-center gap-1">
        <ArrowLeft size={14} /> Back
      </button>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Import Questions</h1>
        <p className="text-gray-500 dark:text-gray-400">Upload CSV or text files with your own questions</p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm rounded-lg flex items-center gap-2">
          <AlertCircle size={16} />
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-sm rounded-lg flex items-center gap-2">
          <CheckCircle size={16} />
          {success}
        </div>
      )}

      <BorderGlow
        backgroundColor="#1f2937"
        borderRadius={12}
        glowColor="220 80 70"
        glowRadius={20}
        glowIntensity={0.5}
        colors={['#6366f1', '#8b5cf6', '#3b82f6']}
      >
        <div className="p-6 dark:bg-gray-800">
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center hover:border-primary-400 dark:hover:border-primary-500 transition cursor-pointer"
            onClick={() => fileRef.current?.click()}
          >
            <Upload size={36} className="mx-auto text-gray-400 dark:text-gray-500 mb-3" />
            <p className="text-gray-700 dark:text-gray-300 font-medium">
              {fileName ? fileName : 'Drop a file here or click to browse'}
            </p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Supports .csv and .txt files</p>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.txt"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              className="hidden"
            />
          </div>

          {questions.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center gap-2 mb-3">
                <FileText size={16} className="text-primary-500" />
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{questions.length} questions parsed</span>
                <button onClick={handleClear} className="ml-auto text-red-400 hover:text-red-600 text-sm flex items-center gap-1">
                  <Trash2 size={12} /> Clear
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Subject</label>
                  <input
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-primary-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Topic</label>
                  <input
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-primary-500 outline-none"
                  />
                </div>
              </div>

              <div className="max-h-60 overflow-y-auto space-y-2 mb-4">
                {questions.slice(0, 20).map((q, i) => (
                  <div key={q.id} className="p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-xs">
                    <span className="font-medium text-gray-700 dark:text-gray-300">Q{i + 1}:</span>{' '}
                    <span className="text-gray-600 dark:text-gray-400">{q.question.slice(0, 80)}{q.question.length > 80 ? '...' : ''}</span>
                    <span className="ml-2 text-primary-500">({q.type})</span>
                  </div>
                ))}
                {questions.length > 20 && <p className="text-xs text-gray-400 text-center">...and {questions.length - 20} more</p>}
              </div>

              <button
                onClick={handleSave}
                className="w-full py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition flex items-center justify-center gap-2"
              >
                <CheckCircle size={18} />
                Save {questions.length} Questions
              </button>
            </div>
          )}
        </div>
      </BorderGlow>

      <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <h3 className="font-semibold text-gray-800 dark:text-gray-100 text-sm mb-2">Supported Formats</h3>
        <div className="space-y-2 text-xs text-gray-500 dark:text-gray-400">
          <p><strong>CSV:</strong> Question, Type (MCQ/TrueFalse/Theory), Correct Answer, Explanation, Options (pipe-separated), Difficulty, Subject, Topic</p>
          <p><strong>Text blocks:</strong> Separate questions with blank lines. Use "Q:", "A:", "E:" prefixes.</p>
          <p><strong>Simple pipe:</strong> Question | Answer | Explanation (one per line)</p>
        </div>
      </div>
    </div>
  );
}
