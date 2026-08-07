import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  Shield,
  AlertTriangle,
  Lock,
  Brain,
  Cloud,
  Database,
  Users,
  Target,
  Zap,
} from 'lucide-react';

const BG = '#0A0A14';
const SURFACE = '#151520';
const SURFACE_LIGHT = '#1E1E2E';
const TEXT_PRIMARY = '#FFFFFF';
const TEXT_SECONDARY = '#A0A0B0';
const TEXT_MUTED = '#707080';
const CYAN = '#00D4FF';
const RED = '#FF6B6B';
const GREEN = '#00D977';
const AMBER = '#FFD93D';
const VIOLET = '#8B5CF7';

const threatData = [
  { label: 'Ransomware', value: 35, color: RED, icon: Shield },
  { label: 'Phishing', value: 25, color: CYAN, icon: AlertTriangle },
  { label: 'Cloud Misconfig', value: 18, color: AMBER, icon: Cloud },
  { label: 'Insider Threat', value: 12, color: GREEN, icon: Users },
  { label: 'Supply Chain', value: 6, color: VIOLET, icon: Database },
  { label: 'Other', value: 4, color: TEXT_MUTED, icon: '' },
];

const trendData = [
  { year: '2021', incidents: 4500 },
  { year: '2022', incidents: 7300 },
  { year: '2023', incidents: 11800 },
  { year: '2024', incidents: 18500 },
  { year: '2025', incidents: 29200 },
  { year: '2026', incidents: 42000 },
];

const recommendations = [
  {
    number: 1,
    title: 'Deploy Zero Trust Network Access',
    description: 'Replace legacy VPN with ZTNA. Every request verified, no implicit trust. Reduces lateral movement by 70%.',
    icon: Shield,
    color: CYAN,
  },
  {
    number: 2,
    title: 'MFA Everywhere + Passkey Enforcement',
    description: 'Migrate to phishing-resistant MFA. Block 99.9% of credential stuffing attacks instantly.',
    icon: Lock,
    color: GREEN,
  },
  {
    number: 3,
    title: 'Automated Threat Detection',
    description: 'Deploy XDR with behavioral analytics. Detect anomalies in seconds, not hours.',
    icon: Brain,
    color: VIOLET,
  },
  {
    number: 4,
    title: 'Security Training Gamification',
    description: 'Quarterly phishing simulations with reward tiers. Human firewall reduces risk by 45%.',
    icon: Users,
    color: AMBER,
  },
  {
    number: 5,
    title: 'Incident Response Automation',
    description: 'SOAR integration: auto-isolate, alert SOC, notify stakeholders in under 60 seconds.',
    icon: Zap,
    color: RED,
  },
];

