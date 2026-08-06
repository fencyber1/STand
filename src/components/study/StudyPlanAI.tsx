import { useState, useRef, useEffect, useCallback } from 'react';
import { ArrowLeft, Send, Loader2, Sparkles, Plus, Trash2, Clock } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { loadStudyPlanConversations, saveStudyPlanConversation, deleteStudyPlanConversation, type StudyPlanConversation, type StudyPlanMessage } from '../../services/studyPlanChatService';

function getApiUrl(): string { return '/api/generate'; }
function getHeaders(): Record<string, string> { return { 'Content-Type': 'application/json' }; }

const SYSTEM_PROMPT = `You are StudyPlan AI — a specialized study planning assistant. Your ONLY function is to help users build personalized, structured study plans. You do NOT answer general knowledge questions, do homework, or discuss unrelated topics. If asked something outside study planning, politely redirect the user back to building or refining their plan.

CRITICAL RULE: Ask ONE question at a time. Wait for the user's answer before asking the next question. Never ask multiple questions in a single message. This is a guided conversation, not a survey.

Your process — ask these questions ONE BY ONE, in this order:

1. Goal — What subject/exam/skill are they studying for, and what's the target date?
2. Current level — What do they already know? Where are their weak points?
3. Time available — How many hours per day/week can they realistically study, and on which days?
4. Materials — What resources do they have (textbooks, courses, notes, past papers)?
5. Learning style — Do they learn better by reading, practicing problems, watching videos, or teaching others?
6. Constraints — Any other commitments, deadlines, or things that eat into their time?

After each answer, acknowledge it briefly (1 sentence), then ask the next question. After the last question, build the study plan.

When you have all their answers, build a study plan that:
- Breaks the material into topics/modules in a logical order
- Assigns realistic time blocks to each topic (never overloaded)
- Includes regular review/revision sessions (spaced repetition), not just first-pass learning
- Adds checkpoints or practice tests to measure progress
- Builds in buffer days for catch-up or rest
- Ends with a final review phase before the deadline

Output format: Present the plan as a week-by-week or day-by-day table. Clearly flag anything that looks unrealistic given the user's stated time constraints, and suggest adjustments (e.g., extending the timeline, cutting scope, or increasing weekly hours).

Ongoing behavior:
- If the user reports falling behind, missing sessions, or wanting to adjust the plan, revise the schedule accordingly rather than starting over from scratch.
- Always keep responses focused on planning, scheduling, and study strategy — not on teaching the subject content itself.
- If asked to go outside this scope, respond: "I'm built specifically for study planning — want help adjusting your schedule or starting a new plan instead?"

Be concise, structured, and actionable. Use tables and bullet points. Never be overwhelming.`;

