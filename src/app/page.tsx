"use client";
import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import {
  motion, useInView, useScroll, useTransform,
  animate, useMotionValue, useSpring, AnimatePresence,
} from "framer-motion";
import {
  ArrowRight, Bell, Shield, BarChart3, Bot, FileDown, Zap,
  CheckCircle2, ChevronDown, Menu, X, Target, Clock,
  TrendingUp, Star, Lock, Phone, Users, Activity,
  AlertTriangle, Download, Settings, MessageCircle,
  Sparkles, Eye, Filter, Search, Check,
} from "lucide-react";

const SANS = "Inter, system-ui, -apple-system, sans-serif";

/* ─── helpers ──────────────────────────────────────────────────────────── */
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.4,0,0.2,1] } },
};
const staggerWrap = (delay = 0, gap = 0.1) => ({
  hidden: {},
  show: { transition: { staggerChildren: gap, delayChildren: delay } },
});

function Counter({ to, suffix = "" }: { to: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  useEffect(() => {
    if (!inView || !ref.current) return;
    const c = animate(0, to, { duration: 1.8, ease: [0.4,0,0.2,1],
      onUpdate: (v) => { if (ref.current) ref.current.textContent = Math.round(v) + suffix; },
    });
    return () => c.stop();
  }, [inView, to, suffix]);
  return <span ref={ref}>0{suffix}</span>;
}

/* ─── 3D tilt ──────────────────────────────────────────────────────────── */
function Tilt3D({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rx = useSpring(useTransform(my, [-0.5,0.5],[8,-8]), { stiffness: 220, damping: 26 });
  const ry = useSpring(useTransform(mx, [-0.5,0.5],[-10,10]), { stiffness: 220, damping: 26 });
  return (
    <motion.div style={{ perspective: 1200, rotateX: rx, rotateY: ry, transformStyle:"preserve-3d" }}
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        mx.set((e.clientX - r.left) / r.width - 0.5);
        my.set((e.clientY - r.top) / r.height - 0.5);
      }}
      onMouseLeave={() => { mx.set(0); my.set(0); }}
      className={className}>
      {children}
    </motion.div>
  );
}

/* ─── Dashboard mockup ─────────────────────────────────────────────────── */
const LEADS = [
  { name:"Alex Rivera",    type:"SaaS",         value:"$8,500",  status:"new",       time:"2m" },
  { name:"Priya Mehta",    type:"Agency",       value:"$12,200", status:"contacted", time:"18m" },
  { name:"David Chen",     type:"Real Estate",  value:"$6,800",  status:"new",       time:"32m" },
  { name:"Sarah Johnson",  type:"Healthcare",   value:"$9,100",  status:"qualified", time:"1h" },
  { name:"Thomas Ng",      type:"E-commerce",   value:"$5,400",  status:"archived",  time:"3h" },
];
const ST: Record<string,string> = {
  new:"bg-emerald-500/15 text-emerald-400",
  contacted:"bg-blue-500/15 text-blue-400",
  qualified:"bg-sky-400/15 text-sky-300",
  archived:"bg-slate-500/15 text-slate-400",
};

