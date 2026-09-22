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

async function generateImageWithFlux(query: string): Promise<{ url: string | null; error: string | null }> {
  try {
    const res = await fetch('/api/flux', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: `Educational illustration for: ${query}. Clean, clear, labeled diagram style, white background, suitable for exam study material.`,
        width: 1024,
        height: 768,
        steps: 30,
        cfg_scale: 3.5,
        seed: Math.floor(Math.random() * 999999),
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      return { url: null, error: data?.error || `FLUX failed (HTTP ${res.status})` };
    }
    const data = await res.json();
    if (data.artifacts && data.artifacts[0]?.base64) {
      return { url: `data:image/png;base64,${data.artifacts[0].base64}`, error: null };
    }
    return { url: null, error: 'No image returned from FLUX' };
  } catch {
    return { url: null, error: 'FLUX service unavailable' };
  }
}

export default function QuestionImage({ query }: Props) {
  const [src, setSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [fluxError, setFluxError] = useState<string | null>(null);

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
        generateImageWithFlux(query).then(({ url, error }) => {
          if (cancelled) return;
          if (url) {
            setSrc(url);
          } else {
            setFluxError(error);
            setFailed(true);
          }
          setLoading(false);
        });
      }
    });

    return () => { cancelled = true; };
  }, [query]);

  if (failed) {
    return (
      <div className="mb-5 flex justify-center">
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 text-xs text-yellow-700 dark:text-yellow-400">
          <ImageIcon size={14} />
          <span>Image unavailable — using text-only questions</span>
        </div>
      </div>
    );
  }

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
