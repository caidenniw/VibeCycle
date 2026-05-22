import React, { useState, useEffect, useRef } from "react";
import { motion, useScroll, useTransform, AnimatePresence, useInView, useMotionValueEvent, useSpring } from "motion/react";
import { Leaf, Cpu, BarChart3, Droplets, ChevronRight, Sparkles, Activity } from "lucide-react";
import DarkModeToggle from "./DarkModeToggle";

// Asset Fallbacks (Replace these with your local imports when files are in src/assets)
import cardImg from "./assets/card_compressed.jpeg"; // Waste
import sawImg from "./assets/cardsawmethod_compressed.jpeg"; // Data/SAW
import impactImg from "./assets/ecoimpact_compressed.jpeg"; // Eco
import resultImg from "./assets/hasilkerajinan_compressed.jpeg"; // Upcycled Art
import scanImg from "./assets/masukkan_botol_compressed.jpeg"; // AI/Tech
import insightImg from "./assets/bohlam_compressed.jpeg"; // eco insight

interface LandingPageProps {
  onStart: () => void;
}

const CountUp = ({ end, duration = 2.5 }: { end: number; duration?: number }) => {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  useEffect(() => {
    if (!isInView) return;

    let startTimestamp: number | null = null;
    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / (duration * 1000), 1);

      // Easing function: easeOutExpo (starts fast, ends slow)
      const easeOut = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);

      setCount(Math.floor(easeOut * end));

      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        setCount(end); // Ensure exact final value
      }
    };
    window.requestAnimationFrame(step);
  }, [end, duration, isInView]);

  return <span ref={ref}>{count.toLocaleString()}</span>;
};

