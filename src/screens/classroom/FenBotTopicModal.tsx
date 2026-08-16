import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import {
  Loader2,
  Sparkles,
  Send,
  Copy,
  X,
  Sparkles as SparklesIcon,
  MessageSquare,
  Brain,
  BookOpen,
  Target,
  Lightbulb,
} from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  createdAt: number;
}

interface FenBotTopicModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (context: string) => void;
  topicTitle: string;
  sourceText: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

const TOPIC_CREATION_SYSTEM_PROMPT = `You are FenBot - an elite educational content creator specialized in helping teachers design comprehensive learning topics.

Your role is to help the teacher refine and enhance their topic before AI generation. You will:
1. Ask clarifying questions about the topic scope, audience, and goals
2. Suggest learning objectives, key concepts, and structure
3. Recommend examples, case studies, and activities
4. Help identify potential student difficulties and misconceptions
5. Provide pedagogical guidance on difficulty level and scaffolding

When the teacher is ready, they will click "Generate Topic" which will use our conversation as context for the AI topic engine.

Guidelines:
- Be collaborative and supportive
- Ask one focused question at a time
- Provide concrete, actionable suggestions
- Reference proven teaching methodologies (Bloom's Taxonomy, scaffolding, spaced repetition, Feynman technique)
- Keep responses concise but insightful
- Don't overwhelm with questions - let the teacher guide the pace`;

function getWelcomeMessages(title: string) {
  return [
    `Hi! I'm FenBot, your AI teaching partner. I can help you create an exceptional topic on "${title}". Let me start by understanding your goals better.

What's the most important thing you want your students to walk away understanding from this topic?`,
    `Hello! I'm excited to help you build a great learning experience for "${title}".

Before we generate the content, let me ask: What level are your students at, and what's the biggest challenge they typically face with this subject?`,
    `Hey there! I'm FenBot, and I specialize in helping teachers create engaging, effective lessons.

For "${title}", what would you say is the ONE key insight or "aha!" moment you want every student to have?`,
  ];
}

function getRandomWelcome(title: string) {
  const messages = getWelcomeMessages(title);
  return messages[Math.floor(Math.random() * messages.length)];
}

