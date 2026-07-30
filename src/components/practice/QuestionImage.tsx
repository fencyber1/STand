import { useState, useEffect } from 'react';
import { Image as ImageIcon } from 'lucide-react';

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

export default function QuestionImage({ query }: Props) {
  const [src, setSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setFailed(false);
    setSrc(null);

    getWikipediaImage(query).then((url) => {
      if (cancelled) return;
      if (url) {
        setSrc(url);
      } else {
        setFailed(true);
      }
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, [query]);

  if (failed) return null;

  return (
    <div className="mb-5 flex justify-center">
      <div className="relative">
        {loading && (
          <div className="absolute inset-0 rounded-xl bg-gray-200 dark:bg-gray-700 animate-pulse flex items-center justify-center" style={{ width: 480, height: 300 }}>
            <ImageIcon size={24} className="text-gray-400 dark:text-gray-500" />
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
