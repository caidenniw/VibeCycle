import React, { useState, useRef, useEffect, useMemo } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { motion, AnimatePresence } from "motion/react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import LandingPage from './LandingPage';
import DarkModeToggle from './DarkModeToggle';
import confetti from 'canvas-confetti';
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
  Share2,
  Zap,
  X
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
  creativity: number; // 1-10 (Higher is Better - Benefit)
  sell_value: number; // 1-10 (Higher is Better - Benefit)
  ease: number;       // 1-10 (Higher is Better - Benefit)
  score?: number;     // Calculated Match Score (0-100)
}

interface EcoImpact {
  water_saved: number;
  carbon_reduced: number;
  waste_diverted: number;
  energy_saved: number;
  description: string;
}

interface AnalysisResult {
  detected_item: string;
  greeting: string;
  kategori: WasteCategory;
  recommendations: UpcycleOption[];
  eco_impact: EcoImpact;
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
  const [isStarted, setIsStarted] = useState(false);
  // Navigation
  const [activeTab, setActiveTab] = useState<'scan' | 'gallery' | 'banks'>('scan');

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [isStarted, activeTab]);
  
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
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<HistoryItem | null>(null);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Persistence Loading
  useEffect(() => {
    const loadData = () => {
      try {
        const savedPoints = localStorage.getItem('vibe_points');
        const savedHistory = localStorage.getItem('vibe_history');
        if (savedPoints) setPoints(parseInt(savedPoints));
        if (savedHistory) setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error("Failed to load persistence:", e);
      } finally {
        // Artifical delay to show smooth transitions
        setTimeout(() => setIsHistoryLoading(false), 1000);
      }
    };
    loadData();
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
    // Benefit Only Weights: Kreativitas (40%), Nilai Jual (30%), Kemudahan (30%)
    const W_CREATIVITY = 0.4;
    const W_SELL_VALUE = 0.3;
    const W_EASE = 0.3;

    const maxCreativity = Math.max(...options.map(o => o.creativity)) || 1;
    const maxSellValue = Math.max(...options.map(o => o.sell_value)) || 1;
    const maxEase = Math.max(...options.map(o => o.ease)) || 1;

    return options.map(o => {
      // Normalization (Benefit Criterion: value / max)
      const rCreativity = o.creativity / maxCreativity;
      const rSellValue = o.sell_value / maxSellValue;
      const rEase = o.ease / maxEase;

      // Preference Score
      const vScore = (rCreativity * W_CREATIVITY) + (rSellValue * W_SELL_VALUE) + (rEase * W_EASE);
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
      
      const prompt = `Kamu adalah VibeCycle AI, asisten pengelolaan sampah cerdas dengan nilai filosofis "Transformasi Limbah Menjadi Karya". 
      Analisis benda dalam foto ini dan berikan output dalam format JSON mentah tanpa markdown:
      1. detected_item: Nama benda spesifik yang terdeteksi.
      2. kategori: (Organik, Plastik, Kertas, Logam, atau B3/Bahaya).
      3. greeting: Sapaan apresiasi singkat, ramah, dan menyemangati dalam Bahasa Indonesia santai (misal: "Wah keren banget! Barang ini bisa jadi karya yang luar biasa!"). Jika gambar bukan sampah atau tidak jelas, minta untuk difoto ulang dengan sopan.
      4. recommendations: 3 ide upcycle spesifik. Untuk setiap ide berikan nilai 1-10 (semua Benefit/Semakin tinggi semakin baik): creativity (1-10: Kreativitas ide), sell_value (1-10: Potensi harga jual), dan ease (1-10: Kemudahan dibuat).
      5. eco_impact: Objek berisi metrik rinci: water_saved (liter air yang dihemat), carbon_reduced (kg emisi CO2 yang dicegah per item), waste_diverted (gram sampah yang dialihkan), energy_saved (kWh energi yang dihemat), dan description (1 kalimat fun fact dampaknya, misal "Dengan mendaur ulang barang ini, kamu menghemat energi setara 2 jam menyalakan TV!").

      Output JSON format:
      {
        "detected_item": "...nama benda...",
        "kategori": "...",
        "greeting": "...",
        "recommendations": [
          { "title": "...", "description": "...", "creativity": 0, "sell_value": 0, "ease": 0 }
        ],
        "eco_impact": {
          "water_saved": 0,
          "carbon_reduced": 0,
          "waste_diverted": 0,
          "energy_saved": 0,
          "description": "..."
        }
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
      const rankedOptions = rankOptionsWithSAW(rawData.recommendations);
      const finalResult = { ...rawData, recommendations: rankedOptions };

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
      setError("Maaf ya, gambarnya kurang jelas atau ada gangguan koneksi. Coba foto ulang sekali lagi ya.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const reset = () => {
    setImage(null);
    setResult(null);
    setError(null);
  };

  const handleIMadeThis = async (e: React.MouseEvent, item: HistoryItem) => {
    e.stopPropagation();
    confetti({
      particleCount: 150,
      spread: 80,
      origin: { y: 0.6 }
    });
    
    const shareText = `Saya baru saja membuat "${item.recommendations?.[0]?.title}" dari limbah ${item.detected_item} di VibeCycle! 🌿✨ #TransformasiLimbahMenjadiKarya #VibeCycle`;
    const shareUrl = window.location.href;
    
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({
          title: 'VibeCycle - Transformasi Limbah',
          text: shareText,
          url: shareUrl,
        });
      } else {
        await navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
      }
    } catch (err) {
      console.log('Share attempt failed or cancelled', err);
    }
  };

  const [isCopied, setIsCopied] = useState(false);

  const handleShare = async () => {
    if (!result) return;
    const shareText = `VibeCycle: Saya baru saja mentransformasi limbah ${result.detected_item} menjadi "${result.recommendations[0].title}"! Bumi jadi lebih hijau. 🌿✨ #TransformasiLimbahMenjadiKarya #VibeCycle`;
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
      async (position) => {
        try {
          const { latitude: lat, longitude: lon } = position.coords;
          
          let banks: WasteBank[] = [];
          
          // Try Overpass API first for real recycling nodes
          try {
             const query = `[out:json];(node["amenity"="recycling"](around:10000,${lat},${lon});way["amenity"="recycling"](around:10000,${lat},${lon});node["name"~"sampah",i](around:10000,${lat},${lon}););out center 5;`;
             const controller = new AbortController();
             const timeoutId = setTimeout(() => controller.abort(), 6000);
             const res = await fetch('https://overpass-api.de/api/interpreter', {
                method: 'POST',
                body: query,
                signal: controller.signal
             });
             clearTimeout(timeoutId);
             const overpassData = await res.json();
             
             if (overpassData && overpassData.elements && overpassData.elements.length > 0) {
                 const R = 6371;
                 const rawBanks = overpassData.elements.map((el: any) => {
                     const elLat = el.lat || el.center?.lat;
                     const elLon = el.lon || el.center?.lon;
                     
                     let d = 0;
                     if (elLat && elLon) {
                       const dLat = (elLat - lat) * Math.PI / 180;
                       const dLon = (elLon - lon) * Math.PI / 180;
                       const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                         Math.cos(lat * Math.PI / 180) * Math.cos(elLat * Math.PI / 180) *
                         Math.sin(dLon/2) * Math.sin(dLon/2);
                       const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
                       d = R * c;
                     }
                     
                     const name = el.tags?.name || (el.tags?.recycling_type ? `Pusat Daur Ulang (${el.tags.recycling_type})` : 'Pusat Daur Ulang Umum');
                     let address = 'Terdekat dari lokasimu';
                     if (el.tags?.['addr:street']) address = el.tags['addr:street'] + (el.tags?.['addr:housenumber'] ? ' No. ' + el.tags['addr:housenumber'] : '');
                     
                     return {
                        id: String(el.id),
                        name,
                        address,
                        distance: d < 1 ? '< 1 km' : d.toFixed(1) + ' km',
                        rawDist: d
                     };
                 });
                 
                 rawBanks.sort((a: any, b: any) => a.rawDist - b.rawDist);
                 banks = rawBanks.map(({ id, name, address, distance }: any) => ({ id, name, address, distance }));
             }
          } catch(e) {
             console.log('Overpass error or timeout', e);
          }
          
          // Fallback to nominatim reverse geocoding if overpass finds nothing or fails
          if (banks.length === 0) {
             const revRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=14`);
             const revData = await revRes.json();
             
             const address = revData.address || {};
             const region = address.suburb || address.village || address.town || address.city_district || address.county || 'Kawasan Anda';
             const city = address.city || address.town || address.county || address.state || '';
             
             banks = [
               { id: 'f1', name: `Bank Sampah Induk ${city || region}`.trim(), address: `Pusat Layanan ${region}`.trim(), distance: '± 1.2 km' },
               { id: 'f2', name: `Pusat Daur Ulang Mandiri (${region})`.trim(), address: `Kawasan ${region}`.trim(), distance: '± 2.5 km' },
               { id: 'f3', name: `Komunitas Hijau ${city || region}`.trim(), address: `Kecamatan/Balai ${region}`.trim(), distance: '± 4.0 km' },
             ];
             
             // Deduplicate "Induk " from "Induk " in case city is empty
             banks = banks.map(b => ({ ...b, name: b.name.replace(/\s+/g, ' ') }));
          }

          setNearbyBanks(banks.slice(0, 5));
          setIsLocating(false);

        } catch (error) {
          console.error("Locating logic error", error);
          setIsLocating(false);
          setLocationError(true);
        }
      },
      (error) => {
        setIsLocating(false);
        setLocationError(true);
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  };

  const chartData = useMemo(() => {
    const sorted = [...history].sort((a, b) => a.timestamp - b.timestamp);
    let totalWaste = 0;
    return sorted.map((item) => {
      totalWaste += item.eco_impact?.waste_diverted || 0;
      return {
        date: new Date(item.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
        waste: totalWaste,
      };
    });
  }, [history]);

  if (!isStarted) {
    return <LandingPage onStart={() => setIsStarted(true)} />;
  }

  return (
    <div className="min-h-screen bg-[#FDFDFB] dark:bg-slate-950 text-[#1A1C19] dark:text-slate-100 font-sans selection:bg-emerald-100 selection:text-emerald-900 pb-36 overflow-x-hidden">
      {/* Refined Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#FDFDFB]/80 dark:bg-slate-950/80 backdrop-blur-2xl border-b border-emerald-950/5 dark:border-white/10 px-6">
        <div className="max-w-xl mx-auto h-24 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <motion.div 
              whileHover={{ rotate: 90 }}
              className="w-10 h-10 rounded-full bg-emerald-950 dark:bg-emerald-600 flex items-center justify-center shadow-xl shadow-emerald-950/20"
              title="Reset Aplikasi / Muat Ulang"
            >
              <RefreshCw className="w-5 h-5 text-white" />
            </motion.div>
            <div 
              className="flex flex-col -space-y-1 cursor-pointer group"
              onClick={() => setIsStarted(false)}
              title="Kembali ke Beranda"
            >
              <h1 className="text-xl font-bold tracking-tight text-emerald-950 dark:text-emerald-50 font-sans group-hover:text-emerald-700 dark:text-emerald-300 transition-colors">VibeCycle</h1>
              <span className="text-[10px] uppercase tracking-[0.2em] font-black text-emerald-600 dark:text-emerald-400/60">Transformasi Limbah Menjadi Karya</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4">
            <DarkModeToggle />
            <motion.div 
              whileHover={{ y: -2 }}
              className="flex items-center gap-3 sm:gap-4 pl-3 sm:pl-4 border-l border-emerald-950/5 dark:border-white/10"
            >
            <div className="text-right">
              <p className="text-[9px] font-black text-emerald-700 dark:text-emerald-300 uppercase tracking-[0.2em]">{currentBadge.name}</p>
              <p className="text-xs sm:text-sm font-sans font-medium text-slate-500 dark:text-slate-400">{points} Eco-Pts</p>
            </div>
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white dark:bg-slate-800 border border-emerald-950/5 dark:border-white/10 shadow-sm flex items-center justify-center text-emerald-700 dark:text-emerald-300">
              {React.cloneElement(currentBadge.icon as React.ReactElement, { className: "w-4 h-4 sm:w-5 sm:h-5" })}
            </div>
          </motion.div>
          </div>
        </div>
      </header>

      <main className="pt-32 px-6 max-w-xl mx-auto">
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
                <div className="space-y-12">
                  <div className="space-y-6">
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="inline-block px-4 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-[10px] font-black uppercase tracking-[0.3em]"
                    >
                      AI Waste Identification
                    </motion.div>
                    <motion.h2 
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 }}
                      className="text-5xl sm:text-7xl font-bold font-serif leading-[0.9] text-emerald-950 dark:text-emerald-50"
                    >
                      Beri Peluang Baru<br />
                      <span className="italic font-light text-emerald-600 dark:text-emerald-400/80">Untuk Semesta.</span>
                    </motion.h2>
                    <p className="text-slate-500 dark:text-slate-400 text-lg sm:text-xl font-medium leading-relaxed max-w-sm">
                      Identifikasi sampah & temukan ide kreatif <span className="text-emerald-950 dark:text-emerald-50">Upcycle</span> yang ditenagai AI.
                    </p>
                  </div>

                  <motion.div 
                    onClick={() => fileInputRef.current?.click()}
                    whileHover={{ scale: 0.995 }}
                    whileTap={{ scale: 0.98 }}
                    className="aspect-[5/4] w-full rounded-[3.5rem] bg-white dark:bg-slate-800 border border-emerald-950/5 dark:border-white/10 shadow-2xl shadow-emerald-900/5 flex flex-col items-center justify-center gap-8 cursor-pointer group relative overflow-hidden transition-all duration-700"
                    title="Unggah atau Ambil Foto Sampah"
                  >
                    <div className="absolute inset-0 bg-emerald-50 dark:bg-emerald-950/40 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    
                    <div className="relative z-10 w-28 h-28 rounded-full bg-[#1A1C19] flex items-center justify-center group-hover:shadow-[0_0_50px_rgba(5,150,105,0.2)] transition-all">
                      <Camera className="w-12 h-12 text-white" />
                    </div>
                    
                    <div className="relative z-10 text-center space-y-2">
                      <p className="text-2xl font-bold font-serif text-emerald-950 dark:text-emerald-50 group-hover:tracking-tight transition-all">Scan Objek Sampah</p>
                      <p className="text-slate-400 text-sm font-medium uppercase tracking-widest">Ketuk untuk Ambil Foto</p>
                    </div>

                    {/* Subtle corner accents */}
                    <div className="absolute top-8 left-8 w-4 h-4 border-t-2 border-l-2 border-emerald-950/10 rounded-tl-lg" />
                    <div className="absolute bottom-8 right-8 w-4 h-4 border-b-2 border-r-2 border-emerald-950/10 rounded-br-lg" />
                  </motion.div>
                  <input ref={fileInputRef} type="file" onChange={handleFileUpload} accept="image/*" className="hidden" />
                </div>
              ) : (
                <div className="space-y-12">
                  <div className="space-y-4">
                    <div className="relative aspect-[4/3] w-full rounded-[3rem] overflow-hidden shadow-2xl bg-slate-100 dark:bg-slate-900 border border-emerald-950/5 dark:border-white/10 group transform-gpu">
                      <img src={image} alt="Target" className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105 transform-gpu" />
                      {!result && !isAnalyzing && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <motion.button 
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={analyzeWaste}
                            className="bg-white dark:bg-slate-800 text-emerald-950 dark:text-emerald-50 px-10 py-6 rounded-full font-black text-xs uppercase tracking-[0.2em] flex items-center gap-3 shadow-2xl"
                            title="Analisis Sampah dengan AI"
                          >
                            <Sparkles className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                            Mulai Analisis AI
                          </motion.button>
                        </div>
                      )}
                      {isAnalyzing && (
                        <div className="absolute inset-0 bg-[#FDFDFB]/95 dark:bg-slate-950/95 flex flex-col items-center justify-center backdrop-blur-2xl">
                          <motion.div 
                            animate={{ rotate: 360 }}
                            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                            className="mb-10 w-24 h-24 rounded-full border-4 border-emerald-950/10 dark:border-white/10 border-t-emerald-600 dark:border-t-emerald-400 flex items-center justify-center shadow-lg"
                          >
                            <motion.div 
                              animate={{ scale: [1, 1.1, 1], rotate: -360 }}
                              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                              className="w-16 h-16 rounded-full bg-emerald-50/50 dark:bg-emerald-950/40 flex items-center justify-center shadow-[0_0_15px_rgba(5,150,105,0.1)]"
                            >
                              <RefreshCw className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                            </motion.div>
                          </motion.div>
                          <div className="text-center space-y-3">
                            <p className="font-serif italic font-bold text-3xl text-emerald-950 dark:text-emerald-50 tracking-tight">Merangkai Kreativitas...</p>
                            <div className="flex gap-1 justify-center">
                              {[0, 1, 2].map(i => (
                                <motion.div 
                                  key={i}
                                  animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
                                  transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                                  className="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400" 
                                />
                              ))}
                            </div>
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
                        title="Hapus Gambar Ini & Kembali"
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
                      <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} className="space-y-12">
                        {/* Status Bar */}
                        <div className="space-y-4">
                           {result.greeting && (
                             <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/50 p-6 sm:p-8 rounded-[2.5rem] relative overflow-hidden">
                               <div className="absolute top-0 right-0 p-4 opacity-[0.03]">
                                 <Sparkles className="w-24 h-24 text-emerald-900" />
                               </div>
                               <p className="font-serif italic text-emerald-950 dark:text-emerald-50 font-medium relative z-10 leading-loose text-lg sm:text-xl">"{result.greeting}"</p>
                             </div>
                           )}
                           <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl p-5 sm:px-6 sm:py-3 rounded-[1.5rem] sm:rounded-full border border-emerald-950/5 dark:border-white/10 shadow-sm shadow-emerald-900/5">
                              <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-4 min-w-0 flex-1">
                                <span className="text-emerald-950 dark:text-emerald-50/50 text-[10px] font-black uppercase tracking-[0.3em] shrink-0">Terdeteksi</span>
                                <div className="hidden sm:block w-px h-4 bg-emerald-950 dark:bg-emerald-600/10"></div>
                                <span className="text-emerald-950 dark:text-emerald-50 font-bold text-base sm:text-sm">{result.detected_item}</span>
                              </div>
                              <span className="inline-flex items-center justify-center self-start sm:self-auto px-5 py-2.5 rounded-full bg-emerald-950 dark:bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest shrink-0 shadow-md">{result.kategori}</span>
                           </div>
                        </div>

                        {/* Analysis Card */}
                        <div className="space-y-6">
                          <div className="flex justify-between items-end px-2">
                             <div className="space-y-1">
                               <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400/60 uppercase tracking-[0.4em]">Upcycle Strategies</p>
                               <h3 className="text-3xl font-bold font-serif text-emerald-950 dark:text-emerald-50 italic">Pilihan Terbaik Untukmu</h3>
                             </div>
                             <div className="px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-[10px] font-black border border-emerald-100 dark:border-emerald-900/50 uppercase tracking-widest">
                               SAW ranked
                             </div>
                          </div>

                          <div className="grid gap-6">
                            {result.recommendations.map((opt, idx) => (
                              <motion.div 
                                key={idx}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.1 }}
                                className={`p-8 rounded-[3rem] relative overflow-hidden transition-all duration-500 ${
                                  idx === 0 
                                  ? 'bg-[#1A1C19] text-white shadow-2xl shadow-emerald-950/40 scale-[1.02]' 
                                  : 'bg-white dark:bg-slate-800 border border-emerald-950/5 dark:border-white/10 shadow-xl shadow-emerald-900/5'
                                }`}
                              >
                                <div className="flex justify-between items-start mb-6">
                                  <div className="space-y-1">
                                    <h4 className="text-3xl font-bold font-serif leading-tight">{opt.title}</h4>
                                    <div className="flex items-center gap-2">
                                      <div className={`w-2 h-2 rounded-full ${idx === 0 ? 'bg-emerald-400' : 'bg-emerald-600'}`} />
                                      <span className={`text-[10px] font-black uppercase tracking-widest ${idx === 0 ? 'text-emerald-400' : 'text-emerald-950 dark:text-emerald-50/40'}`}>
                                        Match Score: {opt.score}%
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                
                                <p className={`text-lg leading-relaxed mb-10 italic ${idx === 0 ? 'text-white/60' : 'text-slate-500 dark:text-slate-400 group-hover:text-emerald-950 dark:text-emerald-50'} transition-colors`}>
                                  {opt.description}
                                </p>

                                <div className="grid grid-cols-3 gap-2">
                                  {[
                                    { label: 'KREATIF', val: opt.creativity },
                                    { label: 'NILAI JUAL', val: opt.sell_value },
                                    { label: 'MUDAH', val: opt.ease }
                                  ].map((stat, i) => (
                                    <div key={i} className={`p-4 rounded-[1.5rem] border ${idx === 0 ? 'bg-white/5 border-white/10' : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200/50'}`}>
                                       <p className={`text-[9px] font-black mb-2 uppercase tracking-widest text-center ${idx === 0 ? 'text-white/60' : 'text-emerald-700 dark:text-emerald-300'}`}>{stat.label}</p>
                                       <div className="flex items-center justify-center gap-1">
                                          <span className={`text-sm font-bold ${idx === 0 ? 'text-white' : 'text-emerald-950 dark:text-emerald-50'}`}>{stat.val}</span>
                                          <span className={`text-[9px] font-medium ${idx === 0 ? 'text-white/40' : 'text-emerald-600 dark:text-emerald-400/70'}`}>/10</span>
                                       </div>
                                    </div>
                                  ))}
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        </div>

                        {/* More Prominent Eco-Impact Dashboard */}
                        <div className="space-y-6 bg-emerald-50 dark:bg-emerald-950/40 backdrop-blur-xl p-6 sm:p-8 rounded-[3rem] border border-emerald-100 dark:border-emerald-900/50 shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-8 opacity-[0.05]">
                               <Leaf className="w-32 h-32 text-emerald-900" />
                            </div>
                            
                            <div className="space-y-1 relative z-10">
                               <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400/60 uppercase tracking-[0.4em]">Environmental Impact</p>
                               <h3 className="text-3xl font-bold font-serif text-emerald-950 dark:text-emerald-50 italic">Dampak Ekologismu</h3>
                            </div>

                            <p className="text-emerald-950 dark:text-emerald-50 font-medium text-base sm:text-lg leading-relaxed relative z-10 italic border-l-4 border-emerald-400 pl-4 bg-white/60 dark:bg-slate-800/60 p-4 rounded-r-2xl shadow-sm">
                                "{result.eco_impact?.description || 'Setiap langkah kecilmu sangat berarti untuk menyelamatkan bumi.'}"
                            </p>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 flex-wrap relative z-10">
                               <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-[2rem] shadow-xl shadow-emerald-900/5 border border-emerald-950/5 dark:border-white/10 flex flex-col items-center text-center gap-3">
                                 <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center border border-blue-100"><Droplets className="w-6 h-6"/></div>
                                 <div className="space-y-1">
                                    <p className="text-xl sm:text-2xl font-black text-emerald-950 dark:text-emerald-50">{result.eco_impact?.water_saved || 0}</p>
                                    <p className="text-[8px] sm:text-[9px] font-bold text-slate-400/80 uppercase tracking-widest leading-tight">Liter<br/>Air</p>
                                 </div>
                               </motion.div>
                               
                               <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-[2rem] shadow-xl shadow-emerald-900/5 border border-emerald-950/5 dark:border-white/10 flex flex-col items-center text-center gap-3">
                                 <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500 flex items-center justify-center border border-emerald-100 dark:border-emerald-900/50"><Leaf className="w-6 h-6"/></div>
                                 <div className="space-y-1">
                                    <p className="text-xl sm:text-2xl font-black text-emerald-950 dark:text-emerald-50">{result.eco_impact?.carbon_reduced || 0}</p>
                                    <p className="text-[8px] sm:text-[9px] font-bold text-slate-400/80 uppercase tracking-widest leading-tight">Kg<br/>CO2</p>
                                 </div>
                               </motion.div>
                               
                               <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-[2rem] shadow-xl shadow-emerald-900/5 border border-emerald-950/5 dark:border-white/10 flex flex-col items-center text-center gap-3">
                                 <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center border border-amber-100"><Trash2 className="w-6 h-6"/></div>
                                 <div className="space-y-1">
                                    <p className="text-xl sm:text-2xl font-black text-emerald-950 dark:text-emerald-50">{result.eco_impact?.waste_diverted || 0}</p>
                                    <p className="text-[8px] sm:text-[9px] font-bold text-slate-400/80 uppercase tracking-widest leading-tight">Gram<br/>Sampah</p>
                                 </div>
                               </motion.div>

                               <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-[2rem] shadow-xl shadow-emerald-900/5 border border-emerald-950/5 dark:border-white/10 flex flex-col items-center text-center gap-3">
                                 <div className="w-12 h-12 rounded-full bg-purple-50 text-purple-500 flex items-center justify-center border border-purple-100"><Zap className="w-6 h-6"/></div>
                                 <div className="space-y-1">
                                    <p className="text-xl sm:text-2xl font-black text-emerald-950 dark:text-emerald-50">{result.eco_impact?.energy_saved || 0}</p>
                                    <p className="text-[8px] sm:text-[9px] font-bold text-slate-400/80 uppercase tracking-widest leading-tight">kWh<br/>Energi</p>
                                 </div>
                               </motion.div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="grid grid-cols-2 gap-4">
                          <motion.button 
                            whileHover={{ y: -2 }} 
                            whileTap={{ scale: 0.98 }} 
                            onClick={reset} 
                            className="bg-white dark:bg-slate-800 border border-emerald-950/5 dark:border-white/10 py-7 rounded-full font-black text-[10px] uppercase tracking-[0.3em] text-slate-400 hover:text-emerald-700 dark:text-emerald-300 transition-all shadow-xl shadow-emerald-900/5 flex items-center justify-center gap-3"
                            title="Mulai Ulang Analisis Baru"
                          >
                            Reset <RefreshCw className="w-4 h-4" />
                          </motion.button>
                          
                          <motion.button 
                            whileHover={{ y: -2 }} 
                            whileTap={{ scale: 0.98 }} 
                            onClick={handleShare} 
                            className={`py-7 rounded-full font-black text-[10px] uppercase tracking-[0.3em] flex items-center justify-center gap-3 shadow-2xl transition-all duration-500 ${
                              isCopied ? 'bg-emerald-950 dark:bg-emerald-600 text-emerald-400' : 'bg-emerald-600 text-white shadow-emerald-600/20'
                            }`}
                            title="Bagikan Pencapaian Ekologi"
                          >
                            {isCopied ? 'Copied' : 'Share'} <Share2 className="w-4 h-4" />
                          </motion.button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </motion.div>
          ) : activeTab === 'gallery' ? (
            <motion.div key="gallery-tab" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-12">
               <div className="space-y-4">
                 <div className="inline-block px-4 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-[10px] font-black uppercase tracking-[0.3em]">
                   Inspirasi & Log
                 </div>
                 <h2 className="text-5xl font-bold font-serif text-emerald-950 dark:text-emerald-50 italic">Karya Kamu</h2>
                 <p className="text-slate-500 dark:text-slate-400 text-lg font-medium">Bantu selamatkan bumi, satu karya upcycle di satu waktu.</p>
               </div>
               
               <div className="h-px bg-emerald-950 dark:bg-emerald-600/5" />

               {isHistoryLoading ? (
                 <div className="grid gap-6">
                   {[1, 2, 3].map(i => (
                     <div key={i} className="bg-white dark:bg-slate-800 rounded-[3rem] border border-emerald-950/5 dark:border-white/10 overflow-hidden flex animate-pulse">
                       <div className="w-32 sm:w-48 h-32 sm:h-48 shrink-0 bg-emerald-50 dark:bg-emerald-950/40" />
                       <div className="p-6 sm:p-10 flex flex-col justify-center gap-4 flex-1">
                         <div className="w-20 h-4 bg-emerald-50 dark:bg-emerald-950/40 rounded-full" />
                         <div className="w-3/4 h-8 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg" />
                         <div className="w-24 h-4 bg-emerald-50 dark:bg-emerald-950/40 rounded-full" />
                       </div>
                     </div>
                   ))}
                 </div>
               ) : history.length === 0 ? (
                 <div className="py-32 text-center bg-white dark:bg-slate-800 rounded-[3.5rem] border border-dashed border-emerald-950/10 space-y-6 px-4">
                    <div className="w-20 h-20 rounded-full bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center mx-auto">
                      <History className="w-10 h-10 text-emerald-200" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-emerald-950 dark:text-emerald-50 font-bold font-serif text-2xl">Belum ada jejak terekam</p>
                      <p className="text-slate-400 font-medium tracking-tight">Mulailah dengan menscan sampah pertamamu.</p>
                    </div>
                 </div>
               ) : (
                 <div className="space-y-12">
                   <div className="bg-white dark:bg-slate-800 p-6 sm:p-8 rounded-[3.5rem] border border-emerald-950/5 dark:border-white/10 shadow-2xl shadow-emerald-950/10">
                     <div className="mb-6 space-y-1">
                       <h3 className="text-2xl font-bold font-serif text-emerald-950 dark:text-emerald-50 italic">Dampak Ekologismu</h3>
                       <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Pertumbuhan jumlah limbah yang berhasil dialihkan (Gram)</p>
                     </div>
                     <div className="w-full" style={{ height: 256 }}>
                       <ResponsiveContainer width="100%" height="100%">
                         <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                           <defs>
                             <linearGradient id="colorWaste" x1="0" y1="0" x2="0" y2="1">
                               <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                               <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                             </linearGradient>
                           </defs>
                           <XAxis 
                             dataKey="date" 
                             axisLine={false} 
                             tickLine={false} 
                             tick={{ fontSize: 10, fill: '#94a3b8' }} 
                             dy={10}
                           />
                           <YAxis 
                             axisLine={false} 
                             tickLine={false} 
                             tick={{ fontSize: 10, fill: '#94a3b8' }} 
                           />
                           <Tooltip 
                             contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)', padding: '12px 16px' }}
                             itemStyle={{ color: '#064e3b', fontWeight: 'bold' }}
                           />
                           <Area type="monotone" dataKey="waste" name="Gram Sampah Dialihkan" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorWaste)" />
                         </AreaChart>
                       </ResponsiveContainer>
                     </div>
                   </div>
                   
                   <div className="grid gap-6">
                     {history.map((item, idx) => (
                       <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        key={item.id} 
                        onClick={() => setSelectedHistoryItem(item)}
                        className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-2xl rounded-[3rem] border border-white/80 overflow-hidden flex flex-col sm:flex-row shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-2xl hover:scale-[1.01] transition-all duration-700 group cursor-pointer p-2"
                     >
                        <div className="w-full sm:w-48 h-48 shrink-0 overflow-hidden relative rounded-[2.5rem] transform-gpu">
                           <img src={item.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000 transform-gpu" loading="lazy" />
                        </div>
                        <div className="p-6 sm:px-8 flex flex-col justify-center min-w-0 flex-1 relative overflow-hidden">
                           <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
                              <Sparkles className="w-32 h-32 text-emerald-900" />
                           </div>
                           <div className="flex flex-wrap items-center gap-2 mb-3 relative z-10">
                              <span className="text-[9px] font-black uppercase bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 px-3 py-1 rounded-full border border-emerald-100 dark:border-emerald-900/50">#{item.kategori}</span>
                              <span className="text-[9px] font-black text-slate-400/80 uppercase tracking-widest">{new Date(item.timestamp).toLocaleDateString()}</span>
                           </div>
                           <h4 className="text-xl sm:text-2xl font-bold text-emerald-950 dark:text-emerald-50 font-serif line-clamp-1 italic relative z-10 mb-4">{item.recommendations?.[0]?.title}</h4>
                           <button 
                             onClick={(e) => handleIMadeThis(e, item)}
                             className="px-6 py-3 bg-emerald-950 dark:bg-emerald-600 text-white rounded-full text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 self-start shadow-xl hover:shadow-emerald-950/20 hover:scale-105 transition-all" title="Buka detail proyek ini"
                           >
                              I Made This! <ExternalLink className="w-3.5 h-3.5" />
                           </button>
                        </div>
                     </motion.div>
                   ))}
                 </div>
                 </div>
               )}
            </motion.div>
          ) : (
            <motion.div key="banks-tab" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-12 relative overflow-x-clip px-0.5">
               {/* Editorial Heading */}
               <div className="space-y-4 relative z-10">
                 <div className="inline-block px-4 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-[10px] font-black uppercase tracking-[0.3em]">
                   Eco-Center Finder
                 </div>
                 <h2 className="text-5xl font-bold font-serif text-emerald-950 dark:text-emerald-50 italic leading-tight">Pusat Pengolahan<br/>Terdekat</h2>
                 <p className="text-slate-500 dark:text-slate-400 text-lg font-medium leading-relaxed max-w-sm">Temukan bank sampah & pusat daur ulang di sekitarmu dalam satu ketukan.</p>
               </div>

               <div className="bg-white dark:bg-slate-800 p-10 rounded-[3.5rem] border border-emerald-950/5 dark:border-white/10 shadow-2xl shadow-emerald-950/10 flex flex-col items-center text-center space-y-10 relative overflow-hidden z-10">
                 <div className="w-24 h-24 rounded-full bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center relative">
                   <motion.div 
                     animate={{ scale: [1, 1.6, 1], opacity: [0.2, 0, 0.2] }}
                     transition={{ duration: 3, repeat: Infinity }}
                     className="absolute inset-0 rounded-full bg-emerald-400"
                   />
                   <div className="w-16 h-16 rounded-full bg-emerald-950 dark:bg-emerald-600 flex items-center justify-center relative z-10 shadow-xl">
                      <MapPin className="w-8 h-8 text-white" />
                   </div>
                 </div>

                 {locationError ? (
                   <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full space-y-6">
                     <p className="text-amber-800 text-sm font-medium bg-amber-50 p-4 rounded-2xl border border-amber-100">
                       Akses lokasi ditolak. Silakan cari secara manual.
                     </p>
                     <motion.button
                       whileHover={{ y: -2 }}
                       whileTap={{ scale: 0.98 }}
                       onClick={() => window.open('https://www.google.com/maps/search/bank+sampah+terdekat/', '_blank')}
                       className="w-full py-6 rounded-full bg-emerald-950 dark:bg-emerald-600 text-white font-black text-[10px] uppercase tracking-[0.3em] flex items-center justify-center gap-3 shadow-2xl"
                       title="Buka Google Maps"
                     >
                       <ExternalLink className="w-4 h-4" />
                       Cari Manual di Maps
                     </motion.button>
                   </motion.div>
                 ) : (
                   <div className="w-full">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      disabled={isLocating}
                      onClick={findBanksWithGPS}
                      className={`w-full py-7 rounded-full font-black text-[10px] uppercase tracking-[0.4em] flex items-center justify-center transition-all duration-500 shadow-2xl shadow-emerald-900/10 ${
                        isLocating 
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                        : 'bg-emerald-600 text-white hover:bg-emerald-700'
                      }`}
                      title="Deteksi Otomatis Menggunakan GPS Lokasiku"
                    >
                      {isLocating ? (
                        <div className="flex items-center gap-3">
                           <RefreshCw className="w-4 h-4 animate-spin" />
                           <span>Searching Area...</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                           <Sparkles className="w-4 h-4" />
                           <span>Deteksi Sekitarku</span>
                        </div>
                      )}
                    </motion.button>
                   </div>
                 )}
               </div>

               <AnimatePresence>
                 {nearbyBanks.length > 0 && (
                   <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="grid gap-6"
                   >
                     {nearbyBanks.map((bank, index) => (
                       <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        key={bank.id} 
                        className="bg-white dark:bg-slate-800 p-6 sm:p-8 rounded-[2.5rem] sm:rounded-[3rem] border border-emerald-950/5 dark:border-white/10 shadow-xl shadow-emerald-900/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 group hover:scale-[1.01] transition-all duration-500 overflow-hidden"
                       >
                         <div className="flex items-start sm:items-center gap-5 sm:gap-6 w-full sm:min-w-0 sm:flex-1">
                            <div className="w-14 h-14 sm:w-16 sm:h-16 shrink-0 rounded-[1.25rem] sm:rounded-[1.5rem] bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-950 dark:text-emerald-50 border border-emerald-100 dark:border-emerald-900/50 group-hover:bg-emerald-950 dark:bg-emerald-600 group-hover:text-white transition-all duration-500">
                               <MapPin className="w-7 h-7 sm:w-8 sm:h-8" />
                            </div>
                            <div className="min-w-0 flex-1 space-y-1 sm:space-y-2">
                               <h4 className="text-lg sm:text-xl font-bold text-emerald-950 dark:text-emerald-50 font-serif italic truncate leading-tight">{bank.name}</h4>
                               <div className="flex items-center gap-3">
                                 <div className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-[9px] sm:text-[10px] font-black border border-emerald-100 dark:border-emerald-900/50 uppercase tracking-widest shrink-0">{bank.distance}</div>
                                 <p className="text-[11px] sm:text-xs text-slate-400 font-medium truncate max-w-[120px] sm:max-w-none">{bank.address}</p>
                               </div>
                            </div>
                         </div>
                         <motion.button 
                           whileHover={{ x: 5 }}
                           whileTap={{ scale: 0.95 }}
                           onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(bank.name + " " + bank.address)}`, '_blank')}
                           className="w-full sm:w-auto px-8 py-4 bg-emerald-950 dark:bg-emerald-600 text-white rounded-full font-black text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-3 shadow-xl hover:shadow-emerald-950/20 transition-all shrink-0"
                           title="Dapatkan rute ke lokasi ini"
                         >
                           Rute <ChevronRight className="w-4 h-4" />
                         </motion.button>
                       </motion.div>
                     ))}
                   </motion.div>
                 )}
               </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {selectedHistoryItem && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => setSelectedHistoryItem(null)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 30 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-3xl w-full max-w-4xl max-h-[90vh] overflow-y-auto overflow-x-hidden rounded-[3rem] shadow-2xl border border-white/80 dark:border-white/10 p-2 hide-scrollbar relative"
                onClick={e => e.stopPropagation()}
              >
                <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] overflow-hidden flex flex-col md:flex-row shadow-inner">
                   <div className="w-full md:w-1/2 h-64 md:h-auto relative">
                     <img src={selectedHistoryItem.image} className="w-full h-full object-cover" />
                     <div className="absolute top-6 left-6 flex flex-col gap-2">
                       <span className="text-[10px] font-black uppercase bg-white/90 dark:bg-slate-900/90 backdrop-blur-md text-emerald-700 dark:text-emerald-300 px-4 py-2 rounded-full border border-emerald-100/50 dark:border-emerald-900/50 shadow-xl">
                          #{selectedHistoryItem.kategori}
                       </span>
                     </div>
                     <button 
                       onClick={() => setSelectedHistoryItem(null)}
                       className="absolute top-6 right-6 w-10 h-10 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-full flex items-center justify-center text-slate-500 hover:text-emerald-600 transition-colors z-10 shadow-xl border border-white/20"
                     >
                       <X className="w-5 h-5" />
                     </button>
                   </div>
                   
                   <div className="w-full md:w-1/2 p-8 sm:p-12 relative flex flex-col">
                      <div className="absolute top-0 right-0 p-8 opacity-[0.03]">
                         <Sparkles className="w-48 h-48 text-emerald-900" />
                      </div>
                      <div className="space-y-8 relative z-10">
                        <div>
                         <p className="text-[10px] font-black text-emerald-600/60 dark:text-emerald-400/60 uppercase tracking-widest mb-3">{new Date(selectedHistoryItem.timestamp).toLocaleDateString()}</p>
                         <h3 className="text-3xl font-bold font-serif text-emerald-950 dark:text-emerald-50 italic mb-2">{selectedHistoryItem.detected_item}</h3>
                         <p className="text-sm text-slate-600 dark:text-slate-400">{selectedHistoryItem.greeting}</p>
                        </div>
                        
                        <div className="space-y-4">
                          <h4 className="text-[10px] font-black text-emerald-600 dark:text-emerald-400/60 uppercase tracking-[0.4em]">Ide Upcycle</h4>
                          <div className="space-y-4">
                            {selectedHistoryItem.recommendations?.map((rec, i) => (
                              <div key={i} className="p-5 rounded-[2rem] bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/50">
                                <h5 className="font-serif font-bold text-lg text-emerald-950 dark:text-emerald-50 italic mb-2">{rec.title}</h5>
                                <p className="text-xs text-emerald-800/80 dark:text-emerald-300/80 mb-4">{rec.description}</p>
                                <div className="flex gap-4">
                                  <div className="space-y-1">
                                    <span className="text-[8px] font-black text-emerald-600/50 uppercase tracking-widest block">Kreativitas</span>
                                    <div className="flex gap-1">
                                       {[...Array(5)].map((_, idx) => (
                                          <div key={idx} className={`w-1.5 h-1.5 rounded-full ${idx < Math.ceil((rec.creativity || 0)/2) ? 'bg-emerald-500' : 'bg-emerald-200 dark:bg-emerald-800'}`} />
                                       ))}
                                    </div>
                                  </div>
                                  <div className="space-y-1">
                                    <span className="text-[8px] font-black text-emerald-600/50 uppercase tracking-widest block">Nilai Jual</span>
                                    <div className="flex gap-1">
                                       {[...Array(5)].map((_, idx) => (
                                          <div key={idx} className={`w-1.5 h-1.5 rounded-full ${idx < Math.ceil((rec.sell_value || 0)/2) ? 'bg-emerald-500' : 'bg-emerald-200 dark:bg-emerald-800'}`} />
                                       ))}
                                    </div>
                                  </div>
                                  <div className="space-y-1">
                                    <span className="text-[8px] font-black text-emerald-600/50 uppercase tracking-widest block">Kemudahan</span>
                                    <div className="flex gap-1">
                                       {[...Array(5)].map((_, idx) => (
                                          <div key={idx} className={`w-1.5 h-1.5 rounded-full ${idx < Math.ceil((rec.ease || 0)/2) ? 'bg-emerald-500' : 'bg-emerald-200 dark:bg-emerald-800'}`} />
                                       ))}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {selectedHistoryItem.eco_impact?.description && (
                          <div className="space-y-4">
                            <h4 className="text-[10px] font-black text-emerald-600 dark:text-emerald-400/60 uppercase tracking-[0.4em]">Dampak Ekologis</h4>
                            <div className="bg-emerald-950 dark:bg-slate-800 text-emerald-50 p-6 rounded-[2rem] flex sm:items-center gap-4 border border-emerald-800 dark:border-white/10 flex-col sm:flex-row">
                               <div className="w-12 h-12 rounded-full bg-emerald-900 flex flex-shrink-0 flex-grow-0 items-center justify-center text-emerald-400 border border-emerald-800">
                                  <Leaf className="w-6 h-6"/>
                               </div>
                               <p className="text-sm leading-relaxed">{selectedHistoryItem.eco_impact.description}</p>
                            </div>
                          </div>
                        )}
                      </div>
                   </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </main>

      {/* Minimal Dock Navigation */}
      <div className="fixed bottom-8 left-0 right-0 z-50 px-8">
        <nav className="max-w-xs mx-auto bg-white/70 dark:bg-slate-800/70 backdrop-blur-3xl p-2 rounded-full border border-emerald-950/5 dark:border-white/10 shadow-2xl flex items-center justify-between">
          {[
            { id: 'scan', icon: Camera, label: 'Scan' },
            { id: 'gallery', icon: History, label: 'Log' },
            { id: 'banks', icon: MapPin, label: 'Maps' }
          ].map((tab) => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`relative flex flex-col items-center justify-center px-6 py-3 rounded-full transition-all duration-500 group`}
              title={`Buka Halaman ${tab.label}`}
            >
              <tab.icon className={`w-5 h-5 transition-all duration-500 ${activeTab === tab.id ? 'text-white scale-110' : 'text-emerald-950 dark:text-emerald-50/40 group-hover:text-emerald-950 dark:text-emerald-50/70'}`} />
              <div className={`absolute -bottom-8 transition-all duration-500 ${activeTab === tab.id ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-950 dark:text-emerald-50/40">{tab.label}</span>
              </div>
              {activeTab === tab.id && (
                <motion.div 
                  layoutId="active-pill"
                  className="absolute inset-0 bg-emerald-600 -z-10 rounded-full shadow-lg shadow-emerald-600/40"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Atmospheric Background Effects */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div className="absolute top-[-20%] right-[-10%] w-[80vw] h-[80vw] bg-emerald-50 dark:bg-emerald-950/40 rounded-full blur-[140px]" />
        <div className="absolute bottom-[-10%] left-[-20%] w-[60vw] h-[60vw] bg-emerald-100/30 rounded-full blur-[120px]" />
      </div>
    </div>
  );
}



