import { useState } from 'react';
import { Image as ImageIcon } from 'lucide-react';

interface Props {
  query: string;
}

const sources = (q: string) => [
  `https://loremflickr.com/480/300/${encodeURIComponent(q)}`,
  `https://picsum.photos/seed/${encodeURIComponent(q)}/480/300`,
];

export default function QuestionImage({ query }: Props) {
  const [srcIndex, setSrcIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const urls = sources(query);
  const src = urls[srcIndex];

  if (failed) {
    return (
      <div className="mb-5 flex justify-center">
        <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 px-6 py-4 flex items-center gap-2 text-gray-400 dark:text-gray-500 text-sm">
          <ImageIcon size={16} />
          <span>{query}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-5 flex justify-center">
      <div className="relative">
        {loading && (
          <div className="absolute inset-0 rounded-xl bg-gray-200 dark:bg-gray-700 animate-pulse flex items-center justify-center" style={{ width: 480, height: 300 }}>
            <ImageIcon size={24} className="text-gray-400 dark:text-gray-500" />
          </div>
        )}
        <img
          src={src}
          alt={query}
          className="rounded-xl object-cover max-h-52 border border-gray-200 dark:border-gray-600 shadow-sm"
          style={{ minWidth: loading ? 480 : undefined }}
          onLoad={() => setLoading(false)}
          onError={() => {
            if (srcIndex < urls.length - 1) {
              setSrcIndex(srcIndex + 1);
            } else {
              setFailed(true);
            }
          }}
        />
      </div>
    </div>
  );
}
