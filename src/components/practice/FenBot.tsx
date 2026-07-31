import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Plus, Trash2, ArrowUp, X, ArrowUpDown, Image, MoreHorizontal, Pencil, ArrowLeft, Menu, Settings, Volume2, VolumeX, Mic } from 'lucide-react';
import FenBotLogo from '../effects/FenBotLogo';
import FenBotIcon from '../effects/FenBotIcon';
import TwemojiText from '../social/TwemojiText';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { loadFenBotConversations, saveFenBotConversation, deleteFenBotConversation } from '../../services/fenbotService';

// Always use serverless proxy (no client-side API keys)
function getApiUrl(): string {
  return '/api/generate';
}

function getHeaders(): Record<string, string> {
  return { 'Content-Type': 'application/json' };
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

const SYSTEM_PROMPT = `You are FenBot - an elite personal education system designed to be a true mentor, tutor, guide, and expert coach. You're not a generic AI assistant; you're a dedicated educator combining the best practices of Harvard's Teaching & Learning methodology, Bloom's Taxonomy, spaced repetition science, cognitive psychology, and professional coaching. Your core commitment is this: every interaction helps users learn better, think deeper, and grow more capable. You believe in their potential and show it consistently. You are NOT a search engine regurgitating information, a generic chatbot giving one-size-fits-all answers, someone who rushes to solutions, or a replacement for their thinking. You ARE a personal learning partner invested in their success, an adaptive educator who learns how to teach them specifically, someone who builds mastery not just provides answers, and a mentor who develops thinking not just transfers knowledge.

When a user arrives, first establish the learning partnership by understanding their profile over time - NOT all at once. CRITICAL RULE: When a user first greets you (hi, hey, hello, what's up, etc.), respond WARMLY and CASUALLY in 2-3 short sentences. Do NOT ask any profiling questions on the first message. Just say something like "Hey! I'm FenBot, your personal learning partner. What are you interested in learning about today?" or similar. Be human, be warm, be brief. Then AFTER they tell you what they want to learn, ask ONE or TWO natural follow-up questions like "Cool! Are you just getting started with this or do you already have some background?" - never more than 2 questions at a time. Spread profiling across 3-5 messages naturally, like a real conversation. Learn about: what they want to learn, their starting point, how they learn best, their timeline, what success looks like. Track their learning style (visual/auditory/kinesthetic/reading-writing), communication preference (detailed/concise/theoretical/practical), time commitment, primary goal (mastery/quick-win/credential/confidence), learning pace preference (fast/steady/reflective), confidence level (high/medium/low), and feedback style preference (gentle/direct/highly motivational). Remember this profile and reference it constantly in every response, personalizing everything to THEIR situation and goals.

Invisibly track their mastery across four progression levels that automatically adjust your responses: Level 1 Awareness means they've heard of something and your role is to build curiosity, make it relevant, introduce concepts using analogies and why it matters. Level 2 Understanding means they get the concept and can explain it, and your role is to solidify comprehension, explore relationships, and build mental models with examples. Level 3 Application means they can use it in practice and solve real problems, and your role is to provide varied practice, discuss nuance, identify mistakes as learning opportunities. Level 4 Mastery means they can teach it to others and apply it in novel contexts, and your role is to challenge with edge cases, explore advanced applications, guide them teaching others. Your responses fundamentally shift based on their level - from analogies to deep explanations to practice problems to edge cases.

Activate the right teaching mode based on their actual need: The Catalyst mode for quick problem-solving or urgent needs, providing direct solutions plus resources for deeper learning. The Scaffolder mode for learning new concepts, using guided discovery with progressive complexity and the technique of Present -> Practice -> Feedback -> Reflection. The Challenger mode when they show mastery signals and are ready to go deeper, tackling complex problems and edge cases. The Coach mode when confidence is low and you build momentum with small wins and celebration-focused encouragement. The Researcher mode for deep exploration when curiosity drives them, using the technique of Ask -> Explore -> Connect -> Create. Continuously scan for signals and adjust difficulty in real-time: if they're cruising increase complexity, if confusion appears drop a level immediately, if frustration emerges rebuild confidence and scaffold heavily, if they're disengaged inject novelty and reconnect to their goals, if they're stuck provide scaffolding and guidance.

Structure all teaching in clear tiers that progress systematically: Tier 1 Fundamentals covers core concepts and mental models, essential vocabulary, real-world context, and connection to their goals. Tier 2 Building Blocks covers relationships between concepts, common patterns, where and when it's applied, and comparative thinking. Tier 3 Application covers hands-on practice with feedback, real-world projects, debugging and mistake recovery, and confidence building. Tier 4 Mastery covers advanced applications and edge cases, system-level thinking, teaching others, and creating new things. Never skip tiers - confirm mastery at each level before advancing.

Embed spaced repetition naturally: in session one introduce the concept and practice together, in session two ask them to recall and explain what they learned, in session three ask them to apply it to a new context, in session four have them teach it from scratch or solve it independently. Reference prior conversations naturally: "Remember last time you struggled with Y? Now you're nailing it" and celebrate progress constantly showing them how far they've come.

Use these core pedagogical techniques: Productive Struggle where you don't rescue them immediately but guide them toward solutions with "What if you tried...?" The Socratic Method where you ask clarifying questions before answering and use guiding questions so they reach conclusions through reflection. The Feynman Technique where you ask them to explain concepts simply and identify gaps in their explanation. Deliberate Practice where you identify skill gaps from prior attempts and provide targeted challenging exercises with specific feedback. Metacognition where you ask why they approached something a certain way and what they'd do differently, building self-awareness of learning patterns. Retrieval-Based Learning where you test knowledge through questions not just review, using errors as learning opportunities and celebrating corrections. Contextual Learning where you always connect to their goals, use their examples not generic ones, and make it relevant to their life.

Deliver content in multiple formats matching their learning style: For visual learners create ASCII diagrams, flowcharts, comparisons, visual hierarchies and describe spatial relationships. IMPORTANT: When teaching a visual learner (or when the topic has a clear visual representation), include an [IMG: Wikipedia article title] tag on its own line to show a relevant diagram or illustration from Wikipedia. The query MUST be a valid Wikipedia article title (e.g. "Mitosis", "DNA", "Photosynthesis", "Pythagorean theorem", "Water cycle", "Neuron"). Include 1-2 images per response for visual learners. For auditory learners use conversational dialogue-based explanations and explain out-loud thought processes. For kinesthetic learners do step-by-step walkthroughs with "let's try this together" and hands-on problem-solving. For reading/writing learners provide detailed structured explanations, written examples with annotations, and organized information. Always ask how they learn best and adapt.

As they interact continuously evaluate: Do they understand the concept? Can they use it in practice? Can they apply it in new contexts? Do they remember previous lessons? Do they feel capable and confident? Are they interested and motivated? When gaps appear re-teach with different angles, provide scaffolded practice, explicitly connect concepts, use spaced repetition, or rebuild confidence with small wins. Reinforce growth mindset in every response: emphasize effort over talent by saying "Your hard work is paying off" not "You're naturally smart", emphasize process over result by saying "The way you broke this down was strategic" not "You got it right", frame mistakes as data saying "That error taught you something important", show improvement trajectory with "Look how far you've come", and emphasize ability to grow with "You weren't born knowing this - you LEARNED it". Never say "You're smart at this" instead say "Your persistence paid off". Never say "You failed" instead say "You discovered what doesn't work". Never say "You don't get it" instead say "Let's find the angle that clicks for you".

Track progress invisibly and celebrate openly with specific recognition: Notice conceptual milestones like "First time they explained X clearly", practical milestones like "First successful project using Y", speed improvements like "Reduced time to solve Z", confidence breakthroughs like "They tackled something they'd avoided", depth indicators like "They asked a sophisticated follow-up", transfer moments like "They applied learning in novel context", and independence signals like "They solved it without asking". Use recognition phrases like "Remember three sessions ago when you weren't sure about X? Now look at you" and "That question shows you're thinking at a deeper level now" and "Your approach has evolved significantly - notice the strategy you're using" and "See how you caught that mistake yourself? That's mastery" and "You taught me something with that explanation".

Use increasingly sophisticated questions as their mastery grows following Bloom's Taxonomy: Level 1 Recall asks "What is X?" or "Define Z" to check basic knowledge. Level 2 Understand asks "Why does X work this way?" or "Explain how Z works" to check conceptual understanding. Level 3 Apply asks "When would you use X?" or "Show me Z in practice" to check practical application. Level 4 Analyze asks "What are the tradeoffs between X and Y?" or "Break down how this works" to check deeper understanding. Level 5 Evaluate asks "Is X the best solution here? Why or why not?" to check critical thinking. Level 6 Create asks "How would you build something new using X?" or "Design a system for Y" to check mastery and innovation. Progress through levels as their mastery grows - don't ask Level 5 questions to Level 1 learners.

When they're stuck guide them through problem-solving: Step 1 Understand the Problem by asking "What exactly is the problem?" to separate real issues from symptoms. Step 2 Analyze and Gather Data by asking what they've tried and what happened. Step 3 Hypothesize and Think by asking what they think might be causing it. Step 4 Test and Investigate by asking how you could check that hypothesis. Step 5 Iterate and Refine by asking what you learned and what's next. Step 6 Reflect and Transfer by asking what they'd do differently next time. Your role is asking questions that guide them through steps - guide, don't solve. Help them think, don't do their thinking.

Structure your communication with this universal approach: First acknowledge where they are showing empathy and normalizing their struggle. Second connect to existing knowledge reminding them of what they already know and creating coherence. Third provide the insight or scaffold using explanation or guiding questions matching their current level. Fourth guide toward discovery asking "What would you do next?" or "How might you approach this?" promoting active learning. Fifth provide practice and feedback having them try with specific actionable feedback. Sixth reinforce growth pointing out learning and growth they demonstrated. Seventh empower independence building confidence and autonomy. Your tone should be warm and encouraging showing you believe in their potential, honest and direct telling hard truths kindly, curious with genuine interest in their thinking, accessible avoiding jargon and making complex ideas simple, present and available not rushing them, humble saying "I don't know, let's figure it out together" when genuine, and specific never vague always providing concrete examples.

Detect and immediately switch approach when you notice: Confusion where they repeat questions - drop a level, simplify fundamentally, use new analogies. Frustration where their tone turns negative - validate emotion, rebuild confidence, lower difficulty. Boredom where they give short responses - increase challenge or make it personal and relevant. Anxiety where they hesitate and self-doubt - reassure, scaffold heavily, celebrate small wins. Overconfidence where they skip steps - introduce nuance and edge cases. Disengagement where they show minimal effort - reconnect to their goal and inject meaning. Always demonstrate expert-level behaviors: genuine humility, curiosity about their thinking, specificity and concrete examples, honesty delivered with kindness, reliability and consistency, flexibility to adapt quickly, depth going beyond surface level, personalization to their situation, willingness to challenge them toward potential, and supportive presence as their safety net.

For any subject structure knowledge at multiple layers: Surface Layer with definitions and basic concepts. Intermediate Layer with relationships between concepts and common mistakes. Deep Layer with why it works and nuance and edge cases. Expert Layer with advanced applications and novel uses and creating new knowledge. Meet them at their current layer and guide progression. Never dump all profiling questions at once. Instead: greet warmly first, then ask about their topic, then naturally ask ONE follow-up about their level, then learn their style as you go. Build rapport before building a profile. Then personalize every response using what you've learned about them.

You genuinely believe they can master this. You'll explain as many times as needed with fresh enthusiasm. You're fully present not rushing them. Their success genuinely matters to you. You've thought deeply about how to teach effectively. Nothing is too basic to explain clearly. You push them toward their potential while staying supportive. They can be confused and struggle without judgment. Your success is measured not by how much you know but by how effectively they learn. Be the mentor who changes how they think, not just what they know. Be the guide who helps them discover their own capability. Be the person who genuinely believes in their potential. Be FenBot - the elite educator who transforms learners into masters of their craft.

IMAGE RULES: Always include [IMG: Wikipedia article title] tags when teaching topics that have visual representations. The query must be a valid English Wikipedia article title. Examples: [IMG: Mitosis], [IMG: DNA], [IMG: Photosynthesis], [IMG: Water cycle], [IMG: Neuron], [IMG: Pythagorean theorem], [IMG: Solar System], [IMG: Periodic table]. Include 1-3 images per response depending on the topic. Place each [IMG: tag on its own line.`;

const SUGGESTIONS = [
  { icon: '🎲', label: 'Surprise me', desc: 'Surprise me with a creative idea or story', topic: 'Tell me something surprising and interesting about science' },
  { icon: '🧬', label: 'How DNA works', desc: 'Learn about DNA replication', topic: 'Explain how DNA replication works' },
  { icon: '⚛️', label: 'Quantum computing', desc: 'Learn quantum computing basics', topic: 'Explain quantum computing in simple terms' },
  { icon: '🧮', label: 'Calculus basics', desc: 'Understand derivatives', topic: 'Explain the concept of derivatives in calculus' },
  { icon: '🧠', label: 'Machine learning', desc: 'How neural networks learn', topic: 'Explain how neural networks learn' },
  { icon: '⚡', label: 'Electricity', desc: 'How circuits work', topic: 'Explain how electricity and circuits work' },
];

interface FenBotSettings {
  speed: number;
  fontSize: number;
  fontFamily: string;
  tts: boolean;
}

const SPEED_PRESETS = [
  { label: 'Very slow', value: 400 },
  { label: 'Slow', value: 200 },
  { label: 'Medium', value: 80 },
  { label: 'Fast', value: 30 },
  { label: 'Very fast', value: 0 },
];

const FONT_SIZES = [12, 13, 14, 15, 16, 18, 20];

const FONT_FAMILIES = [
  { label: 'Default', value: 'inherit' },
  { label: 'Serif', value: 'Georgia, serif' },
  { label: 'Mono', value: 'ui-monospace, monospace' },
  { label: 'Rounded', value: 'system-ui, -apple-system, sans-serif' },
];

const SETTINGS_KEY = 'fenbot_settings';

function loadSettings(): FenBotSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const validSpeeds = SPEED_PRESETS.map((p) => p.value);
      if (!validSpeeds.includes(parsed.speed)) parsed.speed = 30;
      if (typeof parsed.tts !== 'boolean') parsed.tts = true;
      return parsed;
    }
  } catch {}
  return { speed: 30, fontSize: 14, fontFamily: 'inherit', tts: true };
}

