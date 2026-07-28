import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Upload, FileText, Loader2, AlertCircle,
  Trash2, Settings2, Save, FolderOpen,
  CheckCircle, X,
} from 'lucide-react';
import { getDocumentQuestions } from '../../services/api';
import { QUESTION_TYPES, DIFFICULTY_LEVELS } from '../../constants';
import { storage } from '../../services/storage';
import type { SavedDocument } from '../../types';
import BorderGlow from '../ui/BorderGlow';

type Step = 'upload' | 'preview' | 'generating';

export default function DocumentQuizScreen() {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>('upload');
  const [docText, setDocText] = useState('');
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const [questionCount, setQuestionCount] = useState(5);
  const [questionType, setQuestionType] = useState('MCQ');
  const [difficulty, setDifficulty] = useState('all');

  const [generating, setGenerating] = useState(false);

  const [savedDocs, setSavedDocs] = useState<SavedDocument[]>(() => storage.getSavedDocuments());

  const handleFile = async (file: File) => {
    setError('');
    setFileName(file.name);
    setSaved(false);
    const ext = file.name.split('.').pop()?.toLowerCase();

    try {
      if (ext === 'pdf') {
        const pdfjsLib = await import('pdfjs-dist');
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let text = '';
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          text += content.items.map((item: any) => item.str).join(' ') + '\n';
        }
        setDocText(text);
        setStep('preview');
      } else if (ext === 'docx') {
        const mammoth = await import('mammoth');
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        setDocText(result.value);
        setStep('preview');
      } else {
        const text = await file.text();
        if (text.trim().length < 20) {
          setError('File appears to be empty or not text-readable. Try a different file.');
          return;
        }
        setDocText(text);
        setStep('preview');
      }
    } catch (e: any) {
      setError(`Failed to read file: ${e.message}`);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handlePaste = (text: string) => {
    if (text.trim().length < 50) {
      setError('Document text is too short. Paste at least 50 characters.');
      return;
    }
    setDocText(text);
    setFileName('Pasted text');
    setStep('preview');
    setError('');
    setSaved(false);
  };

  const handleGenerate = async () => {
    if (!docText.trim()) return;
    setGenerating(true);
    setStep('generating');
    setError('');

    try {
      const { questions } = await getDocumentQuestions({
        documentText: docText,
        questionCount,
        questionType,
        difficulty: difficulty === 'all' ? undefined : difficulty,
      });

      navigate('/quiz', {
        state: {
          questions,
          topic: `Document: ${fileName}`,
          sector: 'Document-Based',
          level: 'Custom',
          questionType,
          timeLimit: 0,
        },
      });
    } catch (e: any) {
      setError(e.message || 'Failed to generate questions');
      setStep('preview');
    }
    setGenerating(false);
  };

  const handleSaveDoc = () => {
    if (!docText.trim() || saved) return;
    const doc: SavedDocument = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name: fileName,
      text: docText,
      wordCount: docText.split(/\s+/).filter(Boolean).length,
      createdAt: new Date().toISOString(),
    };
    storage.saveDocument(doc);
    setSavedDocs(storage.getSavedDocuments());
    setSaved(true);
  };

  const handleDeleteDoc = (id: string) => {
    storage.deleteSavedDocument(id);
    setSavedDocs(storage.getSavedDocuments());
  };

  const handleLoadDoc = (doc: SavedDocument) => {
    setFileName(doc.name);
    setDocText(doc.text);
    setSaved(true);
    setStep('preview');
  };

  const wordCount = docText.split(/\s+/).filter(Boolean).length;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <button onClick={() => navigate(-1)} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-sm flex items-center gap-1">
        <ArrowLeft size={14} /> Back
      </button>

      <div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Document Quiz</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm">Upload a document and quiz yourself on its content</p>
      </div>

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm rounded-lg flex items-center gap-2">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Saved Documents List */}
      {step === 'upload' && savedDocs.length > 0 && (
        <BorderGlow backgroundColor={document.documentElement.classList.contains('dark') ? '#1f2937' : '#ffffff'} borderRadius={12} glowColor="142 80 70" glowIntensity={0.3} colors={['#6366f1', '#3b82f6', '#10b981']}>
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3 text-gray-700 dark:text-gray-300 font-semibold text-sm">
              <FolderOpen size={16} /> Saved Documents
            </div>
            <div className="space-y-2 max-h-56 overflow-y-auto">
              {savedDocs.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg group">
                  <button onClick={() => handleLoadDoc(doc)} className="flex-1 text-left min-w-0">
                    <div className="flex items-center gap-2">
                      <FileText size={14} className="text-primary-500 shrink-0" />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{doc.name}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 ml-[22px]">
                      <span className="text-xs text-gray-400">{doc.wordCount} words</span>
                      <span className="text-xs text-gray-400">{new Date(doc.createdAt).toLocaleDateString()}</span>
                    </div>
                  </button>
                  <button
                    onClick={() => handleDeleteDoc(doc.id)}
                    className="p-1.5 text-gray-400 hover:text-red-500 transition opacity-0 group-hover:opacity-100 shrink-0"
                    title="Delete document"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </BorderGlow>
      )}

      {/* Step: Upload */}
      {step === 'upload' && (
        <>
          <BorderGlow backgroundColor={document.documentElement.classList.contains('dark') ? '#1f2937' : '#ffffff'} borderRadius={12} glowColor="142 80 70" glowIntensity={0.4} colors={['#10b981', '#3b82f6', '#6366f1']}>
            <div className="p-6">
              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center hover:border-primary-400 dark:hover:border-primary-500 transition cursor-pointer"
                onClick={() => fileRef.current?.click()}
              >
                <Upload size={36} className="mx-auto text-gray-400 dark:text-gray-500 mb-3" />
                <p className="text-gray-700 dark:text-gray-300 font-medium">Drop a document here or click to browse</p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Supports PDF, DOCX, TXT, HTML, CSV, and more</p>
                <input
                  ref={fileRef}
                  type="file"
                  onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                  className="hidden"
                />
              </div>
            </div>
          </BorderGlow>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200 dark:border-gray-700" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-3 bg-gray-100 dark:bg-gray-900 text-gray-400">or paste text</span>
            </div>
          </div>

          <PasteBox onSubmit={handlePaste} />
        </>
      )}

      {/* Step: Preview */}
      {step === 'preview' && (
        <>
          <div className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-xl px-4 py-3 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <FileText size={16} className="text-primary-500" />
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{fileName}</span>
              <span className="text-xs text-gray-400">{wordCount} words</span>
              {saved && <span className="text-xs text-green-500 flex items-center gap-1"><CheckCircle size={10} /> Saved</span>}
            </div>
            <div className="flex items-center gap-2">
              {!saved && (
                <button
                  onClick={handleSaveDoc}
                  className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 flex items-center gap-1 font-medium"
                >
                  <Save size={12} /> Save
                </button>
              )}
              <button
                onClick={() => { setDocText(''); setFileName(''); setStep('upload'); setError(''); setSaved(false); }}
                className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
              >
                <X size={12} /> Change
              </button>
            </div>
          </div>

          <BorderGlow backgroundColor={document.documentElement.classList.contains('dark') ? '#1f2937' : '#ffffff'} borderRadius={12} glowColor="142 80 70" glowIntensity={0.4} colors={['#10b981', '#3b82f6', '#6366f1']}>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300 font-semibold">
                <Settings2 size={16} /> Quiz Settings
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Number of Questions</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={questionCount}
                    onChange={(e) => {
                      const v = parseInt(e.target.value);
                      if (!isNaN(v) && v >= 1 && v <= 50) setQuestionCount(v);
                    }}
                    className="w-20 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-center font-semibold focus:ring-2 focus:ring-primary-500 outline-none"
                  />
                  <div className="flex-1 flex gap-1.5">
                    {[3, 5, 7, 10, 15, 20].map((n) => (
                      <button
                        key={n}
                        onClick={() => setQuestionCount(n)}
                        className={`flex-1 py-2 rounded-lg text-xs font-semibold transition ${
                          questionCount === n
                            ? 'bg-primary-600 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-1">Enter any number from 1 to 50</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Question Type</label>
                <select
                  value={questionType}
                  onChange={(e) => setQuestionType(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 outline-none"
                >
                  {QUESTION_TYPES.map((t) => (
                    <option key={t} value={t.includes('MCQ') ? 'MCQ' : t.includes('Theory') ? 'Theory' : t.includes('True') ? 'True' : t.includes('Fill') ? 'Fill' : t.includes('Mixed') ? 'Mixed' : 'MCQ'}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Difficulty</label>
                <div className="flex gap-2">
                  {['all', ...DIFFICULTY_LEVELS].map((d) => (
                    <button
                      key={d}
                      onClick={() => setDifficulty(d)}
                      className={`flex-1 py-2 rounded-lg text-sm font-semibold capitalize transition ${
                        difficulty === d
                          ? 'bg-primary-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleGenerate}
                disabled={generating || wordCount < 20}
                className="w-full py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 disabled:opacity-50 transition flex items-center justify-center gap-2"
              >
                {generating ? (
                  <><Loader2 size={18} className="animate-spin" /> Generating Questions...</>
                ) : (
                  <>Generate {questionCount} Questions from Document</>
                )}
              </button>
            </div>
          </BorderGlow>
        </>
      )}

      {/* Step: Generating */}
      {step === 'generating' && (
        <div className="text-center py-16">
          <Loader2 size={40} className="animate-spin mx-auto text-primary-500 mb-4" />
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-1">Generating Questions</h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Reading your document and creating quiz questions...</p>
        </div>
      )}
    </div>
  );
}

function PasteBox({ onSubmit }: { onSubmit: (text: string) => void }) {
  const [text, setText] = useState('');

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Paste your document text</label>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Paste your notes, textbook content, lecture slides, or any study material here..."
        rows={6}
        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-primary-500 outline-none resize-none text-sm"
      />
      <div className="flex items-center justify-between mt-3">
        <span className="text-xs text-gray-400">{text.split(/\s+/).filter(Boolean).length} words</span>
        <button
          onClick={() => onSubmit(text)}
          disabled={text.trim().length < 50}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-semibold hover:bg-primary-700 disabled:opacity-50 transition"
        >
          Use This Text
        </button>
      </div>
    </div>
  );
}
