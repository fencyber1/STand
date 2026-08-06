import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Upload, FileText, Loader2, AlertCircle,
  Trash2, Settings2, Save, FolderOpen,
  CheckCircle, X, BookOpen,
} from 'lucide-react';
import { setQuestionProgressCallback } from '../../services/api';
import { QUESTION_TYPES, DIFFICULTY_LEVELS } from '../../constants';
import { storage } from '../../services/storage';
import type { SavedDocument } from '../../types';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import BorderGlow from '../ui/BorderGlow';
import { useLanguage } from '../../contexts/LanguageContext';

type Step = 'upload' | 'preview' | 'generating';

const WORDS_PER_PAGE = 1000;

function splitIntoChunks(text: string, wordsPerPage: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length <= wordsPerPage) return [text];
  const chunks: string[] = [];
  for (let i = 0; i < words.length; i += wordsPerPage) {
    chunks.push(words.slice(i, i + wordsPerPage).join(' '));
  }
  return chunks;
}

export default function DocumentQuizScreen() {
  const navigate = useNavigate();
  const { t } = useLanguage();
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
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [parsing, setParsing] = useState(false);

  // Page range — works for all file types
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [isPdf, setIsPdf] = useState(false);
  const [fullText, setFullText] = useState('');        // full text for non-PDF
  const [chunks, setChunks] = useState<string[]>([]);  // virtual pages for non-PDF
  const [totalPages, setTotalPages] = useState(0);
  const [pageStart, setPageStart] = useState(1);
  const [pageEnd, setPageEnd] = useState(0);

  const [savedDocs, setSavedDocs] = useState<SavedDocument[]>(() => storage.getSavedDocuments());

  const resetState = () => {
    setDocText('');
    setFullText('');
    setChunks([]);
    setFileName('');
    setPdfDoc(null);
    setIsPdf(false);
    setTotalPages(0);
    setPageStart(1);
    setPageEnd(0);
    setError('');
    setSaved(false);
  };

  const handleFile = async (file: File) => {
    setError('');
    setFileName(file.name);
    setSaved(false);
    setParsing(true);
    const ext = file.name.split('.').pop()?.toLowerCase();

    try {
      let rawText = '';

      if (ext === 'pdf') {
        const pdfjsLib = await import('pdfjs-dist');
        pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
          'pdfjs-dist/build/pdf.worker.min.mjs',
          import.meta.url,
        ).toString();
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        setPdfDoc(pdf);
        setIsPdf(true);
        setTotalPages(pdf.numPages);
        setPageStart(1);
        setPageEnd(pdf.numPages);
        // Preview first page only
        const firstPage = await pdf.getPage(1);
        const firstContent = await firstPage.getTextContent();
        rawText = firstContent.items.map((item: any) => item.str).join(' ');
        if (rawText.trim().length < 20) {
          setError('PDF appears to have no readable text (may be scanned/image-based). Try a different file.');
          setParsing(false);
          return;
        }
        setDocText(`[Preview: Page 1 of ${pdf.numPages}]\n${rawText.slice(0, 500)}...`);
        setFullText('');
        setChunks([]);
        setStep('preview');
      } else {
        // All non-PDF files: read text and split into virtual pages
        if (ext === 'docx') {
          const mammoth = await import('mammoth');
          const arrayBuffer = await file.arrayBuffer();
          const result = await mammoth.extractRawText({ arrayBuffer });
          rawText = result.value;
        } else {
          rawText = await file.text();
        }

        if (rawText.trim().length < 20) {
          setError('Document appears to be empty. Try a different file.');
          setParsing(false);
          return;
        }

        const textChunks = splitIntoChunks(rawText, WORDS_PER_PAGE);
        setPdfDoc(null);
        setIsPdf(false);
        setFullText(rawText);
        setChunks(textChunks);
        setTotalPages(textChunks.length);
        setPageStart(1);
        setPageEnd(textChunks.length);
        // Show first chunk as preview
        const previewWords = rawText.split(/\s+/).slice(0, 200).join(' ');
        setDocText(`${previewWords}${rawText.split(/\s+/).length > 200 ? '...' : ''}`);
        setStep('preview');
      }
    } catch (e: any) {
      setError('Failed to read the file. Please try a different file.');
    }
    setParsing(false);
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
    setGenerating(true);
    setProgress(null);
    setStep('generating');
    setError('');
    setQuestionProgressCallback((current, total) => setProgress({ current, total }));

    try {
      let textToUse = '';

      if (pdfDoc && isPdf) {
        // PDF: parse selected pages
        let parsedText = '';
        const end = Math.min(pageEnd, totalPages);
        for (let i = pageStart; i <= end; i++) {
          const page = await pdfDoc.getPage(i);
          const content = await page.getTextContent();
          parsedText += content.items.map((item: any) => item.str).join(' ') + '\n';
        }
        if (parsedText.trim().length < 20) {
          setError('Selected pages have no readable text. Try a different page range.');
          setStep('preview');
          setQuestionProgressCallback(null);
          setProgress(null);
          setGenerating(false);
          return;
        }
        textToUse = parsedText;
      } else if (chunks.length > 0) {
        // Non-PDF: use selected chunks
        const end = Math.min(pageEnd, totalPages);
        const selectedChunks = chunks.slice(pageStart - 1, end);
        textToUse = selectedChunks.join('\n\n');
      } else {
        // Pasted text: use all
        textToUse = docText;
      }

      const rangeLabel = isPdf
        ? ` (Pages ${pageStart}-${Math.min(pageEnd, totalPages)})`
        : totalPages > 1
        ? ` (Sections ${pageStart}-${Math.min(pageEnd, totalPages)})`
        : '';

      navigate('/quiz', {
        state: {
          progressive: true,
          params: {
            documentText: textToUse,
            documentName: fileName,
            questionCount,
            questionType,
            difficulty: difficulty === 'all' ? undefined : difficulty,
          },
          topic: `Document: ${fileName}${rangeLabel}`,
          sector: 'Document-Based',
          level: 'Custom',
          questionType,
          timeLimit: 0,
        },
      });
    } catch (e: any) {
      setError('Failed to generate questions. Please try again.');
      setStep('preview');
    }
    setQuestionProgressCallback(null);
    setProgress(null);
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

    // Split saved text into virtual pages
    const textChunks = splitIntoChunks(doc.text, WORDS_PER_PAGE);
    setFullText(doc.text);
    setChunks(textChunks);
    setTotalPages(textChunks.length);
    setPageStart(1);
    setPageEnd(textChunks.length);

    setStep('preview');
  };

  const wordCount = docText.split(/\s+/).filter(Boolean).length;

  return (
    <div className="max-w-2xl mx-auto px-4 space-y-6">
      <button onClick={() => navigate(-1)} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-sm flex items-center gap-1">
        <ArrowLeft size={14} /> Back
      </button>

      <div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{t('Document Quiz')}</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm">{t('Upload a document or paste text')}</p>
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
                <FolderOpen size={16} /> {t('Saved Documents')}
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
        <div data-tour-id="tour-doc-quiz">
          <BorderGlow backgroundColor={document.documentElement.classList.contains('dark') ? '#1f2937' : '#ffffff'} borderRadius={12} glowColor="142 80 70" glowIntensity={0.4} colors={['#10b981', '#3b82f6', '#6366f1']}>
            <div className="p-6">
              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                className={`border-2 border-dashed rounded-xl p-8 text-center transition cursor-pointer ${
                  parsing
                    ? 'border-primary-400 dark:border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                    : 'border-gray-300 dark:border-gray-600 hover:border-primary-400 dark:hover:border-primary-500'
                }`}
                onClick={() => !parsing && fileRef.current?.click()}
              >
                {parsing ? (
                  <Loader2 size={36} className="mx-auto text-primary-500 mb-3 animate-spin" />
                ) : (
                  <Upload size={36} className="mx-auto text-gray-400 dark:text-gray-500 mb-3" />
                )}
                <p className="text-gray-700 dark:text-gray-300 font-medium">
                  {parsing ? t('Reading document...') : t('drag and drop')}
                </p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                  {parsing ? t('This may take a moment for large files') : t('Supported formats')}
                </p>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf,.docx,.doc,.txt,.html,.htm,.csv,.json,.md,.rtf,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFile(file);
                    e.target.value = '';
                  }}
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
              <span className="px-3 bg-gray-100 dark:bg-gray-900 text-gray-400">{t('Paste Text')}</span>
            </div>
          </div>

          <PasteBox onSubmit={handlePaste} />
        </div>
      )}

      {/* Step: Preview */}
      {step === 'preview' && (
        <>
          <div className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-xl px-4 py-3 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <FileText size={16} className="text-primary-500" />
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{fileName}</span>
              <span className="text-xs text-gray-400">{isPdf ? `${totalPages} ${t('pages')}` : `${wordCount} ${t('words')}`}</span>
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
                onClick={() => resetState()}
                className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
              >
                <X size={12} /> Change
              </button>
            </div>
          </div>

          <BorderGlow backgroundColor={document.documentElement.classList.contains('dark') ? '#1f2937' : '#ffffff'} borderRadius={12} glowColor="142 80 70" glowIntensity={0.4} colors={['#10b981', '#3b82f6', '#6366f1']}>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300 font-semibold">
                <Settings2 size={16} /> {t('Quiz Settings')}
              </div>

              {/* Page Range */}
              {totalPages > 1 && (
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-2 mb-2">
                    <BookOpen size={14} className="text-blue-600 dark:text-blue-400" />
                    <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                      {isPdf ? t('Page Range') : t('Section Range')}
                    </span>
                    <span className="text-xs text-blue-500 dark:text-blue-400">
                      ({t('of')} {totalPages} {isPdf ? t('pages') : t('sections')})
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-blue-600 dark:text-blue-400 font-medium">{t('From')}</label>
                      <input
                        type="number"
                        min={1}
                        max={totalPages}
                        value={pageStart}
                        onChange={(e) => {
                          const v = parseInt(e.target.value);
                          if (!isNaN(v) && v >= 1 && v <= totalPages) {
                            setPageStart(v);
                            if (v > pageEnd) setPageEnd(v);
                          }
                        }}
                        className="w-16 px-2 py-1.5 text-sm border border-blue-300 dark:border-blue-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-center focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <span className="text-blue-400">—</span>
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-blue-600 dark:text-blue-400 font-medium">{t('To')}</label>
                      <input
                        type="number"
                        min={1}
                        max={totalPages}
                        value={pageEnd}
                        onChange={(e) => {
                          const v = parseInt(e.target.value);
                          if (!isNaN(v) && v >= 1 && v <= totalPages) {
                            setPageEnd(v);
                            if (v < pageStart) setPageStart(v);
                          }
                        }}
                        className="w-16 px-2 py-1.5 text-sm border border-blue-300 dark:border-blue-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-center focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <button
                      onClick={() => { setPageStart(1); setPageEnd(totalPages); }}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 font-medium ml-auto"
                    >
                      {t('All')}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {[
                      { label: t('First 10'), start: 1, end: Math.min(10, totalPages) },
                      { label: t('First 20'), start: 1, end: Math.min(20, totalPages) },
                      { label: t('Last 10'), start: Math.max(1, totalPages - 9), end: totalPages },
                      { label: t('Middle'), start: Math.max(1, Math.floor(totalPages / 3)), end: Math.min(totalPages, Math.floor(totalPages * 2 / 3)) },
                    ].filter((p) => p.end > p.start && p.end <= totalPages).map((preset) => (
                      <button
                        key={preset.label}
                        onClick={() => { setPageStart(preset.start); setPageEnd(preset.end); }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                          pageStart === preset.start && pageEnd === preset.end
                            ? 'bg-blue-600 text-white'
                            : 'bg-blue-100 dark:bg-blue-800/40 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-700/40'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('Number of Questions')}</label>
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('Question Type')}</label>
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('Difficulty')}</label>
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
                  <><Loader2 size={18} className="animate-spin" /> {t('Generating Questions...')}</>
                ) : (
                  <>{t('Generate Questions from Document')}</>
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
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-1">
            {progress ? `${t('Generating Questions...')} ${progress.current}/${progress.total}` : t('Generating Questions...')}
          </h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm">{t('Reading your document and creating quiz questions...')}</p>
        </div>
      )}
    </div>
  );
}

function PasteBox({ onSubmit }: { onSubmit: (text: string) => void }) {
  const [text, setText] = useState('');
  const { t } = useLanguage();

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('Paste your document text')}</label>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={t('Paste your notes, textbook content, lecture slides, or any study material here...')}
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
          {t('Use This Text')}
        </button>
      </div>
    </div>
  );
}
