import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Plus, Trash2, ArrowUp, X, ArrowUpDown, FileText, Wrench, Image, BookOpen, Calculator, MoreHorizontal, Pencil, ArrowLeft, Menu } from 'lucide-react';
import FenBotLogo from '../effects/FenBotLogo';
import FenBotIcon from '../effects/FenBotIcon';
import TwemojiText from '../social/TwemojiText';
import { useAuth } from '../../contexts/AuthContext';
import { loadFenBotConversations, saveFenBotConversation, deleteFenBotConversation } from '../../services/fenbotService';

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

interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
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
Always include an ASCII diagram, flowchart, or visual representation using code blocks.

### Level 5: Real-World Example
Give a concrete, relatable example.

### Level 6: Quick Quiz
End with 2-3 quick questions.

## Formatting Rules
- Use markdown headers (###) for each level
- Use **bold** for key terms
- Use \`code\` for technical terms
- Use emoji icons liberally
- Keep paragraphs short (2-3 lines max)
- Use bullet points and numbered lists
- Always include at least one ASCII diagram

## Your Personality
- Friendly and encouraging
- Patient — never rush
- Use casual language, not overly academic

## Important
- If a user greets casually, respond warmly
- If a topic is too broad, suggest a starting point
- Always end with something interactive`;

const TOOLS = [
  { icon: BookOpen, label: 'Summarize', desc: 'Summarize a document or text', color: 'text-blue-400' },
  { icon: Calculator, label: 'Solve', desc: 'Solve math problems step by step', color: 'text-green-400' },
  { icon: FileText, label: 'Explain', desc: 'Explain any concept simply', color: 'text-purple-400' },
  { icon: Image, label: 'Visualize', desc: 'Create diagrams and flowcharts', color: 'text-orange-400' },
];

const SUGGESTIONS = [
  { icon: '🎲', label: 'Surprise me', desc: 'Surprise me with a creative idea or story', topic: 'Tell me something surprising and interesting about science' },
  { icon: '🧬', label: 'How DNA works', desc: 'Learn about DNA replication', topic: 'Explain how DNA replication works' },
  { icon: '⚛️', label: 'Quantum computing', desc: 'Learn quantum computing basics', topic: 'Explain quantum computing in simple terms' },
  { icon: '🧮', label: 'Calculus basics', desc: 'Understand derivatives', topic: 'Explain the concept of derivatives in calculus' },
  { icon: '🧠', label: 'Machine learning', desc: 'How neural networks learn', topic: 'Explain how neural networks learn' },
  { icon: '⚡', label: 'Electricity', desc: 'How circuits work', topic: 'Explain how electricity and circuits work' },
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

    if (inCodeBlock) { codeContent += line + '\n'; continue; }

    if (line.startsWith('### ')) {
      elements.push(<h3 key={i} className="text-base font-bold text-indigo-300 mt-5 mb-2">{line.slice(4)}</h3>);
    } else if (line.startsWith('## ')) {
      elements.push(<h2 key={i} className="text-lg font-bold text-white mt-6 mb-2">{line.slice(3)}</h2>);
    } else if (line.startsWith('# ')) {
      elements.push(<h1 key={i} className="text-xl font-bold text-white mt-6 mb-3">{line.slice(2)}</h1>);
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      elements.push(
        <div key={i} className="flex items-start gap-2 ml-2 my-0.5">
          <span className="text-indigo-400 mt-1.5 text-xs">●</span>
          <span className="text-gray-200 text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: formatInline(line.slice(2)) }} />
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

function readFileContent(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

export default function FenBot() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const uid = user?.uid || '';

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showTools, setShowTools] = useState(false);
  const [attachedFile, setAttachedFile] = useState<{ name: string; content: string } | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeConvo = conversations.find((c) => c.id === activeId);
  const messages = activeConvo?.messages || [];
  const isWelcome = !activeConvo || messages.length === 0;

  useEffect(() => {
    if (uid) loadFenBotConversations(uid).then((convos) => setConversations(convos));
  }, [uid]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!menuOpenId) return;
    const close = () => setMenuOpenId(null);
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-menu]')) close();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpenId]);

  const createConversation = useCallback((): string => {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const convo: Conversation = { id, title: 'New conversation', messages: [], createdAt: Date.now(), updatedAt: Date.now() };
    setConversations((prev) => [convo, ...prev]);
    setActiveId(id);
    setSidebarOpen(false);
    saveFenBotConversation(uid, convo).catch(() => {});
    return id;
  }, [uid]);

  const startRename = (id: string, currentTitle: string) => {
    setRenamingId(id);
    setRenameValue(currentTitle);
    setMenuOpenId(null);
  };

  const confirmRename = () => {
    if (!renamingId || !renameValue.trim()) { setRenamingId(null); return; }
    updateAndSave((prev) => prev.map((c) => c.id === renamingId ? { ...c, title: renameValue.trim(), updatedAt: Date.now() } : c));
    setRenamingId(null);
  };

  const deleteConversation = (id: string) => {
    deleteFenBotConversation(id).catch(() => {});
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeId === id) setActiveId(null);
  };

  const updateAndSave = useCallback((updater: (prev: Conversation[]) => Conversation[]) => {
    setConversations((prev) => {
      const next = updater(prev);
      const updated = next.find((c) => c.id === activeId);
      if (updated) saveFenBotConversation(uid, updated).catch(() => {});
      return next;
    });
  }, [activeId, uid]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;

    let convoId = activeId;
    if (!convoId) convoId = createConversation();

    let finalText = text.trim();
    if (attachedFile) {
      finalText = `Attached file "${attachedFile.name}":\n\n${attachedFile.content}\n\n---\n\nMy question: ${finalText}`;
      setAttachedFile(null);
    }

    const userMsg: Message = { role: 'user', content: finalText };
    setInput('');
    setLoading(true);

    updateAndSave((prev) =>
      prev.map((c) => {
        if (c.id !== convoId) return c;
        const newMessages = [...c.messages, userMsg];
        const title = c.messages.length === 0 ? text.trim().slice(0, 50) : c.title;
        return { ...c, messages: newMessages, title, updatedAt: Date.now() };
      })
    );

    try {
      const convo = conversations.find((c) => c.id === convoId) || { messages: [] };
      const allMessages = [...convo.messages, userMsg];
      const apiMessages = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...allMessages.map((m) => ({ role: m.role, content: m.content })),
      ];

      const response = await fetch(getApiUrl(), {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ model: 'meta/llama-3.1-8b-instruct', messages: apiMessages, temperature: 0.7, max_tokens: 4096 }),
      });

      const text2 = await response.text();
      let data;
      try { data = JSON.parse(text2); } catch { throw new Error('Invalid response'); }
      if (!response.ok) throw new Error(data.error || 'API error');
      if (!data.choices?.[0]) throw new Error('No response');

      const reply = data.choices[0].message.content;
      updateAndSave((prev) =>
        prev.map((c) => {
          if (c.id !== convoId) return c;
          return { ...c, messages: [...c.messages, { role: 'assistant', content: reply }], updatedAt: Date.now() };
        })
      );
    } catch {
      updateAndSave((prev) =>
        prev.map((c) => {
          if (c.id !== convoId) return c;
          return { ...c, messages: [...c.messages, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }], updatedAt: Date.now() };
        })
      );
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 500 * 1024) { alert('File must be under 500KB'); return; }
    try {
      const content = await readFileContent(file);
      setAttachedFile({ name: file.name, content });
      inputRef.current?.focus();
    } catch {
      alert('Could not read file');
    }
  };

  return (
    <div className="h-full flex bg-[#0a0e1a] relative overflow-hidden">
      {/* Overlay */}
      {sidebarOpen && <div className="fixed inset-0 z-30 bg-black/50" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-40 w-[260px] flex flex-col bg-[#0d1220]/95 backdrop-blur-xl border-r border-white/5 transition-transform duration-200 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {/* Sidebar header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-white/5">
          <div className="flex items-center gap-2">
            <FenBotIcon size={24} />
            <span className="text-sm font-bold text-white">FenBot</span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => { setActiveId(null); setSidebarOpen(false); }} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors" title="New conversation">
              <Plus className="w-4 h-4 text-white/50" />
            </button>
            <button onClick={() => setSidebarOpen(false)} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
              <X className="w-4 h-4 text-white/50" />
            </button>
          </div>
        </div>

        {/* Recents */}
        <div className="px-3 pt-3 pb-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-white/30 uppercase tracking-wider">Recents</span>
            <ArrowUpDown className="w-3 h-3 text-white/20" />
          </div>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto px-2 scrollbar-hide">
          {conversations.map((c) => (
            <div key={c.id} className="relative">
              <button
                onClick={() => { if (renamingId !== c.id) { setActiveId(c.id); setSidebarOpen(false); } }}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-all group flex items-center justify-between ${
                  activeId === c.id
                    ? 'bg-white/10 text-white'
                    : 'text-white/50 hover:bg-white/5 hover:text-white/70'
                }`}
              >
                {renamingId === c.id ? (
                  <input
                    autoFocus
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') confirmRename(); if (e.key === 'Escape') setRenamingId(null); }}
                    onBlur={confirmRename}
                    onClick={(e) => e.stopPropagation()}
                    className="flex-1 bg-white/10 rounded px-2 py-0.5 text-sm text-white outline-none border border-indigo-500/50"
                  />
                ) : (
                  <span className="truncate">{c.title}</span>
                )}
                {renamingId !== c.id && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === c.id ? null : c.id); }}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-white/10 transition-all"
                  >
                    <MoreHorizontal className="w-3.5 h-3.5 text-white/40" />
                  </button>
                )}
              </button>
              {menuOpenId === c.id && (
                <div data-menu className="absolute right-2 top-full z-50 bg-[#1a2030] border border-white/10 rounded-lg shadow-xl py-1 min-w-[120px]">
                  <button onClick={() => startRename(c.id, c.title)} className="w-full text-left px-3 py-2 text-xs text-white/70 hover:bg-white/5 flex items-center gap-2">
                    <Pencil className="w-3 h-3" /> Rename
                  </button>
                  <button onClick={() => { deleteConversation(c.id); setMenuOpenId(null); }} className="w-full text-left px-3 py-2 text-xs text-red-400 hover:bg-white/5 flex items-center gap-2">
                    <Trash2 className="w-3 h-3" /> Delete
                  </button>
                </div>
              )}
            </div>
          ))}
          {conversations.length === 0 && (
            <p className="text-xs text-white/20 text-center py-4">No conversations yet</p>
          )}
        </div>

        {/* Bottom */}
        <div className="border-t border-white/5 p-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold overflow-hidden flex-shrink-0">
              {user?.photoURL ? (
                <img src={user.photoURL} alt="" className="w-full h-full object-cover" />
              ) : (
                (user?.fullName || 'S').charAt(0).toUpperCase()
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white/70 truncate">{user?.fullName || 'User'}</p>
              <p className="text-[10px] text-white/30">Free plan</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Header bar */}
        <div className="relative z-20 flex items-center gap-2 px-3 py-2.5 border-b border-white/10 bg-[#0d1220] shrink-0">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors">
            <Menu className="w-4 h-4 text-white/50" />
          </button>
          {!isWelcome && (
            <button onClick={() => setActiveId(null)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 text-white/50 hover:text-white/70 text-xs font-medium transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>
          )}
          {isWelcome && (
            <button onClick={() => navigate('/dashboard')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 text-white/50 hover:text-white/70 text-xs font-medium transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
            </button>
          )}
          {!isWelcome && activeConvo && (
            <span className="text-sm font-medium text-white/60 truncate">{activeConvo.title}</span>
          )}
        </div>

        {/* Background */}
        <div className="absolute inset-0 z-0">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-indigo-600/5 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 left-1/4 w-[400px] h-[300px] bg-purple-600/5 rounded-full blur-[100px]" />
        </div>

        {/* Content */}
        <div className="relative z-10 flex-1 min-h-0 overflow-y-auto">
          {isWelcome ? (
            <div className="flex flex-col items-center justify-center min-h-full text-center px-4 pb-20">
              <div className="mb-6" style={{ animation: 'logoFloat 6s ease-in-out infinite' }}>
                <FenBotLogo size={180} />
              </div>
              <h1 className="text-3xl font-bold text-white mb-1">
                Hi, <span className="text-white/70">{user?.fullName || 'there'}</span>
              </h1>
              <h2 className="text-xl font-semibold text-white mb-2">How can I help today?</h2>
              <p className="text-sm text-white/30 mb-8 max-w-md">I'm here to help — from quick answers to smart recommendations.</p>

              {/* Input bar */}
              <div className="w-full max-w-lg mb-6">
                <div className="relative bg-[#141926] rounded-2xl border border-white/5 overflow-hidden shadow-2xl shadow-black/40">
                  {attachedFile && (
                    <div className="flex items-center gap-2 px-4 py-2 border-b border-white/5 bg-white/5">
                      <FileText className="w-4 h-4 text-indigo-400" />
                      <span className="text-xs text-white/60 truncate flex-1">{attachedFile.name}</span>
                      <button onClick={() => setAttachedFile(null)} className="p-0.5 rounded hover:bg-white/10"><X className="w-3 h-3 text-white/40" /></button>
                    </div>
                  )}
                  <div className="flex items-center gap-2 px-4 py-2">
                    <input ref={inputRef} type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder="Ask me anything ..." className="flex-1 bg-transparent text-sm text-white placeholder-white/20 outline-none py-2" disabled={loading} />
                    <button onClick={() => sendMessage(input)} disabled={!input.trim() || loading} className="w-8 h-8 rounded-full bg-indigo-500 hover:bg-indigo-400 flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0">
                      {loading ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <ArrowUp className="w-4 h-4 text-white" />}
                    </button>
                  </div>
                  <div className="flex items-center gap-2 px-4 pb-3">
                    <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 text-white/30 text-xs transition-colors">
                      <FileText size={12} /> Import file
                    </button>
                    <button onClick={() => setShowTools(!showTools)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-colors ${showTools ? 'bg-white/10 text-white/60' : 'bg-white/5 hover:bg-white/10 text-white/30'}`}>
                      <Wrench size={12} /> Tools
                    </button>
                  </div>
                </div>

                {/* Tools menu */}
                {showTools && (
                  <div className="mt-2 bg-[#141926] rounded-xl border border-white/5 p-2 grid grid-cols-2 gap-1.5">
                    {TOOLS.map((t) => {
                      const Icon = t.icon;
                      return (
                        <button key={t.label} onClick={() => { setShowTools(false); sendMessage(`Use the ${t.label} tool: `); }} className="flex items-center gap-2 p-2.5 rounded-lg hover:bg-white/5 transition-colors text-left">
                          <Icon className={`w-4 h-4 ${t.color}`} />
                          <div>
                            <p className="text-xs font-medium text-white/70">{t.label}</p>
                            <p className="text-[10px] text-white/25">{t.desc}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Suggestions */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-2xl">
                {SUGGESTIONS.slice(0, 3).map((s) => (
                  <button key={s.label} onClick={() => sendMessage(s.topic)} className="flex flex-col items-start p-4 rounded-2xl bg-[#141926]/80 hover:bg-[#1a2030] border border-white/5 hover:border-indigo-500/20 transition-all text-left group">
                    <span className="text-lg mb-2">{s.icon}</span>
                    <span className="text-sm font-semibold text-white/80 group-hover:text-white transition-colors">{s.label}</span>
                    <span className="text-xs text-white/25 mt-0.5">{s.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] ${msg.role === 'user' ? 'bg-indigo-600/80 backdrop-blur rounded-2xl rounded-br-sm px-4 py-3 border border-indigo-500/20' : 'bg-[#141926] backdrop-blur rounded-2xl rounded-bl-sm px-4 py-3 border border-white/5'}`}>
                    {msg.role === 'assistant' && (
                      <div className="flex items-center gap-1.5 mb-2">
                        <FenBotIcon size={18} />
                        <span className="text-[11px] font-bold text-indigo-400">FenBot</span>
                      </div>
                    )}
                    <div className="text-sm leading-relaxed">
                      {msg.role === 'assistant' ? <div className="space-y-0">{parseMarkdown(msg.content)}</div> : <TwemojiText className="text-white">{msg.content}</TwemojiText>}
                    </div>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-[#141926] backdrop-blur rounded-2xl rounded-bl-sm px-4 py-3 border border-white/5">
                    <div className="flex items-center gap-1.5 mb-1">
                      <FenBotIcon size={18} />
                      <span className="text-[11px] font-bold text-indigo-400">FenBot</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-white/40"><Loader2 className="w-4 h-4 animate-spin" /> Thinking...</div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Chat input */}
        {!isWelcome && (
          <div className="relative z-10 px-4 pb-4 pt-2 shrink-0">
            <div className="max-w-3xl mx-auto">
              <div className="relative bg-[#141926] rounded-2xl border border-white/5 overflow-hidden shadow-2xl shadow-black/40">
                {attachedFile && (
                  <div className="flex items-center gap-2 px-4 py-2 border-b border-white/5 bg-white/5">
                    <FileText className="w-4 h-4 text-indigo-400" />
                    <span className="text-xs text-white/60 truncate flex-1">{attachedFile.name}</span>
                    <button onClick={() => setAttachedFile(null)} className="p-0.5 rounded hover:bg-white/10"><X className="w-3 h-3 text-white/40" /></button>
                  </div>
                )}
                <div className="flex items-center gap-2 px-4 py-2">
                  <input ref={inputRef} type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder="Ask me anything ..." className="flex-1 bg-transparent text-sm text-white placeholder-white/20 outline-none py-2" disabled={loading} />
                  <button onClick={() => sendMessage(input)} disabled={!input.trim() || loading} className="w-8 h-8 rounded-full bg-indigo-500 hover:bg-indigo-400 flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0">
                    {loading ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <ArrowUp className="w-4 h-4 text-white" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <input ref={fileInputRef} type="file" accept=".txt,.pdf,.doc,.docx,.csv,.md,.json,.js,.ts,.py,.html,.css" className="hidden" onChange={handleFileImport} />

      <style>{`
        @keyframes logoFloat { 0%, 100% { transform: scale(1) rotate(0deg); } 50% { transform: scale(1.03) rotate(0.5deg); } }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
