import React, { useState, useRef, useEffect, useMemo } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { motion, AnimatePresence } from "motion/react";
import { 
  Camera, 
  Upload, 
  Trash2, 
  Sparkles, 
  Droplets, 
  Recycle, 
  Info, 
  ArrowRight,
  RefreshCw,
  Plus,
  User,
  Medal,
  History,
  MapPin,
  ChevronRight,
  Trophy,
  Leaf,
  Star,
  ExternalLink,
  Award,
  Share2
} from "lucide-react";

// --- Types & Constants ---

enum WasteCategory {
  ORGANIK = "Organik",
  PLASTIK = "Plastik",
  KERTAS = "Kertas",
  LOGAM = "Logam",
  B3 = "B3/Bahaya"
}

interface UpcycleOption {
  title: string;
  description: string;
  difficulty: number; // 1-10 (Lower is Better/Cheaper - Cost Criterion)
  aesthetics: number; // 1-10 (Higher is Better - Benefit Criterion)
  impact: number;     // 1-10 (Higher is Better - Benefit Criterion)
  score?: number;     // Calculated Match Score (0-100)
}

interface AnalysisResult {
  kategori: WasteCategory;
  instruksiBersih: string;
  upcycleOptions: UpcycleOption[];
  impactTracker: string;
  impactScore: number; // 1-100 for progress bar
}

interface HistoryItem extends AnalysisResult {
  id: string;
  image: string;
  timestamp: number;
}

const MILESTONES = [
  { name: "Green Starter", threshold: 0, icon: <Leaf className="w-5 h-5" /> },
  { name: "Waste Warrior", threshold: 100, icon: <Medal className="w-5 h-5" /> },
  { name: "Eco Master", threshold: 500, icon: <Trophy className="w-5 h-5" /> },
];

// --- AI Initialization ---
const aiOptions = { apiKey: process.env.GEMINI_API_KEY || '' };
const ai = new GoogleGenAI(aiOptions);

interface WasteBank {
  id: string;
  name: string;
  address: string;
  distance: string;
}

