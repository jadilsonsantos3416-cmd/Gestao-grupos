import React, { useState, useMemo } from 'react';
import { X, Upload, Search, AlertCircle, CheckCircle, Info, Filter, Trash2, Edit2, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/src/lib/utils';
import { ParsedGroup, parseBulkText, extractGroupId } from '@/src/lib/groupParser';
import { Group } from '@/src/types';

interface BulkImporterProps {
  onClose: () => void;
  onImport: (groups: Partial<Group>[]) => void;
  existingGroups: Group[];
}

export function BulkImporter({ onClose, onImport, existingGroups }: BulkImporterProps) {
  const [step, setStep] = useState<'input' | 'preview'>('input');
  const [rawText, setRawText] = useState('');
  const [parsedData, setParsedData] = useState<ParsedGroup[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nichoFilter, setNichoFilter] = useState('Todos');

  const niches = useMemo(() => {
    const set = new Set<string>();
    parsedData.forEach(g => set.add(g.nicho));
    return ['Todos', ...Array.from(set).sort()];
  }, [parsedData]);

  const handleAnalyze = () => {
    if (!rawText.trim()) return;
    const results = parseBulkText(rawText);
    
    // Initial action assignment based on existing groups
    const initialized = results.map(item => {
      const isDuplicate = item.group_id && existingGroups.some(eg => 
        eg.group_id === item.group_id
      );
      return { ...item, importAction: isDuplicate ? 'skip' : 'import' } as ParsedGroup;
    });
    
    setParsedData(initialized);
    setStep('preview');
  };

  const updateItem = (id: string, updates: Partial<ParsedGroup>) => {
    setParsedData(prev => prev.map(item => {
      if (item.id_temp === id) {
        const newItem = { ...item, ...updates };
        if (updates.link_grupo) {
          newItem.group_id = extractGroupId(updates.link_grupo);
        }
        
        // Recalculate status
        const errors = [];
        if (!newItem.nome_grupo) errors.push('Nome não identificado');
        if (!newItem.link_grupo) errors.push('Link não identificado');
        if (newItem.link_grupo && !newItem.group_id) errors.push('ID não encontrado');
        
        newItem.status_analise = (newItem.nome_grupo && newItem.link_grupo && newItem.group_id) ? 'OK' : 'Revisar';
        newItem.erros = errors;
        return newItem;
      }
      return item;
    }));
  };

  const removeItem = (id: string) => {
    setParsedData(prev => prev.filter(item => item.id_temp !== id));
  };

  const filteredData = parsedData.filter(g => nichoFilter === 'Todos' || g.nicho === nichoFilter);

  const getDuplicateInfo = (item: ParsedGroup) => {
    if (!item.group_id) return null;
    const byId = existingGroups.find(eg => eg.group_id === item.group_id);
    if (byId) return { type: 'id', group: byId };
    
    return null;
  };

  const startImport = () => {
    const finalGroups = parsedData.filter(g => g.importAction !== 'skip');
    // We pass the choice to App.tsx
    onImport(finalGroups);
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white w-full max-w-5xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col h-[90vh]"
      >
        {/* Header */}
        <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Importação em Massa</h2>
            <p className="text-sm text-gray-400 mt-1">Cole sua lista de grupos para análise automática</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        {/* Steps */}
        <div className="bg-gray-50/50 px-8 py-3 flex items-center gap-4 border-b border-gray-100">
          <div className={cn("text-xs font-black uppercase tracking-widest flex items-center gap-2", step === 'input' ? "text-green-600" : "text-gray-400")}>
            <span className={cn("w-5 h-5 rounded-full flex items-center justify-center text-[10px] border-2", step === 'input' ? "border-green-600 bg-green-50" : "border-gray-300")}>1</span>
            Colar Lista
          </div>
          <div className="w-8 h-px bg-gray-200" />
          <div className={cn("text-xs font-black uppercase tracking-widest flex items-center gap-2", step === 'preview' ? "text-green-600" : "text-gray-400")}>
            <span className={cn("w-5 h-5 rounded-full flex items-center justify-center text-[10px] border-2", step === 'preview' ? "border-green-600 bg-green-50" : "border-gray-300")}>2</span>
            Revisar e Importar
          </div>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col">
          <AnimatePresence mode="wait">
            {step === 'input' ? (
              <motion.div 
                key="input"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="p-8 flex flex-col h-full space-y-6"
              >
                <div className="flex-1 flex flex-col">
                  <label className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3 ml-2 flex items-center gap-2">
                    Conteúdo da Lista <Info className="w-3 h-3" />
                  </label>
                  <textarea 
                    value={rawText}
                    onChange={e => setRawText(e.target.value)}
                    placeholder="Ex:&#10;nicho: Musa&#10;1. Grupo VIP 50 mil&#10;https://facebook.com/groups/id&#10;&#10;nicho: Gospel&#10;2. Louvor 30 mil https://link.com"
                    className="flex-1 bg-gray-50 border-2 border-dashed border-gray-200 rounded-[2rem] p-6 text-sm font-medium focus:ring-0 focus:border-green-300 outline-none resize-none transition-all"
                  />
                </div>
                
                <div className="bg-blue-50 p-6 rounded-3xl flex gap-4">
                  <div className="bg-blue-100 p-3 rounded-2xl shrink-0">
                    <Info className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="text-sm">
                    <h4 className="font-bold text-blue-900 mb-1">Como funciona o Importador Inteligente?</h4>
                    <p className="text-blue-700 leading-relaxed">
                      Pode colar texto bagunçado! Identificamos automaticamente o <b>Nicho</b> sempre que encontrar linhas como "nicho: Nome". 
                      Também extraímos o <b>Nome</b>, <b>Membros</b> (ex: 79,8 mil) e o <b>Link</b>.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button onClick={onClose} className="flex-1 py-4 px-6 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold rounded-2xl transition-all">
                    Cancelar
                  </button>
                  <button 
                    onClick={handleAnalyze}
                    disabled={!rawText.trim()}
                    className="flex-[2] py-4 px-6 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold rounded-2xl shadow-lg shadow-green-100 transition-all flex items-center justify-center gap-2"
                  >
                    Analisar Lista <Upload className="w-5 h-5" />
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="preview"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex-1 flex flex-col overflow-hidden"
              >
                <div className="p-6 border-b border-gray-50 bg-white flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <Filter className="w-5 h-5 text-gray-400" />
                    <select 
                      value={nichoFilter}
                      onChange={e => setNichoFilter(e.target.value)}
                      className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-2 text-sm font-bold text-gray-600 outline-none"
                    >
                      {niches.map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs font-bold text-gray-400">
                      Total: <span className="text-gray-900">{parsedData.length} grupos</span>
                    </span>
                    <div className="flex gap-2">
                       <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-green-600 bg-green-50 px-3 py-1 rounded-full">
                         <CheckCircle className="w-3 h-3" /> {parsedData.filter(g => g.status_analise === 'OK').length} OK
                       </span>
                       <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-orange-600 bg-orange-50 px-3 py-1 rounded-full">
                         <AlertCircle className="w-3 h-3" /> {parsedData.filter(g => g.status_analise !== 'OK').length} Ajustar
                       </span>
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-x-auto overflow-y-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-gray-50/80 backdrop-blur-md z-10">
                      <tr>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Status</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Código (group_id)</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Nome do Grupo</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Membros</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Nicho</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Perfil</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Link</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Obs</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filteredData.map((item) => {
                        const dup = getDuplicateInfo(item);
                        return (
                          <tr key={item.id_temp} className={cn(
                            "hover:bg-gray-50/50 transition-colors group",
                            dup && "bg-orange-50/20"
                          )}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {dup ? (
                                <div className="flex flex-col gap-2">
                                  <div className="flex items-center gap-1 text-orange-600 font-bold text-[10px] uppercase tracking-wider">
                                    <AlertCircle className="w-4 h-4" /> Duplicado
                                  </div>
                                  <select 
                                    value={item.importAction}
                                    onChange={e => updateItem(item.id_temp, { importAction: e.target.value as any })}
                                    className="text-[10px] bg-orange-50 border border-orange-100 rounded-md px-2 py-1 font-bold text-orange-700 outline-none"
                                  >
                                    <option value="skip">Pular</option>
                                    <option value="update">Atualizar</option>
                                    <option value="import">Importar mesmo assim</option>
                                  </select>
                                </div>
                              ) : item.status_analise === 'OK' ? (
                                <div className="flex items-center gap-1 text-green-500 font-bold text-[10px] uppercase tracking-wider">
                                  <CheckCircle className="w-4 h-4" /> OK
                                </div>
                              ) : (
                                <div className="flex flex-col gap-1">
                                  <div className="flex items-center gap-1 text-orange-500 font-bold text-[10px] uppercase tracking-wider">
                                    <AlertCircle className="w-4 h-4" /> Revisar
                                  </div>
                                  {item.erros.map((err, i) => (
                                    <span key={i} className="text-[9px] text-orange-400 font-medium italic leading-tight">
                                      {err}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-[10px] font-mono font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">
                              {item.group_id || 'ID Pendente'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {editingId === item.id_temp ? (
                              <input 
                                value={item.nome_grupo}
                                onChange={e => updateItem(item.id_temp, { nome_grupo: e.target.value })}
                                className="w-full bg-white border border-green-200 rounded-lg px-3 py-1.5 text-sm font-medium outline-none ring-2 ring-green-50"
                              />
                            ) : (
                              <span className="text-sm font-bold text-gray-800">{item.nome_grupo}</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {editingId === item.id_temp ? (
                                <input 
                                  type="number"
                                  value={item.quantidade_membros === null ? '' : item.quantidade_membros}
                                  onChange={e => updateItem(item.id_temp, { quantidade_membros: e.target.value === '' ? null : parseInt(e.target.value) || 0 })}
                                  className="w-24 bg-white border border-green-200 rounded-lg px-3 py-1.5 text-sm font-medium outline-none ring-2 ring-green-50"
                                />
                            ) : (
                              <span className="text-sm font-mono text-gray-600">
                                {item.quantidade_membros !== null ? 
                                  (item.quantidade_membros >= 1000 ? 
                                    `${(item.quantidade_membros / 1000).toFixed(1)}k` : 
                                    item.quantidade_membros
                                  ) : '-'
                                }
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            {editingId === item.id_temp ? (
                              <input 
                                value={item.nicho}
                                onChange={e => updateItem(item.id_temp, { nicho: e.target.value })}
                                className="w-full bg-white border border-green-200 rounded-lg px-3 py-1.5 text-sm font-medium outline-none ring-2 ring-green-50 capitalize"
                              />
                            ) : (
                              <span className="text-xs font-black uppercase tracking-widest text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full capitalize">{item.nicho}</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            {editingId === item.id_temp ? (
                               <select 
                                 value={item.perfil_compartilhando || 'Inativo'}
                                 onChange={e => updateItem(item.id_temp, { perfil_compartilhando: e.target.value as any })}
                                 className="w-full min-w-[90px] bg-white border border-green-200 rounded-lg px-2 py-1.5 text-[10px] font-bold outline-none ring-2 ring-green-50"
                               >
                                 <option value="Ativo">Ativo</option>
                                 <option value="Inativo">Inativo</option>
                               </select>
                            ) : (
                              <span className={cn(
                                "text-[10px] font-black uppercase px-2 py-0.5 rounded-full inline-block",
                                item.perfil_compartilhando === 'Ativo' ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                              )}>
                                {item.perfil_compartilhando === 'Ativo' ? 'Perfil Ativo' : 'Perfil Inativo'}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            {editingId === item.id_temp ? (
                              <input 
                                value={item.link_grupo}
                                onChange={e => updateItem(item.id_temp, { link_grupo: e.target.value })}
                                className="w-full bg-white border border-green-200 rounded-lg px-3 py-1.5 text-sm font-medium outline-none ring-2 ring-green-50 font-mono"
                              />
                            ) : (
                              <span className="text-xs font-mono text-blue-500 truncate max-w-[150px] block">{item.link_grupo}</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                             {editingId === item.id_temp ? (
                              <input 
                                value={item.observacoes}
                                onChange={e => updateItem(item.id_temp, { observacoes: e.target.value })}
                                className="w-full bg-white border border-green-200 rounded-lg px-3 py-1.5 text-sm font-medium outline-none ring-2 ring-green-50"
                              />
                            ) : (
                              <span className="text-xs text-gray-400 italic truncate max-w-[100px] block">{item.observacoes || '-'}</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              {editingId === item.id_temp ? (
                                 <button onClick={() => setEditingId(null)} className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-all" title="Salvar">
                                   <Save className="w-4 h-4" />
                                 </button>
                              ) : (
                                <button onClick={() => setEditingId(item.id_temp)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all" title="Editar">
                                  <Edit2 className="w-4 h-4" />
                                </button>
                              )}
                              <button onClick={() => removeItem(item.id_temp)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all" title="Excluir">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  </table>
                  
                  {filteredData.length === 0 && (
                    <div className="p-12 text-center text-gray-400 font-bold">Nenhum resultado encontrado para este filtro.</div>
                  )}
                </div>

                <div className="p-6 border-t border-gray-100 bg-gray-50 flex gap-4">
                   <button onClick={() => setStep('input')} className="flex-1 py-4 font-bold text-gray-500 hover:bg-white border border-transparent hover:border-gray-100 rounded-2xl transition-all">
                     Voltar para Edição
                   </button>
                   <button 
                     onClick={startImport}
                     className="flex-[2] py-4 bg-green-600 text-white font-bold rounded-2xl shadow-lg shadow-green-100 hover:bg-green-700 transition-all active:scale-95 flex items-center justify-center gap-2"
                   >
                     Confirmar Importação de {parsedData.length} Grupos
                   </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
