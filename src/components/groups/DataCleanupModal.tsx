import React, { useState, useMemo } from 'react';
import { X, Sparkles, CheckCircle, AlertCircle, Info, RefreshCw, Trash2, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Group } from '@/src/types';
import { cleanGroupName, parseMembers } from '@/src/lib/groupParser';
import { cn } from '@/src/lib/utils';

interface CleanupItem {
  id: string;
  originalName: string;
  originalMembers: number;
  proposedName: string;
  proposedMembers: number;
  status: 'correct' | 'needs_fix' | 'manual';
  isSelected: boolean;
}

interface DataCleanupModalProps {
  onClose: () => void;
  groups: Group[];
  onApply: (updates: { id: string, nome_grupo: string, quantidade_membros: number }[]) => void;
}

export function DataCleanupModal({ onClose, groups, onApply }: DataCleanupModalProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [decisions, setDecisions] = useState<Record<string, 'approve' | 'reject'>>({});
  const [isApplying, setIsApplying] = useState(false);
  const [view, setView] = useState<'detect' | 'confirm'>('detect');
  
  const analyzedData = useMemo(() => {
    return groups.map(g => {
      // 1. Check for member patterns in the name
      // Match numbers like 50.000, 50k, 50 mil, etc.
      const membersRegex = /(\d+(?:[.,]\d+)?)\s*(mil|k|membros|seguidores)?\b/gi;
      const matches = Array.from(g.nome_grupo.matchAll(membersRegex));
      
      let proposedName = g.nome_grupo;
      let proposedMembers = g.quantidade_membros;
      let status: 'correct' | 'needs_fix' | 'manual' = 'correct';

      if (matches.length > 0) {
        // Find match that specifically mentions units or is at the very end
        const bestMatch = matches.find(m => m[2]) || matches[matches.length - 1];
        if (bestMatch) {
          const extractedVal = parseMembers(bestMatch[0]);
          // Only propose if extracted value is different from current or if units were used
          if (extractedVal !== g.quantidade_membros || bestMatch[2]) {
            proposedName = g.nome_grupo.replace(bestMatch[0], '').trim();
            // Remove trailing dashes/dots
            proposedName = proposedName.replace(/[-–—/]\s*$/g, '').trim();
            proposedMembers = extractedVal;
            status = 'needs_fix';
          }
        }
      }

      // 2. Clean leading garbage
      const cleaned = cleanGroupName(proposedName);
      if (cleaned !== proposedName) {
        proposedName = cleaned;
        status = 'needs_fix';
      }

      // If name became too short or empty, might need manual review
      if (!proposedName || proposedName.length < 3) {
        status = 'manual';
      }

      // If it looks identical to original, it's correct
      if (proposedName === g.nome_grupo && Object.is(proposedMembers, g.quantidade_membros)) {
        status = 'correct';
      }

      return {
        id: g.id,
        originalName: g.nome_grupo,
        originalMembers: g.quantidade_membros,
        proposedName,
        proposedMembers,
        status
      };
    });
  }, [groups]);

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else {
      next.add(id);
      // Default decision to approve when selected
      if (!decisions[id]) {
        setDecisions(prev => ({ ...prev, [id]: 'approve' }));
      }
    }
    setSelectedIds(next);
  };

  const handleDecision = (id: string, decision: 'approve' | 'reject') => {
    setDecisions(prev => ({
      ...prev,
      [id]: decision
    }));
  };

  const handleGoToConfirm = () => {
    if (selectedIds.size === 0) return;
    // For all selected IDs, ensure they have a default 'approve' decision if not set
    const newDecisions = { ...decisions };
    selectedIds.forEach(id => {
      if (!newDecisions[id]) newDecisions[id] = 'approve';
    });
    setDecisions(newDecisions);
    setView('confirm');
  };

  const handleApply = async () => {
    const approvedUpdates = analyzedData
      .filter(d => selectedIds.has(d.id) && decisions[d.id] === 'approve')
      .map(d => ({
        id: d.id,
        nome_grupo: d.proposedName,
        quantidade_membros: d.proposedMembers
      }));

    if (approvedUpdates.length === 0 && selectedIds.size > 0) {
      // If user rejected all in confirm view, just close or go back
      onClose();
      return;
    }
    
    setIsApplying(true);
    await onApply(approvedUpdates);
    setIsApplying(false);
    onClose();
  };

  const filtered = analyzedData.filter(d => d.status !== 'correct');
  const selectedCount = selectedIds.size;
  const approvedCount = Array.from(selectedIds).filter(id => decisions[id] === 'approve').length;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-md z-[80] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white w-full max-w-5xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col h-[85vh]"
      >
        {/* Header */}
        <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-green-50 to-white">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-green-100">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800 tracking-tight">Faxina de Dados</h2>
              <p className="text-sm text-gray-500 font-medium">Corrigindo nomes sujos e membros embutidos</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white hover:shadow-sm rounded-full transition-all text-gray-400">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col p-8">
          {filtered.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-20 h-20 bg-green-50 text-green-600 rounded-[2rem] flex items-center justify-center">
                <ShieldCheck className="w-10 h-10" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-800">Seus dados estão brilhando!</h3>
                <p className="text-gray-500 max-w-sm mx-auto">Não encontramos nenhum registro com nomes sujos ou membros fora do lugar.</p>
              </div>
              <button onClick={onClose} className="px-8 py-3 bg-gray-900 text-white font-bold rounded-2xl">Fechar</button>
            </div>
          ) : view === 'detect' ? (
            <div className="flex-1 flex flex-col overflow-hidden">
               <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-2xl mb-6 flex gap-3">
                 <Info className="w-5 h-5 text-blue-500 shrink-0" />
                 <p className="text-xs text-blue-700 font-medium leading-relaxed">
                   Encontramos <b>{filtered.length} grupos</b> que parecem ter informações misturadas no nome. 
                   <b> Selecione os grupos</b> que deseja revisar e clique em prosseguir.
                 </p>
               </div>

               <div className="flex-1 overflow-auto border border-gray-100 rounded-3xl">
                 <table className="w-full text-left border-collapse">
                   <thead className="sticky top-0 bg-gray-50 z-10">
                     <tr>
                       <th className="px-6 py-4 w-10">
                         <input 
                           type="checkbox" 
                           checked={selectedIds.size === filtered.length}
                           onChange={() => {
                             if (selectedIds.size === filtered.length) setSelectedIds(new Set());
                             else setSelectedIds(new Set(filtered.map(f => f.id)));
                           }}
                           className="w-4 h-4 rounded text-green-600 focus:ring-green-500 cursor-pointer"
                         />
                       </th>
                       <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Status</th>
                       <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Conteúdo Atual</th>
                       <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-center">→</th>
                       <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Proposta de Correção</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-50">
                     {filtered.map(item => (
                       <tr key={item.id} className={cn(
                         "hover:bg-gray-50/50 transition-colors group cursor-pointer",
                         selectedIds.has(item.id) && "bg-green-50/30"
                       )} onClick={() => toggleSelect(item.id)}>
                         <td className="px-6 py-4">
                           <input 
                             type="checkbox" 
                             checked={selectedIds.has(item.id)}
                             onChange={(e) => {
                               e.stopPropagation();
                               toggleSelect(item.id);
                             }}
                             className="w-4 h-4 rounded text-green-600 focus:ring-green-500 cursor-pointer"
                           />
                         </td>
                         <td className="px-6 py-4 whitespace-nowrap">
                           {item.status === 'manual' ? (
                             <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-orange-600 bg-orange-50 px-3 py-1 rounded-full">
                               <RefreshCw className="w-3 h-3" /> Revisar
                             </span>
                           ) : (
                             <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                               <Sparkles className="w-3 h-3" /> Ajustar
                             </span>
                           )}
                         </td>
                         <td className="px-6 py-4">
                           <div className="flex flex-col">
                             <span className="text-sm font-bold text-gray-400 line-through decoration-red-300">{item.originalName}</span>
                             <span className="text-[10px] font-mono text-gray-400">Membros: {item.originalMembers.toLocaleString()}</span>
                           </div>
                         </td>
                         <td className="px-6 py-4 text-center">
                            <RefreshCw className="w-4 h-4 text-gray-200 mx-auto" />
                         </td>
                         <td className="px-6 py-4">
                           <div className="flex flex-col">
                             <span className="text-sm font-bold text-green-700">{item.proposedName}</span>
                             <span className="text-[10px] font-mono text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded-full self-start mt-1">
                               Membros: {item.proposedMembers.toLocaleString()}
                             </span>
                           </div>
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden">
               <div className="bg-orange-50/50 border border-orange-100 p-4 rounded-2xl mb-6 flex gap-3">
                 <AlertCircle className="w-5 h-5 text-orange-500 shrink-0" />
                 <p className="text-xs text-orange-700 font-medium leading-relaxed">
                   <b>Confirme as melhorias:</b> Para cada grupo selecionado abaixo, escolha se deseja aplicar a melhoria sugerida.
                 </p>
               </div>

               <div className="flex-1 overflow-auto border border-gray-100 rounded-3xl">
                 <table className="w-full text-left border-collapse">
                   <thead className="sticky top-0 bg-gray-50 z-10">
                     <tr>
                       <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Grupo</th>
                       <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Melhoria Sugerida</th>
                       <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-center">Aplicar?</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-50">
                     {filtered.filter(f => selectedIds.has(f.id)).map(item => (
                       <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                         <td className="px-6 py-4">
                           <div className="flex flex-col">
                             <span className="text-xs font-bold text-gray-400">{item.originalName}</span>
                             <span className="text-[10px] font-mono text-gray-400 italic">Membros originais: {item.originalMembers.toLocaleString()}</span>
                           </div>
                         </td>
                         <td className="px-6 py-4">
                           <div className="bg-green-50/50 p-3 rounded-xl border border-green-100/50">
                             <p className="text-sm font-bold text-green-800">Novo Nome: <span className="font-black underline scale-105 inline-block">{item.proposedName}</span></p>
                             <p className="text-[10px] font-black text-green-600 uppercase tracking-widest mt-1">Novos Membros: {item.proposedMembers.toLocaleString()}</p>
                           </div>
                         </td>
                         <td className="px-6 py-4">
                           <select 
                             value={decisions[item.id] || 'approve'}
                             onChange={(e) => handleDecision(item.id, e.target.value as 'approve' | 'reject')}
                             className={cn(
                               "w-full px-4 py-2 rounded-xl text-xs font-bold border outline-none transition-all cursor-pointer",
                               decisions[item.id] === 'approve' 
                                 ? "bg-green-600 text-white border-green-600" 
                                 : "bg-red-600 text-white border-red-600"
                             )}
                           >
                             <option value="approve" className="bg-white text-gray-900">SIM - Aplicar Melhoria</option>
                             <option value="reject" className="bg-white text-gray-900">NÃO - Manter como está</option>
                           </select>
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
            </div>
          )}
        </div>

        {filtered.length > 0 && (
          <div className="px-8 py-6 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
            <span className="text-sm font-bold text-gray-500">
              {view === 'detect' ? (
                <>
                  <span className="text-blue-600">{selectedCount}</span> grupos selecionados para revisão
                </>
              ) : (
                <>
                  <span className="text-green-600">{approvedCount}</span> melhorias aprovadas de <span className="text-blue-600">{selectedCount}</span>
                </>
              )}
            </span>
            <div className="flex gap-3">
              <button 
                onClick={onClose}
                className="px-6 py-3 bg-white border border-gray-200 text-gray-600 font-bold rounded-2xl hover:bg-gray-100 transition-all"
              >
                Cancelar
              </button>
              
              {view === 'detect' ? (
                <button 
                  onClick={handleGoToConfirm}
                  disabled={selectedCount === 0}
                  className="px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-2xl shadow-lg shadow-blue-100 transition-all flex items-center gap-2"
                >
                  Prosseguir <RefreshCw className="w-5 h-5" />
                </button>
              ) : (
                <button 
                  onClick={handleApply}
                  disabled={isApplying}
                  className="px-8 py-3 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold rounded-2xl shadow-lg shadow-green-100 transition-all flex items-center gap-2"
                >
                  {isApplying ? (
                    <>Aplicando... <RefreshCw className="w-5 h-5 animate-spin" /></>
                  ) : (
                    <>Finalizar Faxina <RefreshCw className="w-5 h-5" /></>
                  )}
                </button>
              )}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}