const StatCard = ({ value, label, delay }: { value: string; label: string; delay: number }) => (
  <motion.div
    className="flex flex-col items-center"
    initial={{ opacity: 0, y: 30, scale: 0.9 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    transition={{ delay: delay, duration: 0.6, ease: 'easeOut' }}
  >
    <div className="text-5xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
      {value}
    </div>
    <div className="text-sm text-gray-400 mt-1">{label}</div>
  </motion.div>
);

const FeatureCard = ({ icon: Icon, title, desc, delay }: {
  icon: any;
  title: string;
  desc: string;
  delay: number;
}) => (
  <motion.div
    className="bg-[#151520] border border-gray-700/50 rounded-xl p-6 text-center transition-all"
    initial={{ opacity: 0, y: 30 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: delay, duration: 0.5, ease: 'easeOut' }}
    whileHover={{
      scale: 1.05,
      borderColor: CYAN,
      boxShadow: '0 10px 30px rgba(0, 212, 255, 0.2)',
    }}
  >
    <div className="mb-4 flex justify-center">
      <div className="p-3 bg-blue-500/10 rounded-xl">
        <Icon size={24} style={{ color: CYAN }} />
      </div>
    </div>
    <div className="font-bold text-lg mb-2">{title}</div>
    <div className="text-sm text-gray-400">{desc}</div>
  </motion.div>
);

const RiskCard = ({ level, title, desc, delay }: {
  level: 'high' | 'medium';
  title: string;
  desc: string;
  delay: number;
}) => (
  <motion.div
    className={`${
      level === 'high' ? 'border-l-4 border-red-400' : 'border-l-4 border-amber-400'
    } bg-[#151520] border border-gray-700/50 rounded-xl p-7 text-left transition-all`}
    initial={{ opacity: 0, x: level === 'high' ? -30 : 30 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay: delay, duration: 0.5, ease: 'easeOut' }}
    whileHover={{
      scale: 1.02,
      boxShadow: '0 10px 30px rgba(0, 212, 255, 0.15)',
    }}
  >
    <div className={`text-xs font-bold uppercase mb-3 flex items-center gap-2 ${
      level === 'high' ? 'text-red-400' : 'text-amber-400'
    }`}>
      {level === 'high' ? '⚠ High Risk' : '⚡ Medium Risk'}
    </div>
    <h4 className="font-bold text-lg mb-2">{title}</h4>
    <p className="text-sm text-gray-400 leading-relaxed">{desc}</p>
  </motion.div>
);

export default function CybersecurityPresentation() {
  const [current, setCurrent] = useState(1);
  const [direction, setDirection] = useState(0);
  const shouldReduceMotion = useReducedMotion();

  const total = 5;

  const nextSlide = useCallback(() => {
    if (current < total) {
      setDirection(1);
      setCurrent(current + 1);
    }
  }, [current, total]);

  const prevSlide = useCallback(() => {
    if (current > 1) {
      setDirection(-1);
      setCurrent(current - 1);
    }
  }, [current]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        nextSlide();
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prevSlide();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nextSlide, prevSlide]);

  const variants = shouldReduceMotion
    ? {}
    : {
        initial: { x: direction > 0 ? '100%' : '-100%', opacity: 0 },
        animate: { x: 0, opacity: 1 },
        exit: { x: direction > 0 ? '-100%' : '100%', opacity: 0 },
        transition: {
          x: { type: 'spring' as const, stiffness: 300, damping: 30 },
          opacity: { duration: 0.2 },
        },
      };

  const renderSlide = () => {
    switch (current) {
      case 1:
        return (
          <motion.div
            key="slide1"
            className="absolute inset-0 flex items-center justify-center p-16"
            style={{
              background: `radial-gradient(ellipse at top right, rgba(0, 212, 255, 0.1), transparent 50%), ${BG}`,
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <div className="w-full max-w-5xl mx-auto text-center relative z-10">
              <motion.p
                className="text-sm text-gray-400 uppercase tracking-widener mb-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                Q3 2026 IT Security Briefing
              </motion.p>
              <motion.h1
                className="text-5xl md:text-7xl font-black mb-6 bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent leading-tight"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.6 }}
              >
                Cybersecurity Threat Landscape 2026
              </motion.h1>
              <motion.p
                className="text-lg text-gray-300 max-w-2xl mx-auto leading-relaxed mb-12"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                Ransomware is evolving faster than ever. Zero-days are weaponized in days, not months.
                Our defenses need to evolve too.
              </motion.p>
              <motion.div
                className="flex flex-wrap justify-center gap-12"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4, staggerChildren: 0.1 }}
              >
                <StatCard value="4.2×" label="Attack Growth YoY" delay={0} />
                <StatCard value="73%" label="Targeted Ransomware" delay={1} />
                <StatCard value="<24h" label="Avg. Breach Time" delay={2} />
              </motion.div>
            </div>
          </motion.div>
        );
      case 2:
        return (
          <motion.div
            key="slide2"
            className="absolute inset-0 flex items-center justify-center p-16"
            style={{
              background: `${BG} url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.03' fill-rule='nonzero'%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <div className="w-full max-w-5xl mx-auto text-center relative z-10">
              <motion.h2
                className="text-3xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-red-400 to-orange-500 bg-clip-text text-transparent"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                Critical Threats Your Team Must Address
              </motion.h2>
              <motion.p
                className="text-lg text-gray-300 max-w-xl mx-auto leading-relaxed mb-10"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                Ransomware groups are leveraging AI to automate attacks at scale. Entry barriers have
                dropped to $50/month subscriptions.
              </motion.p>

              <motion.div
                className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3, staggerChildren: 0.1 }}
              >
                <RiskCard
                  level="high"
                  title="Ransomware-as-a-Service Evolution"
                  desc="LockBit 3.0 and new RaaS platforms are commoditizing attacks. Entry barrier dropped to $50/month subscriptions."
                  delay={0}
                />
                <RiskCard
                  level="high"
                  title="AI-Powered Social Engineering"
                  desc="Deepfake voice cloning and hyper-personalized phishing bypass traditional MFA. 78% more effective than text-based attacks."
                  delay={1}
                />
              </motion.div>

              <motion.div
                className="w-full max-w-3xl mx-auto mt-8"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5, duration: 0.5 }}
              >
                <div className="space-y-3">
                  {trendData.map((d, i) => (
                    <div key={d.year} className="flex items-center gap-4">
                      <span className="text-sm text-gray-500 w-12 text-right">{d.year}</span>
                      <div className="flex-1 bg-[#1E1E2E] rounded-full h-6 overflow-hidden">
                        <motion.div
                          className="h-full rounded-full bg-gradient-to-r from-red-400 to-pink-500"
                          initial={{ width: 0 }}
                          animate={{ width: `${(d.incidents / 42000) * 100}%` }}
                          transition={{ delay: 0.5 + i * 0.1, duration: 0.6, ease: 'easeOut' }}
                        />
                      </div>
                      <span className="text-sm font-medium text-gray-300 w-20 text-right">
                        {d.incidents.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 text-center">
                  <span className="text-xs text-gray-500">🔴 Total Security Incidents (2021-2026 growth trend)</span>
                </div>
              </motion.div>
            </div>
          </motion.div>
        );
      case 3:
        return (
          <motion.div
            key="slide3"
            className="absolute inset-0 flex items-center justify-center p-16"
            style={{ background: BG }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <div className="w-full max-w-5xl mx-auto text-center relative z-10">
              <motion.h2
                className="text-3xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-red-400 to-orange-500 bg-clip-text text-transparent"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                Top Attack Vectors 2026
              </motion.h2>
              <motion.p
                className="text-lg text-gray-300 max-w-2xl mx-auto leading-relaxed mb-10"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                [Feature] lets you [advantage], so you can [benefit]. Here are the vectors exploiting this gap.
              </motion.p>

              <motion.div
                className="w-full max-w-2xl mx-auto space-y-3 mb-8"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                {threatData.map((item, i) => (
                  <motion.div
                    key={item.label}
                    className="flex items-center gap-4 bg-[#151520] border border-gray-700/50 rounded-xl p-4"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 + i * 0.1, duration: 0.4 }}
                    whileHover={{ x: 6 }}
                  >
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg" style={{ backgroundColor: `${item.color}20` }}>
                      {item.icon && <item.icon size={20} style={{ color: item.color }} />}
                    </div>
                    <span className="flex-1 text-left text-sm font-medium">{item.label}</span>
                    <div className="flex-1 bg-[#1E1E2E] rounded-full h-4 overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: item.color }}
                        initial={{ width: 0 }}
                        animate={{ width: `${item.value}%` }}
                        transition={{ delay: 0.5 + i * 0.1, duration: 0.6, ease: 'easeOut' }}
                      />
                    </div>
                    <span className="text-sm font-bold w-12" style={{ color: item.color }}>
                      {item.value}%
                    </span>
                  </motion.div>
                ))}
              </motion.div>

              <motion.div
                className="flex items-center justify-center gap-3 bg-[#151520] border border-gray-700/50 rounded-xl px-6 py-4 mb-8"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.8, type: 'spring', stiffness: 300 }}
              >
                <Target size={24} style={{ color: RED }} />
                <span className="text-lg text-gray-300">
                  <span className="font-bold text-white">42,000 incidents</span> reported in 2026
                </span>
              </motion.div>

              <motion.div
                className="grid grid-cols-1 md:grid-cols-3 gap-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4, staggerChildren: 0.1 }}
              >
                <FeatureCard icon={Database} title="Supply Chain" desc="32% increase in dependency attacks" delay={0} />
                <FeatureCard icon={Lock} title="Identity Breaches" desc="67% of breaches involve stolen creds" delay={1} />
                <FeatureCard icon={Cloud} title="Cloud Misconfigurations" desc="45% of orgs exposed this year" delay={2} />
              </motion.div>
            </div>
          </motion.div>
        );
      case 4:
        return (
          <motion.div
            key="slide4"
            className="absolute inset-0 flex items-center justify-center p-16"
            style={{
              background: `${BG} url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.03' fill-rule='nonzero'%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <div className="w-full max-w-5xl mx-auto text-center relative z-10">
              <motion.h2
                className="text-3xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-red-400 to-orange-500 bg-clip-text text-transparent"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                5 Actions: Harden Your Defenses
              </motion.h2>
              <motion.p
                className="text-lg text-gray-300 max-w-xl mx-auto leading-relaxed mb-10"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                [Pain point before]. [Desired state after]. These are the bridges to get there.
              </motion.p>

              <motion.ul
                className="flex flex-col gap-4 max-w-2xl mx-auto"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3, staggerChildren: 0.05 }}
              >
                {recommendations.map((rec) => (
                  <motion.li
                    key={rec.number}
                    className="bg-[#151520] border border-gray-700/50 rounded-xl p-6 flex items-start gap-4 text-left transition-all"
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{
                      delay: 0.3 + rec.number * 0.08,
                      duration: 0.5,
                      ease: 'easeOut',
                    }}
                    whileHover={{
                      x: 6,
                      borderColor: CYAN,
                    }}
                  >
                    <div className="text-3xl font-bold" style={{ color: rec.color }}>
                      {rec.number}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <rec.icon size={18} style={{ color: rec.color }} />
                        <h4 className="font-bold text-lg">{rec.title}</h4>
                      </div>
                      <p className="text-sm text-gray-400 leading-relaxed">{rec.description}</p>
                    </div>
                  </motion.li>
                ))}
              </motion.ul>
            </div>
          </motion.div>
        );
      case 5:
        return (
          <motion.div
            key="slide5"
            className="absolute inset-0 flex items-center justify-center p-16"
            style={{
              background: `radial-gradient(ellipse at top right, rgba(0, 212, 255, 0.1), transparent 50%), ${BG}`,
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
            <div className="w-full max-w-3xl mx-auto text-center relative z-10">
              <motion.p
                className="text-sm text-gray-400 uppercase tracking-wider mb-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                Security is everyone's job
              </motion.p>
              <motion.h2
                className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.6 }}
              >
                Ready to level up our defenses?
              </motion.h2>
              <motion.p
                className="text-lg text-gray-300 leading-relaxed mb-10"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                The threats won't wait. Without proactive defense, you're losing ground every day.
                Let's secure our organization together.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.5 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.97 }}
              >
                <motion.a
                  href="mailto:security@company.com?subject=Cybersecurity%20Q3%20Roadmap%20Review"
                  className="inline-block bg-red-500 hover:bg-red-600 text-white font-bold py-4 px-10 rounded-full text-lg transition-all"
                  whileHover={{
                    boxShadow: '0 10px 30px rgba(255, 107, 107, 0.5)',
                  }}
                >
                  Schedule Q3 Security Review
                </motion.a>
              </motion.div>

              <motion.p
                className="text-sm text-gray-500 mt-8"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                Join security standup every Friday | security-team@company.com
              </motion.p>
            </div>
          </motion.div>
        );
      default:
        return null;
    }
  };

  return (
    <div
      className="relative w-full h-screen overflow-hidden"
      style={{
        background: BG,
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
      }}
    >
      <motion.div
        className="absolute top-0 left-0 h-1 bg-cyan-400"
        initial={{ width: '20%' }}
        animate={{ width: `${(current / total) * 100}%` }}
        transition={{ duration: 0.3 }}
      />

      <div className="absolute inset-0 flex flex-col">
        <main className="flex-1 flex items-center justify-center overflow-hidden">
          <div className="relative w-full h-full">
            <AnimatePresence initial={false} custom={direction} mode="wait">
              {renderSlide()}
            </AnimatePresence>
          </div>
        </main>

        <div className="flex items-center justify-center gap-6 pb-8">
          <motion.button
            onClick={prevSlide}
            disabled={current === 1}
            className="w-10 h-10 rounded-full bg-white/10 border border-gray-700 text-white flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            whileHover={{ scale: 1.1, borderColor: CYAN, backgroundColor: 'rgba(255,255,255,0.15)' }}
            whileTap={{ scale: 0.95 }}
            animate={{ opacity: current === 1 ? 0.3 : 1 }}
          >
            ←
          </motion.button>
          <span className="text-gray-500 text-sm">
            {current} / {total}
          </span>
          <motion.button
            onClick={nextSlide}
            disabled={current === total}
            className="w-10 h-10 rounded-full bg-white/10 border border-gray-700 text-white flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            whileHover={{ scale: 1.1, borderColor: CYAN, backgroundColor: 'rgba(255,255,255,0.15)' }}
            whileTap={{ scale: 0.95 }}
            animate={{ opacity: current === total ? 0.3 : 1 }}
          >
            →
          </motion.button>
        </div>
      </div>
    </div>
  );
}