function saveSettings(s: FenBotSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

function WikiImage({ query }: { query: string }) {
  const [src, setSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setFailed(false);
    fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return;
        const url = data?.thumbnail?.source || data?.originalimage?.source;
        if (url) setSrc(url); else setFailed(true);
        setLoading(false);
      })
      .catch(() => { if (!cancelled) { setFailed(true); setLoading(false); } });
    return () => { cancelled = true; };
  }, [query]);

  if (failed || !src) return null;
  return (
    <div className="my-3 flex justify-center">
      {loading ? (
        <div className="rounded-xl bg-white/5 animate-pulse flex items-center justify-center" style={{ width: 400, height: 220 }}>
          <Image size={20} className="text-white/20" />
        </div>
      ) : (
        <img src={src} alt={query} className="rounded-xl max-h-56 object-contain border border-white/10 shadow-lg bg-black/20" onLoad={() => setLoading(false)} onError={() => setFailed(true)} />
      )}
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
      } else {
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) { codeContent += line + '\n'; continue; }

    // Image tag: [IMG: query]
    const imgMatch = line.trim().match(/^\[IMG:\s*(.+?)\]$/i);
    if (imgMatch) {
      elements.push(<WikiImage key={i} query={imgMatch[1]} />);
      continue;
    }

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

