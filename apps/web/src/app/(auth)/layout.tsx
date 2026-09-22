import { LogoMark } from '../../components/ui/Logo';

const FEATURES = [
  { icon: '🤖', title: 'AI Study Assistant',    desc: 'Gemini-powered chat in English, Urdu & Roman Urdu' },
  { icon: '📅', title: 'Smart Weekly Planner',  desc: 'Auto-generate optimized study sessions' },
  { icon: '🏆', title: 'Gamified Progress',     desc: 'Earn XP, level up, and track your streak' },
  { icon: '🔍', title: 'Research Hub',          desc: 'Search for lecture notes, papers & books in one click' },
  { icon: '🔗', title: 'Browser Extension',     desc: 'Capture tasks from any website instantly' },
];

const QUOTES = [
  { text: 'The secret of getting ahead is getting started.', author: 'Mark Twain' },
  { text: 'An investment in knowledge pays the best interest.', author: 'Benjamin Franklin' },
  { text: 'Education is the most powerful weapon you can use to change the world.', author: 'Nelson Mandela' },
];

const quote = QUOTES[new Date().getDay() % QUOTES.length];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">

      {/* ── Left branding panel ─────────────────────────────────────────── */}
      <div className="hidden lg:flex flex-col w-[460px] xl:w-[520px] flex-shrink-0 relative overflow-hidden p-10 xl:p-12"
        style={{ background: 'linear-gradient(155deg, #080e1a 0%, #1a1040 45%, #0c1628 100%)' }}>

        {/* Ambient blobs */}
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full opacity-20 pointer-events-none"
          style={{ background: 'radial-gradient(circle, #818cf8, transparent 70%)' }} />
        <div className="absolute -bottom-20 -right-20 w-96 h-96 rounded-full opacity-15 pointer-events-none"
          style={{ background: 'radial-gradient(circle, #c084fc, transparent 70%)' }} />
        <div className="absolute top-1/2 right-0 w-72 h-72 rounded-full opacity-8 pointer-events-none"
          style={{ background: 'radial-gradient(circle, #06b6d4, transparent 70%)' }} />

        <div className="relative z-10 flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-14">
            <LogoMark size={40} />
            <div>
              <p className="text-white font-bold text-lg tracking-tight leading-tight">Smart Productivity</p>
              <p className="text-slate-500 text-xs">AI-powered learning platform</p>
            </div>
          </div>

          {/* Headline */}
          <div className="mb-10">
            <h1 className="text-4xl xl:text-5xl font-black text-white leading-tight mb-4 tracking-tight">
              Study smarter,<br />
              <span style={{
                background: 'linear-gradient(90deg, #818cf8, #c084fc)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>
                not harder.
              </span>
            </h1>
            <p className="text-slate-400 text-base leading-relaxed max-w-sm">
              AI-powered scheduling, gamified learning, and smart research — everything you need to achieve more.
            </p>
          </div>

          {/* Features */}
          <div className="space-y-4 flex-1">
            {FEATURES.map(f => (
              <div key={f.title} className="flex items-start gap-3.5 group">
                <div className="w-8 h-8 rounded-lg bg-white/8 border border-white/10 flex items-center justify-center text-base flex-shrink-0 mt-0.5 group-hover:border-white/20 transition-colors">
                  {f.icon}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-200">{f.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Quote */}
          <div className="mt-auto pt-8 border-t border-white/6">
            <p className="text-xs text-slate-500 italic leading-relaxed">"{quote.text}"</p>
            <p className="text-xs text-slate-600 mt-1.5">— {quote.author}</p>
          </div>
        </div>
      </div>

      {/* ── Right form panel ────────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6 auth-form-bg">
        <div className="w-full max-w-sm animate-fade-in">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <LogoMark size={36} />
            <div>
              <p className="text-base font-bold text-slate-900 dark:text-white leading-tight">Smart Productivity</p>
              <p className="text-xs text-slate-400">AI-powered learning platform</p>
            </div>
          </div>
          {children}
        </div>
      </div>

    </div>
  );
}
