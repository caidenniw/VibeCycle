import fs from 'fs';

function replaceInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Backgrounds
  content = content.replace(/bg-\[\#FDFDFB\]/g, 'bg-[#FDFDFB] dark:bg-slate-950');
  content = content.replace(/bg-slate-50(?!0)/g, 'bg-slate-50 dark:bg-slate-900');
  content = content.replace(/bg-white(?!\/)/g, 'bg-white dark:bg-slate-800');
  content = content.replace(/bg-white\/60/g, 'bg-white/60 dark:bg-slate-800/60');
  content = content.replace(/bg-white\/70/g, 'bg-white/70 dark:bg-slate-800/70');
  content = content.replace(/bg-emerald-50(?!0)/g, 'bg-emerald-50 dark:bg-emerald-950/30');
  content = content.replace(/bg-emerald-950\b/g, 'bg-emerald-950 dark:bg-emerald-400');
  
  // Text
  content = content.replace(/text-\[\#1A1C19\]/g, 'text-[#1A1C19] dark:text-slate-100');
  content = content.replace(/text-slate-500/g, 'text-slate-500 dark:text-slate-400');
  content = content.replace(/text-slate-600/g, 'text-slate-600 dark:text-slate-300');
  content = content.replace(/text-slate-900/g, 'text-slate-900 dark:text-slate-50');
  content = content.replace(/text-emerald-950\b/g, 'text-emerald-950 dark:text-emerald-50');
  content = content.replace(/text-emerald-700/g, 'text-emerald-700 dark:text-emerald-300');
  content = content.replace(/text-emerald-600/g, 'text-emerald-600 dark:text-emerald-400');
  
  // Borders
  content = content.replace(/border-emerald-950\/5/g, 'border-emerald-950/5 dark:border-white/5');
  content = content.replace(/border-emerald-950\/10/g, 'border-emerald-950/10 dark:border-white/10');
  content = content.replace(/border-emerald-100/g, 'border-emerald-100 dark:border-emerald-900/50');
  
  fs.writeFileSync(filePath, content);
  console.log(`Updated ${filePath}`);
}

replaceInFile('src/App.tsx');
replaceInFile('src/LandingPage.tsx');
