import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Settings, Smile, Send as SendIcon, Check } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { postStatus } from '../../services/statusService';

const MAX_CHARS = 150;

const BG_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f97316',
  '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6',
  '#1e1b4b', '#0f172a', '#18181b', '#ffffff',
];

const FONT_STYLES = [
  { label: 'Sans', css: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", weight: '300', size: 24 },
  { label: 'Serif', css: "'Georgia', 'Times New Roman', serif", weight: '400', size: 24 },
  { label: 'Mono', css: "'SF Mono', 'Fira Code', 'Courier New', monospace", weight: '400', size: 22 },
  { label: 'Bold', css: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", weight: '800', size: 28 },
  { label: 'Script', css: "'Brush Script MT', 'Segoe Script', cursive", weight: '400', size: 28 },
];

const EMOJI_ROWS = [
  ['😀','😂','😍','🥰','😎','🤩','😇','🥳','😏','😅','😭','🔥','❤️','💯','✨','🎉','👍','🙌','💪','🤔','😴','🙄','😤','🥺'],
  ['😊','🤪','😜','🤗','🫡','🤡','💀','👻','😈','🫠','🥶','🤯','😱','😰','😥','🫣','🧐','🤓','😈','👹','👺','🎃','🍭','🍬'],
  ['🙏','👏','🤝','🫶','✌️','🤟','🤙','👋','🫰','🤌','☝️','👀','👁️','🧠','💎','🏆','🎯','🚀','💡','📚','🎓','✏️','🎨','🎵'],
  ['🌸','🌺','🌻','🌹','🍀','🌈','☀️','🌙','⭐','🌊','🔥','❄️','🍃','🌴','🪷','🦋','🐱','🐶','🦊','🐻','🐼','🐨','🦁','🐸'],
];

const VISIBILITY_OPTIONS = [
  { key: 'everyone', label: 'Everyone', icon: '🌍', desc: 'Anyone can see this status' },
  { key: 'friends', label: 'Friends Only', icon: '👥', desc: 'Only your friends can see this status' },
  { key: 'only_me', label: 'Only Me', icon: '🔒', desc: 'Only you can see this status' },
];

function getCounterColor(count: number) {
  if (count <= MAX_CHARS * 0.7) return '#4CAF50';
  if (count <= MAX_CHARS * 0.9) return '#FFC107';
  return '#F44336';
}

function getCounterHint(count: number) {
  const remaining = MAX_CHARS - count;
  if (remaining > 45) return null;
  if (remaining > 0) return `${remaining} characters left`;
  return 'Character limit reached';
}

export default function StatusComposer() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const emojiPanelRef = useRef<HTMLDivElement>(null);

  const [text, setText] = useState('');
  const [bgColor, setBgColor] = useState('#6366f1');
  const [textColor, setTextColor] = useState('#ffffff');
  const [showColors, setShowColors] = useState(false);
  const [fontIndex, setFontIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [postedCount, setPostedCount] = useState(0);

  // Emoji picker
  const [showEmoji, setShowEmoji] = useState(false);
  const [emojiSearch, setEmojiSearch] = useState('');
  const emojiInputRef = useRef<HTMLInputElement>(null);

  // Visibility / privacy
  const [showVisibility, setShowVisibility] = useState(false);
  const [visibility, setVisibility] = useState('everyone');

  const font = FONT_STYLES[fontIndex];
  const charCount = text.length;
  const counterColor = getCounterColor(charCount);
  const counterHint = getCounterHint(charCount);
  const canPost = text.trim().length > 0 && charCount <= MAX_CHARS;
  const visOption = VISIBILITY_OPTIONS.find((v) => v.key === visibility)!;

  // Focus emoji search when panel opens
  useEffect(() => {
    if (showEmoji) {
      setTimeout(() => emojiInputRef.current?.focus(), 100);
    }
  }, [showEmoji]);

  // Close panels on outside click
  useEffect(() => {
    if (!showEmoji) return;
    const handler = (e: MouseEvent) => {
      if (emojiPanelRef.current && !emojiPanelRef.current.contains(e.target as Node)) {
        setShowEmoji(false);
        setEmojiSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showEmoji]);

  const handlePost = async () => {
    if (!user || !canPost) return;
    setLoading(true);
    try {
      await postStatus(
        { uid: user.uid, displayName: user.fullName, photoURL: user.photoURL || null },
        'text',
        text.trim(),
        bgColor,
        textColor,
        font.label.toLowerCase()
      );
      setPostedCount((c) => c + 1);
      setText('');
      setFontIndex(0);
    } catch {
      alert('Failed to post status');
    } finally {
      setLoading(false);
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    if (val.length <= MAX_CHARS) setText(val);
  };

  const insertEmoji = (emoji: string) => {
    const ta = textareaRef.current;
    if (!ta) { setText((p) => p + emoji); return; }
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const newVal = text.slice(0, start) + emoji + text.slice(end);
    if (newVal.length <= MAX_CHARS) {
      setText(newVal);
      setTimeout(() => {
        ta.selectionStart = ta.selectionEnd = start + emoji.length;
        ta.focus();
      }, 0);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col dark"
      style={{ backgroundColor: bgColor, color: textColor }}
    >
      {/* ── Header Bar ── */}
      <div className="flex items-center justify-between px-3 py-2 shrink-0" style={{ minHeight: 56 }}>
        <button
          onClick={() => navigate(-1)}
          className="p-3 rounded-full hover:bg-white/10 active:bg-white/15 transition-colors"
          aria-label="Close"
        >
          <X size={22} />
        </button>

        {postedCount > 0 && (
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
            style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}
          >
            <Check size={13} />
            <span>{postedCount} posted</span>
          </div>
        )}

        <div className="flex items-center">
          <button
            onClick={() => setFontIndex((i) => (i + 1) % FONT_STYLES.length)}
            className="p-3 rounded-full hover:bg-white/10 active:bg-white/15 transition-colors"
            title={`Font: ${font.label}`}
            aria-label="Toggle font"
          >
            <span className="text-base font-bold" style={{ fontFamily: font.css, fontWeight: 700 }}>Aa</span>
          </button>
          <button
            onClick={() => { setShowVisibility(!showVisibility); setShowEmoji(false); setShowColors(false); }}
            className="p-3 rounded-full hover:bg-white/10 active:bg-white/15 transition-colors"
            aria-label="Visibility settings"
            title="Who can see this"
          >
            <Settings size={20} />
          </button>
        </div>
      </div>

      {/* ── Visibility Panel ── */}
      {showVisibility && (
        <div
          ref={emojiPanelRef}
          className="mx-4 mb-3 rounded-xl overflow-hidden shrink-0"
          style={{ backgroundColor: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(20px)' }}
        >
          {VISIBILITY_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => { setVisibility(opt.key); setShowVisibility(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                visibility === opt.key ? 'bg-white/15' : 'hover:bg-white/10'
              }`}
            >
              <span className="text-xl">{opt.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold" style={{ color: textColor }}>{opt.label}</p>
                <p className="text-xs opacity-60">{opt.desc}</p>
              </div>
              {visibility === opt.key && <Check size={16} className="text-green-400 shrink-0" />}
            </button>
          ))}
        </div>
      )}

      {/* ── Color Picker ── */}
      {showColors && (
        <div className="px-4 pb-3 flex gap-2 flex-wrap shrink-0 justify-center">
          {BG_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setBgColor(c)}
              className={`w-7 h-7 rounded-full border-2 transition-transform ${
                bgColor === c ? 'scale-125 border-white' : 'border-transparent'
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
          <div className="w-px h-7 bg-white/20 mx-1" />
          {['#ffffff', '#000000'].map((c) => (
            <button
              key={c}
              onClick={() => setTextColor(c)}
              className={`w-7 h-7 rounded-full border-2 transition-transform ${
                textColor === c ? 'scale-125 border-white' : 'border-gray-400'
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      )}

      {/* ── Input Area ── */}
      <div className="flex-1 flex items-center justify-center min-h-0 px-5 py-4">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleTextChange}
          placeholder="Type a status"
          autoFocus
          rows={4}
          className="w-full bg-transparent outline-none resize-none leading-relaxed text-center placeholder-white/30"
          style={{
            color: textColor,
            fontFamily: font.css,
            fontWeight: font.weight,
            fontSize: font.size,
            lineHeight: 1.5,
          }}
        />
      </div>

      {/* ── Emoji Picker Panel ── */}
      {showEmoji && (
        <div
          ref={emojiPanelRef}
          className="mx-4 mb-3 rounded-xl overflow-hidden shrink-0 flex flex-col"
          style={{ backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(20px)', maxHeight: '45vh' }}
        >
          {/* Search */}
          <div className="px-3 pt-3 pb-2">
            <input
              ref={emojiInputRef}
              value={emojiSearch}
              onChange={(e) => setEmojiSearch(e.target.value)}
              placeholder="Search emoji..."
              className="w-full bg-white/10 text-white text-sm rounded-lg px-3 py-2 outline-none placeholder-white/40"
            />
          </div>
          {/* Grid */}
          <div className="overflow-y-auto px-2 pb-3 flex-1 min-h-0">
            {EMOJI_ROWS.map((row, ri) => {
              const filtered = row.filter((e) => !emojiSearch || e.includes(emojiSearch));
              if (filtered.length === 0) return null;
              return (
                <div key={ri} className="flex flex-wrap gap-1 py-1">
                  {filtered.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => insertEmoji(emoji)}
                      className="w-9 h-9 flex items-center justify-center rounded-lg text-xl hover:bg-white/15 active:bg-white/20 transition-colors"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Toolbar ── */}
      <div
        className="flex items-center justify-around px-2 shrink-0"
        style={{ minHeight: 52, borderTop: '1px solid rgba(255,255,255,0.08)' }}
      >
        <button
          onClick={() => { setShowEmoji(!showEmoji); setShowColors(false); setShowVisibility(false); setEmojiSearch(''); }}
          className={`p-3 rounded-full transition-colors ${showEmoji ? 'bg-white/20' : 'hover:bg-white/10 active:bg-white/15'}`}
          aria-label="Emoji"
          title="Emoji"
        >
          <Smile size={22} />
        </button>
        <button
          onClick={() => { setShowColors(!showColors); setShowEmoji(false); setShowVisibility(false); }}
          className={`p-3 rounded-full transition-colors ${showColors ? 'bg-white/20' : 'hover:bg-white/10 active:bg-white/15'}`}
          aria-label="Background color"
          title="Background color"
        >
          <span className="text-lg">🎨</span>
        </button>
      </div>

      {/* ── Character Counter ── */}
      <div className="flex flex-col items-center shrink-0 px-4" style={{ minHeight: 44 }}>
        <span className="text-sm font-medium tabular-nums" style={{ color: counterColor }}>
          {charCount}/{MAX_CHARS}
        </span>
        {counterHint && (
          <span className="text-xs mt-0.5" style={{ color: counterColor, opacity: 0.85 }}>
            {counterHint}
          </span>
        )}
      </div>

      {/* ── Action Buttons ── */}
      <div className="flex items-center gap-3 px-4 pb-5 pt-2 shrink-0 safe-area-bottom">
        <button
          onClick={() => navigate(-1)}
          className="flex-1 h-12 rounded-xl font-semibold text-sm transition-all active:scale-[0.97]"
          style={{
            backgroundColor: 'rgba(255,255,255,0.12)',
            color: textColor,
          }}
        >
          {postedCount > 0 ? 'Done' : 'Cancel'}
        </button>
        <button
          onClick={handlePost}
          disabled={loading || !canPost}
          className="flex-1 h-12 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.97] disabled:opacity-40 disabled:active:scale-100"
          style={{
            backgroundColor: canPost ? '#007AFF' : 'rgba(255,255,255,0.12)',
            color: canPost ? '#fff' : 'rgba(255,255,255,0.35)',
          }}
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <SendIcon size={16} />
              <span>Send</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
