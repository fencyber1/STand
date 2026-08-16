import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { topicService } from '../../services/topicService';
import { useClassroom } from '../../contexts/ClassroomContext';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import {
  ArrowLeft,
  BookOpen,
  CheckCircle,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  Lightbulb,
  Target,
  Brain,
  FileText,
  ExternalLink,
  ThumbsUp,
  ThumbsDown,
  Copy,
  Send,
} from 'lucide-react';
import { Topic, TopicContent } from '../../types/classroom';

export default function TopicReader() {
  const { roomId, topicId } = useParams<{ roomId: string; topicId: string }>();
  const navigate = useNavigate();
  const { currentRoom, subscribeToCurrentRoom } = useClassroom();
  const [topic, setTopic] = useState<Topic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeSection, setActiveSection] = useState('introduction');
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<Array<{ role: 'user' | 'ai'; content: string }>>([]);
  const [isSending, setIsSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

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
    const unsub = subscribeToCurrentRoom();
    return () => { if (unsub) unsub(); };
  }, [topicId]);

  const loadTopic = async () => {
    setLoading(true);
    try {
      const data = await topicService.getTopicById(topicId!);
      if (!data) {
        navigate(`/classroom/${roomId}`);
        return;
      }
      setTopic(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load topic');
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }, []);

  const handleSendMessage = async () => {
    if (!chatMessage.trim() || !topic) return;

    const userMessage = { role: 'user' as const, content: chatMessage };
    setChatHistory((prev) => [...prev, userMessage]);
    setChatMessage('');
    setIsSending(true);

    // Simulate AI response (in real implementation, this would call the AI API)
    setTimeout(() => {
      const aiResponse = {
        role: 'ai' as const,
        content: `Based on the "${topic.title}" topic:\n\nThis is an AI-powered response. You can ask me to:\n- Explain concepts simply\n- Provide more examples\n- Generate practice questions\n- Help with revision`,
      };
      setChatHistory((prev) => [...prev, aiResponse]);
      scrollToBottom();
    }, 1500);

    setIsSending(false);
  };

  const handleCopyContent = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  const renderContent = () => {
    if (!topic || !topic.aiContent) return null;
    const content = topic.aiContent as TopicContent;

    switch (activeSection) {
      case 'introduction':
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-white mb-4">{topic.title}</h2>
            <p className="text-slate-300 leading-relaxed text-lg">{content.introduction}</p>
          </div>
        );

      case 'learningObjectives':
        return (
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
        );

      case 'keyTerminology':
        return (
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
        );

      case 'lesson':
        return (
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
                  onClick={() => handleCopyContent(content.simpleExplanation)}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">
                {content.lesson.simple}
              </p>
            </Card>
          </div>
        );

      case 'simpleExplanation':
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white">Simple Explanation</h2>
            <Card className="bg-slate-800 border-slate-700 p-6">
              <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">
                {content.simpleExplanation}
              </p>
            </Card>
            <Button
              variant="ghost"
              onClick={() => handleCopyContent(content.simpleExplanation)}
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy
            </Button>
          </div>
        );

      case 'advancedExplanation':
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white">Advanced Explanation</h2>
            <Card className="bg-slate-800 border-slate-700 p-6">
              <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">
                {content.advancedExplanation}
              </p>
            </Card>
          </div>
        );

      case 'examples':
        return (
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
        );

      case 'realWorldApplications':
        return (
          <div className="space-y-3">
            <h2 className="text-xl font-bold text-white mb-3">Real-World Applications</h2>
            <ul className="space-y-2">
              {content.realWorldApplications.map((app, i) => (
                <li key={i} className="flex items-start gap-3 text-slate-300">
                  <ExternalLink className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                  <span>{app}</span>
                </li>
              ))}
            </ul>
          </div>
        );

      case 'caseStudies':
        return (
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
        );

      case 'knowledgeChecks':
        return (
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
        );

      case 'practiceQuestions':
        return (
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
                  <p className="text-green-300 font-medium">Answer: {q.correctAnswer}</p>
                  <p className="text-slate-400 text-sm mt-1">{q.explanation}</p>
                </div>
              </Card>
            ))}
          </div>
        );

      case 'revisionNotes':
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white mb-3">Revision Notes</h2>
            <Card className="bg-slate-800 border-slate-700 p-6">
              <div className="prose prose-slate max-w-none" dangerouslySetInnerHTML={{ __html: markdownToHtml(content.revisionNotes) }} />
            </Card>
          </div>
        );

      case 'summary':
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white mb-3">Summary</h2>
            <Card className="bg-slate-800 border-slate-700 p-6">
              <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">
                {content.summary}
              </p>
            </Card>
          </div>
        );

      case 'additionalResources':
        return (
          <div className="space-y-3">
            <h2 className="text-xl font-bold text-white mb-3">Additional Resources</h2>
            <div className="space-y-2">
              {content.additionalResources.map((res, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-slate-800 border border-slate-700 rounded-md">
                  <FileText className="w-5 h-5 text-blue-400" />
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
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              ))}
            </div>
          </div>
        );

      case 'interactiveActivities':
        return (
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
        );

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex">
      {/* Sidebar Navigation */}
      <aside className="w-64 border-r border-slate-700 overflow-y-auto">
        <div className="p-4 border-b border-slate-700">
          <h2 className="font-bold text-white">Topic Contents</h2>
        </div>
        <nav className="p-2 space-y-1">
          {sectionOrder.map((section) => (
            <button
              key={section}
              onClick={() => setActiveSection(section)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-left transition-colors ${
                activeSection === section
                  ? 'bg-indigo-600/20 text-indigo-300'
                  : 'text-slate-300 hover:bg-slate-700/50'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span className="text-sm capitalize">
                {section.replace(/([A-Z])/g, ' $1').trim()}
              </span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-700">
          <Button
            className="w-full"
            onClick={() => setChatOpen(!chatOpen)}
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            AI Assistant
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/classroom/${roomId}/learn`)}
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
                  /* mark as complete */
                }}
              >
                <CheckCircle className="w-4 h-4 mr-1" />
                Mark Complete
              </Button>
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
              disabled={sectionOrder.indexOf(activeSection) === 0}
              onClick={() => {
                const idx = sectionOrder.indexOf(activeSection);
                if (idx > 0) {
                  setActiveSection(sectionOrder[idx - 1]);
                }
              }}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Previous
            </Button>
            <Button
              variant="outline"
              disabled={sectionOrder.indexOf(activeSection) === sectionOrder.length - 1}
              onClick={() => {
                const idx = sectionOrder.indexOf(activeSection);
                if (idx < sectionOrder.length - 1) {
                  setActiveSection(sectionOrder[idx + 1]);
                }
              }}
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      </main>

      {/* AI Chat Assistant */}
      {chatOpen && (
        <div className="w-96 border-l border-slate-700 flex flex-col">
          <div className="p-4 border-b border-slate-700">
            <h3 className="font-bold text-white">AI Assistant</h3>
            <p className="text-sm text-slate-400">Ask about: {topic?.title}</p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {chatHistory.length === 0 ? (
              <div className="text-center text-slate-500 py-8">
                <Brain className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Ask me anything about this topic!</p>
                <div className="mt-4 space-y-2">
                  <button
                    onClick={() => setChatMessage('Explain this simply')}
                    className="text-left w-full p-2 text-sm bg-slate-700/30 rounded-md hover:bg-slate-700/50"
                  >
                    Explain this simply
                  </button>
                  <button
                    onClick={() => setChatMessage('Give me an example')}
                    className="text-left w-full p-2 text-sm bg-slate-700/30 rounded-md hover:bg-slate-700/50"
                  >
                    Give me an example
                  </button>
                  <button
                    onClick={() => setChatMessage('Test me')}
                    className="text-left w-full p-2 text-sm bg-slate-700/30 rounded-md hover:bg-slate-700/50"
                  >
                    Test me
                  </button>
                </div>
              </div>
            ) : (
              chatHistory.map((msg, i) => (
                <div
                  key={i}
                  className={`p-3 rounded-lg ${
                    msg.role === 'user'
                      ? 'bg-indigo-600/20 ml-4'
                      : 'bg-slate-700/30 mr-4'
                  }`}
                >
                  <p className="text-slate-200 whitespace-pre-wrap">{msg.content}</p>
                </div>
              ))
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="p-4 border-t border-slate-700">
            <div className="flex gap-2">
              <input
                type="text"
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Ask AI..."
                className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                disabled={isSending}
              />
              <Button
                size="sm"
                onClick={handleSendMessage}
                disabled={isSending || !chatMessage.trim()}
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  function markdownToHtml(markdown: string): string {
    // Simple markdown to HTML conversion
    let html = markdown
      .replace(/^### (.*$)/gm, '<h3 class="text-lg font-semibold text-white mb-2">$1</h3>')
      .replace(/^## (.*$)/gm, '<h2 class="text-xl font-bold text-white mb-3">$1</h2>')
      .replace(/^# (.*$)/gm, '<h1 class="text-2xl font-bold text-white mb-4">$1</h1>')
      .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/^\s*[-•]\s(.*$)/gm, '<li class="mb-1">• $1</li>')
      .replace(/\n\n/g, '</p><p class="mb-2 text-slate-300">')
      .replace(/^(.*$)/gm, '<p class="mb-2 text-slate-300">$1</p>')
      .trim();

    return `<div class="space-y-2">${html}</div>`;
  }
}
