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
        <Skeleton className="h-14 w-full md:w-64 rounded-2xl" />
        <div className="flex gap-4 w-full md:w-auto">
          <Skeleton className="h-14 flex-1 md:w-32 rounded-2xl" />
          <Skeleton className="h-14 flex-1 md:w-32 rounded-2xl" />
        </div>
      </div>
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-100/40 overflow-hidden">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="p-6 border-b border-slate-50 flex items-center gap-4">
            <Skeleton className="h-12 w-12 rounded-2xl shrink-0" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-4 w-1/3 rounded-full" />
              <Skeleton className="h-3 w-1/4 rounded-full" />
            </div>
            <Skeleton className="h-8 w-24 rounded-full shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
};
