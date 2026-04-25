import React, { useState, useRef, useEffect } from 'react';
import { Nicho } from '@/src/types';
import { Filter, ChevronDown, Plus, Edit2, Search } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface NichoFilterProps {
  value: string;
  onChange: (value: string) => void;
  nichos: Nicho[];
  onManage: () => void;
}

export function NichoFilter({ value, onChange, nichos, onManage }: NichoFilterProps) {
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

  const allOptions = ['Todos', ...nichos.map(n => n.nome)];

  return (
    <div className="relative w-full lg:w-auto xl:flex-1 min-w-[160px]" ref={dropdownRef}>
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
          <span className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none shrink-0">Nicho:</span>
          <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 truncate">
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
            className="absolute z-[100] top-full left-0 right-0 mt-3 bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden min-w-[220px]"
          >
            <div className="p-3 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
              <span className="text-[8px] font-black uppercase text-slate-400 tracking-[0.2em] ml-2">Filtrar por Nicho</span>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onManage();
                  setIsOpen(false);
                }}
                className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-emerald-600 hover:text-emerald-700 bg-white border border-slate-200 px-3 py-2 rounded-xl shadow-sm transition-all active:scale-95"
              >
                <Plus className="w-3 h-3" />
                Criar / Editar
              </button>
            </div>
            
            <div className="max-h-64 overflow-y-auto no-scrollbar">
              <button
                onClick={() => {
                  onChange('Todos');
                  setIsOpen(false);
                }}
                className={cn(
                  "w-full px-5 py-4 text-left font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-between group/opt",
                  value === 'Todos' ? "bg-emerald-50 text-emerald-600" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                <span>Todos os Nichos</span>
                {value === 'Todos' && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
              </button>

              {nichos.map((nicho) => (
                <button
                  key={nicho.id}
                  onClick={() => {
                    onChange(nicho.nome);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "w-full px-5 py-4 text-left font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-between group/opt",
                    value === nicho.nome ? "bg-emerald-50 text-emerald-600" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                  )}
                >
                  <span className="capitalize">{nicho.nome}</span>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onManage(); // Since we use the same modal for create/edit
                        setIsOpen(false);
                      }}
                      className="opacity-0 group-hover/opt:opacity-100 p-1.5 hover:bg-white rounded-lg transition-all"
                    >
                      <Edit2 className="w-3 h-3 text-slate-400" />
                    </button>
                    {value === nicho.nome && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
