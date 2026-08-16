import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { topicService } from '../../services/topicService';
import { aiTopicEngine } from '../../services/aiTopicService';
import { useClassroom } from '../../contexts/ClassroomContext';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '../../components/ui/select';
import {
  ArrowLeft,
  Save,
  Send,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { Topic, TopicContent } from '../../types/classroom';

export default function TopicDraftReview() {
  const { roomId, topicId } = useParams<{ roomId: string; topicId: string }>();
  const navigate = useNavigate();
  const { currentRoom, refreshRoom } = useClassroom();

  const [topic, setTopic] = useState<Topic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regeneratingSection, setRegeneratingSection] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);

  const sectionNames = [
    'introduction',
    'learningObjectives',
    'keyTerminology',
    'lesson',
    'simpleExplanation',
    'advancedExplanation',
    'examples',
    'realWorldApplications',
    'caseStudies',
    'interactiveActivities',
    'knowledgeChecks',
    'practiceQuestions',
    'revisionNotes',
    'summary',
    'additionalResources',
  ];

  useEffect(() => {
    if (topicId) {
      loadTopic();
    }
  }, [topicId]);

  const loadTopic = async () => {
    setLoading(true);
    try {
      const data = await topicService.getTopicById(topicId!);
      if (!data || !data.aiContent) {
        navigate(`/classroom/${roomId}/topics/${topicId}/add`);
        return;
      }
      setTopic(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load topic');
    } finally {
      setLoading(false);
    }
  };

  const updateContentField = (
    section: string,
    value: string | any
  ) => {
    if (!topic || !topic.aiContent) return;

    const newContent = { ...topic.aiContent };
    (newContent as any)[section] = value;

    setTopic({
      ...topic,
      aiContent: newContent,
    });
  };

  const handleRegenerateSection = async (section: string) => {
    if (!topic || !topic.aiContent) return;

    const sourceText = topic.sourceFiles?.map((f) => `[${f.name}: ${f.extractedText || ''}]`).join('\n') || '';
    const allText = sourceText || topic.title;

    setRegeneratingSection(section);
    setIsRegenerating(true);

    try {
      const newContent = await aiTopicEngine.regenerateSection(
        section,
        topic.title,
        topic.aiContent,
        allText
      );

      updateContentField(section, newContent);
      await topicService.setAiContent(topic.id, { ...topic.aiContent, [section]: newContent });
    } catch (err: any) {
      setError(err.message || `Failed to regenerate ${section}`);
    } finally {
      setRegeneratingSection(null);
      setIsRegenerating(false);
    }
  };

  const handlePublish = async () => {
    if (!topic) return;

    if (!confirm('Publishing this topic will make it available to students. Continue?')) return;

    setIsPublishing(true);
    setError('');

    try {
      await topicService.publishTopic(topic.id);
      await refreshRoom();
      navigate(`/classroom/${roomId}/topics`);
    } catch (err: any) {
      setError(err.message || 'Failed to publish topic');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!topic || !topic.aiContent) return;

    try {
      await topicService.updateTopic(topic.id, {
        aiContent: topic.aiContent,
        status: 'draft',
      });
      // Show temporary success
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to save');
    }
  };

  const renderTextField = (
    label: string,
    section: string,
    placeholder: string = '',
    rows: number = 3
  ) => {
    const value = (topic?.aiContent as any)?.[section] || '';

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium text-slate-300">{label}</Label>
          <button
            onClick={() => handleRegenerateSection(section)}
            disabled={isRegenerating}
            className="text-xs text-slate-400 hover:text-indigo-400 transition-colors"
            title={`Regenerate ${label.toLowerCase()}`}
          >
            {regeneratingSection === section ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Sparkles className="w-3 h-3" />
            )}
          </button>
        </div>
        <Textarea
          value={value}
          onChange={(e) => updateContentField(section, e.target.value)}
          placeholder={placeholder}
          rows={rows}
          disabled={isRegenerating}
        />
      </div>
    );
  };

  const renderArrayField = (
    label: string,
    section: string,
    itemType: 'list' | 'keyterms' | 'examples' | 'questions' | 'activities' | 'resources'
  ) => {
    const items = (topic?.aiContent as any)?.[section] || [];

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium text-slate-300">{label}</Label>
          <button
            onClick={() => handleRegenerateSection(section)}
            disabled={isRegenerating}
            className="text-xs text-slate-400 hover:text-indigo-400 transition-colors"
            title={`Regenerate ${label.toLowerCase()}`}
          >
            {regeneratingSection === section ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Sparkles className="w-3 h-3" />
            )}
          </button>
        </div>

        <div className="space-y-3">
          {items.map((item: any, index: number) => (
            <div key={index} className="p-3 bg-slate-700/30 rounded-md">
              {itemType === 'keyterms' && (
                <>
                  <Input
                    className="mb-1"
                    placeholder="Term"
                    value={item.term || ''}
                    onChange={(e) => {
                      items[index].term = e.target.value;
                      updateContentField(section, items);
                    }}
                    disabled={isRegenerating}
                  />
                  <Textarea
                    placeholder="Definition"
                    value={item.definition || ''}
                    onChange={(e) => {
                      items[index].definition = e.target.value;
                      updateContentField(section, items);
                    }}
                    rows={2}
                    disabled={isRegenerating}
                  />
                </>
              )}
              {itemType === 'list' && (
                <Textarea
                  value={typeof item === 'string' ? item : JSON.stringify(item)}
                  onChange={(e) => {
                    items[index] = e.target.value;
                    updateContentField(section, items);
                  }}
                  rows={2}
                  disabled={isRegenerating}
                />
              )}
              {itemType === 'examples' && (
                <>
                  <Input
                    className="mb-1"
                    placeholder="Example title"
                    value={item.title || ''}
                    onChange={(e) => {
                      items[index].title = e.target.value;
                      updateContentField(section, items);
                    }}
                    disabled={isRegenerating}
                  />
                  <Textarea
                    placeholder="Description"
                    value={item.description || ''}
                    onChange={(e) => {
                      items[index].description = e.target.value;
                      updateContentField(section, items);
                    }}
                    rows={2}
                    disabled={isRegenerating}
                  />
                  <Select
                    value={item.type || 'basic'}
                    onValueChange={(v) => {
                      items[index].type = v;
                      updateContentField(section, items);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="basic">Basic</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                </>
              )}
              {itemType === 'questions' && (
                <>
                  <Textarea
                    className="mb-1"
                    placeholder="Question"
                    value={item.question || item.text || ''}
                    onChange={(e) => {
                      items[index].question = e.target.value;
                      updateContentField(section, items);
                    }}
                    rows={2}
                    disabled={isRegenerating}
                  />
                  <Input
                    className="mb-1"
                    placeholder="Correct answer"
                    value={item.correctAnswer || ''}
                    onChange={(e) => {
                      items[index].correctAnswer = e.target.value;
                      updateContentField(section, items);
                    }}
                    disabled={isRegenerating}
                  />
                  <Textarea
                    placeholder="Explanation"
                    value={item.explanation || ''}
                    onChange={(e) => {
                      items[index].explanation = e.target.value;
                      updateContentField(section, items);
                    }}
                    rows={1}
                    disabled={isRegenerating}
                  />
                </>
              )}
              {itemType === 'resources' && (
                <>
                  <Input
                    className="mb-1"
                    placeholder="Resource title"
                    value={item.title || ''}
                    onChange={(e) => {
                      items[index].title = e.target.value;
                      updateContentField(section, items);
                    }}
                    disabled={isRegenerating}
                  />
                  <Input
                    placeholder="URL"
                    value={item.url || ''}
                    onChange={(e) => {
                      items[index].url = e.target.value;
                      updateContentField(section, items);
                    }}
                    disabled={isRegenerating}
                  />
                </>
              )}
              {itemType === 'activities' && (
                <>
                  <Input
                    className="mb-1"
                    placeholder="Activity title"
                    value={item.title || ''}
                    onChange={(e) => {
                      items[index].title = e.target.value;
                      updateContentField(section, items);
                    }}
                    disabled={isRegenerating}
                  />
                  <Textarea
                    placeholder="Activity content (JSON)"
                    value={typeof item.content === 'string' ? item.content : JSON.stringify(item.content || {})}
                    onChange={(e) => {
                      items[index].content = e.target.value;
                      updateContentField(section, items);
                    }}
                    rows={2}
                    disabled={isRegenerating}
                  />
                </>
              )}
            </div>
          ))}

          <button
            onClick={() => {
              const newItems = [...items];
              if (itemType === 'list') {
                newItems.push('');
              } else if (itemType === 'keyterms') {
                newItems.push({ term: '', definition: '' });
              } else if (itemType === 'examples') {
                newItems.push({ title: '', description: '', type: 'basic' });
              } else if (itemType === 'questions') {
                newItems.push({
                  question: '',
                  options: [],
                  correctAnswer: '',
                  explanation: '',
                  difficulty: 'medium',
                });
              } else if (itemType === 'resources') {
                newItems.push({ title: '', url: '', type: 'article' });
              } else if (itemType === 'activities') {
                newItems.push({ id: '', type: 'quiz', title: '', content: {} });
              }
              updateContentField(section, newItems);
            }}
            className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            + Add Item
          </button>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-slate-400">Loading topic...</div>
      </div>
    );
  }

  if (!topic || !topic.aiContent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center text-slate-400">
          <p>No AI-generated content found.</p>
          <Button
            onClick={() => navigate(`/classroom/${roomId}/topics/${topicId}/add`)}
            className="mt-4"
          >
            Generate Content
          </Button>
        </div>
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
              <h1 className="text-2xl font-bold text-white">{topic.title}</h1>
              <p className="text-slate-400">
                Draft review · {currentRoom?.name}
              </p>
            </div>
          </div>
          <Badge variant="secondary">DRAFT</Badge>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6">
        {error && (
          <div className="bg-red-900/30 border border-red-800 text-red-300 p-3 rounded-md mb-4">
            {error}
          </div>
        )}

        {/* Topic Title & Description */}
        <div className="mb-6">
          <Label className="text-sm font-medium text-slate-300">Topic Title</Label>
          <Input
            value={topic.title}
            onChange={(e) => {
              setTopic({ ...topic, title: e.target.value });
              updateContentField('title', e.target.value);
            }}
            className="text-lg font-bold"
          />
          <Label className="mt-3 text-sm font-medium text-slate-300">Description</Label>
          <Textarea
            value={topic.description || ''}
            onChange={(e) => {
              setTopic({ ...topic, description: e.target.value });
              updateContentField('description', e.target.value);
            }}
            rows={2}
          />
        </div>

        {/* Content Sections */}
        <div className="space-y-8">
          {renderTextField(
            'Introduction',
            'introduction',
            'A compelling opening for this topic',
            4
          )}

          {renderArrayField(
            'Learning Objectives',
            'learningObjectives',
            'list'
          )}

          {renderArrayField(
            'Key Terminology',
            'keyTerminology',
            'keyterms'
          )}

          {renderTextField(
            'Simple Explanation',
            'simpleExplanation',
            'Easy-to-understand explanation for beginners',
            5
          )}

          {renderTextField(
            'Detailed Lesson',
            'lesson.detailed',
            'Comprehensive lesson content',
            8
          )}

          {renderTextField(
            'Simple Lesson Version',
            'lesson.simple',
            'Simplified lesson content',
            5
          )}

          {renderArrayField(
            'Real-World Applications',
            'realWorldApplications',
            'list'
          )}

          {renderArrayField(
            'Case Studies',
            'caseStudies',
            'questions'
          )}

          {renderArrayField(
            'Interactive Activities',
            'interactiveActivities',
            'activities'
          )}

          {renderArrayField(
            'Knowledge Checks',
            'knowledgeChecks',
            'questions'
          )}

          {renderArrayField(
            'Practice Questions',
            'practiceQuestions',
            'questions'
          )}

          {renderTextField(
            'Revision Notes',
            'revisionNotes',
            'Key points for revision',
            5
          )}

          {renderTextField(
            'Summary',
            'summary',
            'Concise conclusion',
            4
          )}

          {renderArrayField(
            'Additional Resources',
            'additionalResources',
            'resources'
          )}

          {renderTextField(
            'Advanced Explanation',
            'advancedExplanation',
            'Detailed explanation for advanced learners',
            6
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between pt-6 border-t border-slate-700">
          <Button
            variant="outline"
            onClick={handleSaveDraft}
          >
            <Save className="w-4 h-4 mr-2" />
            Save Draft
          </Button>

          <div className="flex gap-3">
            <Button
              variant="ghost"
              onClick={() => navigate(`/classroom/${roomId}/topics/${topicId}/add`)}
            >
              Back to Editor
            </Button>
            <Button
              onClick={handlePublish}
              disabled={isPublishing}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {isPublishing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Publishing...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Publish Topic
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
