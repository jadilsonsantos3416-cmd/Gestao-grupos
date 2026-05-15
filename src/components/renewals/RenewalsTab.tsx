import React, { useState, useMemo } from 'react';
import { Group, Locatario, RenewalHistoryEntry } from '@/src/types';
import { Search, RotateCcw, Calendar, CheckCircle2, ChevronRight, Phone, MessageSquare, Copy, Clock, RefreshCw, Filter, Users, DollarSign, X, CalendarCheck, RotateCw } from 'lucide-react';
import { cn, formatCurrency } from '@/src/lib/utils';
import { parseISO, format, addDays, isPast, isToday, startOfDay, isBefore } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';

interface RenewalsTabProps {
  groups: Group[];
  onUpdate: (id: string, updates: Partial<Group>) => Promise<void>;
}

interface LocatarioGroup {
  group: Group;
  locatarioIndex: number; // -1 for legacy
  locatarioData: Locatario | { nome: string; whatsapp: string; data_vencimento: string; valor: number; status: string };
}

export function RenewalsTab({ groups, onUpdate }: RenewalsTabProps) {
  const [selectedRenter, setSelectedRenter] = useState<string | null>(null);
  const [newExpirationDate, setNewExpirationDate] = useState<string>(format(addDays(new Date(), 30), 'yyyy-MM-dd'));
  const [totalPaidValue, setTotalPaidValue] = useState<string>('');
  const [selectedGroupKeys, setSelectedGroupKeys] = useState<Set<string>>(new Set());
  const [isRenewing, setIsRenewing] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [searchRenter, setSearchRenter] = useState('');
  const [groupFilter, setGroupFilter] = useState<'Todos' | 'Vencidos' | 'Vence Hoje' | 'Ativos'>('Todos');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Helper to format date for display DD/MM/YYYY
  const formatDateBR = (dateStr: string | undefined | null) => {
    if (!dateStr) return '-';
    // If it's a full ISO string, take only the date part
    const justDate = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
    const parts = justDate.split('-');
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  // Aggregate unique renters and their stats
  const rentersData = useMemo(() => {
    const renterMap = new Map<string, {
      nome: string;
      whatsapp: string;
      groupCount: number;
      expiredCount: number;
      totalValue: number;
    }>();

    groups.forEach(group => {
      // Check legacy fields
      if (group.locatario && group.status === 'Alugado') {
        const key = group.locatario.toLowerCase().trim();
        const existing = renterMap.get(key) || { 
          nome: group.locatario, 
          whatsapp: group.whatsapp || '', 
          groupCount: 0, 
          expiredCount: 0, 
          totalValue: 0 
        };
        
        existing.groupCount++;
        // Use a more robust check for expiration that avoids timezone shifts
        if (group.data_vencimento) {
          const expiration = parseISO(group.data_vencimento);
          // Compare using startOfDay to avoid time issues
          if (isPast(expiration) && !isToday(expiration)) {
            existing.expiredCount++;
          }
        }
        existing.totalValue += Number(group.valor) || 0;
        renterMap.set(key, existing);
      }

      // Check locatarios array
      if (group.locatarios && group.locatarios.length > 0) {
        group.locatarios.forEach(l => {
          if (l.status === 'Ativo') {
            const key = l.nome.toLowerCase().trim();
            const existing = renterMap.get(key) || { 
              nome: l.nome, 
              whatsapp: l.whatsapp || '', 
              groupCount: 0, 
              expiredCount: 0, 
              totalValue: 0 
            };
            
            existing.groupCount++;
            if (l.data_vencimento) {
              const expiration = parseISO(l.data_vencimento);
              if (isPast(expiration) && !isToday(expiration)) {
                existing.expiredCount++;
              }
            }
            existing.totalValue += Number(l.valor) || 0;
            renterMap.set(key, existing);
          }
        });
      }
    });

    return Array.from(renterMap.values()).sort((a, b) => b.groupCount - a.groupCount);
  }, [groups]);

  // Filter groups for selected renter
  const renterGroups = useMemo(() => {
    if (!selectedRenter) return [];

    const list: LocatarioGroup[] = [];
    const renterKey = selectedRenter.toLowerCase().trim();

    groups.forEach(group => {
      // Legacy
      if (group.locatario && group.status === 'Alugado' && group.locatario.toLowerCase().trim() === renterKey) {
        list.push({
          group,
          locatarioIndex: -1,
          locatarioData: {
            nome: group.locatario,
            whatsapp: group.whatsapp,
            data_vencimento: group.data_vencimento,
            valor: group.valor,
            status: group.status
          }
        });
      }

      // Array
      if (group.locatarios) {
        group.locatarios.forEach((l, idx) => {
          if (l.status === 'Ativo' && l.nome.toLowerCase().trim() === renterKey) {
            list.push({
              group,
              locatarioIndex: idx,
              locatarioData: l
            });
          }
        });
      }
    });

    return list.filter(item => {
      if (groupFilter === 'Todos') return true;
      if (!item.locatarioData.data_vencimento) return false;
      
      const date = parseISO(item.locatarioData.data_vencimento);
      if (groupFilter === 'Vencidos') return isPast(date) && !isToday(date);
      if (groupFilter === 'Vence Hoje') return isToday(date);
      if (groupFilter === 'Ativos') return !isPast(date) || isToday(date);
      return true;
    });
  }, [groups, selectedRenter, groupFilter]);

  const selectedRenterStats = useMemo(() => {
    if (!selectedRenter) return null;
    return rentersData.find(r => r.nome.toLowerCase().trim() === selectedRenter.toLowerCase().trim());
  }, [rentersData, selectedRenter]);

  const parsedTotalValue = useMemo(() => {
    if (!totalPaidValue) return 0;
    const clean = totalPaidValue.replace(/[^\d.,]/g, '').replace(',', '.');
    return parseFloat(clean) || 0;
  }, [totalPaidValue]);

  const valuePerGroup = useMemo(() => {
    if (selectedGroupKeys.size === 0 || parsedTotalValue === 0) return 0;
    return parsedTotalValue / selectedGroupKeys.size;
  }, [selectedGroupKeys.size, parsedTotalValue]);

  const handleApplyPlus30 = () => {
    setNewExpirationDate(format(addDays(new Date(), 30), 'yyyy-MM-dd'));
  };

  const handleSelectAll = () => {
    if (selectedGroupKeys.size === renterGroups.length) {
      setSelectedGroupKeys(new Set());
    } else {
      setSelectedGroupKeys(new Set(renterGroups.map(lg => `${lg.group.id}-${lg.locatarioIndex}`)));
    }
  };

  const handleToggleSelection = (key: string) => {
    const next = new Set(selectedGroupKeys);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setSelectedGroupKeys(next);
  };

  const handleRenew = () => {
    if (selectedGroupKeys.size === 0 || !newExpirationDate) return;
    setShowConfirmModal(true);
  };

  const confirmRenew = async () => {
    setIsRenewing(true);
    setShowConfirmModal(false);
    const timestamp = new Date().toISOString();
    const targetDateFormatted = formatDateBR(newExpirationDate);
    const vpg = valuePerGroup;
    const totalPaid = parsedTotalValue;
    const qty = selectedGroupKeys.size;
    let successCount = 0;

    try {
      // Group renewals by group ID to avoid race conditions
      const updatesByGroup = new Map<string, Partial<Group>>();

      for (const key of selectedGroupKeys) {
        const [groupId, locIndexStr] = key.split('-');
        const locIndex = parseInt(locIndexStr);
        const lg = renterGroups.find(item => item.group.id === groupId && item.locatarioIndex === locIndex);
        
        if (!lg) continue;

        const currentUpdates = updatesByGroup.get(groupId) || {};
        
        if (locIndex === -1) {
          // Legacy update
          const historyEntry: RenewalHistoryEntry = {
            data_renovacao: timestamp,
            vencimento_anterior: lg.group.data_vencimento || '',
            novo_vencimento: newExpirationDate,
            valor: vpg > 0 ? vpg : (lg.group.valor || 0),
            locatario: lg.group.locatario,
            tipo: "renovacao_por_locatario",
            valor_total_pago: totalPaid > 0 ? totalPaid : undefined,
            valor_por_grupo: vpg > 0 ? vpg : undefined,
            quantidade_grupos: qty > 0 ? qty : undefined
          };

          updatesByGroup.set(groupId, {
            ...currentUpdates,
            data_vencimento: newExpirationDate,
            valor: vpg > 0 ? vpg : lg.group.valor,
            status: 'Alugado',
            ultima_renovacao: timestamp,
            atualizado_em: timestamp,
            historico_renovacoes: [historyEntry, ...(lg.group.historico_renovacoes || [])].slice(0, 50)
          });
          successCount++;
        } else {
          // Array update
          const currentLocatarios = (currentUpdates.locatarios || [...(lg.group.locatarios || [])]);
          const loc = { ...currentLocatarios[locIndex] };
          
          const historyEntry: RenewalHistoryEntry = {
            data_renovacao: timestamp,
            vencimento_anterior: loc.data_vencimento || '',
            novo_vencimento: newExpirationDate,
            valor: vpg > 0 ? vpg : (loc.valor || lg.group.valor || 0),
            locatario: loc.nome,
            tipo: "renovacao_por_locatario",
            valor_total_pago: totalPaid > 0 ? totalPaid : undefined,
            valor_por_grupo: vpg > 0 ? vpg : undefined,
            quantidade_grupos: qty > 0 ? qty : undefined
          };

          currentLocatarios[locIndex] = {
            ...loc,
            data_vencimento: newExpirationDate,
            status: 'Ativo',
            valor: vpg > 0 ? vpg : loc.valor,
            ultima_renovacao: timestamp,
            historico_renovacoes: [historyEntry, ...(loc.historico_renovacoes || [])].slice(0, 50)
          } as Locatario;

          updatesByGroup.set(groupId, {
            ...currentUpdates,
            locatarios: currentLocatarios,
            atualizado_em: timestamp
          });
          successCount++;
        }
      }

      // Apply updates
      const promises = Array.from(updatesByGroup.entries()).map(([id, updates]) => onUpdate(id, updates));
      await Promise.all(promises);

      setToast({ message: `${successCount} grupos renovados para ${targetDateFormatted}`, type: 'success' });
      setSelectedGroupKeys(new Set());
    } catch (error) {
      console.error("Erro ao renovar por locatário:", error);
      setToast({ message: "Alguns grupos não foram renovados", type: 'error' });
    } finally {
      setIsRenewing(false);
      setTimeout(() => setToast(null), 5000);
    }
  };

  const copyWhatsAppMessage = () => {
    if (!selectedRenterStats) return;

    const hour = new Date().getHours();
    const greeting = hour >= 18 || hour < 5 ? "Boa noite" : "Bom dia";
    const dateFormatted = formatDateBR(newExpirationDate);
    
    let message = `${greeting}, ${selectedRenterStats.nome}! Tudo bem? 😊\n\nRecebi a renovação dos seus grupos.\nPróximo vencimento: *${dateFormatted}*`;
    
    if (parsedTotalValue > 0) {
      message += `\nTotal renovado: *${formatCurrency(parsedTotalValue)}*`;
    }

    message += `\n\nTudo certo por aqui 👍`;
    
    navigator.clipboard.writeText(message);
    setToast({ message: "Mensagem copiada!", type: 'success' });
    setTimeout(() => setToast(null), 2000);
  };

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto px-4 md:px-6 py-6">
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={cn(
              "fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-2xl shadow-2xl font-black text-xs uppercase tracking-widest flex items-center gap-3 border",
              toast.type === 'success' ? "bg-emerald-600 text-white border-emerald-500" : "bg-rose-600 text-white border-rose-500"
            )}
          >
            {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <X className="w-4 h-4" />}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row gap-6 items-stretch">
        {/* Left Card: Selection */}
        <div className="flex-1 bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center border border-blue-100">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Renovação por Locatário</h2>
              <p className="text-slate-400 font-bold text-xs">Selecione um locatário para gerenciar seus grupos</p>
            </div>
          </div>

          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
            <input 
              type="text"
              placeholder="Pesquisar locatário..."
              value={searchRenter}
              onChange={(e) => setSearchRenter(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-50 focus:border-blue-200 transition-all font-bold text-sm text-slate-600 placeholder:text-slate-300"
            />
          </div>

          <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
            {rentersData
              .filter(r => r.nome.toLowerCase().includes(searchRenter.toLowerCase()))
              .map(r => (
                <button
                  key={r.nome}
                  onClick={() => {
                    setSelectedRenter(r.nome);
                    setSelectedGroupKeys(new Set());
                  }}
                  className={cn(
                    "flex items-center justify-between p-4 rounded-2xl border transition-all text-left group",
                    selectedRenter === r.nome 
                      ? "bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-100 scale-[1.02]" 
                      : "bg-white border-slate-100 text-slate-600 hover:border-blue-200 hover:bg-blue-50/30"
                  )}
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="font-black text-sm uppercase tracking-tight">{r.nome}</span>
                    <span className={cn(
                      "text-[10px] font-bold",
                      selectedRenter === r.nome ? "text-blue-100" : "text-slate-400"
                    )}>
                      {r.whatsapp || 'Sem WhatsApp'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col items-end">
                      <span className="text-[10px] font-black uppercase tracking-widest">{r.groupCount} grupos</span>
                      {r.expiredCount > 0 && (
                        <span className={cn(
                          "text-[9px] font-black uppercase tracking-widest",
                          selectedRenter === r.nome ? "text-rose-200" : "text-rose-500"
                        )}>
                          {r.expiredCount} vencidos
                        </span>
                      )}
                    </div>
                    <ChevronRight className={cn(
                      "w-4 h-4 transition-transform",
                      selectedRenter === r.nome ? "translate-x-1" : "opacity-30 group-hover:opacity-100"
                    )} />
                  </div>
                </button>
              ))}
          </div>
        </div>

        {/* Right Card: Configuration */}
        <div className="w-full md:w-[400px] bg-slate-900 p-8 rounded-[2.5rem] shadow-2xl flex flex-col gap-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -mr-16 -mt-16" />
          
          <div className="relative space-y-6">
            <div>
              <h3 className="text-emerald-400 font-black uppercase tracking-widest text-xs mb-4">Configurar Renovação</h3>
              <div className="space-y-4">
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Novo Vencimento</label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                    <input 
                      type="date"
                      value={newExpirationDate}
                      onChange={(e) => setNewExpirationDate(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 text-white pl-12 pr-4 py-3 rounded-2xl outline-none focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all font-mono font-bold"
                    />
                  </div>
                </div>
                <button 
                  onClick={handleApplyPlus30}
                  className="w-full py-2.5 bg-slate-800 text-slate-300 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-700 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <RotateCw className="w-3.5 h-3.5 text-emerald-500" />
                  Sugerir +30 dias
                </button>
              </div>
            </div>

            {selectedRenterStats && (
              <div className="bg-slate-800/50 rounded-3xl p-6 border border-white/5 space-y-6">
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Valor Total Pago (R$)</label>
                  <div className="relative">
                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                    <input 
                      type="text"
                      placeholder="0,00"
                      value={totalPaidValue}
                      onChange={(e) => setTotalPaidValue(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 text-white pl-12 pr-4 py-3 rounded-2xl outline-none focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all font-mono font-bold"
                    />
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-white/5">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Valor por Grupo</span>
                    <span className={cn(
                      "text-lg font-black font-mono",
                      valuePerGroup > 0 ? "text-white" : "text-slate-600"
                    )}>
                      {formatCurrency(valuePerGroup)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Grupos Selecionados</span>
                    <span className="text-emerald-400 font-black font-mono">{selectedGroupKeys.size}</span>
                  </div>
                  {newExpirationDate && (
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Novo Vencimento</span>
                      <span className="text-white font-black font-mono">{formatDateBR(newExpirationDate)}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex flex-col gap-3">
              <button
                disabled={selectedGroupKeys.size === 0 || isRenewing || !newExpirationDate || !parsedTotalValue}
                onClick={handleRenew}
                className={cn(
                  "w-full py-5 rounded-[1.5rem] font-black uppercase tracking-[0.2em] text-xs transition-all flex items-center justify-center gap-3",
                  selectedGroupKeys.size > 0 && !isRenewing && newExpirationDate && parsedTotalValue
                    ? "bg-emerald-500 text-white hover:bg-emerald-600 shadow-xl shadow-emerald-500/20 active:scale-95"
                    : "bg-slate-800 text-slate-600 cursor-not-allowed"
                )}
              >
                {isRenewing ? <RefreshCw className="w-5 h-5 animate-spin" /> : <RotateCcw className="w-5 h-5" />}
                {isRenewing ? 'Salvando...' : 'Salvar e Renovar'}
              </button>
              
              <button
                disabled={!selectedRenterStats}
                onClick={copyWhatsAppMessage}
                className="w-full py-4 rounded-[1.5rem] bg-slate-800 text-slate-400 font-black uppercase tracking-widest text-[10px] hover:bg-slate-700 hover:text-white transition-all active:scale-95 flex items-center justify-center gap-3"
              >
                <MessageSquare className="w-4 h-4 text-blue-400" />
                Copiar Mensagem WhatsApp
              </button>
            </div>
          </div>
        </div>
      </div>

      {selectedRenter && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden"
        >
          <div className="p-8 border-b border-slate-50 bg-slate-50/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm border border-slate-100">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Grupos de {selectedRenter}</h3>
                <p className="text-slate-400 font-bold text-xs">{renterGroups.length} grupos encontrados no filtro</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button 
                onClick={handleSelectAll}
                className="px-4 py-2 bg-white text-slate-600 rounded-xl border border-slate-200 text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all active:scale-95"
              >
                {selectedGroupKeys.size === renterGroups.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
              </button>

              <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-100">
                {(['Todos', 'Vencidos', 'Vence Hoje', 'Ativos'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setGroupFilter(f)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                      groupFilter === f ? "bg-slate-900 text-white" : "text-slate-400 hover:text-slate-600"
                    )}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-6 py-4 w-12"></th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Grupo</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nicho</th>
                  <th className="px-6 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Valor</th>
                  <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Vencimento</th>
                  <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {renterGroups.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center gap-3 opacity-20">
                        <Filter className="w-12 h-12" />
                        <span className="font-black uppercase tracking-[0.2em] text-xs">Nenhum grupo encontrado</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  renterGroups.map(lg => {
                    const key = `${lg.group.id}-${lg.locatarioIndex}`;
                    const isSelected = selectedGroupKeys.has(key);
                    const dateStr = lg.locatarioData.data_vencimento;
                    const date = dateStr ? parseISO(dateStr) : null;
                    const isVencido = date && isPast(date) && !isToday(date);
                    const isVenceHoje = date && isToday(date);

                    return (
                      <tr 
                        key={key} 
                        onClick={() => handleToggleSelection(key)}
                        className={cn(
                          "group cursor-pointer transition-colors",
                          isSelected ? "bg-blue-50/30" : "hover:bg-slate-50/50"
                        )}
                      >
                        <td className="px-6 py-4">
                          <div className={cn(
                            "w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all",
                            isSelected ? "bg-blue-600 border-blue-600" : "border-slate-200"
                          )}>
                            {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-black text-slate-900 tracking-tight">{lg.group.nome_grupo}</span>
                            <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5">
                              <Users className="w-3 h-3" />
                              {lg.group.quantidade_membros || 0} membros
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full text-[9px] font-black uppercase tracking-widest border border-slate-200">
                            {lg.group.nicho}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={cn(
                            "font-black font-mono transition-colors",
                            isSelected && valuePerGroup > 0 ? "text-emerald-600 scale-110" : "text-slate-700"
                          )}>
                            {formatCurrency(isSelected && valuePerGroup > 0 ? valuePerGroup : Number(lg.locatarioData.valor))}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className={cn(
                            "font-black font-mono",
                            isVencido ? "text-rose-500" : isVenceHoje ? "text-orange-500" : "text-slate-500"
                          )}>
                            {formatDateBR(dateStr)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className={cn(
                            "text-[10px] font-black uppercase tracking-widest",
                            isVencido ? "text-rose-500" : isVenceHoje ? "text-orange-500" : "text-emerald-500"
                          )}>
                            {isVencido ? 'Vencido' : isVenceHoje ? 'Vence Hoje' : 'Ativo'}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirmModal && selectedRenterStats && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowConfirmModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[3rem] shadow-2xl overflow-hidden border border-slate-100 z-[111]"
            >
              <div className="p-8 md:p-10">
                <div className="w-20 h-20 bg-emerald-50 rounded-3xl flex items-center justify-center border border-emerald-100 mx-auto mb-6">
                  <CalendarCheck className="w-10 h-10 text-emerald-600" />
                </div>

                <div className="text-center space-y-3 mb-8">
                  <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Renovar aluguel do locatário?</h3>
                  <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 flex flex-col gap-3">
                    <p className="text-slate-500 font-bold leading-relaxed">
                      Você está renovando <span className="text-emerald-600 font-black">{selectedGroupKeys.size} grupos</span> do locatário <span className="text-slate-900 font-black">{selectedRenterStats.nome}</span>.
                    </p>
                    <div className="flex flex-col gap-1 items-center justify-center pt-2 border-t border-slate-200/50">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Novo Vencimento</span>
                      <span className="text-xl font-black text-slate-900">{formatDateBR(newExpirationDate)}</span>
                      {parsedTotalValue > 0 && (
                        <>
                          <div className="h-4" />
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Valor Total Pago</span>
                          <span className="text-xl font-black text-emerald-600">{formatCurrency(parsedTotalValue)}</span>
                          <span className="text-[10px] font-bold text-slate-400">({formatCurrency(valuePerGroup)} p/ grupo)</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setShowConfirmModal(false)}
                    className="py-4 bg-slate-100 text-slate-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={confirmRenew}
                    className="py-4 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 shadow-xl shadow-emerald-100 transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Confirmar Renovação
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
