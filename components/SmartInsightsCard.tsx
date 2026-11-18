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
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <h3 className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
            Умная аналитика
          </h3>
        </div>
        <span className="text-[10px] text-zinc-500 font-mono">Автоанализ</span>
      </div>

      <div className="flex flex-col gap-2">
        {insights.map(item => {
          let badgeBorder = 'border-zinc-800';
          let icon = <Lightbulb className="w-3.5 h-3.5 text-amber-400 shrink-0" />;

          if (item.type === 'positive') {
            badgeBorder = 'border-emerald-500/20';
            icon = <TrendingUp className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
          } else if (item.type === 'warning') {
            badgeBorder = 'border-rose-500/20';
            icon = <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />;
          }

          return (
            <div
              key={item.id}
              className={`p-3 rounded-xl bg-zinc-900 border ${badgeBorder} transition`}
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="flex items-center gap-2">
                  {icon}
                  <h4 className="text-xs font-semibold text-white tracking-tight">
                    {item.title}
                  </h4>
                </div>
                {item.metric && (
                  <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-zinc-950 text-amber-400 border border-zinc-800 shrink-0">
                    {item.metric}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed pl-5.5">
                {item.message}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
