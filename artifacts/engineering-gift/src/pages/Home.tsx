import { Link } from "wouter";
import { motion } from "framer-motion";
import { Zap, Wifi, Activity, ArrowRight, BookOpen } from "lucide-react";

const tools = [
  {
    title: "Voltage Drop Calculator",
    description: "Calculate voltage drop for fire alarms and standard cables over distance.",
    icon: Zap,
    href: "/voltage-drop",
    color: "from-blue-500 to-cyan-400",
    shadow: "shadow-blue-500/20"
  },
  {
    title: "Fiber Optic Link Budget",
    description: "Determine total loss and link margin for your fiber optic networks.",
    icon: Wifi,
    href: "/fiber-budget",
    color: "from-indigo-500 to-purple-500",
    shadow: "shadow-purple-500/20"
  },
  {
    title: "Inrush Current",
    description: "Estimate inrush current peaks and select appropriate circuit breakers.",
    icon: Activity,
    href: "/inrush-current",
    color: "from-orange-500 to-amber-400",
    shadow: "shadow-orange-500/20"
  }
];

export default function Home() {
  return (
    <div className="space-y-12 pb-12">
      {/* Hero Section */}
      <section className="relative rounded-3xl overflow-hidden glass-card p-8 md:p-16 border-0 shadow-2xl">
        <div className="absolute inset-0 z-0">
          <img 
            src={`${import.meta.env.BASE_URL}images/hero-bg.png`}
            alt="Abstract tech background"
            className="w-full h-full object-cover opacity-80 dark:opacity-40 mix-blend-overlay"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-white/40 to-white/90 dark:from-black/40 dark:to-slate-950/90" />
        </div>
        
        <div className="relative z-10 max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary font-medium text-sm mb-6 border border-primary/20 backdrop-blur-md">
              <Zap className="w-4 h-4" />
              <span>Smart ELV Calculations v1.0</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-display font-bold tracking-tight mb-6 text-slate-900 dark:text-white">
              Engineering <span className="text-gradient">Gift</span>
            </h1>
            <p className="text-lg md:text-xl text-slate-600 dark:text-slate-300 mb-2 max-w-2xl leading-relaxed">
              Design, calculate, and optimize your engineering systems.
            </p>
            <p className="text-lg md:text-xl text-slate-500 dark:text-slate-400 mb-8 font-medium">
              بسهولة واحترافية (Easily and professionally)
            </p>
            
            <div className="flex flex-wrap gap-4">
              <Link href="/voltage-drop" className="inline-flex items-center justify-center px-6 py-3 rounded-xl font-semibold bg-gradient-to-r from-primary to-cyan-500 text-white shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 transition-all duration-200">
                Start Calculating
                <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
              <Link href="/history" className="inline-flex items-center justify-center px-6 py-3 rounded-xl font-semibold glass hover:bg-white/80 dark:hover:bg-white/10 transition-all duration-200 text-slate-700 dark:text-slate-200">
                <BookOpen className="mr-2 w-5 h-5" />
                View History
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Tools Grid */}
      <section>
        <div className="flex items-center gap-3 mb-8">
          <div className="w-2 h-8 rounded-full bg-primary" />
          <h2 className="text-2xl font-bold font-display">Calculation Modules</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tools.map((tool, index) => (
            <motion.div
              key={tool.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + index * 0.1 }}
            >
              <Link href={tool.href}>
                <div className="group block h-full p-6 rounded-3xl glass-card hover:bg-white/90 dark:hover:bg-slate-800/80 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 cursor-pointer border border-slate-200/50 dark:border-white/5">
                  <div className={`w-14 h-14 rounded-2xl mb-6 flex items-center justify-center bg-gradient-to-br ${tool.color} shadow-lg ${tool.shadow}`}>
                    <tool.icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-slate-800 dark:text-slate-100 group-hover:text-primary transition-colors">
                    {tool.title}
                  </h3>
                  <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                    {tool.description}
                  </p>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}
