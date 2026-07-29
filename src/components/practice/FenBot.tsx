import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Loader2, Sparkles, RotateCcw } from 'lucide-react';
import Strands from '../effects/Strands';
import TwemojiText from '../social/TwemojiText';

const API_KEY = import.meta.env.VITE_NVIDIA_API_KEY || '';

function getApiUrl(): string {
  if (import.meta.env.DEV) return '/api/nvidia/chat/completions';
  return '/api/generate';
}

function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (import.meta.env.DEV) headers['Authorization'] = `Bearer ${API_KEY}`;
  return headers;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const SYSTEM_PROMPT = `You are FenBot, a friendly AI tutor built into the STand study platform. Your mission is to make ANY topic — no matter how complex — simple and understandable.

## Your Teaching Method

When a user asks about a topic, you MUST follow this structure:

### Level 1: The Big Picture (1-2 sentences)
Explain what this topic IS in the simplest possible terms. Use an analogy from everyday life.

### Level 2: Core Concepts
Break the topic into 3-5 key concepts. For each:
- Give it a simple name
- Explain it in 1-2 sentences
- Use an emoji icon

### Level 3: How It Works
Explain the mechanics step by step. Use numbered lists.

### Level 4: Visual Representation
Always include an ASCII diagram, flowchart, or visual representation using code blocks. For example:
- Flow diagrams with arrows (→, ↓, ↑)
- Tree structures
- Comparison tables
- Process flows

### Level 5: Real-World Example
Give a concrete, relatable example that connects to something the user already knows.

### Level 6: Quick Quiz
End with 2-3 quick questions to test understanding (without answers — let the user think).

## Formatting Rules
- Use markdown headers (###) for each level
- Use **bold** for key terms
- Use \`code\` for technical terms
- Use emoji icons liberally to make it visually engaging
- Keep paragraphs short (2-3 lines max)
- Use bullet points and numbered lists
- Always include at least one ASCII diagram or visual
- If the topic is very complex, suggest breaking it into sub-topics

## Your Personality
- Friendly and encouraging ("Great question!", "You're on the right track!")
- Patient — never rush through explanations
- Curious — ask follow-up questions to understand what the user already knows
- Use casual language, not overly academic

## Important
- If a user greets you casually, respond warmly and ask what they'd like to learn
- If a topic is too broad, suggest a specific starting point
- If a topic is too advanced, offer to start from the basics
- Always end with something interactive (quiz, question, or suggestion)
- Use markdown formatting throughout`;

const SUGGESTIONS = [
  { icon: '🧬', label: 'How DNA works', topic: 'Explain how DNA replication works' },
  { icon: '⚛️', label: 'Quantum computing', topic: 'Explain quantum computing in simple terms' },
  { icon: '🧮', label: 'Calculus basics', topic: 'Explain the concept of derivatives in calculus' },
  { icon: '🧠', label: 'Machine learning', topic: 'Explain how neural networks learn' },
  { icon: '⚡', label: 'Electricity', topic: 'Explain how electricity and circuits work' },
  { icon: '🌍', label: 'Plate tectonics', topic: 'Explain plate tectonics and earthquakes' },
];

function parseMarkdown(text: string) {
  const lines = text.split('\n');
  const elements: JSX.Element[] = [];
  let inCodeBlock = false;
  let codeContent = '';
  let codeKey = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith('```')) {
      if (inCodeBlock) {
        elements.push(
          <pre key={codeKey++} className="bg-black/40 border border-white/10 rounded-xl p-4 my-3 overflow-x-auto text-sm font-mono text-indigo-200">
            <code>{codeContent.trim()}</code>
          </pre>
        );
        codeContent = '';
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeContent += line + '\n';
      continue;
    }

    if (line.startsWith('### ')) {
      elements.push(<h3 key={i} className="text-base font-bold text-indigo-300 mt-5 mb-2">{line.slice(4)}</h3>);
    } else if (line.startsWith('## ')) {
      elements.push(<h2 key={i} className="text-lg font-bold text-white mt-6 mb-2">{line.slice(3)}</h2>);
    } else if (line.startsWith('# ')) {
      elements.push(<h1 key={i} className="text-xl font-bold text-white mt-6 mb-3">{line.slice(2)}</h1>);
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      const content = line.slice(2);
      elements.push(
        <div key={i} className="flex items-start gap-2 ml-2 my-0.5">
          <span className="text-indigo-400 mt-1.5 text-xs">●</span>
          <span className="text-gray-200 text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: formatInline(content) }} />
        </div>
      );
    } else if (/^\d+\.\s/.test(line)) {
      const match = line.match(/^(\d+)\.\s(.+)/);
      if (match) {
        elements.push(
          <div key={i} className="flex items-start gap-2.5 ml-2 my-1">
            <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{match[1]}</span>
            <span className="text-gray-200 text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: formatInline(match[2]) }} />
          </div>
        );
      }
    } else if (line.startsWith('> ')) {
      elements.push(
        <div key={i} className="border-l-2 border-indigo-500/50 pl-3 my-2 text-sm text-gray-300 italic" dangerouslySetInnerHTML={{ __html: formatInline(line.slice(2)) }} />
      );
    } else if (line.trim() === '') {
      elements.push(<div key={i} className="h-2" />);
    } else {
      elements.push(<p key={i} className="text-sm text-gray-200 leading-relaxed my-1" dangerouslySetInnerHTML={{ __html: formatInline(line) }} />);
    }
  }

  return elements;
}

