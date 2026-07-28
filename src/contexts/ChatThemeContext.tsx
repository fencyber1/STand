import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { ChatTheme } from '../types';
import { storage } from '../services/storage';

const PRESET_THEMES: ChatTheme[] = [
  {
    id: 'default',
    name: 'Default',
    gradient: 'linear-gradient(135deg, #111827 0%, #1f2937 50%, #111827 100%)',
    bubbleOwn: 'bg-blue-600/80 backdrop-blur-md text-white rounded-2xl rounded-br-sm border border-blue-500/20',
    bubbleReceived: 'bg-white/10 backdrop-blur-md text-white rounded-2xl rounded-bl-sm border border-white/5',
    senderNameColor: 'text-blue-300/80',
    headerBg: 'backdrop-blur-xl bg-gray-900/80 border-b border-white/5',
    inputBg: 'backdrop-blur-xl bg-gray-900/80 border-t border-white/5',
    inputField: 'bg-white/10 backdrop-blur rounded-full px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:ring-2 focus:ring-blue-500/30',
    sendButton: 'bg-blue-500 text-white rounded-full hover:bg-blue-400 transition-all shadow-lg shadow-blue-500/30',
    sendButtonShadow: 'shadow-blue-500/30',
    textColor: 'text-white',
    timestampColor: 'text-white/30',
    onlineIndicator: 'bg-green-500',
    avatarRing: 'ring-2 ring-white/10',
  },
  {
    id: 'ocean',
    name: 'Ocean',
    gradient: 'linear-gradient(135deg, #1a2a6c 0%, #2a4a9c 40%, #3a6abc 70%, #4a8adc 100%)',
    bubbleOwn: 'bg-black/40 backdrop-blur-md text-white rounded-2xl rounded-br-sm border border-white/5',
    bubbleReceived: 'bg-black/40 backdrop-blur-md text-white rounded-2xl rounded-bl-sm border border-white/5',
    senderNameColor: 'text-yellow-300/80',
    headerBg: 'backdrop-blur-xl bg-black/20 border-b border-white/10',
    inputBg: 'backdrop-blur-xl bg-black/20 border-t border-white/10',
    inputField: 'bg-white/10 backdrop-blur rounded-full px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:ring-2 focus:ring-white/20',
    sendButton: 'bg-blue-500 text-white rounded-full hover:bg-blue-400 transition-all shadow-lg shadow-blue-500/30',
    sendButtonShadow: 'shadow-blue-500/30',
    textColor: 'text-white',
    timestampColor: 'text-white/30',
    onlineIndicator: 'bg-green-500',
    avatarRing: 'ring-2 ring-white/20',
  },
  {
    id: 'midnight',
    name: 'Midnight',
    gradient: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
    bubbleOwn: 'bg-white/10 backdrop-blur-md text-white rounded-2xl rounded-br-sm border border-purple-500/20',
    bubbleReceived: 'bg-purple-900/30 backdrop-blur-md text-white rounded-2xl rounded-bl-sm border border-purple-500/20',
    senderNameColor: 'text-purple-300/80',
    headerBg: 'backdrop-blur-xl bg-purple-900/20 border-b border-purple-500/10',
    inputBg: 'backdrop-blur-xl bg-purple-900/20 border-t border-purple-500/10',
    inputField: 'bg-white/10 backdrop-blur rounded-full px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:ring-2 focus:ring-purple-500/30',
    sendButton: 'bg-purple-500 text-white rounded-full hover:bg-purple-400 transition-all shadow-lg shadow-purple-500/30',
    sendButtonShadow: 'shadow-purple-500/30',
    textColor: 'text-white',
    timestampColor: 'text-white/30',
    onlineIndicator: 'bg-green-500',
    avatarRing: 'ring-2 ring-purple-400/30',
  },
  {
    id: 'forest',
    name: 'Forest',
    gradient: 'linear-gradient(135deg, #134e1b 0%, #1a6b2a 40%, #228b22 70%, #2ea84e 100%)',
    bubbleOwn: 'bg-black/35 backdrop-blur-md text-white rounded-2xl rounded-br-sm border border-green-500/15',
    bubbleReceived: 'bg-green-900/30 backdrop-blur-md text-white rounded-2xl rounded-bl-sm border border-green-500/15',
    senderNameColor: 'text-green-300/80',
    headerBg: 'backdrop-blur-xl bg-green-900/20 border-b border-green-500/10',
    inputBg: 'backdrop-blur-xl bg-green-900/20 border-t border-green-500/10',
    inputField: 'bg-white/10 backdrop-blur rounded-full px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:ring-2 focus:ring-green-500/30',
    sendButton: 'bg-green-500 text-white rounded-full hover:bg-green-400 transition-all shadow-lg shadow-green-500/30',
    sendButtonShadow: 'shadow-green-500/30',
    textColor: 'text-white',
    timestampColor: 'text-white/30',
    onlineIndicator: 'bg-green-400',
    avatarRing: 'ring-2 ring-green-400/30',
  },
  {
    id: 'sunset',
    name: 'Sunset',
    gradient: 'linear-gradient(135deg, #e65c00 0%, #f9d423 50%, #ff6e7f 100%)',
    bubbleOwn: 'bg-black/30 backdrop-blur-md text-white rounded-2xl rounded-br-sm border border-orange-400/20',
    bubbleReceived: 'bg-orange-900/30 backdrop-blur-md text-white rounded-2xl rounded-bl-sm border border-orange-400/20',
    senderNameColor: 'text-yellow-200/90',
    headerBg: 'backdrop-blur-xl bg-black/20 border-b border-orange-400/15',
    inputBg: 'backdrop-blur-xl bg-black/20 border-t border-orange-400/15',
    inputField: 'bg-white/15 backdrop-blur rounded-full px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:ring-2 focus:ring-orange-400/30',
    sendButton: 'bg-orange-500 text-white rounded-full hover:bg-orange-400 transition-all shadow-lg shadow-orange-500/30',
    sendButtonShadow: 'shadow-orange-500/30',
    textColor: 'text-white',
    timestampColor: 'text-white/30',
    onlineIndicator: 'bg-green-500',
    avatarRing: 'ring-2 ring-orange-300/30',
  },
  {
    id: 'rose',
    name: 'Rose',
    gradient: 'linear-gradient(135deg, #8e2de2 0%, #d63384 50%, #e91e63 100%)',
    bubbleOwn: 'bg-black/30 backdrop-blur-md text-white rounded-2xl rounded-br-sm border border-pink-400/20',
    bubbleReceived: 'bg-pink-900/30 backdrop-blur-md text-white rounded-2xl rounded-bl-sm border border-pink-400/20',
    senderNameColor: 'text-pink-300/80',
    headerBg: 'backdrop-blur-xl bg-pink-900/20 border-b border-pink-500/10',
    inputBg: 'backdrop-blur-xl bg-pink-900/20 border-t border-pink-500/10',
    inputField: 'bg-white/10 backdrop-blur rounded-full px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:ring-2 focus:ring-pink-500/30',
    sendButton: 'bg-pink-500 text-white rounded-full hover:bg-pink-400 transition-all shadow-lg shadow-pink-500/30',
    sendButtonShadow: 'shadow-pink-500/30',
    textColor: 'text-white',
    timestampColor: 'text-white/30',
    onlineIndicator: 'bg-green-500',
    avatarRing: 'ring-2 ring-pink-400/30',
  },
  {
    id: 'dark',
    name: 'Pitch Black',
    gradient: 'linear-gradient(135deg, #000000 0%, #0a0a0a 50%, #111111 100%)',
    bubbleOwn: 'bg-gray-800/80 backdrop-blur-md text-white rounded-2xl rounded-br-sm border border-gray-700/50',
    bubbleReceived: 'bg-gray-800/60 backdrop-blur-md text-white rounded-2xl rounded-bl-sm border border-gray-700/50',
    senderNameColor: 'text-gray-300/80',
    headerBg: 'backdrop-blur-xl bg-black/40 border-b border-gray-800/50',
    inputBg: 'backdrop-blur-xl bg-black/40 border-t border-gray-800/50',
    inputField: 'bg-gray-800/60 backdrop-blur rounded-full px-4 py-2.5 text-sm text-white placeholder-gray-400 outline-none focus:ring-2 focus:ring-gray-600',
    sendButton: 'bg-gray-700 text-white rounded-full hover:bg-gray-600 transition-all shadow-lg shadow-gray-700/30',
    sendButtonShadow: 'shadow-gray-700/30',
    textColor: 'text-white',
    timestampColor: 'text-gray-400',
    onlineIndicator: 'bg-green-500',
    avatarRing: 'ring-2 ring-gray-600/30',
  },
  {
    id: 'aurora',
    name: 'Aurora',
    gradient: 'linear-gradient(135deg, #00c6ff 0%, #0072ff 30%, #7c3aed 70%, #a855f7 100%)',
    bubbleOwn: 'bg-black/30 backdrop-blur-md text-white rounded-2xl rounded-br-sm border border-cyan-400/20',
    bubbleReceived: 'bg-indigo-900/30 backdrop-blur-md text-white rounded-2xl rounded-bl-sm border border-cyan-400/20',
    senderNameColor: 'text-cyan-300/80',
    headerBg: 'backdrop-blur-xl bg-black/20 border-b border-cyan-500/15',
    inputBg: 'backdrop-blur-xl bg-black/20 border-t border-cyan-500/15',
    inputField: 'bg-white/10 backdrop-blur rounded-full px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:ring-2 focus:ring-cyan-500/30',
    sendButton: 'bg-cyan-500 text-white rounded-full hover:bg-cyan-400 transition-all shadow-lg shadow-cyan-500/30',
    sendButtonShadow: 'shadow-cyan-500/30',
    textColor: 'text-white',
    timestampColor: 'text-white/30',
    onlineIndicator: 'bg-green-500',
    avatarRing: 'ring-2 ring-cyan-400/30',
  },
  {
    id: 'light',
    name: 'Light',
    gradient: 'linear-gradient(135deg, #e8f0fe 0%, #d4e4fc 50%, #c2d9fb 100%)',
    bubbleOwn: 'bg-blue-500/90 backdrop-blur-md text-white rounded-2xl rounded-br-sm border border-blue-400/20 shadow-sm',
    bubbleReceived: 'bg-white/80 backdrop-blur-md text-gray-800 rounded-2xl rounded-bl-sm border border-gray-200/80 shadow-sm',
    senderNameColor: 'text-blue-600',
    headerBg: 'backdrop-blur-xl bg-white/80 border-b border-gray-200/60',
    inputBg: 'backdrop-blur-xl bg-white/80 border-t border-gray-200/60',
    inputField: 'bg-gray-100/80 backdrop-blur rounded-full px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-400/30',
    sendButton: 'bg-blue-500 text-white rounded-full hover:bg-blue-400 transition-all shadow-lg shadow-blue-500/20',
    sendButtonShadow: 'shadow-blue-500/20',
    textColor: 'text-gray-800',
    timestampColor: 'text-gray-400',
    onlineIndicator: 'bg-green-500',
    avatarRing: 'ring-2 ring-blue-200/50',
  },
];

