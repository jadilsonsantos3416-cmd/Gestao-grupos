import React, { useState, useRef, useEffect } from 'react';
import { Filter, ChevronDown } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface PriorityFilterProps {
  value: string;
  onChange: (value: string) => void;
}

export function PriorityFilter({ value, onChange }: PriorityFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const options = ['Todos', 'Alta', 'Média', 'Baixa'];

  return (
    <div className="relative w-full lg:w-auto xl:flex-1 min-w-[140px]" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2 md:gap-3 bg-white px-4 md:px-5 h-12 lg:h-14 rounded-xl md:rounded-2xl border transition-all group w-full cursor-pointer outline-none",
          value !== 'Todos' ? "border-emerald-200 bg-emerald-50/10 shadow-sm shadow-emerald-50" : "border-slate-100 shadow-sm hover:border-emerald-200"
        )}
      >
        <Filter className={cn(
          "w-3 md:w-3.5 h-3 md:h-3.5 shrink-0 transition-colors",
          value !== 'Todos' ? "text-emerald-500" : "text-slate-300 group-hover:text-emerald-500"
        )} />
        <div className="flex items-center gap-1.5 md:gap-2 flex-1 min-w-0 pointer-events-none text-left">
          <span className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none shrink-0">Prioridade:</span>
          <span className={cn(
            "text-[10px] font-black uppercase tracking-widest truncate",
            value === 'Alta' ? "text-rose-600" : 
            value === 'Média' ? "text-amber-600" : 
            value === 'Baixa' ? "text-slate-500" : "text-emerald-600"
          )}>
            {value}
          </span>
        </div>
        <ChevronDown className={cn(
          "w-4 h-4 text-slate-300 transition-transform duration-200",
          isOpen && "rotate-180 text-emerald-500"
        )} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute z-[100] top-full left-0 right-0 mt-3 bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden min-w-[180px]"
          >
            <div className="p-3 border-b border-slate-50 bg-slate-50/50">
              <span className="text-[8px] font-black uppercase text-slate-400 tracking-[0.2em] ml-2">Filtrar por Prioridade</span>
            </div>
            
            <div className="py-2">
              {options.map((opt) => (
                <button
                  key={opt}
                  onClick={() => {
                    onChange(opt);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "w-full px-5 py-4 text-left font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-between group/opt",
                    value === opt ? "bg-emerald-50 text-emerald-600" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                  )}
                >
                  <span className={cn(
                    opt === 'Alta' && value !== opt && "group-hover/opt:text-rose-600",
                    opt === 'Média' && value !== opt && "group-hover/opt:text-amber-600",
                    opt === 'Baixa' && value !== opt && "group-hover/opt:text-slate-600",
                  )}>
                    {opt === 'Todos' ? 'Todas Prioridades' : opt}
                  </span>
                  {value === opt && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
