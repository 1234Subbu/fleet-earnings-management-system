import React from 'react';
import { motion } from 'motion/react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  colorClass?: string; // e.g. text-blue-600 bg-blue-50
  subtitle?: string;
  index?: number;
}

export default function StatCard({ title, value, icon: Icon, colorClass = 'text-blue-600 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-400', subtitle, index = 0 }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.05, ease: 'easeOut' }}
      className="p-5 glass-card rounded-[24px] shadow-sm hover:shadow-md transition-all flex items-start justify-between"
    >
      <div className="space-y-2">
        <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
          {title}
        </span>
        <h3 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          {value}
        </h3>
        {subtitle && (
          <p className="text-[11px] font-medium text-slate-400">
            {subtitle}
          </p>
        )}
      </div>
      <div className={`p-3 rounded-xl ${colorClass} flex-shrink-0`}>
        <Icon className="h-5 w-5" />
      </div>
    </motion.div>
  );
}