export default function App() {
  // Navigation
  const [activeTab, setActiveTab] = useState<'scan' | 'gallery' | 'banks'>('scan');
  
  // States
  const [image, setImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<boolean>(false);
  const [nearbyBanks, setNearbyBanks] = useState<WasteBank[]>([]);
  
  // Gamification & Persistence
  const [points, setPoints] = useState(0);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Persistence Loading
  useEffect(() => {
    try {
      const savedPoints = localStorage.getItem('vibe_points');
      const savedHistory = localStorage.getItem('vibe_history');
      if (savedPoints) setPoints(parseInt(savedPoints));
      if (savedHistory) setHistory(JSON.parse(savedHistory));
    } catch (e) {
      console.error("Failed to load persistence:", e);
    }
  }, []);

  // Sync Persistence
  useEffect(() => {
    localStorage.setItem('vibe_points', points.toString());
    localStorage.setItem('vibe_history', JSON.stringify(history));
  }, [points, history]);

  // Derived Values
  const currentBadge = useMemo(() => {
    return [...MILESTONES].reverse().find(m => points >= m.threshold) || MILESTONES[0];
  }, [points]);

  // --- SAW Method Ranking Engine ---
  const rankOptionsWithSAW = (options: UpcycleOption[]): UpcycleOption[] => {
    // Weights: Impact (50%), Aesthetics (30%), Difficulty (20%)
    const W_IMPACT = 0.5;
    const W_AESTHETICS = 0.3;
    const W_DIFFICULTY = 0.2;

    const maxImpact = Math.max(...options.map(o => o.impact));
    const maxAesthetics = Math.max(...options.map(o => o.aesthetics));
    const minDifficulty = Math.min(...options.map(o => o.difficulty));

    return options.map(o => {
      // Normalization
      const rImpact = o.impact / maxImpact; // Benefit criterion
      const rAesthetics = o.aesthetics / maxAesthetics; // Benefit criterion
      const rDifficulty = minDifficulty / o.difficulty; // Cost criterion (lower score is better)

      // Preference Score
      const vScore = (rImpact * W_IMPACT) + (rAesthetics * W_AESTHETICS) + (rDifficulty * W_DIFFICULTY);
      return { ...o, score: Math.round(vScore * 100) };
    }).sort((a, b) => (b.score || 0) - (a.score || 0));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setError("Waduh, fotonya kegedean. Maksimal 10MB ya!");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
        setResult(null);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const analyzeWaste = async () => {
    if (!image || !process.env.GEMINI_API_KEY) {
      if (!process.env.GEMINI_API_KEY) {
        setError("API Key tidak ditemukan. Pastikan sudah menyetelnya di Secrets panel.");
      }
      return;
    }
    setIsAnalyzing(true);
    setError(null);

    try {
      const base64Data = image.split(',')[1];
      
      const prompt = `Kamu adalah VibeCycle AI, asisten pengelolaan sampah cerdas. 
      Analisis benda dalam foto ini dan berikan output dalam format JSON mentah tanpa markdown:
      1. Kategori: (Organik, Plastik, Kertas, Logam, atau B3/Bahaya).
      2. Instruksi Bersih: Langkah singkat ramah sebelum dibuang (max 10 kata).
      3. Upcycle Options: 3 ide kreatif spesifik. Untuk setiap ide berikan nilai 1-10 untuk: difficulty (1=mudah, 10=sulit), aesthetics (1=buruk, 10=indah), dan impact (1=rendah, 10=dahsyat).
      4. Impact Tracker: 1 statistik unik dampak positif (unik per benda).
      5. Impact Score: Score dampak lingkungan secara keseluruhan (1-100).

      Output JSON format:
      {
        "kategori": "string",
        "instruksiBersih": "string",
        "upcycleOptions": [
          { "title": "string", "description": "string", "difficulty": number, "aesthetics": number, "impact": number }
        ],
        "impactTracker": "string",
        "impactScore": number
      }`;

      const generateResult = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: {
          parts: [
            { text: prompt },
            { inlineData: { mimeType: "image/jpeg", data: base64Data } }
          ]
        }
      });

      const responseText = generateResult.text || '';
      // Clean potential json markers if the model adds them despite instructions
      const cleanedJson = responseText.replace(/```json|```/g, '').trim();
      const rawData: AnalysisResult = JSON.parse(cleanedJson);
      
      // Apply SAW Ranking
      const rankedOptions = rankOptionsWithSAW(rawData.upcycleOptions);
      const finalResult = { ...rawData, upcycleOptions: rankedOptions };

      setResult(finalResult);
      setPoints(p => p + 10);
      
      // Save to History
      const historyItem: HistoryItem = {
        id: Date.now().toString(),
        image,
        timestamp: Date.now(),
        ...finalResult
      };
      setHistory(prev => [historyItem, ...prev]);

    } catch (err: any) {
      console.error(err);
      setError("Duh, sepertinya Vibe check gagal. Coba lagi yuk!");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const reset = () => {
    setImage(null);
    setResult(null);
    setError(null);
  };

  const [isCopied, setIsCopied] = useState(false);

  const handleShare = async () => {
    if (!result) return;
    const shareText = `VibeCycle AI: Saya baru saja mengubah sampah ${result.kategori} menjadi "${result.upcycleOptions[0].title}"! Bumi jadi lebih hijau. 🌿✨ #VibeCycle #ZeroWaste`;
    const shareUrl = window.location.href;
    
    // Visual feedback helper
    const showCopied = () => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    };

    try {
      // Check for native share first (Smartphone/Safari/Edge)
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({
          title: 'VibeCycle Eco-Achievement',
          text: shareText,
          url: shareUrl,
        });
      } else {
        // Fallback for Desktop/In-App Browsers
        await navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
        showCopied();
      }
    } catch (err) {
      // If native share is cancelled or fails (common in iframes)
      // fallback to clipboard anyway
      try {
        await navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
        showCopied();
      } catch (clipErr) {
        console.error("Gagal membagikan:", clipErr);
        // Last resort: simple alert if everything is blocked (rare)
        alert("Pencapaianmu sudah disalin! Siap dibagikan ke media sosial.");
      }
    }
  };

  const findBanksWithGPS = () => {
    setIsLocating(true);
    setLocationError(false);
    setNearbyBanks([]);

    if (!navigator.geolocation) {
      setIsLocating(false);
      setLocationError(true);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        // Simulating logic based on coords or just providing a diverse dummy set
        setTimeout(() => {
          const mockBanks: WasteBank[] = [
            { id: '1', name: 'Bank Sampah Induk Kota', address: 'Jl. Ahmad Yani No. 12', distance: '0.8 km' },
            { id: '2', name: 'Pusat Daur Ulang Mandiri', address: 'Kawasan Teratai Indah', distance: '1.5 km' },
            { id: '3', name: 'Bank Sampah Hijau Lestari', address: 'Jl. Merdeka Barat No. 5', distance: '3.2 km' },
          ];
          setNearbyBanks(mockBanks);
          setIsLocating(false);
        }, 1500);
      },
      (error) => {
        setIsLocating(false);
        setLocationError(true);
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  };

  return (
    <div className="min-h-screen bg-[#FDFDFB] text-[#1A1C19] font-sans selection:bg-emerald-100 selection:text-emerald-900 pb-32 overflow-x-hidden">
      {/* Header with User Info */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#FDFDFB]/90 backdrop-blur-xl border-b border-gray-100 px-4 sm:px-6">
        <div className="max-w-xl mx-auto h-20 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-1 min-w-0">
            <motion.div 
              whileHover={{ rotate: 180 }}
              transition={{ duration: 0.6 }}
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-200 flex-shrink-0"
            >
              <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </motion.div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-emerald-950 truncate">VibeCycle</h1>
          </div>
          
          <motion.div 
            whileHover={{ scale: 1.05 }}
            className="flex items-center gap-2 sm:gap-4 bg-white px-3 sm:px-5 py-2 rounded-full border border-gray-100 shadow-sm flex-shrink-0"
          >
            <div className="text-right">
              <p className="text-[8px] sm:text-[10px] font-bold text-emerald-600 uppercase tracking-[0.1em] sm:tracking-[0.2em]">{currentBadge.name}</p>
              <p className="text-xs sm:text-sm font-black text-slate-800">{points} Pts</p>
            </div>
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 shadow-inner">
              {React.cloneElement(currentBadge.icon as React.ReactElement, { className: "w-4 h-4 sm:w-5 sm:h-5" })}
            </div>
          </motion.div>
        </div>
      </header>

      <main className="pt-24 sm:pt-28 px-4 sm:px-6 max-w-xl mx-auto">
        <AnimatePresence mode="wait">
          {activeTab === 'scan' ? (
            <motion.div
              key="scan-tab"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              {!image ? (
                <div className="space-y-8">
                  <div className="space-y-4">
                    <motion.h2 
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="text-3xl sm:text-5xl font-bold font-serif leading-[1.1] text-emerald-950 break-words overflow-hidden"
                    >
                      Beri Peluang Baru<br />
                      <span className="italic text-emerald-600">Untuk Semesta.</span> 🌿
                    </motion.h2>
                    <p className="text-slate-500 text-lg leading-relaxed">Analisis cerdas menggunakan Metode SAW untuk hasil upcycle yang paling pas buat kamu.</p>
                  </div>

                  <motion.div 
                    onClick={() => fileInputRef.current?.click()}
                    whileHover={{ scale: 1.01, boxShadow: "0 20px 40px -15px rgba(0, 0, 0, 0.1)" }}
                    whileTap={{ scale: 0.98 }}
                    className="aspect-square w-full rounded-[3rem] bg-white border border-gray-100 shadow-xl shadow-gray-100 flex flex-col items-center justify-center gap-6 cursor-pointer group relative overflow-hidden transition-all duration-500"
                  >
                    <div className="absolute inset-0 bg-emerald-50 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative z-10 w-24 h-24 rounded-[2rem] bg-emerald-50 flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
                      <Camera className="w-12 h-12 text-emerald-600" />
                    </div>
                    <div className="relative z-10 text-center space-y-1">
                      <p className="text-2xl font-bold text-emerald-950">Mulai Vibe Check</p>
                      <p className="text-slate-400">Ketuk untuk upload foto</p>
                    </div>
                  </motion.div>
                  <input ref={fileInputRef} type="file" onChange={handleFileUpload} accept="image/*" className="hidden" />
                </div>
              ) : (
                <div className="space-y-8">
                  <div className="space-y-4">
                    <div className="relative aspect-[4/3] w-full rounded-[2.5rem] overflow-hidden shadow-2xl bg-white border border-gray-100 group">
                      <img src={image} alt="Target" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                      {!result && !isAnalyzing && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-[2px]">
                          <motion.button 
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={analyzeWaste}
                            className="bg-emerald-600 text-white px-10 py-5 rounded-full font-bold flex items-center gap-3 shadow-2xl"
                          >
                            <Sparkles className="w-6 h-6" />
                            Cek Solusi & Kreativitas
                          </motion.button>
                        </div>
                      )}
                      {isAnalyzing && (
                        <div className="absolute inset-0 bg-white/95 flex flex-col items-center justify-center backdrop-blur-xl">
                          <motion.div 
                            animate={{ rotate: 360, scale: [1, 1.1, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="mb-8 p-10 rounded-full bg-emerald-50"
                          >
                            <RefreshCw className="w-20 h-20 text-emerald-600" />
                          </motion.div>
                          <div className="text-center space-y-2">
                            <p className="font-serif italic font-bold text-2xl sm:text-3xl text-emerald-950 animate-pulse">Sedang meracik ide terbaik...</p>
                            <p className="text-slate-400 text-[10px] sm:text-xs tracking-[0.2em] sm:tracking-[0.3em] uppercase font-bold">Merampingkan data berkelanjutan</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {!isAnalyzing && (
                      <motion.button
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        onClick={reset}
                        className="flex items-center gap-2 mx-auto text-slate-400 hover:text-red-500 transition-colors text-sm font-bold uppercase tracking-widest"
                      >
                        <Trash2 className="w-4 h-4" />
                        Ganti Gambar
                      </motion.button>
                    )}
                  </div>

                  {error && (
                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="p-6 bg-red-50 text-red-700 rounded-3xl border border-red-100 flex items-start gap-4">
                      <Info className="w-6 h-6 shrink-0" />
                      <p className="font-medium text-sm leading-relaxed">{error}</p>
                    </motion.div>
                  )}

                  <AnimatePresence>
                    {result && (
                      <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                        {/* Summary */}
                        <div className="flex items-center justify-between p-3 pl-8 bg-white rounded-full border border-gray-100 shadow-sm">
                           <span className="text-slate-400 text-xs font-bold uppercase tracking-[0.2em]">Kategori</span>
                           <span className="px-10 py-4 rounded-full bg-emerald-600 text-white text-lg font-bold shadow-lg shadow-emerald-100">{result.kategori}</span>
                        </div>

                        {/* SAW Ranked Options */}
                        <div className="space-y-4">
                          <div className="flex justify-between items-center px-4">
                            <h3 className="font-bold uppercase text-[12px] tracking-[0.2em] text-emerald-900/60">Smart Upcycle Ranking</h3>
                            <div className="flex items-center gap-1.5 text-[10px] bg-emerald-100 px-3 py-1 rounded-full font-black text-emerald-700">
                               <Award className="w-3 h-3" /> MATCH SCORE
                            </div>
                          </div>
                          <div className="grid gap-5">
                            {result.upcycleOptions.map((opt, idx) => (
                              <motion.div 
                                key={idx}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.15 }}
                                className={`p-8 rounded-[2.5rem] border relative overflow-hidden group shadow-sm hover:shadow-md transition-all ${
                                  idx === 0 ? 'bg-[#1A1C19] text-white border-[#1A1C19]' : 'bg-white border-gray-50'
                                }`}
                              >
                                <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-10 -mr-16 -mt-16 ${idx === 0 ? 'bg-emerald-500' : 'bg-emerald-200'}`} />
                                <div className="flex justify-between items-start relative z-10 mb-4">
                                  <div className="flex items-center gap-3">
                                    <div className={`text-[10px] font-black w-6 h-6 rounded-full flex items-center justify-center ${idx === 0 ? 'bg-emerald-500 text-white' : 'bg-emerald-100 text-emerald-700'}`}>
                                      {idx + 1}
                                    </div>
                                    <h4 className="text-2xl font-bold font-serif">{opt.title}</h4>
                                  </div>
                                  <div className={`px-4 py-1.5 rounded-full text-sm font-bold border ${idx === 0 ? 'border-emerald-500 text-emerald-400' : 'border-emerald-100 text-emerald-600'}`}>
                                    {opt.score}%
                                  </div>
                                </div>
                                <p className={`text-base sm:text-lg leading-snug mb-6 break-words hyphens-auto ${idx === 0 ? 'text-white/60' : 'text-slate-500 font-medium'}`}>{opt.description}</p>
                                <div className="grid grid-cols-3 gap-3">
                                  {[{l: 'DiF', v: opt.difficulty}, {l: 'AES', v: opt.aesthetics}, {l: 'ECO', v: opt.impact}].map((stat, i) => (
                                    <div key={i} className={`p-3 rounded-2xl flex flex-col items-center justify-center border ${idx === 0 ? 'bg-white/5 border-white/10' : 'bg-emerald-50/50 border-emerald-50'}`}>
                                       <span className={`text-[10px] font-black mb-1 ${idx === 0 ? 'text-white/40' : 'text-emerald-900/30'}`}>{stat.l}</span>
                                       <span className="text-sm font-bold">{stat.v}/10</span>
                                    </div>
                                  ))}
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        </div>

                        {/* Impact Tracker with Progress */}
                        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="bg-emerald-50 p-10 rounded-[3rem] border border-emerald-100 shadow-inner relative overflow-hidden">
                           <div className="flex items-center justify-between mb-8">
                             <div className="flex items-center gap-3 text-emerald-800">
                               <Recycle className="w-8 h-8" />
                               <h3 className="font-bold uppercase text-[12px] tracking-[0.2em]">Impact Progress</h3>
                             </div>
                             <span className="text-4xl font-serif italic font-bold text-emerald-600">{result.impactScore}%</span>
                           </div>
                           
                           <div className="w-full bg-emerald-200/50 h-4 rounded-full overflow-hidden mb-6">
                              <motion.div initial={{ width: 0 }} animate={{ width: `${result.impactScore}%` }} transition={{ duration: 1.5, ease: "circOut" }} className="h-full bg-emerald-600 shadow-lg shadow-emerald-200" />
                           </div>
                           
                           <div className="bg-white p-5 sm:p-6 rounded-[2rem] border border-emerald-100 shadow-sm">
                             <p className="text-lg sm:text-xl text-emerald-950 font-serif leading-relaxed italic break-words hyphens-auto">"{result.impactTracker}"</p>
                           </div>
                        </motion.div>

                        <div className="flex gap-4">
                          <motion.button 
                            whileHover={{ scale: 1.02, backgroundColor: '#f8fafc' }} 
                            whileTap={{ scale: 0.98 }} 
                            onClick={reset} 
                            className="flex-1 bg-white border border-gray-100 py-6 rounded-[2rem] font-bold text-slate-400 hover:text-emerald-700 transition-all flex items-center justify-center gap-3 shadow-lg"
                          >
                            Ulangi <Plus className="w-5 h-5" />
                          </motion.button>
                          
                          <motion.button 
                            whileHover={{ scale: 1.02 }} 
                            whileTap={{ scale: 0.98 }} 
                            onClick={handleShare} 
                            className={`flex-1 ${isCopied ? 'bg-emerald-800' : 'bg-emerald-600'} text-white py-6 rounded-[2rem] font-bold flex items-center justify-center gap-3 shadow-lg shadow-emerald-200 transition-all duration-300`}
                          >
                            {isCopied ? (
                              <>Tersalin! <Star className="w-5 h-5 fill-current" /></>
                            ) : (
                              <>Bagikan <Share2 className="w-5 h-5" /></>
                            )}
                          </motion.button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </motion.div>
          ) : activeTab === 'gallery' ? (
            <motion.div key="gallery-tab" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
               <div className="space-y-2">
                 <h2 className="text-3xl sm:text-4xl font-bold font-serif text-emerald-950 leading-tight">Koleksi Progresmu</h2>
                 <p className="text-slate-500 text-sm sm:text-base">Melihat setiap langkah kecil yang kamu ambil untuk bumi.</p>
               </div>
               
               {history.length === 0 ? (
                 <div className="py-20 sm:py-24 text-center bg-gray-50 rounded-[2.5rem] sm:rounded-[3rem] border border-dashed border-gray-200 space-y-4 px-4">
                    <History className="w-12 h-12 sm:w-16 sm:h-16 text-slate-200 mx-auto" />
                    <p className="text-slate-400 font-medium text-sm sm:text-base">Belum ada jejak hijau terekam.</p>
                 </div>
               ) : (
                 <div className="grid gap-4 sm:gap-6">
                   {history.map(item => (
                     <motion.div 
                        layoutId={item.id}
                        key={item.id} 
                        className="bg-white rounded-[2rem] sm:rounded-[2.5rem] border border-gray-100 overflow-hidden flex shadow-sm hover:shadow-xl transition-all duration-300 group"
                     >
                        <div className="w-24 sm:w-40 h-24 sm:h-40 shrink-0 overflow-hidden">
                           <img src={item.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                        </div>
                        <div className="p-4 sm:p-8 flex flex-col justify-center gap-1 sm:gap-3 min-w-0">
                           <div className="flex items-center gap-2">
                              <span className="text-[8px] sm:text-[10px] font-black uppercase bg-emerald-50 text-emerald-700 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full">#{item.kategori}</span>
                              <span className="text-[8px] sm:text-[10px] font-bold text-slate-300">{new Date(item.timestamp).toLocaleDateString()}</span>
                           </div>
                           <h4 className="text-base sm:text-xl font-bold text-emerald-950 font-serif line-clamp-1 break-words">{item.upcycleOptions[0].title}</h4>
                           <div className="flex items-center gap-1.5 text-[10px] sm:text-xs font-bold text-emerald-600">
                              <Star className="w-3 sm:w-3.5 h-3 sm:h-3.5" fill="currentColor" /> {item.upcycleOptions[0].score}% Rank
                           </div>
                        </div>
                     </motion.div>
                   ))}
                 </div>
               )}
            </motion.div>
          ) : (
            <motion.div key="banks-tab" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-10 relative overflow-x-clip px-0.5">
               {/* Ambient background glows for Glassmorphism depth */}
               <div className="absolute top-40 -right-24 w-72 h-72 bg-emerald-500/20 blur-[120px] rounded-full -z-10 pointer-events-none" />
               <div className="absolute bottom-40 -left-24 w-72 h-72 bg-emerald-400/20 blur-[120px] rounded-full -z-10 pointer-events-none" />

               <div className="space-y-3 relative z-10">
                 <h2 className="text-3xl sm:text-4xl font-bold font-serif text-emerald-950 leading-tight">Pusat Pengolahan Terdekat</h2>
                 <div className="flex items-center gap-2 text-emerald-600">
                    <MapPin className="w-4 h-4" />
                    <p className="text-xs sm:text-sm font-bold uppercase tracking-widest text-emerald-950/60">Real-time Location Service</p>
                 </div>
               </div>

               <div className="bg-white/40 backdrop-blur-3xl p-6 sm:p-10 rounded-[3rem] border border-white/50 shadow-2xl shadow-emerald-900/5 flex flex-col items-center text-center space-y-8 relative overflow-hidden z-10">
                 <div className="absolute top-0 left-0 w-full h-1 bg-emerald-600" />
                 
                 <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-emerald-50 flex items-center justify-center relative">
                   <motion.div 
                     animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0, 0.3] }}
                     transition={{ duration: 2, repeat: Infinity }}
                     className="absolute inset-0 rounded-full bg-emerald-400"
                   />
                   <MapPin className="w-8 h-8 sm:w-10 sm:h-10 text-emerald-600 relative z-10" />
                 </div>

                 <div className="space-y-3 max-w-sm">
                   <h3 className="text-xl sm:text-2xl font-bold text-emerald-950 font-serif">Bank Sampah Tracker</h3>
                   <p className="text-slate-500 text-sm sm:text-base leading-relaxed">
                     Klik di bawah untuk mendeteksi lokasi pengolahan sampah paling dekat dengan posisimu saat ini.
                   </p>
                 </div>

                 {locationError ? (
                   <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full space-y-4">
                     <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl text-amber-800 text-xs sm:text-sm font-medium">
                       Akses lokasi ditolak. Cari manual untuk hasil yang maksimal.
                     </div>
                     <motion.button
                       whileHover={{ scale: 1.02 }}
                       whileTap={{ scale: 0.98 }}
                       onClick={() => window.open('https://www.google.com/maps/search/bank+sampah+terdekat/', '_blank')}
                       className="w-full py-4 sm:py-5 rounded-[2rem] bg-emerald-950 text-white font-bold text-sm sm:text-base flex items-center justify-center gap-3"
                     >
                       <ExternalLink className="w-4 sm:w-5 h-4 sm:h-5" />
                       Cari Manual
                     </motion.button>
                   </motion.div>
                 ) : (
                   <div className="w-full max-w-md mx-auto">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      disabled={isLocating}
                      onClick={findBanksWithGPS}
                      className={`w-full py-5 sm:py-6 rounded-[2rem] font-bold text-base sm:text-lg flex items-center justify-center transition-all duration-300 shadow-xl px-4 ${
                        isLocating 
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                        : 'bg-emerald-600 text-white shadow-emerald-100 hover:bg-emerald-700'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-3">
                        {isLocating ? (
                          <>
                            <RefreshCw className="w-5 h-5 animate-spin shrink-0" />
                            <span className="text-center leading-tight">Mencari Lokasi...</span>
                          </>
                        ) : (
                          <>
                            <MapPin className="w-6 h-6 shrink-0" />
                            <span className="text-center leading-tight">Cari Bank Sampah di Sekitarku</span>
                          </>
                        )}
                      </div>
                    </motion.button>
                   </div>
                 )}
               </div>

               <AnimatePresence>
                 {nearbyBanks.length > 0 && (
                   <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="grid gap-4 sm:gap-6"
                   >
                     {nearbyBanks.map((bank, index) => (
                       <motion.div 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        key={bank.id} 
                        className="bg-white/40 backdrop-blur-3xl p-5 sm:p-6 rounded-[2.5rem] border border-white/40 shadow-xl shadow-emerald-900/5 flex flex-col sm:flex-row items-center justify-between gap-4 group hover:bg-white/50 hover:border-white transition-all duration-500 relative z-10"
                       >
                         <div className="flex items-center gap-5 w-full sm:w-auto">
                            <div className="w-14 h-14 shrink-0 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-xl shadow-emerald-200">
                               <MapPin className="w-7 h-7" />
                            </div>
                            <div className="min-w-0 flex-1">
                               <h4 className="text-base sm:text-lg font-bold text-emerald-950 truncate leading-tight mb-1">{bank.name}</h4>
                               <p className="text-xs text-slate-500 font-medium line-clamp-1">{bank.address}</p>
                               <div className="flex items-center gap-1.5 mt-1">
                                 <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                 <span className="text-[11px] font-black text-emerald-700 uppercase tracking-wider">{bank.distance}</span>
                               </div>
                            </div>
                         </div>
                         <motion.button 
                           whileHover={{ scale: 1.05 }}
                           whileTap={{ scale: 0.95 }}
                           onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(bank.name + " " + bank.address)}`, '_blank')}
                           className="w-full sm:w-auto px-5 py-3 bg-emerald-950 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg hover:bg-emerald-900 transition-colors"
                         >
                           Rute Sekarang <ChevronRight className="w-4 h-4" />
                         </motion.button>
                       </motion.div>
                     ))}
                   </motion.div>
                 )}
               </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Modern Liquid Glass Dock Navigation */}
      <div className="fixed bottom-6 sm:bottom-10 left-4 sm:left-6 right-4 sm:right-6 z-50">
        <nav className="max-w-md mx-auto bg-emerald-950/40 backdrop-blur-3xl p-1.5 sm:p-2 sm:px-3 rounded-full shadow-[0_25px_50px_-12px_rgba(6,78,59,0.5)] flex items-center justify-between border border-white/20">
          <button 
            onClick={() => setActiveTab('scan')}
            className={`flex flex-1 items-center justify-center gap-2 sm:gap-3 py-3 sm:py-4 rounded-full transition-all group ${activeTab === 'scan' ? 'bg-emerald-600 text-white shadow-lg' : 'text-white/40 hover:text-white/60'}`}
          >
            <Camera className={`w-5 h-5 sm:w-6 sm:h-6 transition-transform ${activeTab === 'scan' ? 'scale-110' : 'group-hover:scale-110'}`} />
            {activeTab === 'scan' && <span className="text-[11px] sm:text-[13px] font-black uppercase tracking-widest">Analisis</span>}
          </button>
          
          <button 
            onClick={() => setActiveTab('gallery')}
            className={`flex flex-1 items-center justify-center gap-2 sm:gap-3 py-3 sm:py-4 rounded-full transition-all group ${activeTab === 'gallery' ? 'bg-emerald-600 text-white shadow-lg' : 'text-white/40 hover:text-white/60'}`}
          >
            <History className={`w-5 h-5 sm:w-6 sm:h-6 transition-transform ${activeTab === 'gallery' ? 'scale-110' : 'group-hover:scale-110'}`} />
            {activeTab === 'gallery' && <span className="text-[11px] sm:text-[13px] font-black uppercase tracking-widest">Koleksi</span>}
          </button>
          
          <button 
            onClick={() => setActiveTab('banks')}
            className={`flex flex-1 items-center justify-center gap-2 sm:gap-3 py-3 sm:py-4 rounded-full transition-all group ${activeTab === 'banks' ? 'bg-emerald-600 text-white shadow-lg' : 'text-white/40 hover:text-white/60'}`}
          >
            <MapPin className={`w-5 h-5 sm:w-6 sm:h-6 transition-transform ${activeTab === 'banks' ? 'scale-110' : 'group-hover:scale-110'}`} />
            {activeTab === 'banks' && <span className="text-[11px] sm:text-[13px] font-black uppercase tracking-widest">Maps</span>}
          </button>
        </nav>
      </div>

      {/* Atmospheric Background Effects */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div className="absolute top-[-20%] right-[-10%] w-[80vw] h-[80vw] bg-emerald-50/50 rounded-full blur-[140px]" />
        <div className="absolute bottom-[-10%] left-[-20%] w-[60vw] h-[60vw] bg-emerald-100/30 rounded-full blur-[120px]" />
      </div>
    </div>
  );
}



