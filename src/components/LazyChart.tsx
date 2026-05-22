// Lazy-loaded chart component for Gallery tab
// Recharts (8MB) is only loaded when this component is rendered

import { lazy, Suspense } from 'react';

const LazyChartInner = lazy(() => import('./LazyChartInner'));

interface LazyChartProps {
  data: { date: string; waste: number }[];
}

export default function LazyChart({ data }: LazyChartProps) {
  return (
    <Suspense fallback={
      <div className="w-full h-64 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-emerald-200 border-t-emerald-600 animate-spin" />
      </div>
    }>
      <LazyChartInner data={data} />
    </Suspense>
  );
}