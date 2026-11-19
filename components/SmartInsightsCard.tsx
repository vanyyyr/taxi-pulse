'use client';

import React from 'react';
import { 
  Lightbulb, TrendingUp, AlertTriangle, Sparkles 
} from 'lucide-react';
import { SmartInsight } from '@/lib/types';

interface SmartInsightsCardProps {
  insights: SmartInsight[];
}

export function SmartInsightsCard({ insights }: SmartInsightsCardProps) {
  if (!insights || insights.length === 0) return null;

  return (
    <div className="w-full flex flex-col gap-2.5">
      <div className="flex items-center gap-1.5 px-1">
        <Sparkles className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
        <h3 className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
          Умная аналитика
        </h3>
      </div>

      <div className="flex flex-col gap-2">
        {insights.map(item => {
          let badgeBorder = 'border-black/[0.06] dark:border-white/[0.08]';
          let icon = <Lightbulb className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0" />;

          if (item.type === 'positive') {
            badgeBorder = 'border-emerald-500/20';
            icon = <TrendingUp className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0" />;
          } else if (item.type === 'warning') {
            badgeBorder = 'border-rose-500/20';
            icon = <AlertTriangle className="w-4 h-4 text-rose-500 dark:text-rose-400 shrink-0" />;
          }

          return (
            <div
              key={item.id}
              className={`p-3.5 rounded-2xl liquid-glass-card border ${badgeBorder} transition-colors`}
            >
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2">
                  {icon}
                  <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
                    {item.title}
                  </h4>
                </div>
                {item.metric && (
                  <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-lg bg-amber-500/10 dark:bg-amber-400/10 text-amber-600 dark:text-amber-300 border border-amber-500/20 shrink-0">
                    {item.metric}
                  </span>
                )}
              </div>
              <p className="text-[12px] text-zinc-600 dark:text-zinc-300 leading-relaxed pl-6">
                {item.message}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
