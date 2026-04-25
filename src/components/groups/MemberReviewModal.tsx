import React, { useState, useMemo } from 'react';
import { Group } from '@/src/types';
import { X, ExternalLink, Save, Loader2, CheckCircle2, Clock, AlertCircle, ChevronRight } from 'lucide-react';
import { cn, formatNumber, ensureAbsoluteUrl, parseMembers } from '@/src/lib/utils';
import { getGroupPriority } from '@/src/lib/priorityUtils';
import { motion, AnimatePresence } from 'motion/react';
import { format, isSameDay, isSameWeek, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MemberReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  groups: Group[];
  onUpdate: (id: string, updates: Partial<Group>) => Promise<void>;
}

export function MemberReviewModal({ isOpen, onClose, groups, onUpdate }: MemberReviewModalProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [membersInput, setMembersInput] = useState('');
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const reviewGroups = useMemo(() => {
    return groups.filter(group => {
      const priority = getGroupPriority(group);
      const membros = Number(group.quantidade_membros) || 0;
      const isPerfilAtivo = group.perfil_compartilhando === 'Ativo';
      const isShopeeAtivo = group.uso_shopee === 'Ativo';
      
      return priority.prioridade === 'Alta' || membros >= 30000 || isPerfilAtivo || isShopeeAtivo;
    }).sort((a, b) => {
      // Sort by last review date (oldest first)
      const dateA = a.ultima_revisao_membros ? new Date(a.ultima_revisao_membros).getTime() : 0;
      const dateB = b.ultima_revisao_membros ? new Date(b.ultima_revisao_membros).getTime() : 0;
      return dateA - dateB;
    });
  }, [groups]);

  const handleSave = async (group: Group) => {
    const newCount = parseMembers(membersInput);
    if (!newCount && newCount !== 0) return;

    setLoadingId(group.id);
    try {
      await onUpdate(group.id, {
        quantidade_membros: newCount,
        ultima_revisao_membros: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      setEditingId(null);
    } catch (error) {
      console.error('Erro ao salvar revisão:', error);
      alert('Erro ao salvar. Tente novamente.');
    } finally {
      setLoadingId(null);
    }
  };

  const getReviewStatus = (dateStr?: string) => {
    if (!dateStr) return { label: 'Revisão Pendente', color: 'text-rose-500', icon: AlertCircle, bg: 'bg-rose-50 border-rose-100' };
    const date = parseISO(dateStr);
    const today = new Date();
    
    if (isSameDay(date, today)) {
      return { label: 'Revisado Hoje', color: 'text-primary', icon: CheckCircle2, bg: 'bg-green-50 border-green-100' };
    }
    
    if (isSameWeek(date, today, { weekStartsOn: 0 })) {
      return { label: 'Revisado esta semana', color: 'text-blue-600', icon: Clock, bg: 'bg-blue-50 border-blue-100' };
    }
    
    return { label: 'Revisão Pendente', color: 'text-rose-500', icon: AlertCircle, bg: 'bg-rose-50 border-rose-100' };
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6">
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
        className="relative bg-white w-full max-w-4xl max-h-[85vh] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="p-6 md:p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-green-200">
                <CheckCircle2 className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">Revisar Membros</h2>
            </div>
            <p className="text-slate-500 text-sm font-medium">Mantenha os principais grupos atualizados semanalmente.</p>
          </div>
          <button 
            onClick={onClose}
            className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:border-slate-300 transition-all shadow-sm active:scale-90"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* List Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-4 no-scrollbar">
          {reviewGroups.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-20 h-20 rounded-[2.5rem] bg-slate-50 flex items-center justify-center mb-6">
                <CheckCircle2 className="w-10 h-10 text-slate-300" />
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-2">Tudo em dia!</h3>
              <p className="text-slate-500 max-w-xs mx-auto">Nenhum grupo prioritário pendente de revisão no momento.</p>
            </div>
          ) : (
            reviewGroups.map((group) => {
              const status = getReviewStatus(group.ultima_revisao_membros);
              const priority = getGroupPriority(group);
              const isEditing = editingId === group.id;

              return (
                <div 
                  key={group.id}
                  className={cn(
                    "group relative bg-white border rounded-3xl p-5 md:p-6 transition-all duration-300",
                    isEditing ? "border-primary shadow-xl shadow-green-50 ring-4 ring-green-50" : "border-slate-100 hover:border-slate-200 hover:shadow-md"
                  )}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-3 mb-2">
                        <span className={cn(
                          "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                          status.bg, status.color
                        )}>
                          <div className="flex items-center gap-1.5">
                            <status.icon className="w-3 h-3" />
                            {status.label}
                          </div>
                        </span>
                        <span className={cn(
                          "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                          priority.prioridade === 'Alta' ? "bg-rose-50 text-rose-600 border-rose-100 shadow-rose-50" :
                          priority.prioridade === 'Média' ? "bg-amber-50 text-amber-600 border-amber-100 shadow-amber-50" :
                          "bg-slate-50 text-slate-400 border-slate-100 shadow-slate-50"
                        )}>
                          {priority.prioridade}
                        </span>
                        <span className="px-3 py-1 bg-slate-100 text-slate-500 rounded-full text-[10px] font-black uppercase tracking-widest">
                          {group.nicho}
                        </span>
                      </div>
                      
                      <h3 className="text-lg font-black text-slate-900 mb-1 flex items-center gap-2">
                        {group.nome_grupo}
                        {group.link_grupo && (
                          <a 
                            href={ensureAbsoluteUrl(group.link_grupo)} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-slate-300 hover:text-primary transition-colors"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                      </h3>
                      <p className="text-slate-400 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                        Atual: <span className="text-slate-600">{formatNumber(group.quantidade_membros)} membros</span>
                        {group.ultima_revisao_membros && (
                          <>
                            <span className="w-1 h-1 rounded-full bg-slate-200" />
                            <span>Última revisão: {format(parseISO(group.ultima_revisao_membros), "dd 'de' MMMM", { locale: ptBR })}</span>
                          </>
                        )}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      {isEditing ? (
                        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2">
                          <input 
                            autoFocus
                            type="text"
                            placeholder="Nova qtde..."
                            value={membersInput}
                            onChange={(e) => setMembersInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSave(group)}
                            className="w-full md:w-36 px-4 py-3 bg-white border-2 border-primary rounded-2xl text-sm font-black text-slate-900 focus:outline-none shadow-lg shadow-green-50"
                          />
                          <div className="flex gap-2">
                            <button 
                              onClick={() => handleSave(group)}
                              disabled={loadingId === group.id}
                              className="flex-1 md:flex-none h-12 px-5 bg-primary hover:bg-primary text-white rounded-2xl flex items-center justify-center gap-2 font-black text-[10px] uppercase tracking-widest shadow-lg shadow-green-200 transition-all active:scale-95 disabled:opacity-50"
                            >
                              {loadingId === group.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                              Confirmar
                            </button>
                            <button 
                              onClick={() => setEditingId(null)}
                              className="h-12 px-4 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-2xl flex items-center justify-center font-black text-[10px] uppercase tracking-widest transition-all"
                            >
                              Sair
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button 
                          onClick={() => {
                            setEditingId(group.id);
                            setMembersInput(formatNumber(group.quantidade_membros || 0));
                          }}
                          className="w-full md:w-auto h-14 px-8 bg-slate-900 hover:bg-primary text-white rounded-[1.25rem] flex items-center justify-center gap-3 font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-slate-200 active:scale-95"
                        >
                          Atualizar Membros
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="p-6 bg-slate-50 border-t border-slate-100">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex -space-x-2">
                {[1,2,3].map(i => (
                  <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-400">
                    {i}
                  </div>
                ))}
              </div>
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                {reviewGroups.length} Grupos para priorizar
              </span>
            </div>
            {reviewGroups.length > 0 && (
              <p className="text-[9px] font-black uppercase text-rose-400 tracking-widest flex items-center gap-1.5 animate-pulse">
                <AlertCircle className="w-3 h-3" />
                Dica: Foque nos grupos com revisão pendente
              </p>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
