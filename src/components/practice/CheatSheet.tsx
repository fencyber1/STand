import { X, BookOpen } from 'lucide-react';

interface Props {
  subject: string;
  topic: string;
  onClose: () => void;
}

const CHEAT_SHEETS: Record<string, Record<string, string[]>> = {
  default: {
    'Study Tips': [
      'Active Recall: Test yourself instead of re-reading',
      'Spaced Repetition: Review at increasing intervals',
      'Pomodoro: 25 min focus, 5 min break',
      'Feynman Technique: Explain in simple terms',
    ],
    'Test Taking': [
      'Read all options before answering',
      'Eliminate obviously wrong answers first',
      'Watch for absolute words: always, never, all',
      'Manage your time — don\'t stuck on one question',
    ],
  },
  Mathematics: {
    'Algebra': [
      'a² - b² = (a+b)(a-b)',
      '(a+b)² = a² + 2ab + b²',
      'Quadratic: x = (-b ± √(b²-4ac)) / 2a',
      'Log rules: log(a*b) = log(a) + log(b)',
    ],
    'Calculus': [
      'd/dx(xⁿ) = nxⁿ⁻¹',
      '∫xⁿdx = xⁿ⁺¹/(n+1) + C',
      'Chain Rule: d/dx[f(g(x))] = f\'(g(x))·g\'(x)',
      'Product Rule: (fg)\' = f\'g + fg\'',
    ],
    'Geometry': [
      'Circle area: πr²',
      'Triangle area: ½bh',
      'Pythagorean: a² + b² = c²',
      'Sphere volume: (4/3)πr³',
    ],
  },
  Science: {
    'Physics': [
      'F = ma (Newton\'s 2nd Law)',
      'E = mc² (Mass-energy equivalence)',
      'V = IR (Ohm\'s Law)',
      'KE = ½mv²',
    ],
    'Chemistry': [
      'pH = -log[H⁺]',
      'PV = nRT (Ideal Gas Law)',
      'Molarity = moles / liters',
      'pH + pOH = 14',
    ],
    'Biology': [
      'DNA → RNA → Protein (Central Dogma)',
      'ATP = Adenosine Triphosphate (energy)',
      'Mitochondria = Powerhouse of cell',
      'Photosynthesis: 6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂',
    ],
  },
  'Computer Science': {
    'Programming': [
      'Big O: O(1) < O(log n) < O(n) < O(n²)',
      'Recursion = Base case + Recursive case',
      'DRY = Don\'t Repeat Yourself',
      'KISS = Keep It Simple, Stupid',
    ],
    'Data Structures': [
      'Array: O(1) access, O(n) insert',
      'Linked List: O(n) access, O(1) insert',
      'Stack: LIFO (Last In, First Out)',
      'Queue: FIFO (First In, First Out)',
    ],
  },
  Language: {
    'Grammar': [
      'Subject + Verb + Object (SVO)',
      'Noun: person, place, thing, idea',
      'Verb: action word',
      'Adjective: describes a noun',
    ],
    'Writing': [
      'Introduction → Body → Conclusion',
      'Topic sentence → Evidence → Analysis',
      'Avoid passive voice when possible',
      'Vary sentence length for rhythm',
    ],
  },
};

export default function CheatSheet({ subject, topic, onClose }: Props) {
  const subjectKey = Object.keys(CHEAT_SHEETS).find(
    (k) => subject.toLowerCase().includes(k.toLowerCase())
  ) || 'default';

  const sheets = CHEAT_SHEETS[subjectKey] || CHEAT_SHEETS['default'];

  return (
    <div className="fixed bottom-20 left-4 z-50 w-80 max-h-96 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col">
      <div className="flex items-center justify-between px-3 py-2 bg-gray-100 dark:bg-gray-700 shrink-0">
        <div className="flex items-center gap-1.5">
          <BookOpen size={14} className="text-green-600 dark:text-green-400" />
          <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Cheat Sheet</span>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
          <X size={14} />
        </button>
      </div>
      <div className="p-3 overflow-y-auto flex-1">
        {Object.entries(sheets).map(([section, items]) => (
          <div key={section} className="mb-3 last:mb-0">
            <h4 className="text-xs font-bold text-primary-600 dark:text-primary-400 mb-1.5 uppercase tracking-wide">{section}</h4>
            <ul className="space-y-1">
              {items.map((item, i) => (
                <li key={i} className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed pl-3 relative before:content-['•'] before:absolute before:left-0 before:text-primary-400">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