export default function LandingPage({ onStart }: LandingPageProps) {
  const { scrollY } = useScroll();
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeout = useRef<NodeJS.Timeout | null>(null);

  // Detect active scrolling to pause floating animations
  useMotionValueEvent(scrollY, "change", () => {
    setIsScrolling(true);
    if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
    scrollTimeout.current = setTimeout(() => {
      setIsScrolling(false);
    }, 150); // Pause animation for 150ms after scroll stops
  });

  // Adjust transform to be much further down so it doesn't disappear on single-column mobile view
  const y = useTransform(scrollY, [0, 800], [0, 100]);

  // Dynamic scroll scattering range based on screen size
  const [scatterRange, setScatterRange] = useState([0, 500]);

  useEffect(() => {
    const updateRange = () => {
      const isMobile = window.innerWidth < 640; // sm breakpoint
      setScatterRange(isMobile ? [250, 750] : [0, 500]);
    };

    updateRange();
    window.addEventListener("resize", updateRange);
    return () => window.removeEventListener("resize", updateRange);
  }, []);

  const springConfig = { stiffness: 90, damping: 25, mass: 0.8 };

  // Card 1: Plastic Waste
  const card1XRaw = useTransform(scrollY, scatterRange, ["35%", "0%"]);
  const card1YRaw = useTransform(scrollY, scatterRange, ["35%", "0%"]);
  const card1ScaleRaw = useTransform(scrollY, scatterRange, [0.85, 1]);
  const card1RotateRaw = useTransform(scrollY, scatterRange, [-5, 0]);

  const card1X = useSpring(card1XRaw, springConfig);
  const card1Y = useSpring(card1YRaw, springConfig);
  const card1Scale = useSpring(card1ScaleRaw, springConfig);
  const card1RotateCluster = useSpring(card1RotateRaw, springConfig);

  // Card 2: Eco Insights
  const card2XRaw = useTransform(scrollY, scatterRange, ["-35%", "0%"]);
  const card2YRaw = useTransform(scrollY, scatterRange, ["30%", "0%"]);
  const card2ScaleRaw = useTransform(scrollY, scatterRange, [0.8, 1]);
  const card2RotateRaw = useTransform(scrollY, scatterRange, [5, 0]);

  const card2X = useSpring(card2XRaw, springConfig);
  const card2Y = useSpring(card2YRaw, springConfig);
  const card2Scale = useSpring(card2ScaleRaw, springConfig);
  const card2RotateCluster = useSpring(card2RotateRaw, springConfig);

  // Card 3: Eco Art Piece
  const card3XRaw = useTransform(scrollY, scatterRange, ["-30%", "0%"]);
  const card3YRaw = useTransform(scrollY, scatterRange, ["-45%", "0%"]);
  const card3ScaleRaw = useTransform(scrollY, scatterRange, [0.75, 1]);
  const card3RotateRaw = useTransform(scrollY, scatterRange, [10, 5]);

  const card3X = useSpring(card3XRaw, springConfig);
  const card3YScatter = useSpring(card3YRaw, springConfig);
  const card3Scale = useSpring(card3ScaleRaw, springConfig);
  const card3Rotate = useSpring(card3RotateRaw, springConfig);

  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-50 font-sans selection:bg-emerald-500 selection:text-white">
      {/* Sticky Navbar */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${isScrolled ? "bg-white/80 backdrop-blur-xl border-b border-emerald-950/5 dark:border-white/10 py-4 shadow-sm" : "bg-transparent py-6"}`}>
        <div className="container mx-auto px-6 md:px-12 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-950 dark:bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-900/20">
              <Leaf className="w-5 h-5 text-emerald-400" />
            </div>
            <span className={`text-xl font-bold tracking-tight transition-colors ${isScrolled ? "text-emerald-950 dark:text-emerald-50" : "text-emerald-950 dark:text-emerald-50"}`}>VibeCycle</span>
          </div>
          <div className="flex items-center gap-4">
            <DarkModeToggle />
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onStart}
              className="hidden md:flex items-center gap-2 px-6 py-2.5 rounded-full bg-emerald-950 dark:bg-emerald-600 text-white font-black text-xs uppercase tracking-widest hover:shadow-xl hover:shadow-emerald-900/20 transition-all"
            >
              Mulai Sekarang
            </motion.button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative lg:min-h-screen flex items-center pt-32 pb-32 md:pb-48 lg:pb-0 overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-50 dark:from-slate-900 via-white dark:via-slate-800 to-slate-50 dark:to-slate-900 -z-20" />
        <div className="absolute top-1/4 -right-1/4 w-[800px] h-[800px] bg-emerald-200/40 rounded-full mix-blend-multiply filter blur-[100px] opacity-70 animate-blob" />
        <div className="absolute -bottom-1/4 -left-1/4 w-[800px] h-[800px] bg-teal-200/40 rounded-full mix-blend-multiply filter blur-[100px] opacity-70 animate-blob animation-delay-2000" />

        {/* Bottom Fade Mask */}
        <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-slate-50 dark:from-slate-900 to-transparent z-10 pointer-events-none" />

        <div className="container mx-auto px-6 md:px-12 relative z-10 grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: "easeOut" }} className="space-y-8 text-center lg:text-left pt-12 lg:pt-0">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-emerald-950/10 bg-white/50 backdrop-blur-sm self-center lg:self-start">
              <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-800">The Green Gateway</span>
            </div>

            <h1 className="text-5xl md:text-7xl font-bold text-emerald-950 dark:text-emerald-50 leading-[1.1] tracking-tight">
              Beri Peluang Baru Untuk <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500 italic font-serif pr-4">Semesta.</span>
            </h1>

            <p className="text-lg md:text-xl text-slate-600 dark:text-slate-300 font-medium max-w-2xl mx-auto lg:mx-0 leading-relaxed">
              Ubah limbah menjadi karya bermakna dengan bantuan AI dan Analisis Cerdas. Transformasi limbah menjadi karya, satu langkah kecil untuk bumi yang lebih baik.
            </p>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onStart}
              className="inline-flex items-center justify-center gap-3 px-8 py-4 sm:px-10 sm:py-5 rounded-full bg-emerald-950 dark:bg-emerald-600 text-white font-black text-sm uppercase tracking-[0.2em] shadow-[0_0_40px_-10px_rgba(4,47,46,0.5)] hover:shadow-[0_0_60px_-15px_rgba(4,47,46,0.6)] transition-all group"
            >
              Mulai Analisis
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </motion.button>
          </motion.div>

          {/* Hero Visual - Floating abstract glassmorphism elements representing transform */}
          <div className="relative h-[420px] sm:h-[500px] md:h-[550px] lg:h-[650px] w-full mt-12 lg:mt-0 perspective-1000">
            <motion.div style={{ y }} className="absolute inset-0 flex items-center justify-center">
              {/* Bottle / Waste representation */}
              <motion.div
                style={{ x: card1X, y: card1Y, scale: card1Scale, rotateZ: card1RotateCluster }}
                animate={
                  !isScrolling
                    ? {
                        y: [-10, 10, -10],
                        rotateZ: [-3, 3, -3],
                      }
                    : {}
                }
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-0 left-0 sm:top-[12%] sm:left-[8%] w-[120px] h-[170px] sm:w-52 sm:h-72 bg-white/40 border border-white/60 backdrop-blur-md sm:backdrop-blur-xl rounded-3xl sm:rounded-[3rem] shadow-2xl flex items-center justify-center z-20 overflow-hidden will-change-transform"
              >
                <img src={cardImg} alt="Plastic Waste" className="absolute inset-0 w-full h-full object-cover opacity-60" loading="lazy" decoding="async" />
                <div className="relative z-10 text-emerald-900/40 text-[10px] sm:text-xs font-black uppercase tracking-widest text-center px-2 sm:px-4">
                  Plastic
                  <br />
                  Waste
                </div>
              </motion.div>

              {/* Middle / Secondary card representing analysis/impact */}
              <motion.div
                style={{ x: card2X, y: card2Y, scale: card2Scale, rotateZ: card2RotateCluster }}
                animate={
                  !isScrolling
                    ? {
                        y: [-12, 12, -12],
                        rotateZ: [2, -2, 2],
                      }
                    : {}
                }
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                className="absolute top-8 right-0 sm:top-[8%] sm:right-[18%] w-[110px] h-[160px] sm:w-48 sm:h-64 bg-white/10 border border-white/30 backdrop-blur-sm sm:backdrop-blur-lg rounded-2xl sm:rounded-[2.5rem] shadow-xl flex flex-col items-center justify-center gap-1 z-10 overflow-hidden will-change-transform"
              >
                <img src={insightImg} alt="Impact" className="absolute inset-0 w-full h-full object-cover opacity-60" loading="lazy" decoding="async" />
                <Activity className="w-8 h-8 sm:w-12 sm:h-12 text-emerald-400 relative z-10 block" />
                <div className="relative z-10 text-white text-[8px] sm:text-xs font-black uppercase tracking-[0.2em] text-center px-1">
                  Eco
                  <br />
                  Insights
                </div>
              </motion.div>

              {/* Transformation particles */}
              <motion.div
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.5, 0.8, 0.5],
                }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 sm:w-64 sm:h-64 bg-emerald-400/20 rounded-full blur-[40px] sm:blur-[50px] z-20"
              />

              {/* Upcycled representation */}
              <motion.div
                style={{ x: card3X, y: card3YScatter, scale: card3Scale, rotateZ: card3Rotate }}
                animate={
                  !isScrolling
                    ? {
                        y: [10, -10, 10],
                        rotateZ: [2, -2, 2],
                      }
                    : {}
                }
                transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
                className="absolute bottom-4 right-0 sm:bottom-[15%] sm:right-[6%] w-[180px] h-[180px] sm:w-80 sm:h-80 bg-emerald-950 dark:bg-emerald-600/90 border border-emerald-800/50 backdrop-blur-md sm:backdrop-blur-2xl rounded-3xl sm:rounded-[3.5rem] shadow-2xl flex flex-col items-center justify-center gap-2 sm:gap-4 z-30 overflow-hidden will-change-transform"
              >
                <img src={resultImg} alt="Eco Art Piece" className="absolute inset-0 w-full h-full object-cover opacity-70" loading="lazy" decoding="async" />
                <div className="relative z-10 flex flex-col items-center gap-2">
                  <Sparkles className="w-10 h-10 sm:w-16 sm:h-16 text-emerald-400" />
                  <div className="text-emerald-50 text-xs sm:text-lg font-black uppercase tracking-[0.2em] text-center px-4 drop-shadow-xl">
                    Eco Art
                    <br />
                    Piece
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Global Impact Stats (Glassmorphism) */}
      <section className="py-20 relative z-20">
        <div className="container mx-auto px-6 md:px-12">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="bg-white/40 backdrop-blur-2xl border border-white/60 p-8 md:p-12 rounded-[3rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
          >
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2, duration: 0.8 }}
              className="text-center text-sm sm:text-base font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] text-emerald-600 dark:text-emerald-400 mb-12"
            >
              Bumi Butuh Tindakan Nyata
            </motion.p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-4 divide-y md:divide-y-0 md:divide-x divide-emerald-950/10">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ delay: 0.2, duration: 0.6, ease: "easeOut" }}
                className="flex flex-col items-center text-center space-y-4 pt-8 md:pt-0"
              >
                <div className="w-14 h-14 rounded-full bg-red-50 text-red-500 flex items-center justify-center border border-red-100">
                  <Activity className="w-6 h-6" />
                </div>
                <div className="text-4xl md:text-5xl font-bold text-emerald-950 dark:text-emerald-50 font-serif">
                  <CountUp end={8} /> Juta
                </div>
                <div className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest leading-loose">Ton Plastik Ke Laut Setiap Tahun</div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ delay: 0.4, duration: 0.6, ease: "easeOut" }}
                className="flex flex-col items-center text-center space-y-4 pt-8 md:pt-0"
              >
                <div className="w-14 h-14 rounded-full bg-emerald-50 dark:bg-emerald-950 dark:bg-emerald-600/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-100 dark:border-emerald-900/50">
                  <Leaf className="w-6 h-6" />
                </div>
                <div className="text-4xl md:text-5xl font-bold text-emerald-950 dark:text-emerald-50 font-serif">
                  <CountUp end={450} /> Tahun
                </div>
                <div className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest leading-loose">Waktu Urai Botol Plastik</div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ delay: 0.6, duration: 0.6, ease: "easeOut" }}
                className="flex flex-col items-center text-center space-y-4 pt-8 md:pt-0"
              >
                <div className="w-14 h-14 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center border border-blue-100">
                  <Droplets className="w-6 h-6" />
                </div>
                <div className="text-4xl md:text-5xl font-bold text-emerald-950 dark:text-emerald-50 font-serif">
                  <CountUp end={30} />%
                </div>
                <div className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest leading-loose">Target Pengurangan Sampah Nas</div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Feature Showcase */}
      <section className="py-24 relative overflow-hidden bg-slate-50 dark:bg-slate-900">
        <div className="container mx-auto px-6 md:px-12 space-y-32">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-100px" }} transition={{ duration: 0.8, ease: "easeOut" }} className="text-center max-w-2xl mx-auto space-y-4">
            <h2 className="text-4xl md:text-5xl font-bold text-emerald-950 dark:text-emerald-50 font-serif italic">Kenapa VibeCycle?</h2>
            <p className="text-lg text-slate-600 dark:text-slate-300">Teknologi mutakhir untuk masa depan yang lebih hijau, dirancang khusus untuk memandu langkah kecilmu.</p>
          </motion.div>

          <div className="space-y-24">
            {/* Feature 1 */}
            <motion.div initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-100px" }} transition={{ duration: 0.7 }} className="grid md:grid-cols-2 gap-12 items-center">
              <div className="order-2 md:order-1 bg-white dark:bg-slate-800 p-4 rounded-[3.5rem] border border-emerald-950/5 dark:border-white/10 shadow-2xl shadow-emerald-900/5 aspect-square flex flex-col items-center justify-center relative overflow-hidden group">
                <img src={scanImg} alt="AI Detection" className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:opacity-60 transition-opacity duration-700" loading="lazy" decoding="async" />
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 dark:from-emerald-950/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                <Cpu className="w-24 h-24 text-emerald-200 group-hover:text-emerald-400 transition-colors duration-700 group-hover:scale-110 relative z-10" />
              </div>
              <div className="order-1 md:order-2 space-y-6">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Cpu className="w-6 h-6" />
                </div>
                <h3 className="text-3xl lg:text-4xl font-bold text-emerald-950 dark:text-emerald-50">AI Detection</h3>
                <p className="text-lg text-slate-600 dark:text-slate-300 leading-relaxed">Deteksi sampah secepat kilat. Sistem AI kami dapat mengenali berbagai jenis limbah mulai dari plastik, organik, hingga B3 hanya dari sebuah foto.</p>
              </div>
            </motion.div>

            {/* Feature 2 */}
            <motion.div initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-100px" }} transition={{ duration: 0.7 }} className="grid md:grid-cols-2 gap-12 items-center">
              <div className="space-y-6">
                <div className="w-12 h-12 rounded-2xl bg-teal-100 text-teal-600 flex items-center justify-center">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <h3 className="text-3xl lg:text-4xl font-bold text-emerald-950 dark:text-emerald-50">SAW Method</h3>
                <p className="text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
                  Rekomendasi objektif berdasarkan kriteria terbaik. Algoritma <i>Simple Additive Weighting</i> kami memprioritaskan ide upcycle berdasarkan kreativitas, nilai jual, dan kemudahan.
                </p>
              </div>
              <div className="bg-emerald-950 dark:bg-emerald-600 p-4 rounded-[3.5rem] shadow-2xl aspect-square flex flex-col items-center justify-center relative overflow-hidden group">
                <img src={sawImg} alt="SAW Method" className="absolute inset-0 w-full h-full object-cover opacity-35 group-hover:opacity-50 transition-opacity duration-700" loading="lazy" decoding="async" />
                <div className="absolute top-0 right-0 p-8 opacity-10 blur-xl group-hover:blur-md transition-all duration-700">
                  <Sparkles className="w-48 h-48 text-emerald-400" />
                </div>
                <div className="grid grid-cols-2 gap-4 relative z-10 w-full max-w-xs">
                  <div className="bg-emerald-900 border border-emerald-800 p-6 rounded-2xl flex flex-col items-center gap-2 group-hover:-translate-y-2 transition-transform duration-500 delay-100">
                    <div className="w-8 h-2 bg-emerald-500 rounded-full" />
                    <div className="w-12 h-2 bg-emerald-800 rounded-full" />
                  </div>
                  <div className="bg-emerald-900 border border-emerald-800 p-6 rounded-2xl flex flex-col items-center gap-2 group-hover:-translate-y-4 transition-transform duration-500 delay-200 mt-4">
                    <div className="w-10 h-2 bg-teal-400 rounded-full" />
                    <div className="w-14 h-2 bg-emerald-800 rounded-full" />
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Feature 3 */}
            <motion.div initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-100px" }} transition={{ duration: 0.7 }} className="grid md:grid-cols-2 gap-12 items-center">
              <div className="order-2 md:order-1 bg-white dark:bg-slate-800 p-4 rounded-[3.5rem] border border-emerald-950/5 dark:border-white/10 shadow-2xl shadow-emerald-900/5 aspect-square flex flex-col items-center justify-center relative overflow-hidden group">
                <img src={impactImg} alt="Eco Impact" className="absolute inset-0 w-full h-full object-cover opacity-35 group-hover:opacity-50 transition-opacity duration-700" loading="lazy" decoding="async" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-50 dark:from-slate-700/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                <div className="flex gap-4 relative z-10">
                  <Leaf className="w-16 h-16 text-emerald-300 group-hover:text-emerald-500 -rotate-12 transition-all duration-700" />
                  <Droplets className="w-16 h-16 text-blue-300 group-hover:text-blue-500 translate-y-4 rotate-12 transition-all duration-700" />
                </div>
              </div>
              <div className="order-1 md:order-2 space-y-6">
                <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center">
                  <Leaf className="w-6 h-6" />
                </div>
                <h3 className="text-3xl lg:text-4xl font-bold text-emerald-950 dark:text-emerald-50">Eco-Impact Dashboard</h3>
                <p className="text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
                  Pantau kontribusimu untuk bumi. Lihat langsung estimasi liter air yang dihemat, emisi karbon yang dikurangi, dan limbah yang direduksi dari setiap karyamu.
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-24 relative overflow-hidden bg-emerald-950 dark:bg-emerald-600 text-center px-6">
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="container mx-auto max-w-3xl relative z-10 space-y-8"
        >
          <h2 className="text-4xl md:text-6xl font-bold font-serif italic text-white leading-tight">
            Siap Untuk
            <br />
            Perubahan?
          </h2>
          <p className="text-emerald-200/80 text-lg">Setiap gambar yang kamu unggah adalah awal dari kehidupan kedua sebuah benda.</p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="mt-8 px-12 py-5 rounded-full bg-white dark:bg-slate-800 text-emerald-950 dark:text-emerald-50 font-black text-sm uppercase tracking-[0.2em] shadow-2xl hover:shadow-[0_0_40px_rgba(255,255,255,0.3)] transition-all"
          >
            Kembali ke Atas
          </motion.button>
        </motion.div>
        {/* Decorative background blobs */}
        <div className="absolute top-1/2 left-0 w-96 h-96 bg-emerald-800/40 rounded-full filter blur-[80px] -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute top-1/2 right-0 w-96 h-96 bg-teal-800/40 rounded-full filter blur-[80px] translate-x-1/2 -translate-y-1/2" />
      </section>
    </div>
  );
}