interface ChatThemeContextType {
  theme: ChatTheme;
  setTheme: (id: string) => void;
  wallpaper: string | null;
  setWallpaper: (dataUrl: string) => void;
  removeWallpaper: () => void;
  themes: ChatTheme[];
}

const ChatThemeContext = createContext<ChatThemeContextType | undefined>(undefined);

export function ChatThemeProvider({ children }: { children: ReactNode }) {
  const [currentId, setCurrentId] = useState(() => {
    const stored = storage.getChatThemeId();
    return stored === 'ocean' ? 'default' : stored;
  });
  const [wallpaper, setWallpaperState] = useState<string | null>(storage.getChatWallpaper());

  const theme = PRESET_THEMES.find((t) => t.id === currentId) || PRESET_THEMES[0];

  const setTheme = useCallback((id: string) => {
    setCurrentId(id);
    storage.setChatThemeId(id);
  }, []);

  const setWallpaper = useCallback((dataUrl: string) => {
    setWallpaperState(dataUrl);
    storage.setChatWallpaper(dataUrl);
  }, []);

  const removeWallpaper = useCallback(() => {
    setWallpaperState(null);
    storage.removeChatWallpaper();
  }, []);

  return (
    <ChatThemeContext.Provider value={{ theme, setTheme, wallpaper, setWallpaper, removeWallpaper, themes: PRESET_THEMES }}>
      {children}
    </ChatThemeContext.Provider>
  );
}

export function useChatTheme() {
  const ctx = useContext(ChatThemeContext);
  if (!ctx) throw new Error('useChatTheme must be used within ChatThemeProvider');
  return ctx;
}