const WELCOME_MESSAGE = "Hi! I'm StudyPlan AI — I'll help you build a personalized study plan step by step.\n\nLet's start: What subject or exam are you preparing for, and when is your target date?";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function StudyPlanAI({ open, onClose }: Props) {
  const { user } = useAuth();
  const uid = user?.uid || '';

  const [conversations, setConversations] = useState<StudyPlanConversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');

  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const renderTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fullReplyRef = useRef('');
  const conversationsRef = useRef(conversations);
  const activeIdRef = useRef(activeId);

  useEffect(() => { conversationsRef.current = conversations; }, [conversations]);
  useEffect(() => { activeIdRef.current = activeId; }, [activeId]);

  useEffect(() => {
    if (!uid || !open) return;
    loadStudyPlanConversations(uid).then(setConversations).catch(() => {});
  }, [uid, open]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
  }, [conversations, activeId, streamingContent]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 200);
  }, [open]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (renderTimerRef.current) clearTimeout(renderTimerRef.current as unknown as number);
    };
  }, []);

  const activeConvo = conversations.find((c) => c.id === activeId) || null;
  const messages = activeConvo?.messages || [];

  const createConversation = useCallback(() => {
    const id = Date.now().toString();
    const newConvo: StudyPlanConversation = {
      id, uid, title: 'New Study Plan',
      messages: [{ role: 'assistant', content: WELCOME_MESSAGE, createdAt: Date.now() }],
      createdAt: Date.now(), updatedAt: Date.now(),
    };
    setConversations((prev) => [newConvo, ...prev]);
    setActiveId(id);
    saveStudyPlanConversation(uid, newConvo).catch(() => {});
    return id;
  }, [uid]);

  const handleNewChat = useCallback(() => {
    createConversation();
  }, [createConversation]);

  const handleDelete = useCallback((id: string) => {
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeId === id) setActiveId(null);
    deleteStudyPlanConversation(id).catch(() => {});
  }, [activeId]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;

    let convoId = activeIdRef.current;
    if (!convoId) convoId = createConversation();

    const userMsg: StudyPlanMessage = { role: 'user', content: text.trim(), createdAt: Date.now() };
    setInput('');
    setLoading(true);
    setStreamingContent('');

    const controller = new AbortController();
    abortRef.current = controller;
    fullReplyRef.current = '';

    setConversations((prev) =>
      prev.map((c) => {
        if (c.id !== convoId) return c;
        const newMessages = [...c.messages, userMsg];
        const title = c.messages.length <= 1 ? text.trim().slice(0, 50) : c.title;
        return { ...c, messages: newMessages, title, updatedAt: Date.now() };
      })
    );

    try {
      const currentConversations = conversationsRef.current;
      const convo = currentConversations.find((c) => c.id === convoId) || { messages: [] };
      const allMessages = [...convo.messages, userMsg];

      const apiMessages = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...allMessages.map((m) => ({ role: m.role, content: m.content })),
      ];

      const response = await fetch(getApiUrl(), {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ model: 'meta/llama-3.1-8b-instruct', messages: apiMessages, temperature: 0.7, max_tokens: 4096, stream: true }),
        signal: controller.signal,
      });

      if (!response.ok) throw new Error('API error');

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No stream');

      const decoder = new TextDecoder();
      let rawBuffer = '';
      let streamFinished = false;

      const flushToState = () => {
        if (rawBuffer.length > fullReplyRef.current.length) {
          fullReplyRef.current = rawBuffer;
          setStreamingContent(rawBuffer);
        }
      };

      const scheduleFlush = () => {
        if (renderTimerRef.current) return;
        const tick = () => {
          if (streamFinished && rawBuffer.length <= fullReplyRef.current.length) {
            renderTimerRef.current = null;
            return;
          }
          flushToState();
          renderTimerRef.current = setTimeout(tick, 30) as unknown as ReturnType<typeof setTimeout>;
        };
        renderTimerRef.current = setTimeout(tick, 30) as unknown as ReturnType<typeof setTimeout>;
      };

      scheduleFlush();

      const processLine = (line: string) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed === 'data: [DONE]') return;
        let data = '';
        if (trimmed.startsWith('data: ')) data = trimmed.slice(6);
        else if (trimmed.startsWith('data:')) data = trimmed.slice(5);
        else return;
        if (!data) return;
        try {
          const json = JSON.parse(data);
          const delta = json.choices?.[0]?.delta?.content;
          if (delta) rawBuffer += delta;
        } catch {}
      };

      let pendingBuffer = '';
      try {
        while (true) {
          const result = await reader.read();
          if (result.done) break;
          pendingBuffer += decoder.decode(result.value, { stream: true });
          const lines = pendingBuffer.split('\n');
          pendingBuffer = lines.pop() || '';
          for (const line of lines) processLine(line);
        }
      } catch {}

      if (pendingBuffer.trim()) processLine(pendingBuffer);

      streamFinished = true;

      await new Promise<void>((resolve) => {
        const check = () => {
          flushToState();
          if (rawBuffer.length <= fullReplyRef.current.length || !renderTimerRef.current) resolve();
          else setTimeout(check, 20);
        };
        setTimeout(check, 50);
        setTimeout(resolve, 5000);
      });

      flushToState();
      if (renderTimerRef.current) { clearTimeout(renderTimerRef.current as unknown as number); renderTimerRef.current = null; }

      if (fullReplyRef.current) {
        const saved = fullReplyRef.current;
        setConversations((prev) =>
          prev.map((c) => {
            if (c.id !== convoId) return c;
            return { ...c, messages: [...c.messages, { role: 'assistant', content: saved, createdAt: Date.now() }], updatedAt: Date.now() };
          })
        );
        const updated = conversationsRef.current.find((c) => c.id === convoId);
        if (updated) saveStudyPlanConversation(uid, { ...updated, messages: [...updated.messages, { role: 'assistant', content: saved, createdAt: Date.now() }], updatedAt: Date.now() }).catch(() => {});
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        if (fullReplyRef.current) {
          const saved = fullReplyRef.current;
          setConversations((prev) =>
            prev.map((c) => {
              if (c.id !== convoId) return c;
              return { ...c, messages: [...c.messages, { role: 'assistant', content: saved, createdAt: Date.now() }], updatedAt: Date.now() };
            })
          );
        }
      }
    } finally {
      abortRef.current = null;
      setLoading(false);
      setTimeout(() => setStreamingContent(''), 100);
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [loading, uid, createConversation]);

  const handleSend = useCallback(() => {
    sendMessage(input);
  }, [input, sendMessage]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: '#0e1627' }}>
      {/* Header */}
      <div className="shrink-0 flex items-center gap-3 px-4 py-3 border-b border-white/10" style={{ background: '#111827' }}>
        <button onClick={onClose} className="text-gray-400 hover:text-white transition p-1">
          <ArrowLeft size={20} />
        </button>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0">
            <Sparkles size={16} className="text-white" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-white truncate">StudyPlan AI</h2>
            <p className="text-[10px] text-gray-400">Build personalized study plans</p>
          </div>
        </div>
        <button onClick={handleNewChat} className="text-gray-400 hover:text-white transition p-1.5 rounded-lg hover:bg-white/10" title="New chat">
          <Plus size={18} />
        </button>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Sidebar — conversation list */}
        {conversations.length > 0 && (
          <div className="hidden md:flex flex-col w-56 border-r border-white/10 shrink-0 overflow-y-auto" style={{ background: '#0b1120' }}>
            <div className="p-2 space-y-1">
              {conversations.map((c) => (
                <div
                  key={c.id}
                  onClick={() => setActiveId(c.id)}
                  className={`group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition text-sm ${
                    activeId === c.id ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                  }`}
                >
                  <Clock size={14} className="shrink-0 opacity-50" />
                  <span className="truncate flex-1">{c.title}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(c.id); }}
                    className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 transition"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Main chat area */}
        <div className="flex-1 flex flex-col min-w-0">
          {!activeId ? (
            /* No conversation selected — show welcome */
            <div className="flex-1 flex flex-col items-center justify-center px-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center mb-4">
                <Sparkles size={28} className="text-white" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">StudyPlan AI</h2>
              <p className="text-gray-400 text-sm text-center max-w-md mb-6">
                Tell me what you're studying and when your exam is — I'll build you a personalized week-by-week study plan.
              </p>
              <button
                onClick={handleNewChat}
                className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 text-white rounded-xl font-medium hover:bg-violet-500 transition"
              >
                <Sparkles size={16} /> Start Planning
              </button>
            </div>
          ) : (
            /* Messages */
            <div className="flex-1 overflow-y-auto px-4 py-6">
              <div className="max-w-2xl mx-auto space-y-4">
                {messages.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                      msg.role === 'user'
                        ? 'bg-violet-600/80 backdrop-blur rounded-br-sm border border-violet-500/20'
                        : 'bg-[#141926] backdrop-blur rounded-bl-sm border border-white/5'
                    }`}>
                      {msg.role === 'assistant' && (
                        <div className="flex items-center gap-1.5 mb-2">
                          <Sparkles size={14} className="text-violet-400" />
                          <span className="text-[11px] font-bold text-violet-400">StudyPlan AI</span>
                        </div>
                      )}
                      <div className="text-sm leading-relaxed">
                        {msg.role === 'assistant'
                          ? <div className="space-y-0">{parseMarkdown(msg.content)}</div>
                          : <p className="text-white">{msg.content}</p>
                        }
                      </div>
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex justify-start">
                    <div className="bg-[#141926] backdrop-blur rounded-2xl rounded-bl-sm px-4 py-3 border border-white/5 max-w-[85%]">
                      <div className="flex items-center gap-1.5 mb-2">
                        <Sparkles size={14} className="text-violet-400" />
                        <span className="text-[11px] font-bold text-violet-400">StudyPlan AI</span>
                      </div>
                      {streamingContent ? (
                        <div className="text-sm leading-relaxed space-y-0">{parseMarkdown(streamingContent)}</div>
                      ) : (
                        <div className="flex items-center gap-2 text-sm text-white/40"><Loader2 className="w-4 h-4 animate-spin" /> Thinking...</div>
                      )}
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>
          )}

          {/* Input bar */}
          {activeId && (
            <div className="shrink-0 px-4 pb-4 pt-2">
              <div className="max-w-2xl mx-auto flex items-center gap-2 bg-[#141926] rounded-2xl border border-white/10 px-3 py-2">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Describe your study goal..."
                  className="flex-1 bg-transparent text-white text-sm outline-none placeholder-white/30"
                  disabled={loading}
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || loading}
                  className="p-2 rounded-xl bg-violet-600 text-white hover:bg-violet-500 disabled:opacity-30 disabled:cursor-not-allowed transition"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

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
      } else { inCodeBlock = true; }
      continue;
    }
    if (inCodeBlock) { codeContent += line + '\n'; continue; }
    if (line.startsWith('### ')) {
      elements.push(<h3 key={i} className="text-base font-bold text-violet-300 mt-5 mb-2">{line.slice(4)}</h3>);
    } else if (line.startsWith('## ')) {
      elements.push(<h2 key={i} className="text-lg font-bold text-white mt-6 mb-2">{line.slice(3)}</h2>);
    } else if (line.startsWith('# ')) {
      elements.push(<h1 key={i} className="text-xl font-bold text-white mt-6 mb-3">{line.slice(2)}</h1>);
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      elements.push(
        <div key={i} className="flex items-start gap-2 ml-2 my-0.5">
          <span className="text-violet-400 mt-1.5 text-xs">●</span>
          <span className="text-gray-200 text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: formatInline(line.slice(2)) }} />
        </div>
      );
    } else if (/^\d+\.\s/.test(line)) {
      const match = line.match(/^(\d+)\.\s(.+)/);
      if (match) {
        elements.push(
          <div key={i} className="flex items-start gap-2.5 ml-2 my-1">
            <span className="w-5 h-5 rounded-full bg-violet-500/20 text-violet-400 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{match[1]}</span>
            <span className="text-gray-200 text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: formatInline(match[2]) }} />
          </div>
        );
      }
    } else if (line.startsWith('> ')) {
      elements.push(
        <div key={i} className="border-l-2 border-violet-500/50 pl-3 my-2 text-sm text-gray-300 italic" dangerouslySetInnerHTML={{ __html: formatInline(line.slice(2)) }} />
      );
    } else if (line.startsWith('|') && line.includes('|')) {
      // Table row — render as a styled table row
      const cells = line.split('|').filter((c) => c.trim()).map((c) => c.trim());
      if (cells.length > 0) {
        const isHeader = i + 1 < lines.length && lines[i + 1]?.includes('---');
        if (!isHeader || !lines[i + 1]?.includes('---')) {
          elements.push(
            <div key={i} className="flex gap-2 text-xs my-0.5 px-2 py-1 rounded bg-white/5">
              {cells.map((cell, ci) => (
                <span key={ci} className="flex-1 text-gray-300">{cell}</span>
              ))}
            </div>
          );
        }
      }
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
    .replace(/`(.+?)`/g, '<code class="bg-white/10 px-1.5 py-0.5 rounded text-violet-300 text-xs font-mono">$1</code>');
}
