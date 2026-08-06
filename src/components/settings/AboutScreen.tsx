import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  ArrowLeft, GraduationCap, Brain, BookOpen, Shield, Users, MessageSquare,
  Target, Clock, Trophy, Globe, Sparkles, Zap, FileText, Swords, Calendar,
  Bell, Palette, Lock, Star, Heart, TrendingUp,
} from 'lucide-react';

const FEATURES = [
  { icon: Brain, title: 'AI-Powered Questions', desc: 'Generate unlimited exam questions on any subject using advanced AI. Questions adapt to your level and difficulty preference.' },
  { icon: FileText, title: 'Document Quiz', desc: 'Upload any document — PDF, DOCX, or TXT — and instantly generate practice questions from its content.' },
  { icon: Shield, title: 'Exam Simulation', desc: 'Full timed exam experience with strict rules. No going back, auto-submit, and real exam pressure.' },
  { icon: Clock, title: 'Speed Round', desc: 'Test your quick-thinking with 30-second-per-question challenges. Race against the clock.' },
  { icon: Target, title: 'Weak Areas Trainer', desc: 'AI analyzes your history to identify topics where you struggle, then generates targeted practice questions.' },
  { icon: BookOpen, title: 'Deep Explanations', desc: 'Get detailed, AI-powered breakdowns for any question. Understand the "why" behind every answer.' },
  { icon: Trophy, title: 'Achievements & Badges', desc: 'Earn 17+ unique badges as you study. Track milestones and celebrate your progress.' },
  { icon: TrendingUp, title: 'Progress Tracking', desc: 'Visual charts and stats showing your accuracy, streaks, subjects covered, and improvement over time.' },
  { icon: Users, title: 'Study Groups', desc: 'Create or join study groups with friends. Share progress, compete, and learn together.' },
  { icon: Swords, title: 'Multiplayer Quiz', desc: 'Challenge friends head-to-head in real-time quiz battles. See who knows more.' },
  { icon: MessageSquare, title: 'Real-Time Chat', desc: '1-on-1 and group messaging with themes, voice messages, emoji, file sharing, and read receipts.' },
  { icon: Globe, title: 'Social Feed', desc: 'Share study posts, like, comment, and repost. Stay motivated with your study community.' },
  { icon: Sparkles, title: 'Status Updates', desc: 'Share WhatsApp-style status updates with custom fonts, colors, and 24-hour expiry.' },
  { icon: Bell, title: 'Smart Notifications', desc: 'Real-time alerts for friend requests, messages, group activity, and achievement unlocks.' },
  { icon: Palette, title: 'Custom Themes', desc: 'Choose from 9+ chat themes, set custom wallpapers, and personalize your experience.' },
  { icon: Lock, title: 'Privacy Controls', desc: 'Full control over who sees your last seen, profile photo, bio, status, and who can add you to groups.' },
  { icon: Globe, title: 'Multi-Language', desc: 'Supports 10 languages — English, French, Arabic, Spanish, Portuguese, Swahili, Hindi, Chinese, Japanese, Korean.' },
  { icon: Zap, title: 'FenBot AI Tutor', desc: 'Your personal AI tutor with streaming responses, voice input, text-to-speech, and conversation history.' },
];

const STATS = [
  { label: 'Question Types', value: '6+' },
  { label: 'Languages', value: '10' },
  { label: 'Chat Themes', value: '9+' },
  { label: 'Achievements', value: '17+' },
  { label: 'Subjects', value: '16+' },
  { label: 'Education Levels', value: '6' },
];

