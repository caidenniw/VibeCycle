// This component contains Recharts imports - will be lazy loaded
// Only loads when user opens Gallery tab

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface ChartData {
  date: string;
  waste: number;
}

interface LazyChartInnerProps {
  data: ChartData[];
}

export default function LazyChartInner({ data }: LazyChartInnerProps) {
  return (
    <div className="w-full" style={{ height: 256 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
  );
}