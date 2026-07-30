import { useState, useRef, useEffect, useCallback } from 'react';
import { useChatTheme } from '../../contexts/ChatThemeContext';
import { Send, Paperclip, Smile, Mic, X, Loader2, Square } from 'lucide-react';
import EmojiPicker from './EmojiPicker';

interface Props {
  userPhoto: string | null;
  userName: string;
  onSend: (text: string) => void;
  onSendMedia: (type: string, mediaUrl: string, mediaType?: string, fileName?: string, fileSize?: number) => void;
  onAttach: () => void;
  disabled?: boolean;
  sending?: boolean;
}

export default function ChatInputBar({ userPhoto, userName, onSend, onSendMedia, onAttach, disabled, sending }: Props) {
  const { theme } = useChatTheme();
  const [text, setText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  const tc = (light: string, dark: string) => theme.textColor === 'text-white' ? dark : light;

  const handleSend = useCallback(() => {
    if (!text.trim() || disabled || sending) return;
    onSend(text.trim());
    setText('');
    setShowEmoji(false);
    if (inputRef.current) inputRef.current.style.height = 'auto';
  }, [text, disabled, sending, onSend]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    setText((prev) => prev + emoji);
    inputRef.current?.focus();
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      analyserRef.current = analyser;

      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((t) => t.stop());
        audioCtx.close();
      };

      mediaRecorder.start();
      setRecording(true);
      setRecordTime(0);
      timerRef.current = setInterval(() => setRecordTime((t) => t + 1), 1000);
      drawWaveform(analyser);
    } catch {
      alert('Microphone access denied');
    }
  };

  const drawWaveform = (analyser: AnalyserNode) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animFrameRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const barWidth = (canvas.width / bufferLength) * 1.5;
      let x = 0;
      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height * 0.8;
        ctx.fillStyle = 'rgba(99, 102, 241, 0.8)';
        ctx.beginPath();
        ctx.roundRect(x, (canvas.height - barHeight) / 2, barWidth - 1, barHeight, 2);
        ctx.fill();
        x += barWidth;
      }
    };
    draw();
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) clearInterval(timerRef.current);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    setRecording(false);
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) clearInterval(timerRef.current);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    setRecording(false);
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordTime(0);
  };

  const sendVoiceMessage = async () => {
    if (!audioBlob) return;
    const url = URL.createObjectURL(audioBlob);
    onSendMedia('audio', url, 'audio/webm', `voice-${Date.now()}.webm`, audioBlob.size);
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordTime(0);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  const formatRecordTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const hasText = text.trim().length > 0;

  return (
    <div className="relative">
      {/* Emoji Picker */}
      {showEmoji && (
        <div className="absolute bottom-full left-0 right-0 z-30 mb-2 px-1">
          <EmojiPicker onSelect={handleEmojiSelect} onClose={() => setShowEmoji(false)} />
        </div>
      )}

      {/* Recording state */}
      {recording ? (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl max-w-xl mx-auto ${theme.inputBg}`} style={{ background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(20px)' }}>
          <button onClick={cancelRecording} className="p-2 rounded-full hover:bg-white/10 transition-colors">
            <X className="w-5 h-5 text-red-400" />
          </button>
          <div className="flex items-center gap-2 flex-1">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-sm text-white font-medium tabular-nums">{formatRecordTime(recordTime)}</span>
            <canvas ref={canvasRef} width={120} height={32} className="flex-1 max-w-[120px]" />
          </div>
          <button onClick={stopRecording} className="p-2.5 bg-indigo-500 rounded-full hover:bg-indigo-400 transition-all shadow-lg shadow-indigo-500/30">
            <Square className="w-4 h-4 text-white fill-white" />
          </button>
        </div>
      ) : audioBlob ? (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl max-w-xl mx-auto ${theme.inputBg}`} style={{ background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(20px)' }}>
          <button onClick={cancelRecording} className="p-2 rounded-full hover:bg-white/10 transition-colors">
            <X className="w-5 h-5 text-red-400" />
          </button>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <audio src={audioUrl || ''} controls className="flex-1 h-8 max-w-[200px]" style={{ filter: 'invert(1) hue-rotate(180deg)' }} />
            <span className="text-[11px] text-white/40">{formatRecordTime(recordTime)}</span>
          </div>
          <button onClick={sendVoiceMessage} className="p-2.5 bg-indigo-500 rounded-full hover:bg-indigo-400 transition-all shadow-lg shadow-indigo-500/30">
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
      ) : (
        /* Normal input */
        <div
          className="flex items-end gap-2 px-2 py-2 rounded-2xl max-w-xl mx-auto"
          style={{ background: 'rgba(0,0,0,0.25)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          {/* Avatar */}
          <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            {userPhoto ? (
              <img src={userPhoto} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-white text-xs font-bold">{userName.charAt(0).toUpperCase()}</span>
            )}
          </div>

          {/* Attach */}
          <button onClick={onAttach} className="p-2 rounded-full hover:bg-white/10 transition-colors flex-shrink-0 self-end">
            <Paperclip className={`w-5 h-5 ${tc('text-gray-400', 'text-white/50')}`} />
          </button>

          {/* Input */}
          <textarea
            ref={inputRef}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            onInput={(e) => {
              const t = e.currentTarget;
              t.style.height = 'auto';
              t.style.height = Math.min(t.scrollHeight, 120) + 'px';
            }}
            placeholder="Message"
            rows={1}
            className={`flex-1 bg-transparent text-sm ${theme.textColor} placeholder-white/25 outline-none min-w-0 resize-none leading-relaxed py-1`}
            style={{ maxHeight: '120px' }}
            disabled={disabled || sending}
          />

          {/* Emoji */}
          <button onClick={() => setShowEmoji(!showEmoji)} className={`p-2 rounded-full transition-colors flex-shrink-0 self-end ${showEmoji ? 'bg-white/15' : 'hover:bg-white/10'}`}>
            <Smile className={`w-5 h-5 ${tc('text-gray-400', 'text-white/50')}`} />
          </button>

          {/* Send or Mic */}
          {hasText ? (
            <button onClick={handleSend} disabled={sending} className="p-2.5 bg-indigo-500 rounded-full hover:bg-indigo-400 transition-all shadow-lg shadow-indigo-500/30 flex-shrink-0 disabled:opacity-50 self-end">
              {sending ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <Send className="w-4 h-4 text-white" />}
            </button>
          ) : (
            <button onClick={startRecording} className="p-2.5 bg-white/10 rounded-full hover:bg-white/20 transition-all flex-shrink-0 self-end">
              <Mic className={`w-4 h-4 ${tc('text-gray-400', 'text-white/60')}`} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