function formatInline(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
    .replace(/`(.+?)`/g, '<code class="bg-white/10 px-1.5 py-0.5 rounded text-indigo-300 text-xs font-mono">$1</code>');
}

export default function FenBot() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Message = { role: 'user', content: text.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const apiMessages = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...newMessages.map((m) => ({ role: m.role, content: m.content })),
      ];

      const response = await fetch(getApiUrl(), {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          model: 'meta/llama-3.1-8b-instruct',
          messages: apiMessages,
          temperature: 0.7,
          max_tokens: 4096,
        }),
      });

      const text2 = await response.text();
      let data;
      try { data = JSON.parse(text2); } catch { throw new Error('Invalid response'); }
      if (!response.ok) throw new Error(data.error || 'API error');
      if (!data.choices?.[0]) throw new Error('No response');

      const reply = data.choices[0].message.content;
      setMessages([...newMessages, { role: 'assistant', content: reply }]);
    } catch (err) {
      setMessages([...newMessages, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const isWelcome = messages.length === 0;

  return (
    <div className="h-full flex flex-col bg-gray-950 relative overflow-hidden">
      {/* Strands Background */}
      <div className="absolute inset-0 z-0">
        <Strands
          colors={['#6366F1', '#8B5CF6', '#06B6D4', '#F59E0B']}
          count={4}
          speed={0.4}
          amplitude={1.2}
          waviness={2}
          thickness={2}
          glow={3}
          taper={4}
          spread={1.5}
          intensity={0.3}
          saturation={1.2}
          opacity={0.6}
          scale={1.3}
        />
      </div>

      {/* Header */}
      <div className="relative z-10 backdrop-blur-xl bg-gray-900/70 border-b border-white/5 px-4 py-3 flex items-center gap-3 shrink-0">
        <button onClick={() => navigate('/')} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
          <ArrowLeft className="w-5 h-5 text-white/70" />
        </button>
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-bold text-white">FenBot</h1>
          <p className="text-[11px] text-white/40">AI Tutor — Learn anything, step by step</p>
        </div>
        {messages.length > 0 && (
          <button onClick={() => { setMessages([]); }} className="p-2 rounded-lg hover:bg-white/10 transition-colors" title="New conversation">
            <RotateCcw className="w-4 h-4 text-white/50" />
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="relative z-10 flex-1 min-h-0 overflow-y-auto px-4 py-4">
        {isWelcome ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mb-5 shadow-2xl shadow-indigo-500/30">
              <Sparkles className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Hey! I'm FenBot</h2>
            <p className="text-sm text-white/50 mb-8 max-w-sm leading-relaxed">
              I break down any topic into simple, bite-sized levels with diagrams, examples, and quizzes. What would you like to learn?
            </p>

            <div className="grid grid-cols-2 gap-2.5 w-full max-w-sm">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s.label}
                  onClick={() => sendMessage(s.topic)}
                  className="flex items-center gap-2.5 p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-indigo-500/30 transition-all text-left group"
                >
                  <span className="text-xl">{s.icon}</span>
                  <span className="text-xs text-white/70 group-hover:text-white transition-colors font-medium">{s.label}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto space-y-5">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] ${msg.role === 'user'
                  ? 'bg-indigo-600/80 backdrop-blur rounded-2xl rounded-br-sm px-4 py-3 border border-indigo-500/20'
                  : 'bg-white/5 backdrop-blur rounded-2xl rounded-bl-sm px-4 py-3 border border-white/5'
                }`}>
                  {msg.role === 'assistant' && (
                    <div className="flex items-center gap-1.5 mb-2">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                      <span className="text-[11px] font-bold text-indigo-400">FenBot</span>
                    </div>
                  )}
                  <div className="text-sm leading-relaxed">
                    {msg.role === 'assistant' ? (
                      <div className="space-y-0">{parseMarkdown(msg.content)}</div>
                    ) : (
                      <TwemojiText className="text-white">{msg.content}</TwemojiText>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white/5 backdrop-blur rounded-2xl rounded-bl-sm px-4 py-3 border border-white/5">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="text-[11px] font-bold text-indigo-400">FenBot</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-white/40">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Thinking...
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="relative z-10 backdrop-blur-xl bg-gray-900/70 border-t border-white/5 px-4 py-3 shrink-0 safe-area-bottom">
        <div className="max-w-2xl mx-auto flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask me anything..."
            className="flex-1 bg-white/5 border border-white/10 rounded-full px-4 py-2.5 text-sm text-white placeholder-white/25 outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/30 transition-all"
            disabled={loading}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || loading}
            className="p-2.5 bg-indigo-500 hover:bg-indigo-400 rounded-full transition-all shadow-lg shadow-indigo-500/30 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <Send className="w-4 h-4 text-white" />}
          </button>
        </div>
      </div>
    </div>
  );
}
