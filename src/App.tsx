import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Upload, 
  FileText, 
  BarChart3, 
  Network, 
  History, 
  ArrowRight, 
  Loader2, 
  AlertCircle,
  Database,
  TrendingUp,
  Globe,
  Zap,
  Calendar,
  MapPin
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { analyzeNewsContent, analyzeNewsByDate, AnalysisResult } from './services/gemini';

// --- Types ---

interface Mapping {
  id: number;
  problem_type: string;
  event: string;
  root_cause: string;
  frequency: number;
}

interface Stats {
  mappings: Mapping[];
  problemTypes: { problem_type: string; count: number }[];
  recentArticles: any[];
}

// --- Components ---

const Navbar = () => (
  <nav className="border-b border-zinc-800 bg-black/50 backdrop-blur-md sticky top-0 z-50">
    <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.4)]">
          <Zap className="w-5 h-5 text-black fill-current" />
        </div>
        <span className="text-xl font-bold tracking-tight text-white">NewsIntel</span>
      </div>
      <div className="flex gap-8 text-sm font-medium text-zinc-400">
        <a href="#analyze" className="hover:text-emerald-400 transition-colors">Analyze</a>
        <a href="#dashboard" className="hover:text-emerald-400 transition-colors">Dashboard</a>
        <a href="#knowledge" className="hover:text-emerald-400 transition-colors">Knowledge Base</a>
      </div>
    </div>
  </nav>
);

const Hero = () => (
  <section className="py-20 px-6 max-w-7xl mx-auto text-center">
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 tracking-tight leading-tight">
        Dynamic Root Cause <br />
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
          Intelligence from News
        </span>
      </h1>
      <p className="text-zinc-400 text-lg max-w-2xl mx-auto mb-10 leading-relaxed">
        Automatically analyze news articles, detect events, and identify underlying root causes 
        to build a continuously evolving knowledge map of global problem patterns.
      </p>
    </motion.div>
  </section>
);

