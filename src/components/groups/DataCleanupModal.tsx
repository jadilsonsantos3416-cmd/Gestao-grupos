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
  
  const analyzedData = useMemo(() => {
    return groups.map(g => {
      // 1. Check for member patterns in the name
      const membersRegex = /(\d+(?:[.,]\d+)?)\s*(mil)?\b/gi;
      const matches = Array.from(g.nome_grupo.matchAll(membersRegex));
      
      let proposedName = g.nome_grupo;
      let proposedMembers = g.quantidade_membros;
      let status: 'correct' | 'needs_fix' | 'manual' = 'correct';

      if (matches.length > 0) {
        // Find best match in the name
        const bestMatch = matches.find(m => m[2]) || matches[matches.length - 1];
        if (bestMatch) {
          const extractedVal = parseMembers(bestMatch[0]);
          proposedName = g.nome_grupo.replace(bestMatch[0], '');
          proposedMembers = extractedVal;
          status = 'needs_fix';
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
        status,
        isSelected: status === 'needs_fix'
      };
    });
  }, [groups]);

  // Initialize selected IDs only once (when analyzedData is first computed or groups change)
  const [hasInitialized, setHasInitialized] = useState(false);
  if (!hasInitialized && analyzedData.length > 0) {
    const toFix = analyzedData.filter(d => d.status === 'needs_fix').map(d => d.id);
    setSelectedIds(new Set(toFix));
    setHasInitialized(true);
  }

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleApply = () => {
    const updates = analyzedData
      .filter(d => selectedIds.has(d.id))
      .map(d => ({
        id: d.id,
        nome_grupo: d.proposedName,
        quantidade_membros: d.proposedMembers
      }));
    onApply(updates);
    onClose();
  };

  const filtered = analyzedData.filter(d => d.status !== 'correct');

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
                <h3 className="text-xl font-bold text-gray-800">Seus dados estão brilhandp!</h3>
                <p className="text-gray-500 max-w-sm mx-auto">Não encontramos nenhum registro com nomes sujos ou membros fora do lugar.</p>
              </div>
              <button onClick={onClose} className="px-8 py-3 bg-gray-900 text-white font-bold rounded-2xl">Fechar</button>
            </div>
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden">
               <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-2xl mb-6 flex gap-3">
                 <Info className="w-5 h-5 text-blue-500 shrink-0" />
                 <p className="text-xs text-blue-700 font-medium leading-relaxed">
                   Encontramos <b>{filtered.length} grupos</b> que parecem ter informações misturadas no nome. 
                   Revisamos automaticamente e propomos a separação abaixo. Escolha quais deseja aplicar.
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
                           className="w-4 h-4 rounded text-green-600 focus:ring-green-500"
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
                         "hover:bg-gray-50/50 transition-colors group",
                         selectedIds.has(item.id) && "bg-green-50/30"
                       )}>
                         <td className="px-6 py-4">
                           <input 
                             type="checkbox" 
                             checked={selectedIds.has(item.id)}
                             onChange={() => toggleSelect(item.id)}
                             className="w-4 h-4 rounded text-green-600 focus:ring-green-500"
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
          )}
        </div>

        {filtered.length > 0 && (
          <div className="px-8 py-6 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
            <span className="text-sm font-bold text-gray-500">
              <span className="text-green-600">{selectedIds.size}</span> registros selecionados para correção
            </span>
            <div className="flex gap-3">
              <button 
                onClick={onClose}
                className="px-6 py-3 bg-white border border-gray-200 text-gray-600 font-bold rounded-2xl hover:bg-gray-100 transition-all"
              >
                Cancelar
              </button>
              <button 
                onClick={handleApply}
                disabled={selectedIds.size === 0}
                className="px-8 py-3 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold rounded-2xl shadow-lg shadow-green-100 transition-all flex items-center gap-2"
              >
                Aplicar Correções <RefreshCw className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
