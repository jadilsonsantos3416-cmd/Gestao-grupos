import React, { useState, useMemo } from 'react';
import { Group } from '@/src/types';
import { X, ExternalLink, Copy, CheckCircle2, Loader2, Sparkles, Trophy, Calendar } from 'lucide-react';
import { cn, formatNumber, ensureAbsoluteUrl } from '@/src/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PostTodayModalProps {
  isOpen: boolean;
  onClose: () => void;
  groups: Group[];
  onUpdate: (id: string, updates: Partial<Group>) => Promise<void>;
}

export function PostTodayModal({ isOpen, onClose, groups, onUpdate }: PostTodayModalProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const topGroups = useMemo(() => {
    return [...groups]
      .sort((a, b) => (b.score_postagem || 0) - (a.score_postagem || 0))
      .slice(0, 10);
  }, [groups]);

  const handleCopyLink = (group: Group) => {
    if (!group.link_grupo) return;
    navigator.clipboard.writeText(ensureAbsoluteUrl(group.link_grupo));
    setCopiedId(group.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleMarkAsPosted = async (group: Group) => {
    setLoadingId(group.id);
    try {
      await onUpdate(group.id, {
        ultimo_post: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Erro ao marcar como postado:', error);
    } finally {
      setLoadingId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
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
        className="relative bg-white w-full max-w-2xl max-h-[85vh] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="p-6 md:p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-200">
              <Trophy className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">Postar Hoje</h2>
              <p className="text-slate-500 text-xs md:text-sm font-medium">Os 10 melhores grupos para hoje</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-all shadow-sm active:scale-95"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3 no-scrollbar">
          {topGroups.map((group, index) => {
            const isPostedToday = group.ultimo_post && 
              new Date(group.ultimo_post).toDateString() === new Date().toDateString();

            return (
              <div 
                key={group.id}
                className={cn(
                  "relative bg-white border rounded-[1.5rem] p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all duration-300",
                  isPostedToday ? "border-emerald-100/50 bg-emerald-50/20" : "border-slate-100 hover:border-slate-200"
                )}
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-xs font-black text-slate-400 border border-slate-100 shrink-0">
                    {index + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-black text-slate-900 truncate flex items-center gap-2">
                      {group.nome_grupo}
                      {isPostedToday && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                    </h4>
                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      <span>{formatNumber(group.quantidade_membros)} membros</span>
                      <span className="w-1 h-1 rounded-full bg-slate-200" />
                      <span className="text-emerald-500">Score: {group.score_postagem}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handleCopyLink(group)}
                    className={cn(
                      "h-10 px-4 rounded-xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 border",
                      copiedId === group.id 
                        ? "bg-emerald-50 border-emerald-200 text-emerald-600" 
                        : "bg-white border-slate-100 text-slate-600 hover:border-slate-200"
                    )}
                  >
                    {copiedId === group.id ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedId === group.id ? 'Copiado!' : 'Link'}
                  </button>

                  <button 
                    onClick={() => handleMarkAsPosted(group)}
                    disabled={loadingId === group.id || isPostedToday}
                    className={cn(
                      "h-10 px-4 rounded-xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all active:scale-95",
                      isPostedToday
                        ? "bg-emerald-100 text-emerald-600 cursor-not-allowed"
                        : "bg-slate-900 text-white hover:bg-emerald-600 shadow-md shadow-slate-200"
                    )}
                  >
                    {loadingId === group.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      isPostedToday ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />
                    )}
                    {isPostedToday ? 'Postado' : 'Marcar Postagem'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
            <Calendar className="w-3.5 h-3.5" />
            Hoje, {format(new Date(), "dd 'de' MMMM", { locale: ptBR })}
          </div>
          <p className="text-[9px] font-bold text-slate-400 italic">
            Foque nos grupos com maior score para melhor resultado.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