export default function FenBotTopicModal({
  isOpen,
  onClose,
  onGenerate,
  topicTitle,
  sourceText,
  difficulty,
}: FenBotTopicModalProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isFirstOpen, setIsFirstOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Reset when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setIsFirstOpen(true);
      setMessages([]);
      setInput('');
    } else {
      setIsFirstOpen(true);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && isFirstOpen) {
      const welcomeMsg: Message = {
        role: 'assistant',
        content: getRandomWelcome(topicTitle),
        createdAt: Date.now(),
      };
      setMessages([welcomeMsg]);
      setIsFirstOpen(false);
    }
  }, [isOpen, isFirstOpen, topicTitle]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setLoading(true);

    const userMsg: Message = { role: 'user', content: userMessage, createdAt: Date.now() };
    setMessages((prev) => [...prev, userMsg]);

    // Build context for the AI
    const conversationContext = messages
      .map((m) => `${m.role}: ${m.content}`)
      .join('\n\n');

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'meta/llama-3.1-8b-instruct',
          messages: [
            { role: 'system', content: TOPIC_CREATION_SYSTEM_PROMPT },
            {
              role: 'system',
              content: `Topic: "${topicTitle}"
Difficulty: ${difficulty}
Source material preview: ${sourceText.substring(0, 2000) || '(none provided)'}
Conversation so far:\n${conversationContext}`,
            },
            { role: 'user', content: userMessage },
          ],
          temperature: 0.7,
          max_tokens: 4096,
          stream: true,
        }),
      });

      if (!response.ok) throw new Error('Failed to get response');

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No stream');

      const decoder = new TextDecoder();
      let fullResponse = '';

      // Add placeholder for streaming
      const assistantMsg: Message = { role: 'assistant', content: '', createdAt: Date.now() };
      setMessages((prev) => [...prev, assistantMsg]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            try {
              const json = JSON.parse(data);
              const delta = json.choices?.[0]?.delta?.content;
              if (delta) {
                fullResponse += delta;
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    ...updated[updated.length - 1],
                    content: fullResponse,
                  };
                  return updated;
                });
              }
            } catch {}
          }
        }
      }
    } catch (err) {
      console.error('FenBot error:', err);
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          ...updated[updated.length - 1],
          content: 'Sorry, I encountered an error. Please try again.',
        };
        return updated;
      });
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, topicTitle, sourceText, difficulty]);

  const handleGenerateClick = useCallback(() => {
    // Build full conversation context for topic generation
    const fullContext = messages
      .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
      .join('\n\n');

    const generationContext = `
TOPIC: "${topicTitle}"
DIFFICULTY: ${difficulty}
SOURCE MATERIAL: ${sourceText || '(none provided)'}

FENBOT CONSULTATION:
${fullContext}

Please use this consultation to generate comprehensive topic content. The teacher has discussed the above with FenBot - incorporate relevant insights, suggested objectives, examples, and pedagogical approaches from the conversation.`;

    onGenerate(generationContext);
    onClose();
  }, [messages, onGenerate, onClose, topicTitle, difficulty, sourceText]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center">
      <div className="bg-slate-800 border border-slate-700 rounded-xl flex flex-col max-w-3xl w-full mx-4 h-[90vh] max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-white">FenBot Topic Assistant</h2>
              <p className="text-sm text-slate-400">Chat to refine your topic before generation</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Topic Context */}
        <div className="px-4 py-3 border-b border-slate-700 bg-slate-900/50">
          <div className="flex items-center gap-2 text-sm">
            <SparklesIcon className="w-4 h-4 text-indigo-400" />
            <span className="text-white font-medium">{topicTitle}</span>
            <Badge variant="secondary" className="text-xs capitalize">{difficulty}</Badge>
            {sourceText && (
              <span className="text-slate-500">• {sourceText.length} chars source</span>
            )}
          </div>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}
            >
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                  <Brain className="w-4 h-4 text-white" />
                </div>
              )}
              <div
                className={`max-w-[80%] p-4 rounded-2xl ${
                  msg.role === 'user'
                    ? 'bg-indigo-600 text-white rounded-tr-none'
                    : 'bg-slate-700/50 text-slate-100 rounded-tl-none'
                }`}
              >
                <div className="prose prose-slate max-w-none" dangerouslySetInnerHTML={{
                  __html: msg.content
                    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-white">$1</strong>')
                    .replace(/\n\n/g, '</p><p class="mb-2">')
                    .replace(/^(.*$)/gm, '<p class="mb-2">$1</p>'),
                }} />
              </div>
              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-xl bg-slate-600 flex items-center justify-center flex-shrink-0">
                  <MessageSquare className="w-4 h-4 text-slate-300" />
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                <Loader2 className="w-4 h-4 text-white animate-spin" />
              </div>
              <div className="p-4 bg-slate-700/50 rounded-2xl rounded-tl-none max-w-[80%]">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Action Buttons */}
        <div className="px-4 py-3 border-t border-slate-700">
          <div className="flex flex-wrap gap-2 mb-3">
            <button
              onClick={() => setInput('What learning objectives would you suggest?')}
              className="px-3 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300 transition-colors"
              disabled={loading}
            >
              <Target className="w-3 h-3 mr-1" /> Suggest Objectives
            </button>
            <button
              onClick={() => setInput('What examples or case studies would work well?')}
              className="px-3 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300 transition-colors"
              disabled={loading}
            >
              <Lightbulb className="w-3 h-3 mr-1" /> Add Examples
            </button>
            <button
              onClick={() => setInput('What are common student misconceptions for this topic?')}
              className="px-3 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300 transition-colors"
              disabled={loading}
            >
              <BookOpen className="w-3 h-3 mr-1" /> Misconceptions
            </button>
            <button
              onClick={() => setInput('How should I scaffold this for different ability levels?')}
              className="px-3 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300 transition-colors"
              disabled={loading}
            >
              <Sparkles className="w-3 h-3 mr-1" /> Scaffolding Ideas
            </button>
          </div>

          {/* Input Area */}
          <div className="flex gap-2">
            <Textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask FenBot about your topic..."
              rows={2}
              className="flex-1 min-h-[60px] max-h-32 resize-none"
              disabled={loading}
            />
            <Button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              className="h-12 bg-indigo-600 hover:bg-indigo-700"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Generate Button */}
        <div className="p-4 border-t border-slate-700 bg-slate-900/50">
          <Button
            onClick={handleGenerateClick}
            disabled={messages.length < 2 || loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 py-3 text-lg"
          >
            <SparklesIcon className="w-5 h-5 mr-2" />
            Generate Topic with This Context
          </Button>
          <p className="text-center text-xs text-slate-500 mt-2">
            {messages.length < 2 ? 'Chat with FenBot first to build context' : 'Uses entire conversation for generation'}
          </p>
        </div>
      </div>
    </div>
  );
}

function Badge({ variant = 'secondary', children, className = '' }: { variant?: 'secondary' | 'outline'; children: React.ReactNode; className?: string }) {
  const base = 'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium';
  const variants = {
    secondary: 'bg-slate-700 text-slate-300',
    outline: 'border border-slate-600 text-slate-400',
  };
  return <span className={`${base} ${variants[variant]} ${className}`}>{children}</span>;
}