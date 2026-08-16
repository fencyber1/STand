import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useClassroom } from '../../contexts/ClassroomContext';
import { classroomService } from '../../services/classroomService';
import { topicService } from '../../services/topicService';
import { aiTopicEngine } from '../../services/aiTopicService';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectItem,
  SelectContent,
} from '../../components/ui/select';
import { Card } from '../../components/ui/card';
import {
  Upload,
  FileText,
  Image,
  File,
  X,
  Loader2,
  Sparkles,
  ArrowLeft,
  Save,
  Send,
  MessageSquare,
  Zap,
} from 'lucide-react';
import { Topic, SourceFile } from '../../types/classroom';
import FenBotTopicModal from './FenBotTopicModal';

export default function AddTopicForm() {
  const { roomId, topicId } = useParams<{ roomId: string; topicId: string }>();
  const navigate = useNavigate();
  const { currentRoom } = useClassroom();

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [sourceType, setSourceType] = useState<'type' | 'upload'>('type');
  const [textContent, setTextContent] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [difficulty, setDifficulty] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner');
  const [customInstructions, setCustomInstructions] = useState('');

  // UI state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [existingTopic, setExistingTopic] = useState<Topic | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showFenBotModal, setShowFenBotModal] = useState(false);
  const [fenBotContext, setFenBotContext] = useState<string>('');

  const isEditMode = !!topicId;

  const handleFenBotGenerate = useCallback((context: string) => {
    setFenBotContext(context);
    setShowFenBotModal(false);
    // Trigger generation with the FenBot context
    handleGenerateWithFenBot();
  }, []);

  useEffect(() => {
    if (topicId) {
      loadTopic();
    }
  }, [topicId]);

  const loadTopic = async () => {
    try {
      const topic = await topicService.getTopicById(topicId!);
      if (topic) {
        setExistingTopic(topic);
        setTitle(topic.title);
        setDescription(topic.description || '');
        if (topic.sourceFiles && topic.sourceFiles.length > 0) {
          setSourceType('upload');
        }
        if (topic.aiContent) {
          // In edit mode, extract text content if available
          // This is a simplified approach - full implementation would extract from sourceFiles
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load topic');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setUploadedFiles((prev) => [...prev, ...files]);
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const getFileIcon = (file: File) => {
    const type = file.type;
    if (type.startsWith('image/')) return <Image className="w-5 h-5 text-blue-400" />;
    if (type.includes('pdf')) return <FileText className="w-5 h-5 text-red-400" />;
    if (type.includes('word') || type.includes('document')) return <FileText className="w-5 h-5 text-blue-300" />;
    if (type.includes('powerpoint') || type.includes('presentation')) return <FileText className="w-5 h-5 text-orange-400" />;
    return <File className="w-5 h-5 text-slate-400" />;
  };

  /**
   * Extracts text from uploaded files using existing utilities
   */
  const extractTextFromFiles = async (files: File[]): Promise<string> => {
    let combinedText = '';

    for (const file of files) {
      try {
        if (file.type.startsWith('text/')) {
          combinedText += await file.text();
        } else if (file.type.includes('pdf')) {
          // Would use pdfjs-dist in a full implementation
          combinedText += `[PDF content from ${file.name}]\n`;
        } else if (file.type.includes('word') || file.type.includes('document')) {
          // Would use mammoth in a full implementation
          combinedText += `[DOCX content from ${file.name}]\n`;
        } else if (file.type.startsWith('image/')) {
          combinedText += `[Image: ${file.name}]\n`;
        } else {
          combinedText += `[File: ${file.name}]\n`;
        }
      } catch (err) {
        console.error(`Failed to extract text from ${file.name}:`, err);
      }
    }

    return combinedText;
  };

  const handleGenerate = async () => {
    if (!title) {
      setError('Topic title is required');
      return;
    }

    if (sourceType === 'upload' && uploadedFiles.length === 0 && !textContent) {
      setError('Please provide source material (type or upload)');
      return;
    }

    if (!roomId || !currentRoom) {
      return;
    }

    setIsGenerating(true);
    setError('');

    try {
      // First, create or update the topic with basic info
      let topic: Topic;

      if (isEditMode && existingTopic) {
        await topicService.updateTopic(topicId!, {
          title,
          description,
          status: 'draft',
          updatedAt: new Date(),
        });
        topic = { ...existingTopic, title, description, updatedAt: new Date() };
      } else {
        const order = await topicService.getNextOrder(roomId);
        topic = await topicService.createTopic({
          roomId,
          title,
          description,
          sourceFiles: [],
          status: 'draft',
          order,
          createdBy: currentRoom.ownerId,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      // Extract source text
      let sourceText = textContent || '';
      if (uploadedFiles.length > 0) {
        setGenerationProgress('Extracting text from files...');
        const extracted = await extractTextFromFiles(uploadedFiles);
        sourceText += extracted;
      }

      setGenerationProgress('Generating AI content (step 1/3): Introduction and objectives...');
      setGenerationProgress('Generating AI content (step 2/3): Detailed lesson and explanations...');
      setGenerationProgress('Generating AI content (step 3/3): Practice questions and case studies...');

      // Generate content using NVIDIA AI
      const content = await aiTopicEngine.generateTopicContent(
        title,
        sourceText,
        {
          difficulty,
          customInstructions,
        }
      );

      // Save AI-generated content to topic
      await topicService.setAiContent(topic.id, content);

      navigate(`/classroom/${roomId}/topics/${topic.id}/review`);
    } catch (err: any) {
      setError(err.message || 'Failed to generate topic content');
    } finally {
      setIsGenerating(false);
      setGenerationProgress(null);
    }
  };

  const handleGenerateWithFenBot = async () => {
    if (!title) {
      setError('Topic title is required');
      return;
    }

    if (sourceType === 'upload' && uploadedFiles.length === 0 && !textContent) {
      setError('Please provide source material (type or upload)');
      return;
    }

    if (!roomId || !currentRoom) {
      return;
    }

    setIsGenerating(true);
    setError('');

    try {
      // First, create or update the topic with basic info
      let topic: Topic;

      if (isEditMode && existingTopic) {
        await topicService.updateTopic(topicId!, {
          title,
          description,
          status: 'draft',
          updatedAt: new Date(),
        });
        topic = { ...existingTopic, title, description, updatedAt: new Date() };
      } else {
        const order = await topicService.getNextOrder(roomId);
        topic = await topicService.createTopic({
          roomId,
          title,
          description,
          sourceFiles: [],
          status: 'draft',
          order,
          createdBy: currentRoom.ownerId,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      // Extract source text
      let sourceText = textContent || '';
      if (uploadedFiles.length > 0) {
        setGenerationProgress('Extracting text from files...');
        const extracted = await extractTextFromFiles(uploadedFiles);
        sourceText += extracted;
      }

      // Combine FenBot context with custom instructions
      const combinedInstructions = [customInstructions, fenBotContext].filter(Boolean).join('\n\n');

      setGenerationProgress('Generating AI content with FenBot context...');

      // Generate content using NVIDIA AI with FenBot context
      const content = await aiTopicEngine.generateTopicContent(
        title,
        sourceText,
        {
          difficulty,
          customInstructions: combinedInstructions,
        }
      );

      // Save AI-generated content to topic
      await topicService.setAiContent(topic.id, content);

      // Clear FenBot context after use
      setFenBotContext('');

      navigate(`/classroom/${roomId}/topics/${topic.id}/review`);
    } catch (err: any) {
      setError(err.message || 'Failed to generate topic content');
    } finally {
      setIsGenerating(false);
      setGenerationProgress(null);
    }
  };

  const handleSaveDraft = async () => {
    if (!title || !roomId) return;

    setIsSaving(true);
    setError('');

    try {
      if (isEditMode && existingTopic) {
        await topicService.updateTopic(topicId!, {
          title,
          description,
        });
      } else {
        const order = await topicService.getNextOrder(roomId);
        await topicService.createTopic({
          roomId,
          title,
          description,
          status: 'draft',
          order,
          createdBy: currentRoom?.ownerId || '',
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
      navigate(`/classroom/${roomId}/topics`);
    } catch (err: any) {
      setError(err.message || 'Failed to save draft');
    } finally {
      setIsSaving(false);
    }
  };

  if (!currentRoom) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="border-b border-slate-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/classroom/${roomId}/topics`)}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-white">
                {isEditMode ? 'Edit Topic' : 'Add Topic'}
              </h1>
              <p className="text-slate-400">{currentRoom.name}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6">
        {error && (
          <div className="bg-red-900/30 border border-red-800 text-red-300 p-3 rounded-md mb-4">
            {error}
          </div>
        )}

        {/* Progress indicator for AI generation */}
        {isGenerating && generationProgress && (
          <Card className="bg-slate-800 border-slate-700 p-4 mb-4">
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
              <span className="text-slate-300">{generationProgress}</span>
            </div>
          </Card>
        )}

        <div className="space-y-6">
          {/* Topic Details */}
          <Card className="bg-slate-800 border-slate-700">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Topic Information</h2>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Topic Title *</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Hazard Identification and Risk Assessment"
                    disabled={isGenerating}
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief description of this topic"
                    disabled={isGenerating}
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="difficulty">Difficulty Level</Label>
                  <Select value={difficulty} onValueChange={(v: string) => setDifficulty(v as any)}>
                    <SelectTrigger >
                      <SelectValue placeholder="Select difficulty" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Beginner</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </Card>

          {/* Source Material */}
          <Card className="bg-slate-800 border-slate-700">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Source Material</h2>

              <div className="space-y-4">
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="sourceType"
                      checked={sourceType === 'type'}
                      onChange={() => setSourceType('type')}
                      disabled={isGenerating}
                      className="text-indigo-600"
                    />
                    <span className="text-slate-300">Type Topic Content</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="sourceType"
                      checked={sourceType === 'upload'}
                      onChange={() => setSourceType('upload')}
                      disabled={isGenerating}
                      className="text-indigo-600"
                    />
                    <span className="text-slate-300">Upload Teaching Materials</span>
                  </label>
                </div>

                {sourceType === 'type' && (
                  <div>
                    <Label htmlFor="textContent">Topic Content</Label>
                    <Textarea
                      id="textContent"
                      value={textContent}
                      onChange={(e) => setTextContent(e.target.value)}
                      placeholder="Enter key concepts, notes, or any content you want the AI to use as reference"
                      disabled={isGenerating}
                      rows={6}
                    />
                  </div>
                )}

                {sourceType === 'upload' && (
                  <div>
                    <Label htmlFor="fileUpload">Upload Files</Label>
                    <div className="mt-1 flex items-center gap-4">
                      <label className="flex items-center gap-2 px-4 py-2 bg-slate-700 rounded-md cursor-pointer hover:bg-slate-600 transition-colors">
                        <Upload className="w-4 h-4" />
                        <span>Upload Files</span>
                        <input
                          type="file"
                          id="fileUpload"
                          accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.png,.jpg,.jpeg"
                          multiple
                          onChange={handleFileUpload}
                          className="hidden"
                          disabled={isGenerating}
                        />
                      </label>
                    </div>

                    {uploadedFiles.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {uploadedFiles.map((file, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-2 bg-slate-700/50 rounded-md"
                          >
                            <div className="flex items-center gap-2">
                              {getFileIcon(file)}
                              <span className="text-sm text-slate-300">
                                {file.name} ({Math.round(file.size / 1024)} KB)
                              </span>
                            </div>
                            <button
                              onClick={() => removeFile(index)}
                              disabled={isGenerating}
                              className="text-slate-400 hover:text-red-400 transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <Label htmlFor="customInstructions">Custom Instructions for AI</Label>
                  <Textarea
                    id="customInstructions"
                    value={customInstructions}
                    onChange={(e) => setCustomInstructions(e.target.value)}
                    placeholder="e.g., Focus on practical applications, Include 3 case studies"
                    disabled={isGenerating}
                    rows={2}
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={handleSaveDraft}
              disabled={isGenerating || isSaving}
            >
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              <Save className="w-4 h-4 mr-2" />
              Save Draft
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowFenBotModal(true)}
              disabled={isGenerating || !title}
              className="bg-purple-600 hover:bg-purple-700 border-purple-500"
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              <Zap className="w-4 h-4 mr-2" />
              Chat with FenBot
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !title}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  {isEditMode ? 'Regenerate with AI' : 'Generate with AI'}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    
      {/* FenBot Topic Modal */}
      <FenBotTopicModal
        isOpen={showFenBotModal}
        onClose={() => setShowFenBotModal(false)}
        onGenerate={handleFenBotGenerate}
        topicTitle={title}
        sourceText={sourceType === 'type' ? textContent : uploadedFiles.map(f => f.name).join(', ')}
        difficulty={difficulty}
      />
    </div>
  );
}
