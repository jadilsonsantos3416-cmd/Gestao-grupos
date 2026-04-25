import React, { useState } from 'react';
import { X, Copy, CheckCircle2, MessageSquare, Sparkles, Wand2 } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface GenerateCopyModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaignLink?: string;
}

type CopyType = 'curiosidade' | 'descoberta' | 'alerta' | 'dica';

const COPY_TEMPLATES: Record<CopyType, string[]> = {
  curiosidade: [
    "gente… olha isso aqui 😳 não sabia que existia isso 👉 {link}",
    "alguém já viu isso? achei bizarro de legal kkkk 👉 {link}",
    "você não vai acreditar no que eu achei perdido aqui... sério 👉 {link}"
  ],
  descoberta: [
    "finalmente achei onde vendia isso! 😍 preço tá ótimo 👉 {link}",
    "olha essa descoberta que fiz hoje!!! tô apaixonada 👉 {link}",
    "tava procurando faz tempo e achei aqui na promoção 👉 {link}"
  ],
  alerta: [
    "CUIDADO: promoção relâmpago disso aqui!!! vai acabar rápido 👉 {link}",
    "ALERTA: baixou muito o preço, aproveitem logo 👉 {link}",
    "corre aqui gente, estoque tá acabando e o preço é esse 👉 {link}"
  ],
  dica: [
    "dica de ouro pra vcs hoje: esse aqui é o melhor que já usei 👉 {link}",
    "vcs sempre me pedem indicação e essa aqui é a melhor 👉 {link}",
    "quem tiver precisando disso, recomendo muito esse aqui 👉 {link}"
  ]
};

export function GenerateCopyModal({ isOpen, onClose, campaignLink }: GenerateCopyModalProps) {
  const [selectedType, setSelectedType] = useState<CopyType>('curiosidade');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopy = (text: string, index: number) => {
    const finalLink = campaignLink || '👉 link';
    const finalCopy = text.replace('{link}', finalLink);
    navigator.clipboard.writeText(finalCopy);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
      />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative bg-white w-full max-w-xl max-h-[85vh] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="p-6 md:p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-200">
              <Wand2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">Gerar Copy</h2>
              <p className="text-slate-500 text-xs md:text-sm font-medium">Textos prontos para engajamento</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-all shadow-sm active:scale-95"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Categories */}
        <div className="p-6 pb-2">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {(['curiosidade', 'descoberta', 'alerta', 'dica'] as CopyType[]).map((type) => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={cn(
                  "px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 border",
                  selectedType === type
                    ? "bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-200"
                    : "bg-white text-slate-500 border-slate-100 hover:border-slate-200"
                )}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Templates */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3 no-scrollbar">
          {COPY_TEMPLATES[selectedType].map((template, index) => (
            <div 
              key={index}
              className="group relative bg-slate-50 border border-slate-100 rounded-[1.5rem] p-5 hover:border-indigo-200 hover:bg-white transition-all cursor-pointer"
              onClick={() => handleCopy(template, index)}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-700 leading-relaxed mb-1 italic">
                    "{template.replace('{link}', campaignLink || '👉 link')}"
                  </p>
                </div>
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center transition-all shrink-0",
                  copiedIndex === index ? "bg-primary text-white" : "bg-white text-slate-400 shadow-sm border border-slate-100 group-hover:border-indigo-200 group-hover:text-indigo-500"
                )}>
                  {copiedIndex === index ? <CheckCircle2 className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-6 bg-slate-50 border-t border-slate-100">
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            Dica: Alterne entre os tipos de copy para não saturar a audiência.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