function DashMockup() {
  return (
    <div className="rounded-xl overflow-hidden border border-white/10 shadow-[0_32px_80px_rgba(0,0,0,0.55)]"
         style={{ background:"#0a0a0a", transformStyle:"preserve-3d" }}>
      {/* Chrome */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-white/8" style={{ background:"#151515" }}>
        <div className="flex gap-1.5">
          {["#FF5F57","#FEBC2E","#28C840"].map(c => <div key={c} className="w-2.5 h-2.5 rounded-full" style={{ background:c }} />)}
        </div>
        <div className="flex-1 flex justify-center">
          <div className="bg-[#1a1a1a] rounded px-3 py-0.5 text-[10px] text-gray-500 font-mono max-w-[200px] w-full text-center border border-white/5">
            www.96kapital.com
          </div>
        </div>
      </div>
      {/* App */}
      <div className="flex" style={{ minHeight:300 }}>
        {/* Sidebar */}
        <div className="w-32 flex-shrink-0 border-r border-white/6 py-3 px-2 space-y-0.5" style={{ background:"#0e0e0e" }}>
          <div className="flex items-center gap-1.5 px-2 py-1.5 mb-2">
            <div className="w-5 h-5 rounded-md bg-blue-600 flex items-center justify-center flex-shrink-0">
              <Target size={10} color="white" />
            </div>
            <span className="text-[9px] font-bold text-white truncate">96 Kapital CRM</span>
          </div>
          {[
            {icon:Activity, label:"Dashboard"},
            {icon:Users, label:"Leads", active:true, dot:true},
            {icon:BarChart3, label:"Analytics"},
            {icon:Sparkles, label:"AI Insights"},
            {icon:AlertTriangle, label:"Alerts", badge:"3"},
            {icon:Download, label:"Export"},
          ].map(({icon:Icon,label,active,dot,badge}: any) => (
            <div key={label} className={`flex items-center gap-2 px-2 py-1.5 rounded text-[9px] font-medium ${active?"bg-blue-600/15 text-blue-400":"text-gray-500"}`}>
              <Icon size={10}/><span className="truncate">{label}</span>
              {dot && <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 ml-auto"/>}
              {badge && <div className="ml-auto text-[7px] bg-red-500 text-white rounded-full w-3.5 h-3.5 flex items-center justify-center">{badge}</div>}
            </div>
          ))}
        </div>
        {/* Main */}
        <div className="flex-1 p-3 space-y-2.5" style={{ background:"#080808" }}>
          <div className="grid grid-cols-3 gap-2">
            {[{l:"Total Leads",v:"247",d:"+12%",c:"#60a5fa"},{l:"This Month",v:"34",d:"+8",c:"#34d399"},{l:"Conversion",v:"23%",d:"+3%",c:"#a78bfa"}].map(s=>(
              <div key={s.l} className="rounded-lg p-2 border border-white/6" style={{ background:"#111" }}>
                <div className="text-[8px] text-gray-500 mb-1">{s.l}</div>
                <div className="text-sm font-bold" style={{color:s.c}}>{s.v}</div>
                <div className="text-[7px] text-emerald-400 mt-0.5">{s.d}</div>
              </div>
            ))}
          </div>
          <div className="rounded-lg border border-white/6 overflow-hidden" style={{ background:"#0d0d0d" }}>
            <div className="flex items-center gap-2 px-3 py-1.5 border-b border-white/6">
              <Search size={8} className="text-gray-600"/><span className="text-[8px] text-gray-600">Search leads…</span>
            </div>
            {LEADS.map((l,i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-1.5 border-b border-white/4 last:border-0">
                <div className="w-5 h-5 rounded-full bg-blue-900 flex items-center justify-center text-[7px] font-bold text-blue-300 flex-shrink-0">{l.name[0]}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-[8px] font-semibold text-white/90 truncate">{l.name}</div>
                  <div className="text-[7px] text-gray-600">{l.type}</div>
                </div>
                <div className="text-[8px] font-bold text-emerald-400">{l.value}</div>
                <div className={`text-[6px] px-1 py-0.5 rounded-full font-medium ${ST[l.status]}`}>{l.status}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Logo ─────────────────────────────────────────────────────────────── */
function Logo({ dark=false }: { dark?: boolean }) {
  return (
    <div className="flex items-center gap-2.5 select-none">
      <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/30">
        <Target size={15} color="white" />
      </div>
      <span className={`font-bold text-lg tracking-tight ${dark?"text-slate-900":"text-white"}`} style={{ fontFamily:SANS }}>
        <span className="text-blue-500">96</span> Kapital CRM
      </span>
    </div>
  );
}

/* ─── Nav ───────────────────────────────────────────────────────────────── */
function Nav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", fn, { passive:true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  return (
    <motion.nav initial={{ opacity:0, y:-12 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.45 }}
      className="fixed top-0 inset-x-0 z-50 h-15">
      <div className={`absolute inset-0 border-b transition-all duration-300 ${scrolled?"bg-white/96 backdrop-blur-xl border-slate-200 shadow-sm":"bg-transparent border-transparent"}`} />
      <div className="relative mx-auto max-w-6xl px-6 h-15 flex items-center justify-between" style={{ height:60 }}>
        <Link href="/"><Logo dark={scrolled} /></Link>
        <div className="hidden md:flex items-center gap-7">
          {[["Features","#features"],["Dashboard","#dashboard"],["How It Works","#how-it-works"],["Pricing","#pricing"]].map(([l,h]) => (
            <a key={l} href={h} className={`text-sm font-medium transition-colors ${scrolled?"text-slate-600 hover:text-slate-900":"text-white/70 hover:text-white"}`}>{l}</a>
          ))}
        </div>
        <div className="hidden md:flex items-center gap-3">
          <Link href="/login" className="text-sm px-5 py-2.5 rounded-lg font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-md shadow-blue-600/20">
            Log in to Dashboard
          </Link>
        </div>
        <button className="md:hidden" onClick={() => setOpen(!open)}>
          {open ? <X size={22} className={scrolled?"text-slate-900":"text-white"} /> : <Menu size={22} className={scrolled?"text-slate-900":"text-white"} />}
        </button>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity:0, y:-8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-8 }}
            className="md:hidden absolute top-[60px] inset-x-0 bg-white border-b border-slate-200 p-5 space-y-3 shadow-lg">
            {[["Features","#features"],["Dashboard","#dashboard"],["How It Works","#how-it-works"],["Pricing","#pricing"]].map(([l,h]) => (
              <a key={l} href={h} className="block text-sm font-medium text-slate-700" onClick={() => setOpen(false)}>{l}</a>
            ))}
            <Link href="/login" onClick={() => setOpen(false)}
              className="block w-full text-center text-sm px-5 py-3 rounded-lg font-semibold text-white bg-blue-600 mt-2">
              Log in to Dashboard
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}

/* ─── Hero ─────────────────────────────────────────────────────────────── */
function Hero() {
  const { scrollY } = useScroll();
  const yMockup = useTransform(scrollY, [0,500],[0,50]);
  return (
    <section className="relative min-h-screen flex items-center pt-16 overflow-hidden"
             style={{ background:"linear-gradient(140deg, #0c1628 0%, #091020 50%, #050b18 100%)" }}>
      <div className="absolute inset-0 pointer-events-none"
           style={{ backgroundImage:"linear-gradient(rgba(255,255,255,0.022) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.022) 1px,transparent 1px)", backgroundSize:"60px 60px" }} />
      <motion.div className="absolute top-1/3 left-1/4 w-[500px] h-[400px] rounded-full pointer-events-none"
        style={{ background:"radial-gradient(ellipse,rgba(37,99,235,0.12) 0%,transparent 70%)" }}
        animate={{ scale:[1,1.08,1] }} transition={{ duration:8, repeat:Infinity, ease:"easeInOut" }} />

      <div className="relative z-10 mx-auto max-w-6xl px-6 py-16 grid lg:grid-cols-2 gap-14 items-center">
        {/* Left */}
        <motion.div variants={staggerWrap(0.1,0.12)} initial="hidden" animate="show">
          <motion.div variants={fadeUp}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-300 text-xs font-medium mb-7"
            style={{ fontFamily:SANS }}>
            <Sparkles size={11} /> Built for teams that move fast
          </motion.div>
          <motion.h1 variants={fadeUp}
            className="text-5xl md:text-6xl font-bold text-white leading-tight mb-5"
            style={{ fontFamily:SANS, letterSpacing:"-0.025em", lineHeight:1.1 }}>
            Every lead<br />
            deserves an<br />
            <span style={{ backgroundImage:"linear-gradient(135deg,#60a5fa,#38bdf8)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
              instant response.
            </span>
          </motion.h1>
          <motion.p variants={fadeUp} className="text-base text-white/55 leading-relaxed mb-8 max-w-md" style={{ fontFamily:SANS }}>
            When a prospect reaches out, speed decides who wins the deal. 96 Kapital CRM keeps every enquiry in one place so your team responds first — every time.
          </motion.p>
          <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-3 mb-10">
            <Link href="/login"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/25 transition-all duration-200"
              style={{ fontFamily:SANS }}>
              Log in to Dashboard <ArrowRight size={16} />
            </Link>
            <a href="#dashboard"
               className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-sm font-medium text-white/60 border border-white/15 hover:border-white/30 hover:text-white transition-all duration-200"
               style={{ fontFamily:SANS }}>
              <Eye size={15} /> See the Dashboard
            </a>
          </motion.div>
          {/* Trust row */}
          <motion.div variants={fadeUp} className="flex flex-wrap gap-5 items-center">
            {[{n:"< 5 sec",l:"Lead alert speed"},{n:"24/7",l:"Always on"},{n:"SGD $49",l:"Per month"}].map(({n,l}) => (
              <div key={l}>
                <div className="text-base font-bold text-white" style={{ fontFamily:SANS }}>{n}</div>
                <div className="text-xs text-white/35" style={{ fontFamily:SANS }}>{l}</div>
              </div>
            ))}
          </motion.div>
        </motion.div>

        {/* Right — 3D mockup */}
        <motion.div initial={{ opacity:0, x:32 }} animate={{ opacity:1, x:0 }}
          transition={{ duration:0.8, delay:0.3 }} style={{ y:yMockup }} className="relative hidden lg:block">
          <Tilt3D>
            <DashMockup />
          </Tilt3D>
          <motion.div initial={{ opacity:0, scale:0.85 }} animate={{ opacity:1, scale:1 }}
            transition={{ delay:1.1 }}
            className="absolute -left-8 top-1/3 rounded-xl p-3 shadow-2xl flex items-center gap-3 border"
            style={{ background:"#111827", borderColor:"rgba(16,185,129,0.35)" }}>
            <div className="w-8 h-8 rounded-full bg-emerald-500/15 flex items-center justify-center">
              <Bell size={13} className="text-emerald-400" />
            </div>
            <div style={{ fontFamily:SANS }}>
              <div className="text-xs font-semibold text-white">New lead received</div>
              <div className="text-[10px] text-gray-400">Alex · SaaS · $8,500</div>
            </div>
          </motion.div>
          <motion.div initial={{ opacity:0, scale:0.85 }} animate={{ opacity:1, scale:1 }}
            transition={{ delay:1.4 }}
            className="absolute -right-6 bottom-12 rounded-xl px-4 py-3 shadow-2xl border"
            style={{ background:"#111827", borderColor:"rgba(37,99,235,0.35)", fontFamily:SANS }}>
            <div className="text-[10px] text-gray-400 mb-0.5">Response time</div>
            <div className="text-xl font-bold text-blue-400">4m 12s</div>
            <div className="text-[9px] text-emerald-400">↓ 87% faster than avg</div>
          </motion.div>
        </motion.div>
      </div>
      <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:1.6 }}
        className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-white/25"
        style={{ fontFamily:SANS }}>
        <span className="text-[9px] uppercase tracking-widest">Scroll</span>
        <motion.div animate={{ y:[0,5,0] }} transition={{ duration:1.8, repeat:Infinity }}>
          <ChevronDown size={15} />
        </motion.div>
      </motion.div>
    </section>
  );
}

/* ─── Trust marquee ─────────────────────────────────────────────────────── */
function TrustBar() {
  const items = ["Instant WhatsApp Alerts","Live Lead Tracking","AI Lead Scoring","Secure Admin Login","CSV Export","Real-Time Analytics","Response Time Tracking","Neon Database","Multi-Industry CRM"];
  return (
    <div className="bg-slate-50 border-y border-slate-200 py-3 overflow-hidden">
      <motion.div animate={{ x:["0%","-50%"] }} transition={{ duration:28, repeat:Infinity, ease:"linear" }}
        className="flex gap-10 whitespace-nowrap">
        {[...items,...items].map((item,i) => (
          <div key={i} className="flex items-center gap-2 text-xs text-slate-500 font-medium flex-shrink-0" style={{ fontFamily:SANS }}>
            <div className="w-1 h-1 rounded-full bg-blue-400" />{item}
          </div>
        ))}
      </motion.div>
    </div>
  );
}

/* ─── Features ──────────────────────────────────────────────────────────── */
const FEATS = [
  { icon:Bell,       color:"#16a34a", label:"Instant Alerts",   title:"Know the moment a lead lands",          desc:"Every enquiry from your website triggers a WhatsApp + email alert in under 5 seconds. No more checking your inbox manually at midnight.", preview:"alert" },
  { icon:BarChart3,  color:"#2563eb", label:"Live Analytics",   title:"Understand your lead pipeline",          desc:"See which services drive the most enquiries, track your conversion rate over time, and know exactly where your revenue is sitting.", preview:"chart" },
  { icon:Sparkles,   color:"#7c3aed", label:"AI Lead Scoring",  title:"Focus on the leads that matter",         desc:"Our AI ranks every lead by estimated value and urgency. Stop guessing who to call first — the system tells you.", preview:"ai" },
  { icon:Shield,     color:"#0ea5e9", label:"Secure Access",    title:"Your client data stays private",         desc:"HMAC-signed sessions, HTTP-only cookies, API key authentication. No third-party trackers, no shared databases.", preview:"security" },
  { icon:FileDown,   color:"#f97316", label:"One-Click Export", title:"Take your data anywhere",                desc:"Export leads to CSV in seconds. Filter by date, status, or service type. 20 fields per export.", preview:"export" },
  { icon:MessageCircle, color:"#16a34a", label:"WhatsApp CTA", title:"Respond before they call someone else",  desc:"One-click buttons pre-fill a personalised WhatsApp message to each lead. Reach them before your competitors even open their laptop.", preview:"whatsapp" },
];

function FeaturePreview({ type }: { type:string }) {
  if (type === "alert") return (
    <div className="space-y-2" style={{ fontFamily:SANS }}>
      {[{name:"Alex Rivera",val:"$8,500",ago:"2m"},{name:"Priya Mehta",val:"$12,200",ago:"18m"}].map(l => (
        <motion.div key={l.name} initial={{ opacity:0, x:-12 }} whileInView={{ opacity:1, x:0 }} viewport={{ once:true }}
          className="flex items-center gap-2.5 bg-white rounded-lg p-2.5 shadow-sm border border-slate-100">
          <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">{l.name[0]}</div>
          <div className="flex-1 min-w-0"><div className="text-xs font-semibold text-slate-800 truncate">{l.name}</div><div className="text-[10px] text-slate-400">{l.ago} ago</div></div>
          <div className="text-xs font-bold text-emerald-600">{l.val}</div>
        </motion.div>
      ))}
      <div className="flex items-center gap-2 bg-green-50 rounded-lg p-2.5 border border-green-100">
        <MessageCircle size={12} className="text-green-600 flex-shrink-0" />
        <span className="text-xs text-green-700 font-medium">WhatsApp alert sent</span>
      </div>
    </div>
  );
  if (type === "chart") return (
    <div className="bg-white rounded-lg p-3 border border-slate-100 shadow-sm" style={{ fontFamily:SANS }}>
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs font-semibold text-slate-700">Lead Volume</span>
        <span className="text-[10px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">30 days</span>
      </div>
      <div className="flex items-end gap-0.5 h-14">
        {[35,55,40,70,50,85,65,90,75,100,80,95].map((h,i) => (
          <motion.div key={i} initial={{ height:0 }} whileInView={{ height:`${h}%` }} viewport={{ once:true }}
            transition={{ delay:i*0.04, duration:0.4 }}
            className="flex-1 rounded-sm" style={{ background:i===11?"#2563eb":"rgba(37,99,235,0.2)" }} />
        ))}
      </div>
    </div>
  );
  if (type === "ai") return (
    <div className="space-y-1.5" style={{ fontFamily:SANS }}>
      {[{name:"Alex Rivera",score:94,tag:"Priority",c:"#dc2626"},{name:"Priya Mehta",score:81,tag:"Warm",c:"#ea580c"},{name:"David Chen",score:67,tag:"Medium",c:"#ca8a04"}].map((l,i) => (
        <motion.div key={l.name} initial={{ opacity:0, y:6 }} whileInView={{ opacity:1, y:0 }} viewport={{ once:true }}
          transition={{ delay:i*0.08 }}
          className="flex items-center gap-2.5 bg-white rounded-lg p-2.5 shadow-sm border border-slate-100">
          <div className="text-xs font-bold w-7 text-center" style={{ color:l.c }}>{l.score}</div>
          <div className="flex-1 text-xs text-slate-700 truncate">{l.name}</div>
          <div className="text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white" style={{ background:l.c }}>{l.tag}</div>
        </motion.div>
      ))}
    </div>
  );
  if (type === "security") return (
    <div className="space-y-1.5" style={{ fontFamily:SANS }}>
      {["HMAC-SHA256 signed sessions","HTTP-only secure cookies","API key authentication","CORS-restricted access","No third-party data sharing"].map(item => (
        <div key={item} className="flex items-center gap-2">
          <Check size={11} className="text-emerald-500 flex-shrink-0" />
          <span className="text-xs text-slate-600">{item}</span>
        </div>
      ))}
    </div>
  );
  if (type === "export") return (
    <div className="bg-white rounded-lg p-3 border border-slate-100 shadow-sm" style={{ fontFamily:SANS }}>
      <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Select fields to export</div>
      <div className="flex flex-wrap gap-1 mb-2.5">
        {["Name","Email","Phone","Service","Value","Status","Date"].map(f => (
          <div key={f} className="text-[9px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100">{f}</div>
        ))}
      </div>
      <div className="flex items-center justify-center gap-1.5 bg-blue-600 text-white text-xs font-semibold py-1.5 rounded-lg">
        <Download size={10} /> Export 34 leads
      </div>
    </div>
  );
  if (type === "whatsapp") return (
    <div className="bg-white rounded-lg p-3 border border-slate-100 shadow-sm" style={{ fontFamily:SANS }}>
      <div className="text-[10px] text-slate-400 mb-1.5">Pre-filled message for Alex Rivera</div>
      <div className="bg-slate-50 rounded p-2 text-[9px] text-slate-700 border border-slate-200 leading-relaxed mb-2">
        &quot;Hi Alex, thanks for reaching out. We received your enquiry and would love to help. Are you free for a quick call?&quot;
      </div>
      <div className="flex items-center justify-center gap-1.5 text-white text-xs font-semibold py-1.5 rounded-lg" style={{ background:"#25d366" }}>
        <MessageCircle size={10} /> Send via WhatsApp
      </div>
    </div>
  );
  return null;
}

function FeaturesSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once:true, margin:"-80px" });
  return (
    <section id="features" ref={ref} className="py-20 bg-white">
      <div className="mx-auto max-w-6xl px-6">
        <motion.div variants={staggerWrap()} initial="hidden" animate={inView?"show":"hidden"} className="text-center mb-12">
          <motion.p variants={fadeUp} className="text-xs font-semibold uppercase tracking-widest text-blue-600 mb-3" style={{ fontFamily:SANS }}>Everything included</motion.p>
          <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-bold text-slate-900 mb-3" style={{ fontFamily:SANS, letterSpacing:"-0.02em" }}>
            Purpose-built for<br />high-velocity sales teams
          </motion.h2>
          <motion.p variants={fadeUp} className="text-slate-500 max-w-md mx-auto text-sm leading-relaxed" style={{ fontFamily:SANS }}>
            Not a watered-down generic CRM. Every screen, every alert, and every report was designed around one thing — closing enquiries before your competitors even open their laptop.
          </motion.p>
        </motion.div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATS.map((f,i) => (
            <FeatureCard key={f.label} f={f} i={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * Extracted from the .map() callbacks these used to live in.
 *
 * useRef and useInView were being called inside `FEATS.map(...)` and
 * `steps.map(...)`. That only works by accident: React identifies hooks by
 * call order, so it holds together exactly as long as those arrays keep a
 * constant length and order on every render. Make either one conditional or
 * data-driven and the hook order shifts, which corrupts unrelated state
 * rather than throwing anything obvious. A component per item is the shape
 * that is actually correct.
 */
function FeatureCard({ f, i }: { f: (typeof FEATS)[number]; i: number }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once:true, margin:"-50px" });
  return (
    <motion.div ref={ref}
      initial={{ opacity:0, y:24 }} animate={inView?{opacity:1,y:0}:{}}
      transition={{ duration:0.5, delay:i*0.07 }}
      whileHover={{ y:-3, boxShadow:"0 16px 48px rgba(0,0,0,0.09)" }}
      className="rounded-2xl p-5 border border-slate-100 bg-white transition-shadow duration-300">
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background:f.color+"15" }}>
          <f.icon size={15} style={{ color:f.color }} />
        </div>
        <span className="text-xs font-semibold uppercase tracking-wide" style={{ color:f.color, fontFamily:SANS }}>{f.label}</span>
      </div>
      <h3 className="text-sm font-bold text-slate-900 mb-1.5" style={{ fontFamily:SANS }}>{f.title}</h3>
      <p className="text-xs text-slate-500 leading-relaxed mb-4" style={{ fontFamily:SANS }}>{f.desc}</p>
      <FeaturePreview type={f.preview} />
    </motion.div>
  );
}

/* ─── Dashboard preview ─────────────────────────────────────────────────── */
function DashboardSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once:true, margin:"-80px" });
  const [tab, setTab] = useState<"leads"|"analytics"|"alerts">("leads");
  return (
    <section id="dashboard" ref={ref} className="py-20 bg-slate-50">
      <div className="mx-auto max-w-6xl px-6">
        <motion.div variants={staggerWrap()} initial="hidden" animate={inView?"show":"hidden"} className="text-center mb-10">
          <motion.p variants={fadeUp} className="text-xs font-semibold uppercase tracking-widest text-violet-600 mb-3" style={{ fontFamily:SANS }}>Live preview</motion.p>
          <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-bold text-slate-900 mb-3" style={{ fontFamily:SANS, letterSpacing:"-0.02em" }}>
            Your entire lead pipeline,<br />one screen
          </motion.h2>
          <motion.p variants={fadeUp} className="text-sm text-slate-500 max-w-md mx-auto" style={{ fontFamily:SANS }}>
            From the moment a prospect submits an enquiry on your website to the moment you close the deal — tracked, scored, and acted on here.
          </motion.p>
        </motion.div>
        <div className="flex justify-center gap-2 mb-6">
          {([["leads","📋 Leads"],["analytics","📊 Analytics"],["alerts","🔔 Alerts"]] as const).map(([k,l]) => (
            <button key={k} onClick={() => setTab(k)}
              className={`px-4 py-2 rounded-full text-xs font-semibold transition-all duration-200 ${tab===k?"bg-blue-600 text-white shadow-md shadow-blue-600/20":"bg-white text-slate-600 border border-slate-200 hover:border-blue-300"}`}
              style={{ fontFamily:SANS }}>
              {l}
            </button>
          ))}
        </div>
        <motion.div initial={{ opacity:0, y:32 }} animate={inView?{opacity:1,y:0}:{}} transition={{ duration:0.7, delay:0.15 }}>
          {/* Browser chrome */}
          <div className="rounded-t-xl border border-b-0 border-slate-200 bg-white px-4 py-3 flex items-center gap-3">
            <div className="flex gap-1.5">{["#FF5F57","#FEBC2E","#28C840"].map(c=><div key={c} className="w-2.5 h-2.5 rounded-full" style={{ background:c }} />)}</div>
            <div className="flex-1 bg-slate-100 rounded px-3 py-1 text-[10px] text-slate-400 font-mono max-w-xs mx-auto text-center">
              www.96kapital.com/dashboard/{tab}
            </div>
          </div>
          <AnimatePresence mode="wait">
            <motion.div key={tab} initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} transition={{ duration:0.25 }}>
              <div className="rounded-b-xl border border-slate-200 overflow-hidden shadow-xl shadow-slate-200/60">
                <div className="flex" style={{ minHeight:360, background:"#080808" }}>
                  {/* Sidebar */}
                  <div className="w-44 flex-shrink-0 border-r border-white/6 py-4 px-2.5 space-y-0.5" style={{ background:"#0e0e0e" }}>
                    <div className="flex items-center gap-2 px-2 py-2 mb-3">
                      <div className="w-6 h-6 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
                        <Target size={12} color="white" />
                      </div>
                      <span className="text-xs font-bold text-white truncate" style={{ fontFamily:SANS }}>96 Kapital CRM</span>
                    </div>
                    {[
                      {icon:Activity, label:"Dashboard"},
                      {icon:Users, label:"Leads", active:tab==="leads", dot:true},
                      {icon:BarChart3, label:"Analytics", active:tab==="analytics"},
                      {icon:Sparkles, label:"AI Insights"},
                      {icon:AlertTriangle, label:"Alerts", active:tab==="alerts", badge:"3"},
                      {icon:Download, label:"Export"},
                      {icon:Settings, label:"Settings"},
                    ].map(({icon:Icon,label,active,dot,badge}: any) => (
                      <div key={label} className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium ${active?"bg-blue-600/20 text-blue-400":"text-gray-500"}`} style={{ fontFamily:SANS }}>
                        <Icon size={13}/><span>{label}</span>
                        {dot && <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 ml-auto"/>}
                        {badge && <div className="ml-auto text-[8px] bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center">{badge}</div>}
                      </div>
                    ))}
                  </div>
                  {/* Content */}
                  <div className="flex-1 p-4 space-y-3" style={{ background:"#080808" }}>
                    <div className="grid grid-cols-4 gap-2.5">
                      {[{l:"Total Leads",v:"247",d:"+12%",c:"#60a5fa"},{l:"This Month",v:"34",d:"+8",c:"#34d399"},{l:"Conversion",v:"23%",d:"+3%",c:"#a78bfa"},{l:"Pipeline",v:"$124k",d:"Est.",c:"#fbbf24"}].map(s=>(
                        <div key={s.l} className="rounded-xl p-3 border border-white/6" style={{ background:"#111" }}>
                          <div className="text-[9px] text-gray-500 mb-1" style={{ fontFamily:SANS }}>{s.l}</div>
                          <div className="text-base font-bold mb-0.5" style={{ color:s.c, fontFamily:SANS }}>{s.v}</div>
                          <div className="text-[8px] text-emerald-400" style={{ fontFamily:SANS }}>{s.d}</div>
                        </div>
                      ))}
                    </div>
                    {tab==="leads" && (
                      <div className="rounded-xl border border-white/6 overflow-hidden" style={{ background:"#0d0d0d" }}>
                        <div className="flex items-center gap-2.5 px-3 py-2 border-b border-white/6">
                          <Search size={10} className="text-gray-600"/>
                          <span className="text-[10px] text-gray-600 flex-1" style={{ fontFamily:SANS }}>Search leads…</span>
                          {["All","New","Contacted","Qualified"].map(s=>(
                            <div key={s} className={`px-2 py-0.5 rounded-full text-[9px] font-medium border ${s==="All"?"bg-blue-600 text-white border-blue-600":"border-white/10 text-gray-500"}`} style={{ fontFamily:SANS }}>{s}</div>
                          ))}
                        </div>
                        {LEADS.map((l,i) => (
                          <div key={i} className="flex items-center gap-2.5 px-3 py-2 border-b border-white/4 last:border-0">
                            <div className="w-7 h-7 rounded-full bg-blue-900 flex items-center justify-center text-xs font-bold text-blue-300 flex-shrink-0">{l.name[0]}</div>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-semibold text-white/90 truncate" style={{ fontFamily:SANS }}>{l.name}</div>
                              <div className="text-[9px] text-gray-500" style={{ fontFamily:SANS }}>{l.type} · {l.time} ago</div>
                            </div>
                            <div className="text-xs font-bold text-emerald-400" style={{ fontFamily:SANS }}>{l.value}</div>
                            <div className={`text-[9px] px-2 py-0.5 rounded-full font-medium ${ST[l.status]}`} style={{ fontFamily:SANS }}>{l.status}</div>
                            <div className="flex gap-1">
                              <div className="w-6 h-6 rounded-lg bg-green-900/40 flex items-center justify-center"><MessageCircle size={9} className="text-green-400"/></div>
                              <div className="w-6 h-6 rounded-lg bg-blue-900/40 flex items-center justify-center"><Phone size={9} className="text-blue-400"/></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {tab==="analytics" && (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-xl border border-white/6 p-3" style={{ background:"#0d0d0d" }}>
                          <div className="text-xs text-gray-400 font-medium mb-2.5" style={{ fontFamily:SANS }}>Lead Volume (30 days)</div>
                          <div className="flex items-end gap-0.5 h-16">
                            {[40,55,35,70,50,85,65,90,75,100,80,95].map((h,i)=>(
                              <motion.div key={i} initial={{ height:0 }} animate={{ height:`${h}%` }}
                                transition={{ delay:i*0.04, duration:0.5 }}
                                className="flex-1 rounded-sm" style={{ background:i===11?"#2563eb":"rgba(37,99,235,0.25)" }} />
                            ))}
                          </div>
                        </div>
                        <div className="rounded-xl border border-white/6 p-3" style={{ background:"#0d0d0d" }}>
                          <div className="text-xs text-gray-400 font-medium mb-2.5" style={{ fontFamily:SANS }}>Service Breakdown</div>
                          <div className="space-y-2">
                            {[{l:"SaaS",p:52,c:"#f97316"},{l:"Agency",p:23,c:"#8b5cf6"},{l:"Real Estate",p:15,c:"#3b82f6"},{l:"Healthcare",p:10,c:"#10b981"}].map(s=>(
                              <div key={s.l}>
                                <div className="flex justify-between text-[9px] text-gray-500 mb-0.5" style={{ fontFamily:SANS }}><span>{s.l}</span><span>{s.p}%</span></div>
                                <div className="h-1 rounded-full bg-white/5 overflow-hidden">
                                  <motion.div initial={{ width:0 }} animate={{ width:`${s.p}%` }} transition={{ duration:0.6, delay:0.2 }}
                                    className="h-full rounded-full" style={{ background:s.c }} />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                    {tab==="alerts" && (
                      <div className="space-y-2">
                        {[{n:"Rajan Kumar",lv:"Critical",t:"2h 15m",c:"#ef4444",bg:"rgba(239,68,68,0.08)"},{n:"Mary Fernandez",lv:"High",t:"1h 42m",c:"#f97316",bg:"rgba(249,115,22,0.08)"},{n:"David Lee",lv:"Medium",t:"47m",c:"#3b82f6",bg:"rgba(59,130,246,0.08)"}].map(a=>(
                          <div key={a.n} className="flex items-center gap-3 p-3 rounded-xl border" style={{ background:a.bg, borderColor:a.c+"33" }}>
                            <AlertTriangle size={13} style={{ color:a.c }} className="flex-shrink-0"/>
                            <div className="flex-1" style={{ fontFamily:SANS }}>
                              <div className="text-xs font-semibold text-white">{a.n}</div>
                              <div className="text-[10px] text-gray-500">No response for {a.t}</div>
                            </div>
                            <div className="text-[9px] font-bold px-2 py-0.5 rounded-full border" style={{ color:a.c, borderColor:a.c+"40", fontFamily:SANS }}>{a.lv}</div>
                            <div className="flex gap-1.5">
                              <div className="px-2 py-1 rounded text-[9px] font-medium text-white" style={{ background:"#25d366", fontFamily:SANS }}>WA</div>
                              <div className="px-2 py-1 rounded text-[9px] font-medium text-white bg-blue-600" style={{ fontFamily:SANS }}>Call</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </div>
    </section>
  );
}

/* ─── How it works ──────────────────────────────────────────────────────── */
function HowItWorks() {
  const ref = useRef(null);
  const inView = useInView(ref, { once:true, margin:"-80px" });
  return (
    <section id="how-it-works" ref={ref} className="py-20 bg-white">
      <div className="mx-auto max-w-6xl px-6">
        <motion.div variants={staggerWrap()} initial="hidden" animate={inView?"show":"hidden"} className="text-center mb-12">
          <motion.p variants={fadeUp} className="text-xs font-semibold uppercase tracking-widest text-emerald-600 mb-3" style={{ fontFamily:SANS }}>How it works</motion.p>
          <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-bold text-slate-900 mb-3" style={{ fontFamily:SANS, letterSpacing:"-0.02em" }}>
            From enquiry to response<br />in under 5 minutes
          </motion.h2>
          <motion.p variants={fadeUp} className="text-sm text-slate-500 max-w-lg mx-auto" style={{ fontFamily:SANS }}>
            Prospects evaluate multiple vendors within minutes of reaching out. The first team to respond wins.
          </motion.p>
        </motion.div>
        <div className="grid lg:grid-cols-3 gap-6">
          {STEPS.map((s,i) => (
            <StepCard key={s.n} s={s} i={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

const STEPS = [
  { n:"01", icon:Users, color:"#2563eb", title:"Customer submits an enquiry", desc:"A prospect visits your website, fills out a contact or quote form — service interest, budget, and details — and hits submit. 96 Kapital CRM captures it instantly." },
  { n:"02", icon:Zap, color:"#16a34a", title:"You get an instant alert", desc:"Within seconds, a WhatsApp message and email hit your phone with the full lead — name, number, service required, and estimated value. No delays." },
  { n:"03", icon:TrendingUp, color:"#7c3aed", title:"Log in and close the deal", desc:"Open the dashboard, see your AI-scored lead list, click WhatsApp to send a personalised message, and update the status as you work it." },
];

/** Sibling of FeatureCard — see the note there for why these are components. */
function StepCard({ s, i }: { s: (typeof STEPS)[number]; i: number }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once:true, margin:"-50px" });
  return (
    <motion.div ref={ref}
      initial={{ opacity:0, y:24 }} animate={inView?{opacity:1,y:0}:{}}
      transition={{ duration:0.55, delay:i*0.12 }}
      className="relative rounded-2xl p-6 border border-slate-100 bg-slate-50 hover:bg-white transition-colors duration-200">
      <div className="text-[11px] font-bold tracking-widest mb-4 font-mono" style={{ color:s.color }}>{s.n}</div>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 border" style={{ background:s.color+"10", borderColor:s.color+"20" }}>
        <s.icon size={18} style={{ color:s.color }} />
      </div>
      <h3 className="text-base font-bold text-slate-900 mb-2" style={{ fontFamily:SANS }}>{s.title}</h3>
      <p className="text-xs text-slate-500 leading-relaxed" style={{ fontFamily:SANS }}>{s.desc}</p>
    </motion.div>
  );
}

/* ─── Pricing ───────────────────────────────────────────────────────────── */
function Pricing() {
  const ref = useRef(null);
  const inView = useInView(ref, { once:true, margin:"-80px" });
  const [yearly, setYearly] = useState(true);

  const INCLUDED = [
    "Unlimited lead captures from any connected source",
    "Instant WhatsApp + email alerts on every enquiry",
    "Full CRM dashboard — leads, status, history",
    "AI lead scoring and urgency detection",
    "Live analytics: volume, conversion, service breakdown",
    "Urgent alerts panel (30-min response monitoring)",
    "One-click WhatsApp response with pre-filled messages",
    "CSV export with 20 customisable fields",
    "Secure admin login (HMAC sessions, HTTP-only cookies)",
    "Neon Postgres database — your data, hosted privately",
    "Product/service image display in customer confirmation email",
    "24/7 uptime on Vercel infrastructure",
  ];

  return (
    <section id="pricing" ref={ref} className="py-20 bg-slate-50">
      <div className="mx-auto max-w-4xl px-6">
        <motion.div variants={staggerWrap()} initial="hidden" animate={inView?"show":"hidden"} className="text-center mb-10">
          <motion.p variants={fadeUp} className="text-xs font-semibold uppercase tracking-widest text-blue-600 mb-3" style={{ fontFamily:SANS }}>Pricing</motion.p>
          <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-bold text-slate-900 mb-3" style={{ fontFamily:SANS, letterSpacing:"-0.02em" }}>
            One plan. Everything included.
          </motion.h2>
          <motion.p variants={fadeUp} className="text-sm text-slate-500 max-w-sm mx-auto" style={{ fontFamily:SANS }}>
            No tiers, no feature gates, no hidden fees. One business, one platform.
          </motion.p>
        </motion.div>

        {/* Billing toggle */}
        <motion.div initial={{ opacity:0, y:16 }} animate={inView?{opacity:1,y:0}:{}} transition={{ delay:0.2 }}
          className="flex justify-center mb-8">
          <div className="flex items-center bg-white border border-slate-200 rounded-full p-1 gap-1 shadow-sm">
            <button onClick={() => setYearly(false)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${!yearly?"bg-slate-900 text-white":"text-slate-600 hover:text-slate-900"}`}
              style={{ fontFamily:SANS }}>Monthly</button>
            <button onClick={() => setYearly(true)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 flex items-center gap-1.5 ${yearly?"bg-slate-900 text-white":"text-slate-600 hover:text-slate-900"}`}
              style={{ fontFamily:SANS }}>
              Yearly
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full transition-colors ${yearly?"bg-emerald-500 text-white":"bg-emerald-100 text-emerald-600"}`}>
                50% OFF
              </span>
            </button>
          </div>
        </motion.div>

        {/* Pricing card */}
        <motion.div initial={{ opacity:0, y:24 }} animate={inView?{opacity:1,y:0}:{}} transition={{ delay:0.25 }}
          className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xl shadow-slate-100 max-w-lg mx-auto">
          {/* Top */}
          <div className="p-8 border-b border-slate-100" style={{ background:"linear-gradient(135deg,#f8faff 0%,#ffffff 100%)" }}>
            <div className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-4" style={{ fontFamily:SANS }}>
              Professional Plan
            </div>
            <div className="flex items-end gap-2 mb-1">
              <AnimatePresence mode="wait">
                <motion.div key={yearly?"y":"m"} initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-8 }}
                  transition={{ duration:0.2 }}
                  className="text-5xl font-bold text-slate-900" style={{ fontFamily:SANS, letterSpacing:"-0.03em" }}>
                  {yearly ? "SGD $49" : "SGD $49"}
                </motion.div>
              </AnimatePresence>
              <span className="text-slate-400 text-sm mb-2" style={{ fontFamily:SANS }}>/ month</span>
            </div>
            {yearly ? (
              <div className="flex items-center gap-2" style={{ fontFamily:SANS }}>
                <span className="text-sm text-slate-500">Billed as <strong className="text-slate-700">SGD $588/year</strong></span>
                <span className="text-xs line-through text-slate-400">$1,176</span>
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">Save $588</span>
              </div>
            ) : (
              <div className="text-sm text-slate-500" style={{ fontFamily:SANS }}>
                Billed monthly · <span className="text-blue-600 cursor-pointer font-medium" onClick={() => setYearly(true)}>Switch to yearly and save 50% →</span>
              </div>
            )}
          </div>
          {/* Features */}
          <div className="p-8">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4" style={{ fontFamily:SANS }}>
              Everything included
            </div>
            <ul className="space-y-2.5 mb-8">
              {INCLUDED.map(item => (
                <li key={item} className="flex items-start gap-2.5">
                  <Check size={13} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span className="text-xs text-slate-600 leading-relaxed" style={{ fontFamily:SANS }}>{item}</span>
                </li>
              ))}
            </ul>
            <Link href="/login"
              className="block w-full text-center py-3.5 rounded-xl font-semibold text-white text-sm bg-blue-600 hover:bg-blue-700 transition-colors shadow-md shadow-blue-600/20"
              style={{ fontFamily:SANS }}>
              Get Started — Log In
            </Link>
            <p className="text-center text-xs text-slate-400 mt-3" style={{ fontFamily:SANS }}>
              Single-business licence · Cancel anytime
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ─── Stats ─────────────────────────────────────────────────────────────── */
function Stats() {
  const ref = useRef(null);
  const inView = useInView(ref, { once:true, margin:"-80px" });
  return (
    <section ref={ref} className="py-20 bg-slate-900 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none"
           style={{ backgroundImage:"linear-gradient(rgba(255,255,255,0.018) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.018) 1px,transparent 1px)", backgroundSize:"60px 60px" }} />
      <div className="relative mx-auto max-w-6xl px-6">
        <motion.div variants={staggerWrap()} initial="hidden" animate={inView?"show":"hidden"} className="text-center mb-10">
          <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-bold text-white mb-2" style={{ fontFamily:SANS, letterSpacing:"-0.02em" }}>
            Why response speed wins
          </motion.h2>
          <motion.p variants={fadeUp} className="text-slate-400 text-sm" style={{ fontFamily:SANS }}>
            The data is clear. Prospects decide fast.
          </motion.p>
        </motion.div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { n:9, suffix:"×", label:"higher conversion when you respond within 5 minutes vs 60 minutes", c:"#60a5fa" },
            { n:78, suffix:"%", label:"of inbound leads receive no timely follow-up, across all industries", c:"#f87171" },
            { n:5, suffix:"s", label:"average alert delivery time from form submit to your WhatsApp", c:"#34d399" },
            { n:3, suffix:"+", label:"vendors a prospect typically evaluates before committing to one", c:"#a78bfa" },
          ].map(({n,suffix,label,c}) => (
            <motion.div key={label} initial={{ opacity:0, y:20 }} animate={inView?{opacity:1,y:0}:{}} transition={{ duration:0.5 }}
              className="rounded-xl p-5 border border-white/8" style={{ background:"#111" }}>
              <div className="text-4xl font-bold mb-2" style={{ color:c, fontFamily:SANS }}>
                <Counter to={n} suffix={suffix} />
              </div>
              <p className="text-slate-400 text-xs leading-relaxed" style={{ fontFamily:SANS }}>{label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── CTA ───────────────────────────────────────────────────────────────── */
function CTA() {
  const ref = useRef(null);
  const inView = useInView(ref, { once:true, margin:"-80px" });
  return (
    <section ref={ref} className="py-20 bg-white">
      <div className="mx-auto max-w-4xl px-6">
        <motion.div initial={{ opacity:0, y:24 }} animate={inView?{opacity:1,y:0}:{}} transition={{ duration:0.6 }}
          className="rounded-2xl p-12 text-center relative overflow-hidden"
          style={{ background:"linear-gradient(140deg,#1e3a8a 0%,#1d4ed8 60%,#0369a1 100%)" }}>
          <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage:"linear-gradient(rgba(255,255,255,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.04) 1px,transparent 1px)", backgroundSize:"32px 32px" }} />
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/15 text-white text-xs font-medium mb-6 border border-white/20" style={{ fontFamily:SANS }}>
              <Lock size={11} /> Secure · Always-on · Purpose-built
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4" style={{ fontFamily:SANS, letterSpacing:"-0.02em" }}>
              The next enquiry is coming.<br />Will you be ready?
            </h2>
            <p className="text-blue-100 text-sm mb-8 max-w-lg mx-auto leading-relaxed" style={{ fontFamily:SANS }}>
              Prospects search for solutions at all hours. Log in now and ensure every enquiry is captured, alerted, and acted on — day or night.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/login"
                className="inline-flex items-center justify-center gap-2 px-7 py-3 rounded-xl text-sm font-bold text-blue-700 bg-white hover:bg-blue-50 shadow-lg transition-all duration-200"
                style={{ fontFamily:SANS }}>
                Enter the Dashboard <ArrowRight size={16} />
              </Link>
              <a href="/login"
                className="inline-flex items-center justify-center gap-2 px-7 py-3 rounded-xl text-sm font-medium text-white border border-white/30 hover:bg-white/10 transition-all duration-200"
                style={{ fontFamily:SANS }}>
                <MessageCircle size={15} /> Contact Support
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ─── Footer ────────────────────────────────────────────────────────────── */
function Footer() {
  return (
    <footer className="bg-slate-900 border-t border-white/8 py-10">
      <div className="mx-auto max-w-6xl px-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <Logo />
        <p className="text-xs text-slate-500 text-center" style={{ fontFamily:SANS }}>
          © {new Date().getFullYear()} 96 Kapital CRM. All rights reserved.
        </p>
        <div className="flex items-center gap-5">
          {[["Dashboard","/login"],["Privacy","#"]].map(([l,h]) => (
            <a key={l} href={h} className="text-xs text-slate-500 hover:text-white transition-colors" style={{ fontFamily:SANS }}>{l}</a>
          ))}
        </div>
      </div>
    </footer>
  );
}

/* ─── Page ──────────────────────────────────────────────────────────────── */
export default function LandingPage() {
  return (
    <div style={{ fontFamily:SANS }}>
      <Nav />
      <Hero />
      <FeaturesSection />
      <DashboardSection />
      <HowItWorks />
      <Pricing />
      <Stats />
      <CTA />
      <Footer />
    </div>
  );
}
