import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

export type Language = {
  code: string;
  name: string;
  nativeName: string;
  dir: 'ltr' | 'rtl';
};

export const LANGUAGES: Language[] = [
  { code: 'en', name: 'English', nativeName: 'English', dir: 'ltr' },
  { code: 'fr', name: 'French', nativeName: 'Français', dir: 'ltr' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', dir: 'rtl' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', dir: 'ltr' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', dir: 'ltr' },
  { code: 'sw', name: 'Swahili', nativeName: 'Kiswahili', dir: 'ltr' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', dir: 'ltr' },
  { code: 'zh', name: 'Chinese', nativeName: '中文', dir: 'ltr' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', dir: 'ltr' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', dir: 'ltr' },
];

const LANG_KEY = 'stand_language';
const CACHE_KEY = 'stand_translate_cache';

function loadCache(): Record<string, string> {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveCache(cache: Record<string, string>) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(cache)); } catch {}
}

async function translateBatch(texts: string[], target: string): Promise<string[]> {
  if (target === 'en') return texts;
  const results: string[] = [];
  // Translate one at a time for reliability
  for (const text of texts) {
    if (!text.trim()) { results.push(text); continue; }
    try {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${target}&dt=t&q=${encodeURIComponent(text)}`;
      const res = await fetch(url);
      const data = await res.json();
      results.push(data[0].map((s: any[]) => s[0]).join(''));
    } catch {
      results.push(text);
    }
  }
  return results;
}

interface LanguageContextValue {
  language: string;
  setLanguage: (code: string) => void;
  t: (key: string) => string;
  tBatch: (keys: string[]) => Record<string, string>;
  translating: boolean;
  dir: 'ltr' | 'rtl';
}

const LanguageContext = createContext<LanguageContextValue>({
  language: 'en',
  setLanguage: () => {},
  t: (k) => k,
  tBatch: (keys) => Object.fromEntries(keys.map((k) => [k, k])),
  translating: false,
  dir: 'ltr',
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLangState] = useState<string>(() => {
    try { return localStorage.getItem(LANG_KEY) || 'en'; } catch { return 'en'; }
  });
  const [cache, setCache] = useState<Record<string, string>>(loadCache);
  const [translating, setTranslating] = useState(false);
  const pendingRef = useRef<Set<string>>(new Set());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dir = LANGUAGES.find((l) => l.code === language)?.dir || 'ltr';

  const setLanguage = useCallback((code: string) => {
    setLangState(code);
    try { localStorage.setItem(LANG_KEY, code); } catch {}
  }, []);

  // Batch translate any uncached keys
  const translateUncached = useCallback(async (keys: string[], lang: string, currentCache: Record<string, string>) => {
    if (lang === 'en') return;
    const uncached = keys.filter((k) => !currentCache[`${lang}:${k}`]);
    if (uncached.length === 0) return;

    setTranslating(true);
    const translated = await translateBatch(uncached, lang);
    const newEntries: Record<string, string> = {};
    uncached.forEach((key, i) => { newEntries[`${lang}:${key}`] = translated[i]; });
    const merged = { ...currentCache, ...newEntries };
    setCache(merged);
    saveCache(merged);
    setTranslating(false);
  }, []);

  // Translate in batches of 30 with debounce
  const queueTranslation = useCallback((keys: string[]) => {
    keys.forEach((k) => pendingRef.current.add(k));
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const all = Array.from(pendingRef.current);
      pendingRef.current.clear();
      translateUncached(all, language, loadCache());
    }, 300);
  }, [language, translateUncached]);

  // Translate on language change
  useEffect(() => {
    if (language === 'en') return;
    // Translate all cached keys for new language
    const allKeys = Object.keys(cache)
      .filter((k) => k.startsWith('en:'))
      .map((k) => k.replace('en:', ''));
    if (allKeys.length > 0) {
      translateUncached(allKeys, language, cache);
    }
  }, [language]); // eslint-disable-line

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const t = useCallback((key: string): string => {
    if (language === 'en') return key;
    const cacheKey = `${language}:${key}`;
    if (cache[cacheKey]) return cache[cacheKey];
    // Queue for translation
    queueTranslation([key]);
    // Also ensure English version is cached
    const enKey = `en:${key}`;
    if (!cache[enKey]) {
      setCache((prev) => ({ ...prev, [enKey]: key }));
    }
    return key; // Return English while translating
  }, [language, cache, queueTranslation]);

  const tBatch = useCallback((keys: string[]): Record<string, string> => {
    const result: Record<string, string> = {};
    const uncached: string[] = [];
    for (const key of keys) {
      if (language === 'en') { result[key] = key; continue; }
      const cacheKey = `${language}:${key}`;
      if (cache[cacheKey]) { result[key] = cache[cacheKey]; }
      else { result[key] = key; uncached.push(key); }
    }
    if (uncached.length > 0) queueTranslation(uncached);
    return result;
  }, [language, cache, queueTranslation]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, tBatch, translating, dir }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
