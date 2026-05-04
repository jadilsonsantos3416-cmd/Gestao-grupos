import React from 'react';
import { cn } from '@/src/lib/utils';

export const Skeleton = ({ className }: { className?: string }) => {
  return (
    <div className={cn(
      "relative overflow-hidden bg-slate-100 rounded-lg after:absolute after:inset-0 after:-translate-x-full after:animate-[shimmer_2s_infinite] after:bg-gradient-to-r after:from-transparent after:via-white/60 after:to-transparent",
      className
    )} />
  );
};

export const DashboardSkeleton = () => {
  return (
    <div className="space-y-8 p-2 md:p-8">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white p-5 md:p-6 rounded-3xl border border-slate-100 shadow-xl shadow-slate-100/40 space-y-4">
            <Skeleton className="h-3 w-1/2 rounded-full" />
            <Skeleton className="h-8 w-3/4 rounded-xl" />
          </div>
        ))}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        <div className="lg:col-span-2 bg-white p-6 md:p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-100/40 space-y-6">
          <Skeleton className="h-8 w-1/4 rounded-xl" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-2xl" />
            ))}
          </div>
        </div>
        <div className="bg-white p-6 md:p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-100/40 space-y-6">
          <Skeleton className="h-8 w-1/2 rounded-xl" />
          <Skeleton className="h-[300px] w-full rounded-3xl" />
        </div>
      </div>
    </div>
  );
};

export const GroupListSkeleton = () => {
  return (
    <div className="space-y-6 p-2 md:p-8">
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-8">
        <Skeleton className="h-14 w-full md:w-80 rounded-[22px]" />
        <div className="flex gap-4 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
          <Skeleton className="h-14 min-w-[120px] md:w-32 rounded-[18px] shrink-0" />
          <Skeleton className="h-14 min-w-[120px] md:w-32 rounded-[18px] shrink-0" />
          <Skeleton className="h-14 min-w-[120px] md:w-32 rounded-[18px] shrink-0" />
        </div>
      </div>
      <div className="bg-white rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-100/40 overflow-hidden">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="p-8 border-b border-slate-50 flex items-center gap-6">
            <Skeleton className="h-[52px] w-[52px] rounded-[14px] shrink-0" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-5 w-[40%] rounded-full" />
              <div className="flex gap-4">
                <Skeleton className="h-3 w-20 rounded-full" />
                <Skeleton className="h-3 w-20 rounded-full" />
              </div>
            </div>
            <div className="hidden md:flex flex-col items-center gap-2">
              <Skeleton className="h-3 w-16 rounded-full" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
            <div className="flex gap-3">
              <Skeleton className="h-11 w-11 rounded-xl shrink-0" />
              <Skeleton className="h-11 w-11 rounded-xl shrink-0" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