export default function AboutScreen() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <div className="max-w-2xl mx-auto px-4 space-y-8 pb-12">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/settings')} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition">
          <ArrowLeft size={20} className="text-gray-600 dark:text-gray-300" />
        </button>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{t('About')}</h1>
      </div>

      {/* Hero */}
      <div className="bg-gradient-to-br from-primary-600 via-primary-700 to-indigo-800 rounded-2xl p-8 text-white text-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-40 h-40 bg-white rounded-full -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-60 h-60 bg-white rounded-full translate-x-1/3 translate-y-1/3" />
        </div>
        <div className="relative z-10">
          <GraduationCap size={48} className="mx-auto mb-4 opacity-90" />
          <h2 className="text-3xl font-extrabold mb-2">STand</h2>
          <p className="text-white/80 text-sm font-medium">Exam Practice Platform</p>
          <p className="text-white/60 text-xs mt-1">Version 1.0</p>
        </div>
      </div>

      {/* Description */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-3">{t('What is STand?')}</h3>
        <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
          <p>
            <strong className="text-gray-800 dark:text-gray-200">STand</strong> is an all-in-one AI-powered exam preparation platform designed to help students master any subject through intelligent practice, real-time collaboration, and personalized learning.
          </p>
          <p>
            Whether you're preparing for WAEC, NECO, JAMB, BECE, or any professional certification, STand generates unlimited, curriculum-specific questions tailored to your education level and difficulty preference.
          </p>
          <p>
            Beyond practice, STand is a complete study ecosystem — featuring real-time chat, study groups, multiplayer quizzes, a social feed, and an AI tutor (FenBot) that speaks your language and adapts to your learning pace.
          </p>
          <p>
            Built with support for 10 languages and 6 education levels, STand makes quality exam preparation accessible to students everywhere — from primary school to professional certification.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {STATS.map(({ label, value }) => (
          <div key={label} className="bg-white dark:bg-gray-800 rounded-xl p-4 text-center shadow-sm border border-gray-100 dark:border-gray-700">
            <p className="text-2xl font-extrabold text-primary-600 dark:text-primary-400">{value}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Features */}
      <div>
        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4">{t('Features')}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 hover:border-primary-200 dark:hover:border-primary-800 transition-colors">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-[1.5px_1.5px_4px_rgba(0,0,0,0.07),-1.5px_-1.5px_4px_rgba(255,255,255,0.9)] dark:shadow-[1.5px_1.5px_4px_rgba(0,0,0,0.25),-1.5px_-1.5px_4px_rgba(255,255,255,0.05)] bg-gray-100 dark:bg-gray-700">
                  <Icon size={17} className="text-primary-600 dark:text-primary-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{title}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">{desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* How to Use */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4">{t('How to Use')}</h3>
        <div className="space-y-4">
          {[
            { step: '1', title: 'Sign Up & Set Your Profile', desc: 'Create an account, set your display name, bio, and education level. This personalizes your experience.' },
            { step: '2', title: 'Start Practicing', desc: 'Go to Practice, pick a subject and topic, choose question type and difficulty, and generate questions.' },
            { step: '3', title: 'Take Exam Simulations', desc: 'Use Exam Sim for a timed, exam-like experience. Great for building speed and exam readiness.' },
            { step: '4', title: 'Review & Learn', desc: 'Check your results, read explanations, dive into Deep Explanations, and review wrong answers.' },
            { step: '5', title: 'Join the Community', desc: 'Add friends, join study groups, chat, share posts on the feed, and challenge friends to multiplayer quizzes.' },
            { step: '6', title: 'Ask FenBot', desc: 'Use the AI tutor for instant help on any topic. It streams responses, speaks aloud, and remembers your conversations.' },
          ].map(({ step, title, desc }) => (
            <div key={step} className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center shrink-0">
                <span className="text-sm font-bold text-primary-600 dark:text-primary-400">{step}</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{title}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Education Levels */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4">{t('Supported Education Levels')}</h3>
        <div className="grid grid-cols-2 gap-2">
          {[
            'Primary / Basic',
            'JSS / BECE',
            'SSS / WAEC',
            'SSS / NECO',
            'University / JAMB',
            'Professional / Certification',
          ].map((level) => (
            <div key={level} className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <Star size={12} className="text-primary-500 shrink-0" />
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{level}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Subjects */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4">{t('Supported Subjects')}</h3>
        <div className="flex flex-wrap gap-2">
          {[
            'Mathematics', 'English Language', 'Biology', 'Chemistry', 'Physics',
            'Computer Science', 'Economics', 'Government', 'Literature', 'Geography',
            'History', 'Civic Education', 'Commerce', 'Accounting', 'General Science',
          ].map((subj) => (
            <span key={subj} className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-full text-xs font-medium text-gray-600 dark:text-gray-400">
              {subj}
            </span>
          ))}
        </div>
      </div>

      {/* Founder */}
      <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl p-6 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500 rounded-full opacity-5 -translate-x-1/4 translate-y-1/4" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500 to-indigo-600 flex items-center justify-center text-2xl font-extrabold shadow-lg">
              FE
            </div>
            <div>
              <p className="text-lg font-bold">Fenyi Emmanuel</p>
              <p className="text-white/50 text-sm">Founder & Developer</p>
            </div>
          </div>
          <div className="space-y-3 text-sm text-white/70 leading-relaxed">
            <p>
              STand was founded by <strong className="text-white/90">Fenyi Emmanuel</strong> with a clear vision: to make quality exam preparation accessible, intelligent, and engaging for every student.
            </p>
            <p>
              Built from the ground up with AI-powered question generation, real-time collaboration tools, and a deep understanding of student needs across different education systems — from primary school to professional certification.
            </p>
            <p>
              Fenyi designed STand to be more than a practice tool — it's a complete study ecosystem that combines the power of AI with the warmth of community, making exam preparation feel less like a chore and more like a journey.
            </p>
          </div>
          <div className="mt-5 pt-4 border-t border-white/10 flex items-center gap-2">
            <Heart size={14} className="text-red-400" />
            <span className="text-xs text-white/40">Crafted with passion for students everywhere</span>
          </div>
        </div>
      </div>

      {/* Tech Stack */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-3">{t('Built With')}</h3>
        <div className="flex flex-wrap gap-2">
          {['React', 'TypeScript', 'Tailwind CSS', 'Firebase', 'NVIDIA NIM AI', 'Vercel', 'WebGL'].map((tech) => (
            <span key={tech} className="px-3 py-1.5 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 rounded-full text-xs font-medium">
              {tech}
            </span>
          ))}
        </div>
      </div>

      {/* Copyright */}
      <div className="text-center text-xs text-gray-400 dark:text-gray-500 space-y-1">
        <p>&copy; {new Date().getFullYear()} STand. All rights reserved.</p>
        <p>Made by Fenyi Emmanuel</p>
      </div>
    </div>
  );
}
