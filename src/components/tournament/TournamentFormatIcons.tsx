import type { TournamentFormat } from '../../types/tournament';

const ICON_SIZE = { sm: 32, md: 64, lg: 100, xl: 160 };

interface Props {
  format: TournamentFormat;
  size?: keyof typeof ICON_SIZE;
  className?: string;
}

export default function TournamentFormatIcon({ format, size = 'md', className = '' }: Props) {
  const s = ICON_SIZE[size];
  const icons: Record<TournamentFormat, JSX.Element> = {
    worldcup: <WorldCupIcon size={s} />,
    champions: <ChampionsIcon size={s} />,
    single: <SingleElimIcon size={s} />,
    league: <LeagueIcon size={s} />,
    survival: <SurvivalIcon size={s} />,
    double: <DoubleElimIcon size={s} />,
  };
  return <div className={`inline-flex ${className}`}>{icons[format]}</div>;
}

function WorldCupIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size * 1.15} viewBox="0 0 200 230" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="wc-shield" x1="100" y1="0" x2="100" y2="230" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#1e3a5f" />
          <stop offset="0.5" stopColor="#0d1b2a" />
          <stop offset="1" stopColor="#1b2838" />
        </linearGradient>
        <linearGradient id="wc-gold" x1="100" y1="20" x2="100" y2="140" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ffd700" />
          <stop offset="0.3" stopColor="#ffed4a" />
          <stop offset="0.6" stopColor="#f59e0b" />
          <stop offset="1" stopColor="#b8860b" />
        </linearGradient>
        <linearGradient id="wc-globe" x1="100" y1="45" x2="100" y2="105" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ffd700" />
          <stop offset="0.4" stopColor="#daa520" />
          <stop offset="1" stopColor="#b8860b" />
        </linearGradient>
        <radialGradient id="wc-glow" cx="100" cy="80" r="60" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ffd700" stopOpacity="0.4" />
          <stop offset="1" stopColor="#ffd700" stopOpacity="0" />
        </radialGradient>
        <filter id="wc-shadow">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#ffd700" floodOpacity="0.5" />
        </filter>
        <filter id="wc-glow-filter">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Shield shape */}
      <path d="M100 5 L185 30 L185 130 Q185 190 100 225 Q15 190 15 130 L15 30 Z" fill="url(#wc-shield)" stroke="#2563eb" strokeWidth="2.5" />
      <path d="M100 12 L178 35 L178 128 Q178 184 100 218 Q22 184 22 128 L22 35 Z" fill="none" stroke="#3b82f6" strokeWidth="1" opacity="0.4" />

      {/* Inner glow */}
      <ellipse cx="100" cy="80" rx="55" ry="45" fill="url(#wc-glow)" />

      {/* Laurel wreaths left */}
      <g transform="translate(28, 100)" filter="url(#wc-shadow)">
        {[0, 1, 2, 3, 4, 5, 6].map(i => (
          <ellipse key={`l${i}`} cx="0" cy={i * 14 - 42} rx="7" ry="12" transform={`rotate(-25, 0, ${i * 14 - 42})`} fill="#daa520" opacity={0.9 - i * 0.05} />
        ))}
        {[0, 1, 2, 3, 4, 5, 6].map(i => (
          <ellipse key={`lr${i}`} cx="5" cy={i * 14 - 42} rx="6" ry="10" transform={`rotate(15, 5, ${i * 14 - 42})`} fill="#b8860b" opacity={0.7 - i * 0.03} />
        ))}
      </g>

      {/* Laurel wreaths right */}
      <g transform="translate(172, 100) scale(-1,1)" filter="url(#wc-shadow)">
        {[0, 1, 2, 3, 4, 5, 6].map(i => (
          <ellipse key={`r${i}`} cx="0" cy={i * 14 - 42} rx="7" ry="12" transform={`rotate(-25, 0, ${i * 14 - 42})`} fill="#daa520" opacity={0.9 - i * 0.05} />
        ))}
        {[0, 1, 2, 3, 4, 5, 6].map(i => (
          <ellipse key={`rr${i}`} cx="5" cy={i * 14 - 42} rx="6" ry="10" transform={`rotate(15, 5, ${i * 14 - 42})`} fill="#b8860b" opacity={0.7 - i * 0.03} />
        ))}
      </g>

      {/* Trophy base */}
      <rect x="75" y="128" width="50" height="8" rx="2" fill="url(#wc-gold)" filter="url(#wc-shadow)" />
      <rect x="70" y="134" width="60" height="6" rx="2" fill="#b8860b" />

      {/* Trophy stem */}
      <rect x="93" y="118" width="14" height="14" rx="2" fill="url(#wc-gold)" />
      <rect x="88" y="114" width="24" height="8" rx="3" fill="#daa520" />

      {/* Trophy cup */}
      <path d="M60 55 Q60 115 100 120 Q140 115 140 55 Z" fill="url(#wc-gold)" filter="url(#wc-shadow)" />
      <path d="M65 55 Q65 110 100 115 Q135 110 135 55 Z" fill="none" stroke="#ffed4a" strokeWidth="1" opacity="0.5" />

      {/* Trophy rim */}
      <ellipse cx="100" cy="55" rx="42" ry="8" fill="#daa520" />
      <ellipse cx="100" cy="55" rx="38" ry="6" fill="#f59e0b" />

      {/* Globe on trophy */}
      <circle cx="100" cy="80" r="22" fill="url(#wc-globe)" filter="url(#wc-glow-filter)" />
      <circle cx="100" cy="80" r="22" fill="none" stroke="#ffed4a" strokeWidth="0.8" />
      {/* Globe lines */}
      <ellipse cx="100" cy="80" rx="22" ry="8" fill="none" stroke="#b8860b" strokeWidth="0.7" />
      <ellipse cx="100" cy="80" rx="8" ry="22" fill="none" stroke="#b8860b" strokeWidth="0.7" />
      <line x1="78" y1="80" x2="122" y2="80" stroke="#b8860b" strokeWidth="0.5" />
      <line x1="100" y1="58" x2="100" y2="102" stroke="#b8860b" strokeWidth="0.5" />
      {/* STAnd mark on globe */}
      <text x="100" y="84" textAnchor="middle" fontSize="9" fontWeight="900" fill="#0d1b2a" fontFamily="sans-serif">ST<tspan fill="#06b6d4">A</tspan>nd</text>

      {/* Trophy handles */}
      <path d="M60 60 Q40 65 38 85 Q36 105 55 110" fill="none" stroke="url(#wc-gold)" strokeWidth="5" strokeLinecap="round" />
      <path d="M140 60 Q160 65 162 85 Q164 105 145 110" fill="none" stroke="url(#wc-gold)" strokeWidth="5" strokeLinecap="round" />

      {/* Stars */}
      {[{ x: 55, y: 170 }, { x: 145, y: 170 }, { x: 100, y: 185 }].map((p, i) => (
        <polygon key={i} points={`${p.x},${p.y - 7} ${p.x + 2.5},${p.y - 2} ${p.x + 7},${p.y - 2} ${p.x + 3.5},${p.y + 2} ${p.x + 5},${p.y + 7} ${p.x},${p.y + 3.5} ${p.x - 5},${p.y + 7} ${p.x - 3.5},${p.y + 2} ${p.x - 7},${p.y - 2} ${p.x - 2.5},${p.y - 2}`} fill="#ffd700" />
      ))}

      {/* Text banner */}
      <path d="M30 155 Q100 145 170 155 L170 165 Q100 155 30 165 Z" fill="#0d1b2a" stroke="#2563eb" strokeWidth="1" />
      <text x="100" y="163" textAnchor="middle" fontSize="7.5" fontWeight="800" fill="#06b6d4" fontFamily="sans-serif" letterSpacing="1">ST<tspan fill="#ffffff">A</tspan>nd</text>

      <path d="M25 168 Q100 158 175 168 L175 188 Q100 178 25 188 Z" fill="#0d1b2a" stroke="#ffd700" strokeWidth="1.5" />
      <text x="100" y="180" textAnchor="middle" fontSize="11" fontWeight="900" fill="#ffd700" fontFamily="sans-serif" letterSpacing="0.5">WORLD CUP</text>
      <text x="100" y="190" textAnchor="middle" fontSize="7" fontWeight="700" fill="#f59e0b" fontFamily="sans-serif" letterSpacing="3">★ STYLE ★</text>
    </svg>
  );
}

function ChampionsIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size * 1.15} viewBox="0 0 200 230" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="cl-shield" x1="100" y1="0" x2="100" y2="230" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#1a237e" />
          <stop offset="0.5" stopColor="#0d1442" />
          <stop offset="1" stopColor="#1a1a4e" />
        </linearGradient>
        <linearGradient id="cl-trophy" x1="100" y1="20" x2="100" y2="140" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#60a5fa" />
          <stop offset="0.3" stopColor="#3b82f6" />
          <stop offset="0.7" stopColor="#2563eb" />
          <stop offset="1" stopColor="#1d4ed8" />
        </linearGradient>
        <radialGradient id="cl-glow" cx="100" cy="75" r="55" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#60a5fa" stopOpacity="0.35" />
          <stop offset="1" stopColor="#60a5fa" stopOpacity="0" />
        </radialGradient>
        <filter id="cl-shadow">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#3b82f6" floodOpacity="0.6" />
        </filter>
        <filter id="cl-glow-f">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Shield */}
      <path d="M100 5 L185 30 L185 130 Q185 190 100 225 Q15 190 15 130 L15 30 Z" fill="url(#cl-shield)" stroke="#3b82f6" strokeWidth="2.5" />
      <path d="M100 12 L178 35 L178 128 Q178 184 100 218 Q22 184 22 128 L22 35 Z" fill="none" stroke="#60a5fa" strokeWidth="1" opacity="0.3" />

      {/* Glow */}
      <ellipse cx="100" cy="75" rx="50" ry="40" fill="url(#cl-glow)" />

      {/* Stars background */}
      {[{ x: 35, y: 45 }, { x: 165, y: 45 }, { x: 30, y: 110 }, { x: 170, y: 110 }].map((p, i) => (
        <polygon key={i} points={`${p.x},${p.y - 5} ${p.x + 1.8},${p.y - 1.5} ${p.x + 5},${p.y - 1.5} ${p.x + 2.5},${p.y + 1} ${p.x + 3.5},${p.y + 5} ${p.x},${p.y + 2.5} ${p.x - 3.5},${p.y + 5} ${p.x - 2.5},${p.y + 1} ${p.x - 5},${p.y - 1.5} ${p.x - 1.8},${p.y - 1.5}`} fill="#60a5fa" opacity="0.4" />
      ))}

      {/* Trophy cup - metallic blue */}
      <path d="M62 52 Q62 108 100 115 Q138 108 138 52 Z" fill="url(#cl-trophy)" filter="url(#cl-shadow)" />
      <path d="M67 52 Q67 105 100 112 Q133 105 133 52 Z" fill="none" stroke="#93c5fd" strokeWidth="0.8" opacity="0.4" />

      {/* Trophy rim */}
      <ellipse cx="100" cy="52" rx="40" ry="7" fill="#2563eb" />
      <ellipse cx="100" cy="52" rx="36" ry="5.5" fill="#3b82f6" />

      {/* Starball on trophy */}
      <circle cx="100" cy="78" r="18" fill="#1e40af" stroke="#60a5fa" strokeWidth="1.2" />
      <circle cx="100" cy="78" r="18" fill="none" stroke="#93c5fd" strokeWidth="0.5" opacity="0.5" />
      {/* Star pattern - pentagonal stars */}
      {[0, 72, 144, 216, 288].map((angle, i) => {
        const rad = (angle * Math.PI) / 180;
        const cx = 100 + Math.cos(rad) * 11;
        const cy = 78 + Math.sin(rad) * 11;
        return (
          <polygon key={i} points={`${cx},${cy - 4} ${cx + 1.5},${cy - 1} ${cx + 4},${cy - 1} ${cx + 2},${cy + 1.5} ${cx + 3},${cy + 4} ${cx},${cy + 2} ${cx - 3},${cy + 4} ${cx - 2},${cy + 1.5} ${cx - 4},${cy - 1} ${cx - 1.5},${cy - 1}`} fill="white" />
        );
      })}
      <text x="100" y="82" textAnchor="middle" fontSize="5" fontWeight="700" fill="white" fontFamily="sans-serif">★</text>

      {/* Trophy handles */}
      <path d="M62 56 Q42 60 40 80 Q38 100 56 106" fill="none" stroke="#2563eb" strokeWidth="5" strokeLinecap="round" />
      <path d="M138 56 Q158 60 160 80 Q162 100 144 106" fill="none" stroke="#2563eb" strokeWidth="5" strokeLinecap="round" />

      {/* Trophy stem & base */}
      <rect x="92" y="115" width="16" height="12" rx="2" fill="#2563eb" />
      <rect x="72" y="126" width="56" height="8" rx="3" fill="#1d4ed8" stroke="#3b82f6" strokeWidth="1" />

      {/* Stars row */}
      {[{ x: 55, y: 165 }, { x: 75, y: 160 }, { x: 100, y: 155 }, { x: 125, y: 160 }, { x: 145, y: 165 }].map((p, i) => (
        <polygon key={i} points={`${p.x},${p.y - 4.5} ${p.x + 1.5},${p.y - 1} ${p.x + 4.5},${p.y - 1} ${p.x + 2.2},${p.y + 1.2} ${p.x + 3},${p.y + 4.5} ${p.x},${p.y + 2.5} ${p.x - 3},${p.y + 4.5} ${p.x - 2.2},${p.y + 1.2} ${p.x - 4.5},${p.y - 1} ${p.x - 1.5},${p.y - 1}`} fill="#60a5fa" opacity={0.5 + (i === 2 ? 0.5 : i === 1 || i === 3 ? 0.3 : 0.1)} />
      ))}

      {/* Text */}
      <text x="100" y="180" textAnchor="middle" fontSize="7.5" fontWeight="800" fill="#60a5fa" fontFamily="sans-serif" letterSpacing="1">ST<tspan fill="#ffffff">A</tspan>nd</text>
      <path d="M25 188 Q100 178 175 188 L175 206 Q100 196 25 206 Z" fill="#0d1442" stroke="#3b82f6" strokeWidth="1.5" />
      <text x="100" y="199" textAnchor="middle" fontSize="10" fontWeight="900" fill="#60a5fa" fontFamily="sans-serif" letterSpacing="0.5">CHAMPIONS</text>
      <text x="100" y="209" textAnchor="middle" fontSize="6.5" fontWeight="700" fill="#93c5fd" fontFamily="sans-serif" letterSpacing="3">★ LEAGUE ★</text>
    </svg>
  );
}

function SingleElimIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size * 1.15} viewBox="0 0 200 230" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="se-shield" x1="100" y1="0" x2="100" y2="230" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#2d1b1b" />
          <stop offset="0.5" stopColor="#1a0f0f" />
          <stop offset="1" stopColor="#2d1515" />
        </linearGradient>
        <linearGradient id="se-sword" x1="0" y1="0" x2="1" y2="1" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#e5e7eb" />
          <stop offset="0.5" stopColor="#9ca3af" />
          <stop offset="1" stopColor="#d1d5db" />
        </linearGradient>
        <radialGradient id="se-glow" cx="100" cy="80" r="55" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ef4444" stopOpacity="0.2" />
          <stop offset="1" stopColor="#ef4444" stopOpacity="0" />
        </radialGradient>
        <filter id="se-shadow">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#ef4444" floodOpacity="0.5" />
        </filter>
      </defs>

      {/* Shield */}
      <path d="M100 5 L185 30 L185 130 Q185 190 100 225 Q15 190 15 130 L15 30 Z" fill="url(#se-shield)" stroke="#dc2626" strokeWidth="2.5" />
      <path d="M100 12 L178 35 L178 128 Q178 184 100 218 Q22 184 22 128 L22 35 Z" fill="none" stroke="#ef4444" strokeWidth="1" opacity="0.3" />

      {/* Glow */}
      <ellipse cx="100" cy="80" rx="50" ry="40" fill="url(#se-glow)" />

      {/* Bracket lines */}
      <g stroke="#4b5563" strokeWidth="1.5" opacity="0.4">
        <line x1="30" y1="50" x2="55" y2="50" />
        <line x1="55" y1="50" x2="55" y2="75" />
        <line x1="55" y1="75" x2="80" y2="75" />
        <line x1="30" y1="105" x2="55" y2="105" />
        <line x1="55" y1="105" x2="55" y2="80" />
        <line x1="80" y1="75" x2="80" y2="90" />
        <line x1="120" y1="75" x2="145" y2="75" />
        <line x1="145" y1="75" x2="145" y2="50" />
        <line x1="145" y1="50" x2="170" y2="50" />
        <line x1="120" y1="80" x2="120" y2="75" />
        <line x1="145" y1="105" x2="145" y2="80" />
        <line x1="145" y1="105" x2="170" y2="105" />
      </g>

      {/* Small trophy at top */}
      <g transform="translate(100, 40) scale(0.4)">
        <path d="M-20 -40 Q-20 10 0 15 Q20 10 20 -40 Z" fill="#9ca3af" />
        <ellipse cx="0" cy="-40" rx="22" ry="5" fill="#6b7280" />
      </g>

      {/* Crossed swords */}
      {/* Sword 1 - left to right */}
      <g filter="url(#se-shadow)">
        <line x1="45" y1="130" x2="155" y2="60" stroke="url(#se-sword)" strokeWidth="4" strokeLinecap="round" />
        <polygon points="155,55 165,50 158,63" fill="#d1d5db" />
        <rect x="42" y="126" width="12" height="4" rx="1" fill="#b45309" transform="rotate(-35, 48, 128)" />
        <rect x="40" y="128" width="14" height="6" rx="1" fill="#92400e" transform="rotate(-35, 47, 131)" />
      </g>

      {/* Sword 2 - right to left */}
      <g filter="url(#se-shadow)">
        <line x1="155" y1="130" x2="45" y2="60" stroke="url(#se-sword)" strokeWidth="4" strokeLinecap="round" />
        <polygon points="45,55 35,50 42,63" fill="#d1d5db" />
        <rect x="146" y="126" width="12" height="4" rx="1" fill="#b45309" transform="rotate(35, 152, 128)" />
        <rect x="146" y="128" width="14" height="6" rx="1" fill="#92400e" transform="rotate(35, 153, 131)" />
      </g>

      {/* Skull */}
      <g transform="translate(100, 165)">
        <ellipse cx="0" cy="0" rx="14" ry="16" fill="#d1d5db" />
        <ellipse cx="0" cy="-2" rx="12" ry="13" fill="#e5e7eb" />
        <ellipse cx="-5" cy="-4" rx="3.5" ry="4" fill="#1a0f0f" />
        <ellipse cx="5" cy="-4" rx="3.5" ry="4" fill="#1a0f0f" />
        <ellipse cx="0" cy="3" rx="2" ry="2.5" fill="#1a0f0f" />
        <rect x="-8" y="8" width="16" height="5" rx="1" fill="#d1d5db" />
        <line x1="-5" y1="8" x2="-5" y2="13" stroke="#1a0f0f" strokeWidth="1" />
        <line x1="0" y1="8" x2="0" y2="13" stroke="#1a0f0f" strokeWidth="1" />
        <line x1="5" y1="8" x2="5" y2="13" stroke="#1a0f0f" strokeWidth="1" />
      </g>

      {/* Text */}
      <text x="100" y="198" textAnchor="middle" fontSize="7.5" fontWeight="800" fill="#ef4444" fontFamily="sans-serif" letterSpacing="1">ST<tspan fill="#ffffff">A</tspan>nd</text>
      <path d="M25 205 Q100 196 175 205 L175 218 Q100 209 25 218 Z" fill="#1a0f0f" stroke="#dc2626" strokeWidth="1.5" />
      <text x="100" y="213" textAnchor="middle" fontSize="9" fontWeight="900" fill="#f87171" fontFamily="sans-serif">SINGLE</text>
      <text x="100" y="223" textAnchor="middle" fontSize="7.5" fontWeight="800" fill="#ef4444" fontFamily="sans-serif" letterSpacing="1">ELIMINATION</text>
    </svg>
  );
}

function LeagueIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size * 1.15} viewBox="0 0 200 230" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="lg-shield" x1="100" y1="0" x2="100" y2="230" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#1e3a5f" />
          <stop offset="0.5" stopColor="#0d1b2a" />
          <stop offset="1" stopColor="#1b2838" />
        </linearGradient>
        <linearGradient id="lg-gold" x1="100" y1="20" x2="100" y2="150" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ffd700" />
          <stop offset="0.3" stopColor="#ffed4a" />
          <stop offset="0.7" stopColor="#f59e0b" />
          <stop offset="1" stopColor="#b8860b" />
        </linearGradient>
        <radialGradient id="lg-glow" cx="100" cy="90" r="55" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ffd700" stopOpacity="0.2" />
          <stop offset="1" stopColor="#ffd700" stopOpacity="0" />
        </radialGradient>
        <filter id="lg-shadow">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#ffd700" floodOpacity="0.5" />
        </filter>
      </defs>

      {/* Shield */}
      <path d="M100 5 L185 30 L185 130 Q185 190 100 225 Q15 190 15 130 L15 30 Z" fill="url(#lg-shield)" stroke="#2563eb" strokeWidth="2.5" />
      <path d="M100 12 L178 35 L178 128 Q178 184 100 218 Q22 184 22 128 L22 35 Z" fill="none" stroke="#3b82f6" strokeWidth="1" opacity="0.3" />

      {/* Glow */}
      <ellipse cx="100" cy="90" rx="50" ry="40" fill="url(#lg-glow)" />

      {/* Laurel wreaths left */}
      <g transform="translate(30, 105)" filter="url(#lg-shadow)">
        {[0, 1, 2, 3, 4, 5, 6].map(i => (
          <ellipse key={`ll${i}`} cx="0" cy={i * 13 - 39} rx="6" ry="10" transform={`rotate(-25, 0, ${i * 13 - 39})`} fill="#daa520" opacity={0.85 - i * 0.04} />
        ))}
      </g>

      {/* Laurel wreaths right */}
      <g transform="translate(170, 105) scale(-1,1)" filter="url(#lg-shadow)">
        {[0, 1, 2, 3, 4, 5, 6].map(i => (
          <ellipse key={`lr${i}`} cx="0" cy={i * 13 - 39} rx="6" ry="10" transform={`rotate(-25, 0, ${i * 13 - 39})`} fill="#daa520" opacity={0.85 - i * 0.04} />
        ))}
      </g>

      {/* Crown */}
      <g transform="translate(100, 42)" filter="url(#lg-shadow)">
        <path d="M-30 15 L-25 -15 L-12 5 L0 -20 L12 5 L25 -15 L30 15 Z" fill="url(#lg-gold)" />
        <rect x="-30" y="12" width="60" height="8" rx="2" fill="#daa520" />
        <circle cx="-25" cy="-12" r="3" fill="#60a5fa" />
        <circle cx="0" cy="-17" r="3.5" fill="#60a5fa" />
        <circle cx="25" cy="-12" r="3" fill="#60a5fa" />
      </g>

      {/* People silhouettes */}
      <g transform="translate(100, 95)">
        {/* Center person */}
        <circle cx="0" cy="-15" r="10" fill="#daa520" />
        <ellipse cx="0" cy="10" rx="14" ry="12" fill="#daa520" />
        {/* Left person */}
        <circle cx="-30" cy="-10" r="8" fill="#b8860b" opacity="0.8" />
        <ellipse cx="-30" cy="10" rx="11" ry="10" fill="#b8860b" opacity="0.8" />
        {/* Right person */}
        <circle cx="30" cy="-10" r="8" fill="#b8860b" opacity="0.8" />
        <ellipse cx="30" cy="10" rx="11" ry="10" fill="#b8860b" opacity="0.8" />
      </g>

      {/* Star */}
      <polygon points="100,145 103,152 111,152 105,157 107,165 100,160 93,165 95,157 89,152 97,152" fill="#ffd700" />

      {/* Text */}
      <text x="100" y="180" textAnchor="middle" fontSize="7.5" fontWeight="800" fill="#ffd700" fontFamily="sans-serif" letterSpacing="1">ST<tspan fill="#ffffff">A</tspan>nd</text>
      <path d="M25 188 Q100 178 175 188 L175 206 Q100 196 25 206 Z" fill="#0d1b2a" stroke="#ffd700" strokeWidth="1.5" />
      <text x="100" y="200" textAnchor="middle" fontSize="12" fontWeight="900" fill="#ffd700" fontFamily="sans-serif" letterSpacing="1">LEAGUE</text>
    </svg>
  );
}

function SurvivalIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size * 1.15} viewBox="0 0 200 230" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="sv-shield" x1="100" y1="0" x2="100" y2="230" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#0a2e1a" />
          <stop offset="0.5" stopColor="#061a0e" />
          <stop offset="1" stopColor="#0d2818" />
        </linearGradient>
        <radialGradient id="sv-glow" cx="100" cy="85" r="60" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#22c55e" stopOpacity="0.3" />
          <stop offset="1" stopColor="#22c55e" stopOpacity="0" />
        </radialGradient>
        <filter id="sv-shadow">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#22c55e" floodOpacity="0.6" />
        </filter>
        <filter id="sv-glow-f">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Shield */}
      <path d="M100 5 L185 30 L185 130 Q185 190 100 225 Q15 190 15 130 L15 30 Z" fill="url(#sv-shield)" stroke="#22c55e" strokeWidth="2.5" />
      <path d="M100 12 L178 35 L178 128 Q178 184 100 218 Q22 184 22 128 L22 35 Z" fill="none" stroke="#4ade80" strokeWidth="1" opacity="0.3" />

      {/* Glow */}
      <ellipse cx="100" cy="85" rx="55" ry="45" fill="url(#sv-glow)" />

      {/* Energy waves */}
      {[40, 55, 70].map((r, i) => (
        <circle key={i} cx="100" cy="80" r={r} fill="none" stroke="#22c55e" strokeWidth="0.8" opacity={0.15 - i * 0.04} />
      ))}

      {/* Hooded figure */}
      <g transform="translate(100, 85)" filter="url(#sv-shadow)">
        {/* Hood */}
        <path d="M0 -55 Q-35 -50 -38 -15 Q-40 5 -30 20 L-20 15 Q-15 0 -15 -15 Q-15 -30 0 -35 Q15 -30 15 -15 Q15 0 -20 15 L-30 20 Q-40 5 -38 -15 Q-35 -50 0 -55" fill="#166534" />
        <path d="M0 -55 Q35 -50 38 -15 Q40 5 30 20 L20 15 Q15 0 15 -15 Q15 -30 0 -35" fill="#15803d" opacity="0.8" />

        {/* Face shadow */}
        <ellipse cx="0" cy="-8" rx="18" ry="22" fill="#061a0e" />

        {/* Glowing eyes */}
        <ellipse cx="-7" cy="-12" rx="4" ry="2.5" fill="#22c55e" filter="url(#sv-glow-f)" />
        <ellipse cx="7" cy="-12" rx="4" ry="2.5" fill="#22c55e" filter="url(#sv-glow-f)" />
        <ellipse cx="-7" cy="-12" rx="2" ry="1.5" fill="#86efac" />
        <ellipse cx="7" cy="-12" rx="2" ry="1.5" fill="#86efac" />

        {/* Body/robe */}
        <path d="M-25 15 Q-35 45 -28 70 L28 70 Q35 45 25 15 Z" fill="#166534" />
        <path d="M-20 15 Q-28 40 -22 65 L22 65 Q28 40 20 15 Z" fill="#15803d" opacity="0.5" />
      </g>

      {/* Crown */}
      <g transform="translate(100, 28)" filter="url(#sv-shadow)">
        <path d="M-18 8 L-14 -5 L-7 3 L0 -8 L7 3 L14 -5 L18 8 Z" fill="#22c55e" />
        <rect x="-18" y="6" width="36" height="5" rx="1.5" fill="#16a34a" />
      </g>

      {/* Hourglass */}
      <g transform="translate(100, 170)" filter="url(#sv-shadow)">
        <rect x="-12" y="-12" width="24" height="3" rx="1" fill="#22c55e" />
        <rect x="-12" y="9" width="24" height="3" rx="1" fill="#22c55e" />
        <path d="M-10 -9 Q-4 0 -10 9 L10 9 Q4 0 10 -9 Z" fill="#061a0e" stroke="#22c55e" strokeWidth="1" />
        {/* Sand */}
        <path d="M-6 -6 Q-2 0 -6 6 L6 6 Q2 0 6 -6 Z" fill="#22c55e" opacity="0.3" />
        <path d="M-4 3 Q0 0 4 3 L6 6 L-6 6 Z" fill="#22c55e" opacity="0.5" />
        {/* Sand particles */}
        {[{ x: -2, y: 5 }, { x: 1, y: 4 }, { x: -1, y: 6 }].map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="0.8" fill="#86efac" />
        ))}
      </g>

      {/* Text */}
      <path d="M25 200 Q100 190 175 200 L175 218 Q100 208 25 218 Z" fill="#061a0e" stroke="#22c55e" strokeWidth="1.5" />
      <text x="100" y="212" textAnchor="middle" fontSize="12" fontWeight="900" fill="#22c55e" fontFamily="sans-serif" letterSpacing="1">SURVIVAL</text>
    </svg>
  );
}

function DoubleElimIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size * 1.15} viewBox="0 0 200 230" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="de-shield" x1="100" y1="0" x2="100" y2="230" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#2d1560" />
          <stop offset="0.5" stopColor="#1a0d3a" />
          <stop offset="1" stopColor="#261450" />
        </linearGradient>
        <linearGradient id="de-blue" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#60a5fa" />
          <stop offset="1" stopColor="#3b82f6" />
        </linearGradient>
        <linearGradient id="de-purple" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#c084fc" />
          <stop offset="1" stopColor="#a855f7" />
        </linearGradient>
        <radialGradient id="de-glow" cx="100" cy="80" r="55" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#a855f7" stopOpacity="0.2" />
          <stop offset="1" stopColor="#a855f7" stopOpacity="0" />
        </radialGradient>
        <filter id="de-shadow">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#a855f7" floodOpacity="0.5" />
        </filter>
      </defs>

      {/* Shield */}
      <path d="M100 5 L185 30 L185 130 Q185 190 100 225 Q15 190 15 130 L15 30 Z" fill="url(#de-shield)" stroke="#a855f7" strokeWidth="2.5" />
      <path d="M100 12 L178 35 L178 128 Q178 184 100 218 Q22 184 22 128 L22 35 Z" fill="none" stroke="#c084fc" strokeWidth="1" opacity="0.3" />

      {/* Glow */}
      <ellipse cx="100" cy="80" rx="50" ry="40" fill="url(#de-glow)" />

      {/* Bracket lines */}
      <g stroke="#6b7280" strokeWidth="1.2" opacity="0.3">
        <line x1="25" y1="45" x2="45" y2="45" />
        <line x1="45" y1="45" x2="45" y2="65" />
        <line x1="45" y1="65" x2="65" y2="65" />
        <line x1="25" y1="95" x2="45" y2="95" />
        <line x1="45" y1="95" x2="45" y2="70" />
        <line x1="65" y1="65" x2="65" y2="80" />
        <line x1="135" y1="65" x2="155" y2="65" />
        <line x1="155" y1="65" x2="155" y2="45" />
        <line x1="155" y1="45" x2="175" y2="45" />
        <line x1="135" y1="70" x2="135" y2="65" />
        <line x1="155" y1="95" x2="155" y2="70" />
        <line x1="155" y1="95" x2="175" y2="95" />
      </g>

      {/* Trophy at top */}
      <g transform="translate(100, 38) scale(0.35)">
        <path d="M-20 -45 Q-20 5 0 10 Q20 5 20 -45 Z" fill="#c084fc" />
        <ellipse cx="0" cy="-45" rx="22" ry="5" fill="#a855f7" />
      </g>

      {/* Blue wolf (left) */}
      <g transform="translate(65, 85)" filter="url(#de-shadow)">
        {/* Head */}
        <ellipse cx="0" cy="-5" rx="20" ry="18" fill="#1e40af" />
        {/* Snout */}
        <ellipse cx="12" cy="2" rx="10" ry="7" fill="#2563eb" />
        <ellipse cx="16" cy="0" rx="3" ry="2" fill="#1e3a5f" />
        {/* Ears */}
        <polygon points="-12,-20 -8,-35 -2,-18" fill="#3b82f6" />
        <polygon points="5,-22 10,-38 15,-20" fill="#3b82f6" />
        <polygon points="-10,-22 -7,-32 -4,-19" fill="#60a5fa" opacity="0.5" />
        <polygon points="7,-24 10,-34 13,-21" fill="#60a5fa" opacity="0.5" />
        {/* Eye */}
        <ellipse cx="-2" cy="-8" rx="4" ry="3" fill="#60a5fa" />
        <ellipse cx="-1" cy="-8" rx="2" ry="2" fill="white" />
        {/* Body */}
        <ellipse cx="-5" cy="18" rx="16" ry="14" fill="#1e40af" />
        {/* Legs */}
        <rect x="-15" y="28" width="6" height="10" rx="2" fill="#2563eb" />
        <rect x="-3" y="28" width="6" height="10" rx="2" fill="#2563eb" />
        {/* Tail */}
        <path d="M-18 10 Q-30 5 -25 -5" fill="none" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" />
      </g>

      {/* Purple wolf (right) */}
      <g transform="translate(135, 85) scale(-1,1)" filter="url(#de-shadow)">
        {/* Head */}
        <ellipse cx="0" cy="-5" rx="20" ry="18" fill="#7e22ce" />
        {/* Snout */}
        <ellipse cx="12" cy="2" rx="10" ry="7" fill="#9333ea" />
        <ellipse cx="16" cy="0" rx="3" ry="2" fill="#4a1d7a" />
        {/* Ears */}
        <polygon points="-12,-20 -8,-35 -2,-18" fill="#a855f7" />
        <polygon points="5,-22 10,-38 15,-20" fill="#a855f7" />
        <polygon points="-10,-22 -7,-32 -4,-19" fill="#c084fc" opacity="0.5" />
        <polygon points="7,-24 10,-34 13,-21" fill="#c084fc" opacity="0.5" />
        {/* Eye */}
        <ellipse cx="-2" cy="-8" rx="4" ry="3" fill="#c084fc" />
        <ellipse cx="-1" cy="-8" rx="2" ry="2" fill="white" />
        {/* Body */}
        <ellipse cx="-5" cy="18" rx="16" ry="14" fill="#7e22ce" />
        {/* Legs */}
        <rect x="-15" y="28" width="6" height="10" rx="2" fill="#9333ea" />
        <rect x="-3" y="28" width="6" height="10" rx="2" fill="#9333ea" />
        {/* Tail */}
        <path d="M-18 10 Q-30 5 -25 -5" fill="none" stroke="#a855f7" strokeWidth="3" strokeLinecap="round" />
      </g>

      {/* Infinity symbol */}
      <g transform="translate(100, 162)">
        <path d="M0 0 Q-12 -10 -18 0 Q-12 10 0 0 Q12 -10 18 0 Q12 10 0 0" fill="none" stroke="#c084fc" strokeWidth="2.5" />
        <path d="M0 0 Q-12 -10 -18 0 Q-12 10 0 0 Q12 -10 18 0 Q12 10 0 0" fill="none" stroke="#e9d5ff" strokeWidth="1" opacity="0.4" />
      </g>

      {/* Text */}
      <text x="100" y="180" textAnchor="middle" fontSize="7.5" fontWeight="800" fill="#c084fc" fontFamily="sans-serif" letterSpacing="1">ST<tspan fill="#ffffff">A</tspan>nd</text>
      <path d="M20 188 Q100 178 180 188 L180 206 Q100 196 20 206 Z" fill="#1a0d3a" stroke="#a855f7" strokeWidth="1.5" />
      <text x="100" y="199" textAnchor="middle" fontSize="8.5" fontWeight="900" fill="#c084fc" fontFamily="sans-serif">DOUBLE</text>
      <text x="100" y="210" textAnchor="middle" fontSize="7" fontWeight="800" fill="#a855f7" fontFamily="sans-serif" letterSpacing="1">ELIMINATION</text>
    </svg>
  );
}
