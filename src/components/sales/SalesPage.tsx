import React, { useState } from 'react';
import { Download, Tag, Edit2, XCircle, ExternalLink, MessageSquare, Plus, Search, CheckCircle2, AlertCircle, ChevronDown, Loader2 } from 'lucide-react';
import { Group } from '@/src/types';
import { cn } from '@/src/lib/utils';

interface SalesPageProps {
  groups: Group[];
  onEdit: (group: Group) => void;
  onUpdate: (id: string, group: Partial<Group>) => void;
}

export function SalesPage({ groups, onEdit, onUpdate }: SalesPageProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  const salesGroups = groups.filter(g => g.para_venda);
  
  const filteredAvailableGroups = groups.filter(g => {
    const matchesSearch = 
      g.nome_grupo?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.nicho?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.link_grupo?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  }).sort((a, b) => (a.para_venda === b.para_venda ? 0 : a.para_venda ? 1 : -1));

  const handleAddGroupToSale = async (group: Group) => {
    if (isProcessing) return;
    
    if (group.para_venda) {
      alert("Esse grupo já está na lista de venda");
      return;
    }

    setIsProcessing(group.id);
    try {
      await onUpdate(group.id, { 
        para_venda: true,
        status_venda: 'Disponível',
        // Preserve existing values if they exist
        valor_venda: group.valor_venda || '',
        observacoes_venda: group.observacoes_venda || '',
        atualizado_em: new Date().toISOString()
      });
      setSearchQuery('');
    } catch (error) {
      console.error('Error adding group to sale:', error);
      alert("Erro ao adicionar grupo para venda.");
    } finally {
      setIsProcessing(null);
    }
  };

  const exportToCSV = () => {
    if (salesGroups.length === 0) {
      alert("Nenhum grupo para exportar");
      return;
    }

    const headers = ['nome', 'link', 'nicho', 'membros', 'valor_venda', 'status_venda', 'observacoes_venda'];
    const rows = salesGroups.map(g => [
      g.nome_grupo,
      g.link_grupo,
      g.nicho,
      g.quantidade_membros || 0,
      g.valor_venda || '',
      g.status_venda || 'Disponível',
      g.observacoes_venda || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `grupos-pra-venda.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleRemoveFromSale = (group: Group) => {
    if (confirm(`Remover "${group.nome_grupo}" da lista de venda?`)) {
      onUpdate(group.id, { 
        para_venda: false,
        atualizado_em: new Date().toISOString()
      });
    }
  };

  const formatNumber = (val: number | null) => {
    if (val === null) return '0';
    return val.toLocaleString('pt-BR');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-slate-900 rounded-lg shadow-lg shadow-slate-200">
              <Tag className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">Grupos pra Venda</h1>
          </div>
          <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[8px] md:text-[9px] ml-[44px]">
            Controle os grupos disponíveis para venda e exporte a lista quando precisar.
          </p>
        </div>
      </header>

      {/* Export Button as a Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button 
          onClick={exportToCSV}
          className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-100/40 flex items-center gap-4 group hover:scale-[1.01] transition-all active:scale-[0.99]"
        >
          <div className="p-3 bg-green-50 rounded-2xl group-hover:bg-primary transition-colors">
            <Download className="w-6 h-6 text-primary group-hover:text-white transition-colors" />
          </div>
          <div className="text-left">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none mb-1">Ação Rápida</p>
            <span className="text-lg font-black text-slate-900 tracking-tight">EXPORTAR LISTA EM CSV</span>
          </div>
        </button>

        <div className="relative">
          <button 
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className={cn(
              "w-full bg-white p-6 rounded-[2rem] border transition-all flex items-center justify-between group h-full",
              isDropdownOpen ? "border-primary ring-4 ring-green-50 shadow-none" : "border-slate-100 shadow-xl shadow-slate-100/40 hover:scale-[1.01]"
            )}
          >
            <div className="flex items-center gap-4">
              <div className={cn(
                "p-3 rounded-2xl transition-colors",
                isDropdownOpen ? "bg-primary" : "bg-slate-900 group-hover:bg-primary"
              )}>
                <Plus className={cn("w-6 h-6 transition-colors", isDropdownOpen ? "text-white" : "text-white")} />
              </div>
              <div className="text-left">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none mb-1">Gerenciar</p>
                <span className="text-lg font-black text-slate-900 tracking-tight">ADICIONAR GRUPO</span>
              </div>
            </div>
            <ChevronDown className={cn("w-5 h-5 text-slate-400 transition-transform", isDropdownOpen && "rotate-180")} />
          </button>

          {isDropdownOpen && (
            <>
              <div 
                className="fixed inset-0 z-40 bg-slate-900/5 backdrop-blur-sm md:hidden"
                onClick={() => setIsDropdownOpen(false)}
              />
              <div className="absolute top-full left-0 right-0 mt-3 bg-white rounded-[2rem] border border-slate-100 shadow-2xl z-50 overflow-hidden animate-in slide-in-from-top-2 duration-200">
                <div className="p-4 border-b border-slate-50 bg-slate-50/50">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      autoFocus
                      type="text"
                      placeholder="Buscar grupo por nome, nicho ou link..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-white border-0 rounded-2xl py-4 pl-12 pr-4 text-sm font-black text-slate-900 placeholder:text-slate-300 focus:ring-2 focus:ring-primary shadow-sm"
                    />
                  </div>
                </div>
                
                <div className="max-h-[350px] overflow-y-auto custom-scrollbar">
                  {filteredAvailableGroups.length > 0 ? (
                    <div className="p-2 space-y-1">
                      {filteredAvailableGroups.map((group) => (
                        <button
                          key={group.id}
                          onClick={() => handleAddGroupToSale(group)}
                          className={cn(
                            "w-full text-left p-4 rounded-2xl flex items-center justify-between transition-all group/item",
                            group.para_venda 
                              ? "bg-slate-50 cursor-pointer" 
                              : "hover:bg-green-50 active:scale-[0.98]"
                          )}
                        >
                          <div className="flex-1 min-w-0 mr-4">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-[7px] font-black uppercase tracking-widest text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                                {group.nicho || 'Geral'}
                              </span>
                              <span className="text-[7px] font-black uppercase tracking-widest text-slate-400">
                                {group.quantidade_membros?.toLocaleString('pt-BR')} MEMBROS
                              </span>
                            </div>
                            <h4 className="text-sm font-black text-slate-900 truncate">{group.nome_grupo}</h4>
                            <p className="text-[9px] text-slate-300 font-mono truncate">{group.link_grupo}</p>
                          </div>
                          
                          <div className="shrink-0">
                            {isProcessing === group.id ? (
                              <Loader2 className="w-4 h-4 text-primary animate-spin" />
                            ) : group.para_venda ? (
                              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-700 rounded-lg">
                                <CheckCircle2 className="w-3 h-3" />
                                <span className="text-[8px] font-black uppercase tracking-widest">Já adicionado</span>
                              </div>
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover/item:bg-primary group-hover/item:text-white transition-all">
                                <Plus className="w-4 h-4" />
                              </div>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="p-12 text-center">
                      <div className="p-3 bg-slate-50 rounded-full w-fit mx-auto mb-3">
                        <AlertCircle className="w-6 h-6 text-slate-300" />
                      </div>
                      <p className="text-sm font-black text-slate-300 uppercase tracking-widest">Nenhum grupo encontrado</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* List */}
      <div className="space-y-4">
        {salesGroups.length === 0 ? (
          <div className="bg-white p-12 rounded-[2.5rem] border border-dashed border-slate-200 flex flex-col items-center justify-center text-center space-y-4">
            <div className="p-4 bg-slate-50 rounded-full">
              <Tag className="w-8 h-8 text-slate-300" />
            </div>
            <div className="max-w-xs">
              <p className="text-slate-900 font-black tracking-tight">Nenhum grupo marcado para venda</p>
              <p className="text-slate-400 text-sm">Adicione grupos usando o botão acima para que eles apareçam aqui.</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pb-20">
            {salesGroups.map(group => (
              <div key={group.id} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-100/40 flex flex-col h-full group">
                <div className="flex justify-between items-start gap-4 mb-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="text-[8px] font-black uppercase tracking-[0.25em] text-primary bg-green-50 px-3 py-1 rounded-full border border-green-100">
                        {group.nicho || 'Geral'}
                      </span>
                      <span className={cn(
                        "text-[8px] font-black uppercase tracking-[0.25em] px-3 py-1 rounded-full border",
                        group.status_venda === 'Vendido' ? "bg-rose-50 text-rose-600 border-rose-100" :
                        group.status_venda === 'Reservado' ? "bg-amber-50 text-amber-600 border-amber-100" :
                        "bg-blue-50 text-blue-600 border-blue-100"
                      )}>
                        {group.status_venda || 'Disponível'}
                      </span>
                    </div>
                    <h3 className="text-lg font-black text-slate-900 leading-tight truncate">{group.nome_grupo}</h3>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">
                      {formatNumber(group.quantidade_membros)} MEMBROS
                    </p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <button 
                      onClick={() => onEdit(group)}
                      className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:bg-slate-100 hover:text-primary transition-all border border-slate-100"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleRemoveFromSale(group)}
                      className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:bg-slate-100 hover:text-rose-600 transition-all border border-slate-100"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-auto space-y-4">
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Valor de Venda</span>
                      <span className="text-sm font-black text-primary font-mono">{group.valor_venda || 'Não def.'}</span>
                    </div>
                    {group.observacoes_venda && (
                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Observações</span>
                        <p className="text-[11px] text-slate-600 leading-relaxed max-h-12 overflow-y-auto pr-2 custom-scrollbar">
                          {group.observacoes_venda}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <a 
                      href={group.link_grupo} 
                      target="_blank" 
                      rel="noreferrer"
                      className="flex-1 flex items-center justify-center gap-2 bg-slate-950 text-white font-black uppercase tracking-[0.2em] text-[8px] py-3.5 rounded-xl hover:bg-primary transition-all shadow-lg shadow-slate-100"
                    >
                      ACESSAR <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
