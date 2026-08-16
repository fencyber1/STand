import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { topicService, TopicProgress } from '../../services/topicService';
import { useClassroom } from '../../contexts/ClassroomContext';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import {
  ArrowLeft,
  BookOpen,
  CheckCircle,
  Target,
  Lightbulb,
  Copy,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react';
import { Topic, TopicContent } from '../../types/classroom';

const SectionIcon = {
  introduction: BookOpen,
  learningObjectives: Target,
  keyTerminology: BookOpen,
  lesson: BookOpen,
  simpleExplanation: BookOpen,
  advancedExplanation: BookOpen,
  examples: Lightbulb,
  realWorldApplications: Target,
  caseStudies: BookOpen,
  practiceQuestions: BookOpen,
  revisionNotes: BookOpen,
  summary: CheckCircle,
  additionalResources: BookOpen,
  interactiveActivities: BookOpen,
};

const sectionLabels: Record<string, string> = {
  introduction: 'Introduction',
  learningObjectives: 'Learning Objectives',
  keyTerminology: 'Key Terminology',
  lesson: 'Detailed Lesson',
  simpleExplanation: 'Simple Explanation',
  advancedExplanation: 'Advanced Explanation',
  examples: 'Examples',
  realWorldApplications: 'Real-World Applications',
  caseStudies: 'Case Studies',
  knowledgeChecks: 'Knowledge Checks',
  practiceQuestions: 'Practice Questions',
  revisionNotes: 'Revision Notes',
  summary: 'Summary',
  additionalResources: 'Additional Resources',
  interactiveActivities: 'Interactive Activities',
};

/**
 * Student topic reader screen.
 * Allows students to read published topics and track their progress.
 * Does not affect any existing components or flows.
 */
export default function StudentTopicReader() {
  const { roomId, topicId } = useParams<{ roomId: string; topicId: string }>();
  const navigate = useNavigate();
  const { currentRoom, subscribeToCurrentRoom } = useClassroom();
  const [topic, setTopic] = useState<Topic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeSection, setActiveSection] = useState('introduction');
  const [progress, setProgress] = useState<TopicProgress | null>(null);
  const [savingProgress, setSavingProgress] = useState(false);

  const sectionOrder = [
    'introduction',
    'learningObjectives',
    'keyTerminology',
    'lesson',
    'simpleExplanation',
    'advancedExplanation',
    'examples',
    'realWorldApplications',
    'caseStudies',
    'knowledgeChecks',
    'practiceQuestions',
    'revisionNotes',
    'summary',
    'additionalResources',
    'interactiveActivities',
  ];

  useEffect(() => {
    if (topicId && roomId) {
      loadTopic();
      loadProgress();
    }
    const unsub = subscribeToCurrentRoom();
    return () => { if (unsub) unsub(); };
  }, [topicId, roomId]);

  const loadTopic = async () => {
    setLoading(true);
    try {
      const data = await topicService.getTopicById(topicId!);
      if (!data || data.status !== 'published') {
        navigate(`/classroom/${roomId}/learn/topics`);
        return;
      }
      setTopic(data);
      if (data.aiContent && 'introduction' in data.aiContent) {
        setActiveSection('introduction');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load topic');
    } finally {
      setLoading(false);
    }
  };

  const loadProgress = async () => {
    if (!roomId || !topicId) return;
    try {
      const data = await topicService.getTopicProgress(roomId, topicId);
      setProgress(data);
      if (data?.lastSection) {
        setActiveSection(data.lastSection);
      }
    } catch (err) {
      console.error('Failed to load progress:', err);
    }
  };

  const saveProgress = async (section: string) => {
    if (!roomId || !topicId) return;
    setSavingProgress(true);
    try {
      const sectionIndex = sectionOrder.indexOf(section);
      const progressPercent = Math.round(((sectionIndex + 1) / sectionOrder.length) * 100);
      await topicService.updateStudentProgress(roomId, topicId, {
        progress: progressPercent,
        completed: progressPercent === 100,
        lastSection: section,
        timeSpent: (progress?.timeSpent || 0) + 120,
      });
    } catch (err) {
      console.error('Failed to save progress:', err);
    } finally {
      setSavingProgress(false);
    }
  };

  const handleSectionChange = (section: string) => {
    setActiveSection(section);
    saveProgress(section);
  };

  const renderContent = () => {
    if (!topic || !topic.aiContent) return null;
    const content = topic.aiContent as TopicContent;
    const hasContent = (section: string) => {
      const value = (content as any)[section];
      return value !== undefined && value !== null && value !== '';
    };

    switch (activeSection) {
      case 'introduction':
        return content.introduction ? (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-white mb-4">{topic.title}</h2>
            <p className="text-slate-300 leading-relaxed text-lg">{content.introduction}</p>
          </div>
        ) : null;

      case 'learningObjectives':
        return content.learningObjectives && content.learningObjectives.length > 0 ? (
          <div className="space-y-3">
            <h2 className="text-xl font-bold text-white mb-3">Learning Objectives</h2>
            <ul className="space-y-2">
              {content.learningObjectives.map((obj, i) => (
                <li key={i} className="flex items-start gap-3 text-slate-300">
                  <Target className="w-5 h-5 text-indigo-400 mt-0.5 flex-shrink-0" />
                  <span>{obj}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null;

      case 'keyTerminology':
        return content.keyTerminology && content.keyTerminology.length > 0 ? (
          <div className="space-y-3">
            <h2 className="text-xl font-bold text-white mb-3">Key Terminology</h2>
            <div className="space-y-3">
              {content.keyTerminology.map((term, i) => (
                <div key={i} className="border-b border-slate-700 pb-2">
                  <div className="flex gap-4">
                    <Badge variant="secondary">{term.term}</Badge>
                    <p className="text-slate-300">{term.definition}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null;

      case 'lesson':
        return content.lesson ? (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-white">Detailed Lesson</h2>
            <Card className="bg-slate-800 border-slate-700 p-6">
              <h3 className="text-lg font-semibold text-indigo-300 mb-3">Overview</h3>
              <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">
                {content.lesson.detailed}
              </p>
            </Card>

            <Card className="bg-slate-800 border-slate-700 p-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-blue-300">Simplified Explanation</h3>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => navigator.clipboard.writeText(content.lesson.simple)}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">
                {content.lesson.simple}
              </p>
            </Card>
          </div>
        ) : null;

      case 'simpleExplanation':
        return content.simpleExplanation ? (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white">Simple Explanation</h2>
            <Card className="bg-slate-800 border-slate-700 p-6">
              <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">
                {content.simpleExplanation}
              </p>
            </Card>
          </div>
        ) : null;

      case 'advancedExplanation':
        return content.advancedExplanation ? (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white">Advanced Explanation</h2>
            <Card className="bg-slate-800 border-slate-700 p-6">
              <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">
                {content.advancedExplanation}
              </p>
            </Card>
          </div>
        ) : null;

      case 'examples':
        return content.examples && content.examples.length > 0 ? (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white mb-4">Examples</h2>
            <div className="space-y-4">
              {content.examples.map((ex, i) => (
                <Card key={i} className="bg-slate-800 border-slate-700 p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <Lightbulb className="w-5 h-5 text-yellow-400" />
                    <h3 className="font-bold text-white">{ex.title}</h3>
                    <Badge variant="secondary">{ex.type}</Badge>
                  </div>
                  <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">
                    {ex.description}
                  </p>
                </Card>
              ))}
            </div>
          </div>
        ) : null;

      case 'realWorldApplications':
        return content.realWorldApplications && content.realWorldApplications.length > 0 ? (
          <div className="space-y-3">
            <h2 className="text-xl font-bold text-white mb-3">Real-World Applications</h2>
            <ul className="space-y-2">
              {content.realWorldApplications.map((app, i) => (
                <li key={i} className="flex items-start gap-3 text-slate-300">
                  <Lightbulb className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                  <span>{app}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null;

      case 'caseStudies':
        return content.caseStudies && content.caseStudies.length > 0 ? (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-white mb-4">Case Studies</h2>
            {content.caseStudies.map((cs, i) => (
              <Card key={i} className="bg-slate-800 border-slate-700 p-6">
                <h3 className="font-bold text-xl text-white mb-3">{cs.title}</h3>
                <p className="text-slate-300 mb-4 whitespace-pre-wrap">{cs.scenario}</p>

                <h4 className="font-semibold text-indigo-300 mb-2">Discussion Questions</h4>
                <ul className="list-decimal list-inside space-y-1 text-slate-300 mb-3">
                  {cs.questions.map((q, j) => (
                    <li key={j}>{q}</li>
                  ))}
                </ul>

                <h4 className="font-semibold text-indigo-300 mb-2">Learning Outcomes</h4>
                <ul className="list-decimal list-inside space-y-1 text-slate-300">
                  {cs.learningOutcomes.map((outcome, j) => (
                    <li key={j}>{outcome}</li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        ) : null;

      case 'knowledgeChecks':
        return content.knowledgeChecks && content.knowledgeChecks.length > 0 ? (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white mb-4">Knowledge Checks</h2>
            {content.knowledgeChecks.map((kc, i) => (
              <Card key={i} className="bg-slate-800 border-slate-700 p-4">
                <p className="text-white font-medium mb-2">{kc.question}</p>
                {kc.options && (
                  <ul className="space-y-1 text-slate-300 mb-2">
                    {kc.options.map((opt, j) => (
                      <li key={j} className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center text-xs">
                          {String.fromCharCode(65 + j)}
                        </span>
                        {opt}
                      </li>
                    ))}
                  </ul>
                )}
                <Badge
                  variant={kc.difficulty === 'easy' ? 'default' : kc.difficulty === 'medium' ? 'secondary' : 'destructive'}
                >
                  {kc.difficulty}
                </Badge>
              </Card>
            ))}
          </div>
        ) : null;

      case 'practiceQuestions':
        return content.practiceQuestions && content.practiceQuestions.length > 0 ? (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white mb-4">Practice Questions</h2>
            {content.practiceQuestions.map((q, i) => (
              <Card key={i} className="bg-slate-800 border-slate-700 p-4">
                <p className="text-white font-medium mb-2">{q.text}</p>
                {q.options && (
                  <ul className="space-y-1 text-slate-300 mb-2">
                    {q.options.map((opt, j) => (
                      <li key={j} className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center text-xs">
                          {String.fromCharCode(65 + j)}
                        </span>
                        {opt}
                      </li>
                    ))}
                  </ul>
                )}
                <div className="mt-2 p-2 bg-slate-700/30 rounded-md">
                  <p className="text-green-300 font-medium flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" />
                    Answer: {q.correctAnswer}
                  </p>
                  {q.explanation && (
                    <p className="text-slate-400 text-sm mt-1">{q.explanation}</p>
                  )}
                </div>
              </Card>
            ))}
          </div>
        ) : null;

      case 'revisionNotes':
        return content.revisionNotes ? (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white mb-3">Revision Notes</h2>
            <Card className="bg-slate-800 border-slate-700 p-6">
              <div
                className="prose prose-slate max-w-none"
                dangerouslySetInnerHTML={{
                  __html: content.revisionNotes
                    .replace(/^### (.*$)/gm, '<h3 class="text-lg font-semibold text-white mb-2">$1</h3>')
                    .replace(/^## (.*$)/gm, '<h2 class="text-xl font-bold text-white mb-3">$1</h2>')
                    .replace(/^# (.*$)/gm, '<h1 class="text-2xl font-bold text-white mb-4">$1</h1>')
                    .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>')
                    .replace(/^\s*[-•]\s(.*$)/gm, '<li class="mb-1">• $1</li>')
                    .replace(/\n\n/g, '</p><p class="mb-2 text-slate-300">')
                    .replace(/^(.*$)/gm, '<p class="mb-2 text-slate-300">$1</p>'),
                }}
              />
            </Card>
          </div>
        ) : null;

      case 'summary':
        return content.summary ? (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white mb-3">Summary</h2>
            <Card className="bg-slate-800 border-slate-700 p-6">
              <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">
                {content.summary}
              </p>
            </Card>
          </div>
        ) : null;

      case 'additionalResources':
        return content.additionalResources && content.additionalResources.length > 0 ? (
          <div className="space-y-3">
            <h2 className="text-xl font-bold text-white mb-3">Additional Resources</h2>
            <div className="space-y-2">
              {content.additionalResources.map((res, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-slate-800 border border-slate-700 rounded-md">
                  <BookOpen className="w-5 h-5 text-blue-400" />
                  <div className="flex-1">
                    <p className="text-white font-medium">{res.title}</p>
                    <Badge variant="secondary" className="text-xs">
                      {res.type}
                    </Badge>
                  </div>
                  <a
                    href={res.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-400 hover:text-indigo-300"
                  >
                    <BookOpen className="w-4 h-4" />
                  </a>
                </div>
              ))}
            </div>
          </div>
        ) : null;

      case 'interactiveActivities':
        return content.interactiveActivities && content.interactiveActivities.length > 0 ? (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white mb-4">Interactive Activities</h2>
            {content.interactiveActivities.map((activity, i) => (
              <Card key={i} className="bg-slate-800 border-slate-700 p-6">
                <h3 className="font-bold text-white mb-2">{activity.title}</h3>
                <Badge variant="secondary" className="mb-2">
                  {activity.type}
                </Badge>
                <pre className="text-slate-300 bg-slate-900/50 p-3 rounded-md overflow-x-auto text-sm">
                  {JSON.stringify(activity.content, null, 2)}
                </pre>
              </Card>
            ))}
          </div>
        ) : null;

      default:
        return <div>Section not available</div>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-slate-400">Loading topic...</div>
      </div>
    );
  }

  if (!topic) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center text-slate-400">
          <p>Topic not found</p>
        </div>
      </div>
    );
  }

  const availableSections = sectionOrder.filter(section => {
    const content = topic.aiContent as TopicContent;
    const value = (content as any)[section];
    return value !== undefined && value !== null && value !== '';
  });

  const currentProgress = progress?.progress || 0;
  const sectionIndex = availableSections.indexOf(activeSection);
  const progressPercent = availableSections.length > 0
    ? Math.round(((sectionIndex + 1) / availableSections.length) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex">
      {/* Sidebar Navigation */}
      <aside className="w-64 border-r border-slate-700 overflow-y-auto">
        <div className="p-4 border-b border-slate-700">
          <h2 className="font-bold text-white">Topic Contents</h2>
          <p className="text-sm text-slate-400 mt-1">{topic.title}</p>
        </div>

        <div className="p-3 border-b border-slate-700">
          <div className="flex items-center gap-2 mb-1 text-sm">
            <span className="text-slate-400">Your Progress</span>
            <span className="text-white font-medium">{currentProgress}%</span>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-2">
            <div
              className="bg-indigo-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${currentProgress}%` }}
            />
          </div>
        </div>

        <nav className="p-2 space-y-1">
          {availableSections.map((section) => {
            const Icon = SectionIcon[section as keyof typeof SectionIcon] || BookOpen;
            const isActive = activeSection === section;
            const idx = availableSections.indexOf(section);
            const sectionProgress = progress?.progress || 0;
            const completed = idx < sectionIndex || (idx === sectionIndex && sectionProgress > 0);

            return (
              <button
                key={section}
                onClick={() => handleSectionChange(section)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-left transition-colors ${
                  isActive
                    ? 'bg-indigo-600/20 text-indigo-300'
                    : completed
                    ? 'text-green-400 hover:bg-slate-700/50'
                    : 'text-slate-300 hover:bg-slate-700/50'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-sm">{sectionLabels[section] || section}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/classroom/${roomId}/learn/topics`)}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>

            <div className="flex items-center gap-2">
              <Badge variant={topic.status === 'published' ? 'default' : 'secondary'}>
                {topic.status}
              </Badge>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const idx = availableSections.indexOf(activeSection);
                  if (idx < availableSections.length - 1) {
                    handleSectionChange(availableSections[idx + 1]);
                  }
                }}
              >
                {savingProgress ? 'Saving...' : 'Mark Complete'}
              </Button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex justify-between text-sm text-slate-400 mb-1">
              <span>Section {sectionIndex + 1} of {availableSections.length}</span>
              <span>{progressPercent}% Complete</span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-2">
              <div
                className="bg-indigo-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Content */}
          <div className="mb-8">
            {renderContent()}
          </div>

          {/* Navigation */}
          <div className="flex justify-between pt-6 border-t border-slate-700">
            <Button
              variant="outline"
              size="sm"
              disabled={sectionIndex === 0}
              onClick={() => {
                if (sectionIndex > 0) {
                  handleSectionChange(availableSections[sectionIndex - 1]);
                }
              }}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={sectionIndex === availableSections.length - 1}
              onClick={() => {
                if (sectionIndex < availableSections.length - 1) {
                  handleSectionChange(availableSections[sectionIndex + 1]);
                }
              }}
            >
              Next
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