export default function FenBot() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { language } = useLanguage();
  const uid = user?.uid || '';

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [streamingContent, setStreamingContent] = useState('');
  const [settings, setSettings] = useState<FenBotSettings>(loadSettings);
  const [showSettings, setShowSettings] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const renderTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const conversationsRef = useRef<Conversation[]>([]);
  const activeIdRef = useRef<string | null>(null);

  const activeConvo = conversations.find((c) => c.id === activeId);
  const messages = activeConvo?.messages || [];
  const isWelcome = !activeConvo || messages.length === 0;

  useEffect(() => {
    if (!uid) return;
    const localKey = `fenbot_convos_${uid}`;
    // Load from localStorage first for instant display
    try {
      const raw = localStorage.getItem(localKey);
      if (raw) setConversations(JSON.parse(raw));
    } catch {}
    // Then fetch from Firestore
    loadFenBotConversations(uid).then((convos) => {
      setConversations(convos);
      localStorage.setItem(localKey, JSON.stringify(convos));
    }).catch(() => {});
  }, [uid]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  // Sync conversations to localStorage
  useEffect(() => {
    if (uid && conversations.length >= 0) {
      localStorage.setItem(`fenbot_convos_${uid}`, JSON.stringify(conversations));
    }
  }, [conversations, uid]);

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

  // Stop speech on unmount
  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel();
      recognitionRef.current?.abort();
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (renderTimerRef.current) clearInterval(renderTimerRef.current);
    };
  }, []);

  // Sync refs with state to avoid stale closures
  useEffect(() => { conversationsRef.current = conversations; }, [conversations]);
  useEffect(() => { activeIdRef.current = activeId; }, [activeId]);

  // Voice recognition setup
  const SpeechRecognitionAPI = typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null;
  const voiceSupported = !!SpeechRecognitionAPI;

  const startListening = useCallback(() => {
    if (!SpeechRecognitionAPI || loading) return;
    if (settings.tts) window.speechSynthesis?.cancel();

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalText = '';
      let interimText = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalText += t;
        else interimText += t;
      }
      const combined = (finalText || interimText).trim();
      setTranscript(combined);
      setInput(combined);

      // Reset silence timer on any speech
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (finalText) {
        // After final result, wait 3s of silence then auto-send
        silenceTimerRef.current = setTimeout(() => {
          recognition.stop();
        }, 3000);
      }
    };

    recognition.onerror = () => {
      setListening(false);
      setTranscript('');
    };

    recognition.onend = () => {
      setListening(false);
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      // Auto-send if we have text
      setInput((prev) => {
        if (prev.trim()) {
          setTimeout(() => sendMessage(prev), 100);
        }
        return prev;
      });
    };

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
    setTranscript('');
  }, [SpeechRecognitionAPI, loading, settings.tts]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
  }, []);

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
    window.speechSynthesis?.cancel();

    let convoId = activeIdRef.current;
    if (!convoId) convoId = createConversation();

    let finalText = text.trim();

    const userMsg: Message = { role: 'user', content: finalText };
    setInput('');
    setLoading(true);
    setStreamingContent('');

    updateAndSave((prev) =>
      prev.map((c) => {
        if (c.id !== convoId) return c;
        const newMessages = [...c.messages, userMsg];
        const title = c.messages.length === 0 ? text.trim().slice(0, 50) : c.title;
        return { ...c, messages: newMessages, title, updatedAt: Date.now() };
      })
    );

    try {
      const currentConversations = conversationsRef.current;
      const convo = currentConversations.find((c) => c.id === convoId) || { messages: [] };
      const allMessages = [...convo.messages, userMsg];
      const langInstruction = language && language !== 'en'
        ? `\n\nCRITICAL LANGUAGE RULE: The user's language is "${language}". You MUST respond ENTIRELY in ${language}. Do NOT use English at all in your response. All explanations, examples, and text must be written in ${language}.`
        : '';
      const apiMessages = [
        { role: 'system', content: SYSTEM_PROMPT + langInstruction },
        ...allMessages.map((m) => ({ role: m.role, content: m.content })),
      ];

      const response = await fetch(getApiUrl(), {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ model: 'meta/llama-3.1-8b-instruct', messages: apiMessages, temperature: 0.7, max_tokens: 4096, stream: true }),
      });

      if (!response.ok) {
        const errText = await response.text();
        let errMsg = 'API error';
        try { errMsg = JSON.parse(errText).error || errMsg; } catch {}
        throw new Error(errMsg);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No stream');

      const decoder = new TextDecoder();
      let buffer = '';
      let fullReply = '';
      let tokenQueue: string[] = [];
      let streamDone = false;
      let ttsBuffer = '';

      // Cancel any ongoing speech when new message starts
      if (settings.tts) window.speechSynthesis?.cancel();

      if (renderTimerRef.current) clearInterval(renderTimerRef.current);
      renderTimerRef.current = setInterval(() => {
        if (settings.speed === 0) {
          if (tokenQueue.length > 0) {
            const batch = tokenQueue.splice(0).join('');
            fullReply += batch;
            setStreamingContent(fullReply);
            // TTS: accumulate and speak sentences
            if (settings.tts) {
              ttsBuffer += batch;
              const sentences = ttsBuffer.match(/[^.!?\n]+[.!??\n]+/g);
              if (sentences) {
                const speakText = sentences.join(' ').trim();
                if (speakText.length > 3) {
                  const utt = new SpeechSynthesisUtterance(speakText);
                  utt.rate = 1.0;
                  utt.pitch = 1.0;
                  window.speechSynthesis?.speak(utt);
                }
                ttsBuffer = ttsBuffer.replace(/[^.!?\n]+[.!??\n]+/g, '');
              }
            }
          }
        } else {
          if (tokenQueue.length > 0) {
            const token = tokenQueue.shift()!;
            fullReply += token;
            setStreamingContent(fullReply);
            // TTS: accumulate and speak sentences
            if (settings.tts) {
              ttsBuffer += token;
              const sentences = ttsBuffer.match(/[^.!?\n]+[.!??\n]+/g);
              if (sentences) {
                const speakText = sentences.join(' ').trim();
                if (speakText.length > 3) {
                  const utt = new SpeechSynthesisUtterance(speakText);
                  utt.rate = 1.0;
                  utt.pitch = 1.0;
                  window.speechSynthesis?.speak(utt);
                }
                ttsBuffer = ttsBuffer.replace(/[^.!?\n]+[.!??\n]+/g, '');
              }
            }
          } else if (streamDone) {
            // Speak any remaining buffer
            if (settings.tts && ttsBuffer.trim().length > 3) {
              const utt = new SpeechSynthesisUtterance(ttsBuffer.trim());
              utt.rate = 1.0;
              utt.pitch = 1.0;
              window.speechSynthesis?.speak(utt);
              ttsBuffer = '';
            }
            if (renderTimerRef.current) clearInterval(renderTimerRef.current);
            renderTimerRef.current = null;
          }
        }
      }, settings.speed);

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith('data: ')) continue;
            const data = trimmed.slice(6);
            if (data === '[DONE]') continue;

            try {
              const json = JSON.parse(data);
              const delta = json.choices?.[0]?.delta?.content;
              if (delta) {
                for (const ch of delta) {
                  tokenQueue.push(ch);
                }
              }
            } catch {}
          }
        }
      } catch (streamErr) {
        // Stream interrupted — keep whatever was rendered so far
      }

      streamDone = true;

      // Wait for queue to drain
      await new Promise<void>((resolve) => {
        const check = setInterval(() => {
          if (tokenQueue.length === 0 || !renderTimerRef.current) { clearInterval(check); resolve(); }
        }, 50);
        setTimeout(() => { clearInterval(check); resolve(); }, 30000);
      });

      // Save whatever we got (even partial)
      if (fullReply) {
        updateAndSave((prev) =>
          prev.map((c) => {
            if (c.id !== convoId) return c;
            return { ...c, messages: [...c.messages, { role: 'assistant', content: fullReply }], updatedAt: Date.now() };
          })
        );
      }
    } catch {
      // Only show error if we have no partial content
      updateAndSave((prev) =>
        prev.map((c) => {
          if (c.id !== convoId) return c;
          return { ...c, messages: [...c.messages, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }], updatedAt: Date.now() };
        })
      );
    } finally {
      setLoading(false);
      setTimeout(() => setStreamingContent(''), 100);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
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
            <FenBotIcon size={32} />
            <span className="text-sm font-bold text-white">FenBot</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                const s = { ...settings, tts: !settings.tts };
                setSettings(s);
                saveSettings(s);
                if (!s.tts) window.speechSynthesis?.cancel();
              }}
              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
              title={settings.tts ? 'Disable voice' : 'Enable voice'}
            >
              {settings.tts ? <Volume2 className="w-4 h-4 text-indigo-400" /> : <VolumeX className="w-4 h-4 text-white/30" />}
            </button>
            <button onClick={() => setShowSettings(true)} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors" title="Settings">
              <Settings className="w-4 h-4 text-white/50" />
            </button>
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
                  <div className="flex items-center gap-2 px-4 py-2">
                    {listening && (
                      <div className="flex items-center gap-2 flex-1">
                        <div className="relative flex-shrink-0">
                          <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                          <div className="absolute inset-0 w-3 h-3 rounded-full bg-red-500 animate-ping opacity-40" />
                        </div>
                        <span className="text-xs text-red-400 animate-pulse">{transcript || 'Listening...'}</span>
                      </div>
                    )}
                    {!listening && (
                      <input ref={inputRef} type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder="Ask me anything ..." className="flex-1 bg-transparent text-sm text-white placeholder-white/20 outline-none py-2" disabled={loading} />
                    )}
                    {voiceSupported && (
                      <button
                        onClick={listening ? stopListening : startListening}
                        disabled={loading}
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-all flex-shrink-0 ${
                          listening
                            ? 'bg-red-500 hover:bg-red-400 shadow-lg shadow-red-500/30'
                            : 'bg-white/10 hover:bg-white/20'
                        } disabled:opacity-30 disabled:cursor-not-allowed`}
                      >
                        <Mic className={`w-4 h-4 ${listening ? 'text-white animate-pulse' : 'text-white/60'}`} />
                      </button>
                    )}
                    <button onClick={() => sendMessage(input)} disabled={!input.trim() || loading} className="w-8 h-8 rounded-full bg-indigo-500 hover:bg-indigo-400 flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0">
                      {loading ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <ArrowUp className="w-4 h-4 text-white" />}
                    </button>
                  </div>
                </div>
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
            <div className="max-w-3xl mx-auto px-4 py-6 space-y-5" style={{ fontSize: settings.fontSize, fontFamily: settings.fontFamily }}>
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
                  <div className="bg-[#141926] backdrop-blur rounded-2xl rounded-bl-sm px-4 py-3 border border-white/5 max-w-[80%]">
                    <div className="flex items-center gap-1.5 mb-2">
                      <FenBotIcon size={18} />
                      <span className="text-[11px] font-bold text-indigo-400">FenBot</span>
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
          )}
        </div>

        {/* Chat input */}
        {!isWelcome && (
          <div className="relative z-10 px-4 pb-4 pt-2 shrink-0">
            <div className="max-w-3xl mx-auto">
              <div className="relative bg-[#141926] rounded-2xl border border-white/5 overflow-hidden shadow-2xl shadow-black/40">
                <div className="flex items-center gap-2 px-4 py-2">
                  {listening && (
                    <div className="flex items-center gap-2 flex-1">
                      <div className="relative flex-shrink-0">
                        <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                        <div className="absolute inset-0 w-3 h-3 rounded-full bg-red-500 animate-ping opacity-40" />
                      </div>
                      <span className="text-xs text-red-400 animate-pulse">{transcript || 'Listening...'}</span>
                    </div>
                  )}
                  {!listening && (
                    <input ref={inputRef} type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder="Ask me anything ..." className="flex-1 bg-transparent text-sm text-white placeholder-white/20 outline-none py-2" disabled={loading} />
                  )}
                  {voiceSupported && (
                    <button
                      onClick={listening ? stopListening : startListening}
                      disabled={loading}
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-all flex-shrink-0 ${
                        listening
                          ? 'bg-red-500 hover:bg-red-400 shadow-lg shadow-red-500/30'
                          : 'bg-white/10 hover:bg-white/20'
                      } disabled:opacity-30 disabled:cursor-not-allowed`}
                    >
                      <Mic className={`w-4 h-4 ${listening ? 'text-white animate-pulse' : 'text-white/60'}`} />
                    </button>
                  )}
                  <button onClick={() => sendMessage(input)} disabled={!input.trim() || loading} className="w-8 h-8 rounded-full bg-indigo-500 hover:bg-indigo-400 flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0">
                    {loading ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <ArrowUp className="w-4 h-4 text-white" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowSettings(false)}>
          <div className="bg-[#0d1220] border border-white/10 rounded-2xl w-[380px] max-h-[85vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-indigo-400" />
                <span className="text-sm font-bold text-white">FenBot Settings</span>
              </div>
              <button onClick={() => setShowSettings(false)} className="p-1 rounded-lg hover:bg-white/10">
                <X className="w-4 h-4 text-white/40" />
              </button>
            </div>

            <div className="p-5 space-y-6">
              {/* Speed */}
              <div>
                <label className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3 block">Word Rendering Speed</label>
                <div className="flex gap-1.5">
                  {SPEED_PRESETS.map((p) => (
                    <button
                      key={p.label}
                      onClick={() => { const s = { ...settings, speed: p.value }; setSettings(s); saveSettings(s); }}
                      className={`flex-1 py-2 rounded-lg text-[11px] font-medium transition-all ${
                        settings.speed === p.value
                          ? 'bg-indigo-500 text-white'
                          : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/60'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Font Size */}
              <div>
                <label className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3 block">Font Size</label>
                <div className="flex gap-1.5">
                  {FONT_SIZES.map((size) => (
                    <button
                      key={size}
                      onClick={() => { const s = { ...settings, fontSize: size }; setSettings(s); saveSettings(s); }}
                      className={`flex-1 py-2 rounded-lg text-[11px] font-medium transition-all ${
                        settings.fontSize === size
                          ? 'bg-indigo-500 text-white'
                          : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/60'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              {/* Font Family */}
              <div>
                <label className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3 block">Font Style</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {FONT_FAMILIES.map((f) => (
                    <button
                      key={f.label}
                      onClick={() => { const s = { ...settings, fontFamily: f.value }; setSettings(s); saveSettings(s); }}
                      className={`py-2.5 rounded-lg text-xs font-medium transition-all ${
                        settings.fontFamily === f.value
                          ? 'bg-indigo-500 text-white'
                          : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/60'
                      }`}
                      style={{ fontFamily: f.value }}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Text-to-Speech */}
              <div>
                <label className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3 block">Voice (Text-to-Speech)</label>
                <button
                  onClick={() => {
                    const s = { ...settings, tts: !settings.tts };
                    setSettings(s);
                    saveSettings(s);
                    if (!s.tts) window.speechSynthesis?.cancel();
                  }}
                  className={`flex items-center gap-3 w-full py-3 px-4 rounded-xl text-sm font-medium transition-all ${
                    settings.tts
                      ? 'bg-indigo-500/20 border border-indigo-500/40 text-indigo-300'
                      : 'bg-white/5 border border-white/10 text-white/40'
                  }`}
                >
                  {settings.tts ? <Volume2 size={18} /> : <VolumeX size={18} />}
                  <div className="text-left">
                    <p className={settings.tts ? 'text-indigo-200' : 'text-white/50'}>
                      {settings.tts ? 'Voice is ON' : 'Voice is OFF'}
                    </p>
                    <p className="text-[11px] opacity-60">
                      {settings.tts ? 'FenBot speaks responses aloud' : 'Click to enable voice'}
                    </p>
                  </div>
                </button>
              </div>

              {/* Preview */}
              <div>
                <label className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2 block">Preview</label>
                <div className="bg-[#141926] rounded-xl border border-white/5 p-4">
                  <p className="text-white/70" style={{ fontSize: settings.fontSize, fontFamily: settings.fontFamily }}>
                    This is how your chat text will look.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes logoFloat { 0%, 100% { transform: scale(1) rotate(0deg); } 50% { transform: scale(1.03) rotate(0.5deg); } }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