export default function App() {
  const [inputMode, setInputMode] = useState<'date' | 'text' | 'file'>('date');
  const [inputValue, setInputValue] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedRegion, setSelectedRegion] = useState('Global');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/stats');
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error("Failed to fetch stats", err);
    }
  };

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      let analysis: AnalysisResult;

      if (inputMode === 'date') {
        analysis = await analyzeNewsByDate(selectedDate, selectedRegion);
      } else {
        if (!inputValue.trim()) {
          throw new Error("Please provide news content to analyze.");
        }
        analysis = await analyzeNewsContent(inputValue);
      }

      setResult(analysis);

      // Save to DB
      await fetch('/api/save-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...analysis,
          content: inputMode === 'text' ? inputValue.substring(0, 5000) : `Analyzed news from ${selectedDate} in ${selectedRegion}`,
          url: inputMode === 'date' ? `search://${selectedDate}/${selectedRegion}` : null
        })
      });

      fetchStats();
    } catch (err: any) {
      setError(err.message || "Analysis failed");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setInputValue(event.target?.result as string);
        setInputMode('text');
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-300 font-sans selection:bg-emerald-500/30">
      <Navbar />
      
      <main className="pb-20">
        <Hero />

        {/* Input Section */}
        <section id="analyze" className="max-w-4xl mx-auto px-6 mb-20">
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-8 backdrop-blur-sm shadow-2xl">
            <div className="flex gap-4 mb-6">
              {(['date', 'text', 'file'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => { setInputMode(mode); }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    inputMode === mode 
                      ? 'bg-emerald-500 text-black shadow-[0_0_15px_rgba(16,185,129,0.3)]' 
                      : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                  }`}
                >
                  {mode.toUpperCase()}
                </button>
              ))}
            </div>

            <div className="relative group">
              {inputMode === 'date' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="w-full bg-black border border-zinc-800 rounded-xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                    />
                  </div>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                    <input
                      type="text"
                      placeholder="Enter Region (e.g. Asia, USA, Global)..."
                      value={selectedRegion}
                      onChange={(e) => setSelectedRegion(e.target.value)}
                      className="w-full bg-black border border-zinc-800 rounded-xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                    />
                  </div>
                </div>
              ) : inputMode === 'text' ? (
                <textarea
                  placeholder="Paste news content here..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  rows={6}
                  className="w-full bg-black border border-zinc-800 rounded-xl p-4 text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all resize-none"
                />
              ) : (
                <label className="border-2 border-dashed border-zinc-800 rounded-xl p-10 text-center hover:border-emerald-500 transition-colors cursor-pointer bg-black/30 block">
                  <Upload className="w-10 h-10 text-zinc-500 mx-auto mb-4" />
                  <p className="text-zinc-400">Click to upload text file</p>
                  <input type="file" accept=".txt,.md" onChange={handleFileUpload} className="hidden" />
                </label>
              )}
            </div>

            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing || (inputMode !== 'date' && !inputValue)}
              className="w-full mt-6 bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-800 disabled:text-zinc-600 text-black font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Analyzing Intelligence...
                </>
              ) : (
                <>
                  <Search className="w-5 h-5" />
                  {inputMode === 'date' ? 'Collect & Analyze News' : 'Run Root Cause Analysis'}
                </>
              )}
            </button>

            {error && (
              <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-3 text-red-400 text-sm">
                <AlertCircle className="w-5 h-5 shrink-0" />
                {error}
              </div>
            )}
          </div>
        </section>

        {/* Results Section */}
        <AnimatePresence>
          {result && (
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-7xl mx-auto px-6 mb-20 grid grid-cols-1 lg:grid-cols-3 gap-8"
            >
              {/* Main Analysis */}
              <div className="lg:col-span-2 space-y-8">
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-8 backdrop-blur-sm">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                      <FileText className="w-6 h-6 text-emerald-400" />
                      Analysis Summary
                    </h2>
                    <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 text-xs font-bold rounded-full border border-emerald-500/20 uppercase tracking-wider">
                      {result.problemType}
                    </span>
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-4">{result.title}</h3>
                  <p className="text-zinc-400 leading-relaxed mb-6">{result.summary}</p>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-black/40 rounded-xl border border-zinc-800">
                      <span className="text-xs text-zinc-500 uppercase font-bold tracking-widest mb-1 block">Main Event</span>
                      <span className="text-white font-medium">{result.event}</span>
                    </div>
                    <div className="p-4 bg-black/40 rounded-xl border border-zinc-800">
                      <span className="text-xs text-zinc-500 uppercase font-bold tracking-widest mb-1 block">Problem Category</span>
                      <span className="text-white font-medium">{result.problemType}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-8 backdrop-blur-sm">
                  <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                    <TrendingUp className="w-6 h-6 text-emerald-400" />
                    Root Causes Identified
                  </h2>
                  <div className="space-y-4">
                    {result.rootCauses.map((cause, idx) => (
                      <div key={idx} className="flex items-start gap-4 p-4 bg-black/40 rounded-xl border border-zinc-800 group hover:border-emerald-500/50 transition-colors">
                        <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 font-bold shrink-0">
                          {idx + 1}
                        </div>
                        <p className="text-white font-medium leading-relaxed">{cause}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-8 backdrop-blur-sm">
                  <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                    <Search className="w-6 h-6 text-emerald-400" />
                    Causal Context
                  </h2>
                  <div className="space-y-3">
                    {result.causalSentences.map((sentence, idx) => (
                      <p key={idx} className="text-zinc-400 italic border-l-2 border-emerald-500/30 pl-4 py-1">
                        "{sentence}"
                      </p>
                    ))}
                  </div>
                </div>
              </div>

              {/* Sidebar: Entities & Knowledge Map */}
              <div className="space-y-8">
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 backdrop-blur-sm">
                  <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <Globe className="w-5 h-5 text-emerald-400" />
                    Named Entities
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {result.entities.map((entity, idx) => (
                      <div key={idx} className="px-3 py-1.5 bg-zinc-800/50 border border-zinc-700 rounded-lg text-xs">
                        <span className="text-zinc-500 font-bold mr-2">{entity.type}:</span>
                        <span className="text-white">{entity.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 backdrop-blur-sm">
                  <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <Network className="w-5 h-5 text-emerald-400" />
                    Knowledge Map Update
                  </h2>
                  <div className="space-y-4">
                    <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
                      <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-tighter mb-2">
                        <span>{result.problemType}</span>
                        <ArrowRight className="w-3 h-3" />
                        <span>{result.event}</span>
                      </div>
                      <div className="text-white text-sm font-medium">
                        New causal links established for {result.rootCauses.length} factors.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* Dashboard Section */}
        <section id="dashboard" className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Trends Chart */}
            <div className="lg:col-span-2 bg-zinc-900/50 border border-zinc-800 rounded-2xl p-8 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <BarChart3 className="w-6 h-6 text-emerald-400" />
                  Root Cause Frequency Trends
                </h2>
                <div className="text-xs text-zinc-500 font-bold uppercase tracking-widest">Global Intelligence</div>
              </div>
              
              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats?.mappings.slice(0, 8) || []} layout="vertical" margin={{ left: 40, right: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" horizontal={false} />
                    <XAxis type="number" hide />
                    <YAxis 
                      dataKey="root_cause" 
                      type="category" 
                      stroke="#9ca3af" 
                      fontSize={12} 
                      width={150}
                      tickFormatter={(val) => val.length > 20 ? val.substring(0, 20) + '...' : val}
                    />
                    <Tooltip 
                      cursor={{ fill: '#111827' }}
                      contentStyle={{ backgroundColor: '#000', border: '1px solid #374151', borderRadius: '8px' }}
                    />
                    <Bar dataKey="frequency" radius={[0, 4, 4, 0]}>
                      {stats?.mappings.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#10b981' : '#06b6d4'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Problem Categories Pie */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-8 backdrop-blur-sm">
              <h2 className="text-xl font-bold text-white mb-8 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
                Problem Categories
              </h2>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats?.problemTypes || []}
                      dataKey="count"
                      nameKey="problem_type"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                    >
                      {stats?.problemTypes.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={['#10b981', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'][index % 5]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#000', border: '1px solid #374151', borderRadius: '8px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 space-y-2">
                {stats?.problemTypes.map((type, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm">
                    <span className="text-zinc-400">{type.problem_type}</span>
                    <span className="text-white font-bold">{type.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Knowledge Base List */}
        <section id="knowledge" className="max-w-7xl mx-auto px-6 mt-20">
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-8 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Database className="w-6 h-6 text-emerald-400" />
                Dynamic Knowledge Base
              </h2>
              <div className="flex items-center gap-2 text-zinc-500 text-sm">
                <History className="w-4 h-4" />
                <span>{stats?.mappings.length || 0} Causal Mappings</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-500 text-xs font-bold uppercase tracking-widest">
                    <th className="pb-4 px-4">Problem Type</th>
                    <th className="pb-4 px-4">Event</th>
                    <th className="pb-4 px-4">Root Cause</th>
                    <th className="pb-4 px-4 text-right">Frequency</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {stats?.mappings.map((mapping) => (
                    <tr key={mapping.id} className="group hover:bg-white/5 transition-colors">
                      <td className="py-4 px-4">
                        <span className="px-2 py-1 bg-zinc-800 rounded text-[10px] font-bold text-zinc-400 uppercase">
                          {mapping.problem_type}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-white font-medium">{mapping.event}</td>
                      <td className="py-4 px-4 text-zinc-400">{mapping.root_cause}</td>
                      <td className="py-4 px-4 text-right">
                        <span className="text-emerald-400 font-mono font-bold">{mapping.frequency}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-zinc-800 py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-emerald-500 rounded flex items-center justify-center">
              <Zap className="w-4 h-4 text-black fill-current" />
            </div>
            <span className="text-lg font-bold text-white">NewsIntel</span>
          </div>
          <p className="text-zinc-500 text-sm">
            &copy; 2026 NewsIntel NLP Systems. Dynamic Root Cause Intelligence.
          </p>
          <div className="flex gap-6 text-zinc-400 hover:text-white transition-colors">
            <Globe className="w-5 h-5 cursor-pointer" />
            <Network className="w-5 h-5 cursor-pointer" />
            <Database className="w-5 h-5 cursor-pointer" />
          </div>
        </div>
      </footer>
    </div>
  );
}
