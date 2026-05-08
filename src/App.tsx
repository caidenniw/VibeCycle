import React, { useState, useRef } from "react";
import { GoogleGenAI, Type } from "@google/genai";
import { motion, AnimatePresence } from "motion/react";
import { Camera, Upload, Trash2, Sparkles, Droplets, Recycle, Info, ArrowRight, RefreshCw, Plus } from "lucide-react";

// Types
enum WasteCategory {
  ORGANIK = "Organik",
  PLASTIK = "Plastik",
  KERTAS = "Kertas",
  LOGAM = "Logam",
  B3 = "B3/Bahaya",
}

interface AnalysisResult {
  kategori: WasteCategory;
  instruksiBersih: string;
  upcycleSpark: string;
  impactTracker: string;
}

// AI Initialization
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export default function App() {
  const [image, setImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    if (!image) return;
    if (!process.env.GEMINI_API_KEY) {
      setError("API Key tidak ditemukan. Pastikan sudah menyetelnya di Secrets panel.");
      return;
    }
    setIsAnalyzing(true);
    setError(null);

    try {
      const base64Data = image.split(",")[1];
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: {
          parts: [
            {
              text: `Kamu adalah VibeCycle, asisten ahli pengelolaan sampah yang ramah dan kreatif. 
                Tugasmu adalah menerima input berupa foto mengenai benda yang ingin dibuang.

                Tugas Utama (BERIKAN DALAM FORMAT JSON):
                1. Kategori: Tentukan kategori sampah (Organik, Plastik, Kertas, Logam, atau B3/Bahaya).
                2. Instruksi Bersih: Berikan langkah singkat sebelum dibuang (misal: 'Bilas botolnya dulu, ya!').
                3. Upcycle Spark: Berikan 1 ide kreatif untuk mengubah benda tersebut menjadi barang berguna dengan gaya modern/minimalis.
                4. Impact Tracker: Berikan 1 statistik unik tentang dampak positif jika benda ini didaur ulang (misal: jumlah air yang dihemat, atau pengurangan emisi CO2). Berikan angka statistik yang NYATA atau estimasi yang akurat.

                Format JSON:
                {
                  "kategori": "string",
                  "instruksiBersih": "string",
                  "upcycleSpark": "string",
                  "impactTracker": "string"
                }

                Tone & Gaya:
                - Gunakan bahasa Indonesia yang santai, menyemangati, dan tidak menggurui.
                - Pastikan jawabanmu singkat dan padat (scannable).`,
            },
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: base64Data,
              },
            },
          ],
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              kategori: { type: Type.STRING },
              instruksiBersih: { type: Type.STRING },
              upcycleSpark: { type: Type.STRING },
              impactTracker: { type: Type.STRING },
            },
            required: ["kategori", "instruksiBersih", "upcycleSpark", "impactTracker"],
          },
        },
      });

      const dataText = response.text;
      if (!dataText) throw new Error("Kosong nih responsenya.");
      const data = JSON.parse(dataText);
      setResult(data);
    } catch (err: any) {
      console.error(err);
      if (err.message?.includes("Permission denied") || err.message?.includes("API key")) {
        setError("Akses API ditolak. Coba cek API Key di Secrets panel dan pastikan model 'gemini-1.5-flash' aktif.");
      } else {
        setError("Duh, maaf ya. Sepertinya ada masalah teknis saat analisis. Coba lagi, yuk!");
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const reset = () => {
    setImage(null);
    setResult(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-[#FDFDFB] text-[#1A1C19] font-sans selection:bg-emerald-100 selection:text-emerald-900 pb-20">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#FDFDFB]/90 backdrop-blur-xl border-b border-gray-100">
        <div className="max-w-xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div whileHover={{ rotate: 180 }} transition={{ duration: 0.6 }} className="w-10 h-10 rounded-2xl bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-200">
              <RefreshCw className="w-5 h-5 text-white" />
            </motion.div>
            <h1 className="text-2xl font-bold tracking-tight text-emerald-950">VibeCycle</h1>
          </div>
          <button onClick={reset} className="p-3 hover:bg-emerald-50 rounded-2xl transition-colors text-emerald-900" aria-label="Reset">
            <Plus className="w-6 h-6" />
          </button>
        </div>
      </header>

      <main className="pt-24 px-6 max-w-xl mx-auto">
        <AnimatePresence mode="wait">
          {!image ? (
            <motion.div key="landing" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20, scale: 0.95 }} transition={{ duration: 0.5, ease: "circOut" }} className="space-y-10 py-8">
              <div className="space-y-4 text-center sm:text-left">
                <motion.h2 initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="text-5xl font-bold font-serif leading-[1.1] text-emerald-950">
                  Pilah pintar,
                  <br />
                  <span className="italic text-emerald-600">bumi segar.</span> 🌿
                </motion.h2>
                <motion.p initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} className="text-slate-500 text-lg leading-relaxed max-w-[90%] mx-auto sm:mx-0">
                  Foto benda yang ingin kamu buang, dan VibeCycle akan memberimu ide kreatif untuk masa depan yang lebih hijau.
                </motion.p>
              </div>

              <motion.div
                onClick={() => fileInputRef.current?.click()}
                whileHover={{ scale: 1.02, boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.1)" }}
                whileTap={{ scale: 0.98 }}
                className="aspect-square w-full rounded-[2.5rem] bg-white border border-gray-100 shadow-xl shadow-gray-100 flex flex-col items-center justify-center gap-6 cursor-pointer group relative overflow-hidden transition-all"
              >
                <div className="absolute inset-0 bg-emerald-50 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative z-10 w-24 h-24 rounded-3xl bg-emerald-50 flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
                  <Camera className="w-12 h-12 text-emerald-600" />
                </div>
                <div className="relative z-10 text-center space-y-1">
                  <p className="text-2xl font-bold text-emerald-950">Mulai Vibe Check</p>
                  <p className="text-slate-400">Ketuk untuk ambil foto atau upload</p>
                </div>
              </motion.div>
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" className="hidden" />
            </motion.div>
          ) : (
            <motion.div key="analysis" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
              <div className="relative aspect-[4/3] w-full rounded-[2.5rem] overflow-hidden shadow-2xl bg-white border border-gray-100 group">
                <img src={image} alt="Sampahmu" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                {!result && !isAnalyzing && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-sm">
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={analyzeWaste} className="bg-emerald-600 text-white px-10 py-5 rounded-full font-bold flex items-center gap-3 shadow-2xl backdrop-blur-md">
                      <Sparkles className="w-6 h-6" />
                      Analisis Sekarang
                    </motion.button>
                  </div>
                )}
                {isAnalyzing && (
                  <div className="absolute inset-0 bg-white/95 flex flex-col items-center justify-center backdrop-blur-xl">
                    <motion.div
                      animate={{
                        rotate: 360,
                        scale: [1, 1.1, 1],
                      }}
                      transition={{
                        rotate: { duration: 2, repeat: Infinity, ease: "linear" },
                        scale: { duration: 1.5, repeat: Infinity, ease: "easeInOut" },
                      }}
                      className="mb-6 p-8 rounded-[2rem] bg-emerald-50"
                    >
                      <RefreshCw className="w-20 h-20 text-emerald-600" />
                    </motion.div>
                    <div className="text-center space-y-2">
                      <p className="font-serif italic font-bold text-3xl text-emerald-950">Sedang Identifikasi...</p>
                      <p className="text-slate-400 text-xs tracking-[0.3em] uppercase font-bold">Mencari potensi baru</p>
                    </div>
                  </div>
                )}
              </div>

              {error && (
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="p-6 bg-red-50 text-red-700 rounded-3xl border border-red-100 flex items-start gap-4">
                  <Info className="w-6 h-6 shrink-0 mt-0.5" />
                  <p className="font-medium text-sm leading-relaxed">{error}</p>
                </motion.div>
              )}

              <AnimatePresence>
                {result && (
                  <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }} className="space-y-6 pb-10">
                    {/* Category Card */}
                    <motion.div
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.1 }}
                      className="flex items-center justify-between p-3 pl-8 bg-white rounded-full border border-gray-100 shadow-sm"
                    >
                      <span className="text-slate-400 text-xs font-bold uppercase tracking-[0.2em]">Kategori Sampah</span>
                      <span className="px-10 py-4 rounded-full bg-emerald-600 text-white text-xl font-bold shadow-lg shadow-emerald-200">{result.kategori}</span>
                    </motion.div>

                    <div className="grid gap-6">
                      {/* Clean Instruction */}
                      <motion.div
                        initial={{ opacity: 0, x: -30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3, duration: 0.6 }}
                        className="bg-white p-8 rounded-[2.5rem] border border-gray-50 space-y-4 shadow-sm relative overflow-hidden group"
                      >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full blur-3xl opacity-50 -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700" />
                        <div className="flex items-center gap-3 text-emerald-700 relative">
                          <Droplets className="w-6 h-6" />
                          <h3 className="font-bold uppercase text-[12px] tracking-[0.2em]">Instruksi Bersih</h3>
                        </div>
                        <p className="text-3xl leading-tight font-serif text-slate-800 relative font-medium">{result.instruksiBersih}</p>
                      </motion.div>

                      {/* Upcycle Spark */}
                      <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5, duration: 0.6 }} className="bg-[#1A1C19] p-8 rounded-[2.5rem] space-y-4 shadow-2xl relative overflow-hidden group">
                        <div className="absolute bottom-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-[80px]" />
                        <div className="flex items-center gap-3 text-emerald-400">
                          <Sparkles className="w-6 h-6" />
                          <h3 className="font-bold uppercase text-[12px] tracking-[0.2em] opacity-60">Upcycle Spark</h3>
                        </div>
                        <p className="text-white text-3xl leading-snug font-serif italic font-medium relative">"{result.upcycleSpark}"</p>
                      </motion.div>

                      {/* Impact Tracker */}
                      <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.7, duration: 0.6 }}
                        className="bg-emerald-50 p-8 rounded-[2.5rem] space-y-6 border border-emerald-100 shadow-inner overflow-hidden relative"
                      >
                        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-white/50 rounded-full blur-3xl" />
                        <div className="flex items-center gap-3 text-emerald-800 relative">
                          <Recycle className="w-6 h-6" />
                          <h3 className="font-bold uppercase text-[12px] tracking-[0.2em]">Impact Tracker</h3>
                        </div>
                        <div className="space-y-4 relative">
                          <p className="text-2xl text-emerald-950 leading-relaxed font-serif font-semibold">{result.impactTracker}</p>
                          <div className="pt-6 flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.4em] text-emerald-800/40 border-t border-emerald-200/50">
                            <Info className="w-4 h-4" />
                            KONTRIBUSI NYATA UNTUK BUMI
                          </div>
                        </div>
                      </motion.div>
                    </div>

                    <motion.button
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.9 }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={reset}
                      className="w-full bg-white border border-gray-100 py-6 rounded-[2rem] font-bold text-slate-500 hover:text-emerald-700 hover:bg-emerald-100 transition-all flex items-center justify-center gap-3 shadow-lg hover:shadow-emerald-100 mb-10"
                    >
                      Benda lain <ArrowRight className="w-5 h-5" />
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Decorative Background */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-emerald-50/50 blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-20%] w-[50%] h-[50%] rounded-full bg-emerald-50/30 blur-[100px]" />
      </div>
    </div>
  );
}
