import { useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';

const FAQ_DATA = [
  {
    q: "What is STand?",
    a: "STand is an AI-powered exam preparation platform designed to help students master any subject through intelligent practice, real-time collaboration, and personalized learning. It generates unlimited, curriculum-specific questions tailored to your education level."
  },
  {
    q: "How does AI question generation work?",
    a: "STand uses advanced AI to analyze your selected topic, subject, and education level. It generates exam questions that adapt to your difficulty preference, covering multiple choice, theory, true/false, fill-in-the-blank, and matching formats."
  },
  {
    q: "What subjects are supported?",
    a: "STand supports 16+ subjects across all education levels, from PRIMARY/BASIC to SSS/WAEC/JAMB/NECO/BECE. Topics include Mathematics, Sciences, English, Social Studies, and more."
  },
  {
    q: "Can I import my own questions?",
    a: "Yes! STand's Document Quiz feature lets you upload PDFs, DOCX, or TXT files and instantly generates practice questions from your document content."
  },
  {
    q: "Is STand free?",
    a: "STand offers free access to core features including AI question generation and practice sessions. Premium features may be available for advanced functionality."
  },
  {
    q: "What exam systems does STand support?",
    a: "STand is designed for WAEC, NECO, JAMB, BECE, and any professional certification. It generates questions aligned with specific curricula and difficulty levels."
  },
  {
    q: "How does the exam simulation work?",
    a: "The Exam Sim feature creates a full timed exam experience with strict rules — no going back, auto-submit on expiry, and real exam pressure. Perfect for building confidence before actual exams."
  },
  {
    q: "What is FenBot AI Tutor?",
    a: "FenBot is your personal AI tutor with streaming responses, voice input, text-to-speech, and conversation history. It adapts to your learning pace and speaks your language."
  },
  {
    q: "Does STand work on mobile?",
    a: "Yes! STand is fully responsive and works on all devices. The mobile-optimized interface includes dedicated mobile dashboards for teachers and students."
  },
  {
    q: "How is my progress tracked?",
    a: "STand tracks accuracy, streaks, subjects covered, and improvement over time with visual charts and stats. Weak areas are automatically identified for targeted practice."
  },
  {
    q: "Can I study with friends?",
    a: "Yes! Create or join study groups, challenge friends in multiplayer quiz battles, and share progress through the social feed."
  },
  {
    q: "How many languages does STand support?",
    a: "STand supports 10 languages: English, French, Arabic, Spanish, Portuguese, Swahili, Hindi, Chinese, Japanese, and Korean."
  },
  {
    q: "What question types are available?",
    a: "STand supports 6+ question types: Multiple Choice (MCQ), True/False, Theory/Open-ended, Fill-in-the-blank, Matching, and Mixed formats."
  },
  {
    q: "Is my data secure?",
    a: "Yes. STand uses Firebase for secure authentication and data storage. Full privacy controls let you manage who sees your profile, last seen, status, and activity."
  },
];

export default function FaqScreen() {
  const { t } = useLanguage();
  const [openId, setOpenId] = useState<number | null>(null);

  useEffect(() => {
    const faqSchema = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": FAQ_DATA.map((item) => ({
        "@type": "Question",
        "name": item.q,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": item.a
        }
      }))
    };
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(faqSchema);
    document.head.appendChild(script);
    return () => { document.head.removeChild(script); };
  }, []);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-2">
        {t('Frequently Asked Questions')}
      </h1>
      <p className="text-gray-500 dark:text-gray-400 mb-8">
        Find answers to common questions about STand.
      </p>

      <div className="space-y-4">
        {FAQ_DATA.map((item, idx) => (
          <div key={idx} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
            <button
              onClick={() => setOpenId(openId === idx ? null : idx)}
              className="w-full flex items-center justify-between p-5 text-left hover:bg-gray-50 dark:hover:bg-gray-750 transition"
            >
              <span className="font-semibold text-gray-800 dark:text-gray-200">{item.q}</span>
              <span className="text-gray-400 text-sm">{openId === idx ? '−' : '+'}</span>
            </button>
            {openId === idx && (
              <div className="px-5 pb-5 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                {item.a}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
