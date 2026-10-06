import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  color?: 'blue' | 'emerald' | 'amber' | 'rose' | 'purple';
  warning?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  color = 'blue',
  warning = false,
}) => {
  const colorMap = {
    blue: {
      bg: 'bg-blue-50',
      text: 'text-blue-600',
      border: 'border-blue-100',
    },
    emerald: {
      bg: 'bg-emerald-50',
      text: 'text-emerald-600',
      border: 'border-emerald-100',
    },
    amber: {
      bg: 'bg-amber-50',
      text: 'text-amber-600',
      border: 'border-amber-100',
    },
    rose: {
      bg: 'bg-rose-50',
      text: 'text-rose-600',
      border: 'border-rose-100',
    },
    purple: {
      bg: 'bg-purple-50',
      text: 'text-purple-600',
      border: 'border-purple-100',
    },
  }[color];

  return (
    <div
      className={`p-5 rounded-2xl bg-white border ${
        warning ? 'border-amber-400 bg-amber-50/20 shadow-sm shadow-amber-200/50' : 'border-slate-100'
      } shadow-sm transition hover:shadow-md`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</p>
          <div className="flex items-baseline gap-2 mt-1.5">
            <h4 className="text-2xl sm:text-3xl font-extrabold text-slate-900">{value}</h4>
          </div>
          {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-xl ${colorMap.bg} ${colorMap.text} border ${colorMap.border}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
};

