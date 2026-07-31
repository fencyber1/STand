import { useState, useEffect } from 'react';
import { Image as ImageIcon, Loader2 } from 'lucide-react';

interface Props {
  query: string;
}

async function getWikipediaImage(query: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.thumbnail?.source || data.originalimage?.source || null;
  } catch {
    return null;
  }
}

async function generateImageWithFlux(query: string): Promise<string | null> {
  try {
    const isProd = window.location.hostname !== 'localhost';
    const url = isProd ? '/api/flux' : 'https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux.1-dev';
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (!isProd) {
      const apiKey = import.meta.env.VITE_FLUX_API_KEY;
      if (!apiKey) return null;
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const prompt = `Educational illustration for: ${query}. Clean, clear, labeled diagram style, white background, suitable for exam study material.`;

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        prompt,
        width: 1024,
        height: 768,
        steps: 30,
        cfg_scale: 3.5,
        seed: Math.floor(Math.random() * 999999),
      }),
    });

    if (!res.ok) return null;
    const data = await res.json();
    if (data.artifacts && data.artifacts[0]?.base64) {
      return `data:image/png;base64,${data.artifacts[0].base64}`;
    }
    return null;
  } catch {
    return null;
  }
}

export default function QuestionImage({ query }: Props) {
  const [src, setSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setFailed(false);
    setSrc(null);

    getWikipediaImage(query).then((wikiUrl) => {
      if (cancelled) return;
      if (wikiUrl) {
        setSrc(wikiUrl);
        setLoading(false);
      } else {
        // Wikipedia failed, fallback to FLUX
        generateImageWithFlux(query).then((fluxUrl) => {
          if (cancelled) return;
          if (fluxUrl) {
            setSrc(fluxUrl);
          } else {
            setFailed(true);
          }
          setLoading(false);
        });
      }
    });

    return () => { cancelled = true; };
  }, [query]);

  if (failed) return null;

  return (
    <div className="mb-5 flex justify-center">
      <div className="relative">
        {loading && (
          <div className="absolute inset-0 rounded-xl bg-gray-200 dark:bg-gray-700 animate-pulse flex items-center justify-center gap-2" style={{ width: 480, height: 300 }}>
            <Loader2 size={18} className="text-gray-400 dark:text-gray-500 animate-spin" />
            <span className="text-xs text-gray-400 dark:text-gray-500">Loading image...</span>
          </div>
        )}
        {src && (
          <img
            src={src}
            alt={query}
            className="rounded-xl object-contain max-h-60 border border-gray-200 dark:border-gray-600 shadow-sm bg-white dark:bg-gray-800"
            onLoad={() => setLoading(false)}
            onError={() => setFailed(true)}
          />
        )}
      </div>
    </div>
  );
}
