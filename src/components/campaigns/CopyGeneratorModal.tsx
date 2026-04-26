import React, { useState, useEffect, useCallback } from 'react';
import { Campaign, Group } from '@/src/types';
import { 
  X, 
  Copy, 
  CheckCircle2, 
  RefreshCw, 
  MessageSquare,
  Sparkles,
  ClipboardCheck,
  Facebook
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/src/lib/utils';

interface CopyGeneratorModalProps {
  campaign: Campaign;
  group?: Group;
  onClose: () => void;
}

interface CopyVariation {
  id: number;
  style: string;
  text: string;
}

export function CopyGeneratorModal({ campaign, group, onClose }: CopyGeneratorModalProps) {
  const [variations, setVariations] = useState<CopyVariation[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copySuccess, setCopySuccess] = useState<number | null>(null);
  const [copyAllSuccess, setCopyAllSuccess] = useState(false);

  const generateVariations = useCallback(() => {
    setIsGenerating(true);
    
    // Simulating generation time
    setTimeout(() => {
      const link = `https://gestao-grupos.vercel.app/l/${campaign.slug}`;
      const name = campaign.nome_campanha;
      const niche = group?.nicho || 'essa área';
      const obs = campaign.observacoes ? ` ${campaign.observacoes}` : '';
      const origin = campaign.origem === 'Shopee' ? 'Shopee' : 'a internet';
      
      const templates = [
        {
          style: 'Curiosidade',
          copies: [
            `alguém mais aqui já perdeu tempo com isso? achei uma forma bem mais simples esses dias 👀\n${link}`,
            `acabei de ver um negócio aqui no grupo que me deixou pensando... vcs já conheciam isso? ${obs} 👀\n${link}`
          ]
        },
        {
          style: 'Descoberta pessoal',
          copies: [
            `testei isso sem muita expectativa e acabou facilitando mais do que eu imaginava 😅\n${link}`,
            `queria compartilhar q finalmente achei uma solução prática pra qm gosta de ${niche}. olha q interessante:\n${link}`
          ]
        },
        {
          style: 'Ajuda/Dica',
          copies: [
            `pra quem passa por isso no dia a dia, talvez isso ajude bastante 👇\n${link}`,
            `dica pra quem está no grupo: vi isso aqui e lembrei de vcs, parece ser bem útil pra facilitar a rotina\n${link}`
          ]
        },
        {
          style: 'Comparação',
          copies: [
            `eu fazia isso do jeito mais difícil antes… depois que vi essa alternativa, nunca mais voltei pro jeito antigo\n${link}`,
            `vi muita gente comentando sobre isso e resolvi conferir. realmente é bem diferente do que eu imaginava\n${link}`
          ]
        },
        {
          style: 'Alerta',
          copies: [
            `se você ainda faz isso manualmente, pode estar perdendo tempo sem perceber 👀\n${link}`,
            `vi isso agora e achei q vcs precisavam saber, antes que mude ou acabe. me ajudou dmais!\n${link}`
          ]
        }
      ];

      const newVariations: CopyVariation[] = [];
      let id = 1;

      // Ensure 10 variations (2 from each style)
      templates.forEach(t => {
        t.copies.forEach(text => {
          newVariations.push({
            id: id++,
            style: t.style,
            text: text
          });
        });
      });

      setVariations(newVariations);
      setIsGenerating(false);
    }, 800);
  }, [campaign, group]);

  useEffect(() => {
    generateVariations();
  }, [generateVariations]);

  const copyToClipboard = (text: string, id: number) => {
    navigator.clipboard.writeText(text);
    setCopySuccess(id);
    setTimeout(() => setCopySuccess(null), 2000);
  };

  const copyAll = () => {
    const allText = variations.map(v => `[${v.style}]\n${v.text}`).join('\n\n---\n\n');
    navigator.clipboard.writeText(allText);
    setCopyAllSuccess(true);
    setTimeout(() => setCopyAllSuccess(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative bg-[#FAFAFA] w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-[3rem] shadow-2xl flex flex-col"
      >
        {/* Modal Header */}
        <div className="p-8 bg-white border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-100">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-gray-900 tracking-tight uppercase">GERADOR DE COPY</h2>
              <p className="text-gray-500 font-medium text-sm flex items-center gap-2">
                <Facebook className="w-4 h-4 text-blue-600" />
                Textos otimizados para grupos do Facebook
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-3 hover:bg-gray-100 rounded-2xl transition-colors text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
          {/* Campaign Context Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 bg-white rounded-3xl border border-gray-100 shadow-sm">
              <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest block mb-1">Campanha</span>
              <span className="font-bold text-gray-900">{campaign.nome_campanha}</span>
            </div>
            <div className="p-5 bg-white rounded-3xl border border-gray-100 shadow-sm">
              <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest block mb-1">Link Curto</span>
              <span className="font-mono text-xs font-bold text-blue-600 truncate block">https://gestao-grupos.vercel.app/l/{campaign.slug}</span>
            </div>
          </div>

          <div className="flex items-center justify-between pb-2 border-b border-gray-100">
            <h3 className="font-black text-gray-400 uppercase tracking-widest text-[10px]">Variações Sugeridas (10)</h3>
            <div className="flex gap-2">
              <button 
                onClick={copyAll}
                disabled={isGenerating}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                  copyAllSuccess 
                    ? "bg-primary text-white" 
                    : "bg-gray-900 text-white hover:bg-black"
                )}
              >
                {copyAllSuccess ? <ClipboardCheck className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copyAllSuccess ? 'Copiado!' : 'Copiar Todos'}
              </button>
              <button 
                onClick={generateVariations}
                disabled={isGenerating}
                className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-100 transition-all disabled:opacity-50"
              >
                <RefreshCw className={cn("w-3 h-3", isGenerating && "animate-spin")} />
                Novas Variações
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-8">
            <AnimatePresence mode="popLayout">
              {isGenerating ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={`skeleton-${i}`} className="p-6 bg-gray-50/50 rounded-[2rem] border border-dashed border-gray-200 animate-pulse h-40" />
                ))
              ) : (
                variations.map((v) => (
                  <motion.div
                    key={v.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="group bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-100 transition-all relative flex flex-col"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">{v.style}</span>
                      </div>
                      <button 
                        onClick={() => copyToClipboard(v.text, v.id)}
                        className={cn(
                          "p-2.5 rounded-xl transition-all",
                          copySuccess === v.id ? "bg-green-100 text-primary" : "bg-gray-50 text-gray-400 group-hover:bg-blue-50 group-hover:text-blue-600"
                        )}
                        title="Copiar texto"
                      >
                        {copySuccess === v.id ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-gray-700 text-sm font-medium leading-relaxed flex-1 whitespace-pre-wrap">
                      {v.text}
                    </p>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-8 bg-white border-t border-gray-100">
           <div className="flex items-center gap-4 p-4 bg-amber-50 rounded-2xl border border-amber-100">
             <MessageSquare className="w-5 h-5 text-amber-500" />
             <p className="text-xs font-medium text-amber-700">
               <strong>Dica:</strong> Em grupos do Facebook, textos que parecem uma dúvida ou descoberta pessoal costumam ter muito mais engajamento do que anúncios diretos.
             </p>
           </div>
        </div>
      </motion.div>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #E5E7EB;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #D1D5DB;
        }
      `}} />
    </div>
  );
}
