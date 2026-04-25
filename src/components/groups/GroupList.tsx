import React, { useState, useEffect, useMemo } from 'react';
import { Group, QuickFilter } from '@/src/types';
import { Search, ExternalLink, Edit2, Trash2, Filter, ArrowUpDown, Download, Loader2, ChevronDown } from 'lucide-react';
import { cn, formatNumber, formatCurrency, exportToCSV, ensureAbsoluteUrl } from '@/src/lib/utils';
import { getGroupPriority, PriorityLevel, PriorityInfo } from '@/src/lib/priorityUtils';
import { parseISO, format, isToday, isTomorrow, isPast } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { ptBR } from 'date-fns/locale';

interface GroupListProps {
  groups: Group[];
  onEdit: (group: Group) => void;
  onDelete: (id: string) => void;
  onUpdate?: (id: string, updates: Partial<Group>) => Promise<void>;
  activeQuickFilter?: QuickFilter;
  onQuickFilterChange?: (filter: QuickFilter) => void;
}

type SortField = 'data_vencimento' | 'quantidade_membros' | 'nome_grupo' | 'prioridade' | 'score';

interface GroupWithPriority extends Group {
  priorityInfo: PriorityInfo;
}

export function GroupList({ groups = [], onEdit, onDelete, onUpdate, activeQuickFilter, onQuickFilterChange }: GroupListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [renterSearch, setRenterSearch] = useState('');
  const [nichoFilter, setNichoFilter] = useState('Todos');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [perfilFilter, setPerfilFilter] = useState('Todos');
  const [shopeeFilter, setShopeeFilter] = useState('Todos');
  const [priorityFilter, setPriorityFilter] = useState('Todos');
  const [onlyReadyForShopee, setOnlyReadyForShopee] = useState(false);
  const [sortField, setSortField] = useState<SortField>('data_vencimento');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [processingAction, setProcessingAction] = useState<{ id: string, field: 'perfil' | 'shopee' | 'nicho' } | null>(null);

  const defaultNiches = useMemo(() => [
    "Evangélico", "Fã / Música", "Fã / TV", "Musa", "Beleza / Cabelo", "Receitas", "Agro / Notícias", "Geral"
  ], []);

  const allAvailableNiches = useMemo(() => {
    const existingNiches = Array.from(new Set(groups.map(g => g.nicho))).filter(Boolean);
    return Array.from(new Set([...defaultNiches, ...existingNiches])).sort();
  }, [groups, defaultNiches]);

  const handleUpdateNiche = async (group: Group, newNicho: string) => {
    if (!onUpdate || processingAction || group.nicho === newNicho) return;

    setProcessingAction({ id: group.id, field: 'nicho' });

    try {
      await onUpdate(group.id, { 
        nicho: newNicho,
        updatedAt: new Date().toISOString() 
      });
    } catch (error) {
      console.error(`Erro ao atualizar nicho:`, error);
      alert(`Erro ao atualizar nicho. Tente novamente.`);
    } finally {
      setProcessingAction(null);
    }
  };

  const handleToggleField = async (group: Group, field: 'perfil' | 'shopee') => {
    if (!onUpdate || processingAction) return;

    const groupField = field === 'perfil' ? 'perfil_compartilhando' : 'uso_shopee';
    const currentValue = group[groupField] || 'Inativo';
    const newValue = currentValue === 'Ativo' ? 'Inativo' : 'Ativo';

    setProcessingAction({ id: group.id, field });

    try {
      await onUpdate(group.id, { [groupField]: newValue });
    } catch (error) {
      console.error(`Erro ao atualizar ${field}:`, error);
      alert(`Erro ao atualizar ${field === 'perfil' ? 'Perfil' : 'Shopee'}. Tente novamente.`);
    } finally {
      setProcessingAction(null);
    }
  };

  if (!Array.isArray(groups)) {
    return (
      <div className="bg-white p-12 rounded-[2rem] border border-dashed border-gray-200 text-center">
        <p className="text-gray-400 font-medium italic">Erro ao carregar dados dos grupos. Por favor, recarregue a página.</p>
      </div>
    );
  }

  const niches = ['Todos', ...Array.from(new Set((groups || []).map(g => g?.nicho || 'Geral')))].sort();
  const statuses = ['Todos', 'Alugado', 'Disponível'];
  const renters = ['Todos', ...Array.from(new Set((groups || []).filter(g => g?.locatario).map(g => g.locatario)))].sort();
  const perfis = ['Todos', 'Ativo', 'Inativo'];
  const shopees = ['Todos', 'Ativo', 'Inativo'];

  const priorities = ['Todos', 'Alta', 'Média', 'Baixa'];

  const [renterFilter, setRenterFilter] = useState('Todos');

  // Add priority info to groups for sorting and filtering
  const groupsWithPriority = useMemo(() => {
    if (!Array.isArray(groups)) return [];
    return groups.map(g => {
      if (!g) return null;
      return {
        ...g,
        priorityInfo: getGroupPriority(g)
      };
    }).filter(g => g !== null) as GroupWithPriority[];
  }, [groups]);

  // Handle Quick Filters from Sidebar
  useEffect(() => {
    if (!activeQuickFilter || activeQuickFilter === 'all') {
      if (activeQuickFilter === 'all') {
        setNichoFilter('Todos');
        setStatusFilter('Todos');
        setPerfilFilter('Todos');
        setShopeeFilter('Todos');
        setPriorityFilter('Todos');
        setRenterFilter('Todos');
        setOnlyReadyForShopee(false);
        setSearchTerm('');
        setRenterSearch('');
      }
      return;
    }

    // Reset standard filters
    setNichoFilter('Todos');
    setStatusFilter('Todos');
    setPerfilFilter('Todos');
    setShopeeFilter('Todos');
    setPriorityFilter('Todos');
    setRenterFilter('Todos');
    setOnlyReadyForShopee(false);
    setSearchTerm('');
    setRenterSearch('');

    switch (activeQuickFilter) {
      case 'perfil_ativo': setPerfilFilter('Ativo'); break;
      case 'perfil_inativo': setPerfilFilter('Inativo'); break;
      case 'shopee_ativo': setShopeeFilter('Ativo'); break;
      case 'shopee_inativo': setShopeeFilter('Inativo'); break;
      case 'ready_shopee': setOnlyReadyForShopee(true); break;
      case 'priority_alta': setPriorityFilter('Alta'); break;
      case 'priority_media': setPriorityFilter('Média'); break;
      case 'priority_baixa': setPriorityFilter('Baixa'); break;
    }
  }, [activeQuickFilter]);

  // If user changes a filter manually, we might want to clear the "Quick Filter" highight in sidebar
  const handleFilterChange = (setter: (val: any) => void, val: any) => {
    setter(val);
    if (onQuickFilterChange && activeQuickFilter !== 'all') {
      onQuickFilterChange('all');
    }
  };

  const priorityOrder: Record<PriorityLevel, number> = {
    'Alta': 0,
    'Média': 1,
    'Baixa': 2
  };

  const filteredGroups = groupsWithPriority
    .filter(g => 
      (g.nome_grupo || '').toLowerCase().includes(searchTerm.toLowerCase()) &&
      (g.locatario || '').toLowerCase().includes(renterSearch.toLowerCase()) &&
      (nichoFilter === 'Todos' || (g.nicho || 'Geral') === nichoFilter) &&
      (statusFilter === 'Todos' || (g.status || 'Disponível') === statusFilter) &&
      (perfilFilter === 'Todos' || (g.perfil_compartilhando || 'Inativo') === perfilFilter) &&
      (shopeeFilter === 'Todos' || (g.uso_shopee || 'Inativo') === shopeeFilter) &&
      (priorityFilter === 'Todos' || g.priorityInfo.prioridade === priorityFilter) &&
      (renterFilter === 'Todos' || (g.locatario || '') === renterFilter) &&
      (!onlyReadyForShopee || ((g.perfil_compartilhando || 'Inativo') === 'Ativo' && (g.uso_shopee || 'Inativo') === 'Ativo'))
    )
    .sort((a, b) => {
      // Handle Sorting
      if (sortField === 'nome_grupo') {
        const valA = (a.nome_grupo || '').toLowerCase();
        const valB = (b.nome_grupo || '').toLowerCase();
        return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      
      if (sortField === 'quantidade_membros') {
        const valA = a.quantidade_membros || 0;
        const valB = b.quantidade_membros || 0;
        return sortOrder === 'asc' ? valA - valB : valB - valA;
      }
      
      if (sortField === 'data_vencimento') {
        const valA = a.data_vencimento || '9999-99-99';
        const valB = b.data_vencimento || '9999-99-99';
        return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }

      if (sortField === 'prioridade') {
        const valA = priorityOrder[a.priorityInfo?.prioridade || 'Baixa'];
        const valB = priorityOrder[b.priorityInfo?.prioridade || 'Baixa'];
        return sortOrder === 'asc' ? valA - valB : valB - valA;
      }

      if (sortField === 'score') {
        const valA = a.priorityInfo?.score || 0;
        const valB = b.priorityInfo?.score || 0;
        return sortOrder === 'asc' ? valB - valA : valA - valB;
      }

      // Default grouping sort: Nicho
      const nichoA = (a.nicho || 'Geral').toLowerCase();
      const nichoB = (b.nicho || 'Geral').toLowerCase();
      if (nichoA < nichoB) return -1;
      if (nichoA > nichoB) return 1;

      // Secondary sort: Members Descending (maior para o menor)
      const memA = a.quantidade_membros || 0;
      const memB = b.quantidade_membros || 0;
      if (memB !== memA) return memB - memA;

      // Tertiary sort: Nome do Grupo
      const nameA = (a.nome_grupo || '').toLowerCase();
      const nameB = (b.nome_grupo || '').toLowerCase();
      return nameA.localeCompare(nameB);
    });

  // Grouping for visual separation
  const groupedGroups: { [nicho: string]: GroupWithPriority[] } = filteredGroups.reduce((acc, group) => {
    const nicho = group.nicho || 'Sem Nicho';
    if (!acc[nicho]) acc[nicho] = [];
    acc[nicho].push(group);
    return acc;
  }, {} as { [nicho: string]: GroupWithPriority[] });

  // Get sorted niche names for display
  const sortedNiches = Object.keys(groupedGroups).sort((a, b) => a.localeCompare(b));

  const toggleSort = (field: SortField) => {
    // Note: Manual sort is now secondary to the requested automatic grouping
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  return (
    <div className="space-y-8">
      {/* Controls */}
      <div className="flex flex-col gap-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 w-4 h-4 md:w-5 md:h-5 transition-colors" />
            <input 
              type="text" 
              placeholder="Pesquisar por nome do grupo..."
              className="w-full bg-white border border-slate-100 pl-12 md:pl-14 pr-6 py-3.5 md:py-5 rounded-2xl md:rounded-[2.5rem] shadow-sm focus:ring-4 focus:ring-emerald-50 focus:border-emerald-200 outline-none font-bold text-xs md:text-sm text-slate-600 placeholder:text-slate-300 transition-all"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex-1 relative group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 w-4 h-4 md:w-5 md:h-5 transition-colors" />
            <input 
              type="text" 
              placeholder="Pesquisar por locatário..."
              className="w-full bg-white border border-slate-100 pl-12 md:pl-14 pr-6 py-3.5 md:py-5 rounded-2xl md:rounded-[2.5rem] shadow-sm focus:ring-4 focus:ring-blue-50 focus:border-blue-200 outline-none font-bold text-xs md:text-sm text-slate-600 placeholder:text-slate-300 transition-all"
              value={renterSearch}
              onChange={e => setRenterSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-col xl:flex-row items-center justify-between gap-6 pb-2">
          <div className="flex gap-3 overflow-x-auto pb-4 xl:pb-0 w-full xl:w-auto no-scrollbar">
            <FilterBadge 
              label="Nicho" 
              value={nichoFilter} 
              options={niches} 
              onChange={v => handleFilterChange(setNichoFilter, v)} 
              isCapitalize
            />
            <FilterBadge 
              label="Status" 
              value={statusFilter} 
              options={statuses} 
              onChange={v => handleFilterChange(setStatusFilter, v)} 
            />
            <FilterBadge 
              label="Perfil" 
              value={perfilFilter} 
              options={perfis} 
              onChange={v => handleFilterChange(setPerfilFilter, v)} 
            />
            <FilterBadge 
              label="Shopee" 
              value={shopeeFilter} 
              options={shopees} 
              onChange={v => handleFilterChange(setShopeeFilter, v)} 
            />
            <FilterBadge 
              label="Prioridade" 
              value={priorityFilter} 
              options={priorities} 
              onChange={v => handleFilterChange(setPriorityFilter, v)} 
            />
          </div>

          <button 
            onClick={() => exportToCSV(filteredGroups, `grupos_fb_${new Date().toISOString().split('T')[0]}.csv`)}
            className="w-full xl:w-auto flex items-center justify-center gap-3 px-8 py-4 bg-white border border-slate-100 rounded-[2rem] shadow-sm text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 hover:border-slate-200 active:scale-95 transition-all"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            Exportar CSV
          </button>
        </div>
      </div>

      {/* Desktop Table Content */}
      <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden hidden lg:block">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] cursor-pointer hover:text-slate-900 transition-colors" onClick={() => toggleSort('nome_grupo')}>
                  <div className="flex items-center gap-2">Grupo <ArrowUpDown className="w-3 h-3 opacity-30" /></div>
                </th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] cursor-pointer hover:text-slate-900 transition-colors" onClick={() => toggleSort('quantidade_membros')}>
                  <div className="flex items-center gap-2 text-center justify-center w-full">Membros <ArrowUpDown className="w-3 h-3 opacity-30" /></div>
                </th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] cursor-pointer hover:text-slate-900 transition-colors" onClick={() => toggleSort('prioridade')}>
                  <div className="flex items-center gap-2 text-center justify-center w-full">Prioridade <ArrowUpDown className="w-3 h-3 opacity-30" /></div>
                </th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Configuração</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Locatário / Info</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] cursor-pointer hover:text-slate-900 transition-colors text-right" onClick={() => toggleSort('data_vencimento')}>
                  <div className="flex items-center gap-2 justify-end">Vencimento <ArrowUpDown className="w-3 h-3 opacity-30" /></div>
                </th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 font-medium">
              {sortedNiches.map(nicho => (
                <React.Fragment key={nicho}>
                  <tr className="bg-slate-50/50">
                    <td colSpan={7} className="px-8 py-3">
                      <div className="flex items-center gap-3">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 capitalize">
                          Nicho: {nicho}
                        </span>
                        <span className="text-[9px] font-bold text-slate-300 ml-auto uppercase tracking-widest">
                          {groupedGroups[nicho].length} Grupos
                        </span>
                      </div>
                    </td>
                  </tr>
                  {groupedGroups[nicho].map(group => (
                    <motion.tr 
                      layout
                      key={group.id} 
                      className={cn(
                        "hover:bg-slate-50/50 transition-colors group relative",
                        group.perfil_compartilhando === 'Inativo' && "bg-rose-50/20"
                      )}
                    >
                      <td className="px-8 py-8 relative">
                        {group.perfil_compartilhando === 'Inativo' && (
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-rose-500" />
                        )}
                        <div className="flex flex-col max-w-[250px]">
                          <span className="font-black text-slate-900 group-hover:text-emerald-600 transition-colors text-base truncate" title={group.nome_grupo}>
                            {group.nome_grupo}
                          </span>
                          <div className="flex items-center gap-4 mt-2">
                             {group.link_grupo && (
                              <a 
                                href={ensureAbsoluteUrl(group.link_grupo)} 
                                target="_blank" 
                                rel="noreferrer"
                                className="text-[10px] text-blue-500 hover:text-blue-700 flex items-center gap-1.5 font-black uppercase tracking-widest transition-colors"
                              >
                                Link <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                            <div className="flex items-center gap-1.5">
                               <div className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                               <div className="relative flex items-center gap-1 group/nicho-select min-w-[80px]">
                                 {processingAction?.id === group.id && processingAction?.field === 'nicho' ? (
                                   <Loader2 className="w-2.5 h-2.5 text-emerald-500 animate-spin" />
                                 ) : (
                                   <>
                                     <select
                                       value={group.nicho || 'Geral'}
                                       onChange={(e) => handleUpdateNiche(group, e.target.value)}
                                       disabled={!!processingAction}
                                       className="appearance-none bg-transparent border-0 p-0 pr-4 text-[10px] text-slate-400 font-bold uppercase tracking-wider focus:ring-0 cursor-pointer hover:text-emerald-600 transition-colors w-full"
                                     >
                                       {allAvailableNiches.map(n => (
                                         <option key={n} value={n}>{n}</option>
                                       ))}
                                     </select>
                                     <ChevronDown className="w-2.5 h-2.5 absolute right-0 pointer-events-none text-slate-300 group-hover/nicho-select:text-emerald-400 transition-colors" />
                                   </>
                                 )}
                               </div>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-8 text-center">
                        <div className="flex flex-col items-center">
                          <span className="text-xl font-black text-slate-900 font-mono tracking-tighter">
                            {formatNumber(group.quantidade_membros)}
                          </span>
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Membros</span>
                        </div>
                      </td>
                      <td className="px-8 py-8 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <span className={cn(
                            "text-[9px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-full border shadow-sm transition-all",
                            group.priorityInfo.prioridade === 'Alta' ? "bg-rose-50 text-rose-600 border-rose-100 shadow-rose-50" :
                            group.priorityInfo.prioridade === 'Média' ? "bg-amber-50 text-amber-600 border-amber-100 shadow-amber-50" :
                            "bg-slate-50 text-slate-400 border-slate-100 shadow-slate-50"
                          )}>
                            {group.priorityInfo.prioridade}
                          </span>
                          <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest font-mono">
                            {group.priorityInfo.score} pts
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-8">
                        <div className="flex flex-col gap-2.5 items-center justify-center">
                           <button 
                            onClick={() => handleToggleField(group, 'perfil')}
                            disabled={!!processingAction}
                            title={group.perfil_compartilhando === 'Ativo' ? "Perfil Ativo - Clique para Desativar" : "Perfil Inativo - Clique para Ativar"}
                            className="group/btn flex items-center gap-2 bg-slate-50 hover:bg-white px-3 py-1.5 rounded-xl border border-slate-100 hover:border-emerald-200 transition-all w-full max-w-[120px] justify-between shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                           >
                              <span className="text-[9px] font-black text-slate-400 group-hover/btn:text-emerald-600 uppercase tracking-widest">Post</span>
                              {processingAction?.id === group.id && processingAction?.field === 'perfil' ? (
                                <Loader2 className="w-2 h-2 text-emerald-500 animate-spin" />
                              ) : (
                                <div className={cn("w-2 h-2 rounded-full transition-all", 
                                  group.perfil_compartilhando === 'Ativo' 
                                    ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" 
                                    : "bg-rose-400"
                                )} />
                              )}
                           </button>
                           <button 
                            onClick={() => handleToggleField(group, 'shopee')}
                            disabled={!!processingAction}
                            title={group.uso_shopee === 'Ativo' ? "Shopee Ativo - Clique para Desativar" : "Shopee Inativo - Clique para Ativar"}
                            className="group/btn flex items-center gap-2 bg-slate-50 hover:bg-white px-3 py-1.5 rounded-xl border border-slate-100 hover:border-blue-200 transition-all w-full max-w-[120px] justify-between shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                           >
                              <span className="text-[9px] font-black text-slate-400 group-hover/btn:text-blue-600 uppercase tracking-widest">Shop</span>
                              {processingAction?.id === group.id && processingAction?.field === 'shopee' ? (
                                <Loader2 className="w-2 h-2 text-blue-500 animate-spin" />
                              ) : (
                                <div className={cn("w-2 h-2 rounded-full transition-all", 
                                  group.uso_shopee === 'Ativo' 
                                    ? "bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" 
                                    : "bg-slate-200"
                                )} />
                              )}
                           </button>
                        </div>
                      </td>
                      <td className="px-8 py-8">
                        <div className="flex flex-col">
                          {group.locatario ? (
                            <>
                              <span className="text-sm font-black text-slate-900 group-hover:text-blue-600 transition-colors uppercase tracking-tight">{group.locatario}</span>
                              <div className="flex items-center gap-2 mt-1">
                                 <span className="text-[10px] text-slate-400 font-bold font-mono">{group.whatsapp}</span>
                                 <div className="w-1 h-1 rounded-full bg-slate-200" />
                                 <span className="text-[10px] font-black text-emerald-600 font-mono">{formatCurrency(group.valor)}</span>
                              </div>
                            </>
                          ) : (
                            <div className="flex items-center gap-2">
                               <div className="w-2 h-2 rounded-full bg-emerald-100 animate-pulse" />
                               <span className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] italic">Disponível</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-8 py-8 text-right">
                        <ExpiryBadge dareStr={group.data_vencimento} status={group.status} />
                      </td>
                      <td className="px-8 py-8 text-right">
                        <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                          <button 
                            onClick={() => onEdit(group)}
                            className="p-3 bg-white border border-slate-100 hover:border-emerald-200 rounded-2xl text-slate-400 hover:text-emerald-600 transition-all shadow-sm"
                            title="Editar Grupo"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => setConfirmDeleteId(group.id)}
                            className="p-3 bg-white border border-slate-100 hover:border-rose-200 rounded-2xl text-slate-400 hover:text-rose-600 transition-all shadow-sm"
                            title="Excluir Grupo"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card Layout */}
      <div className="lg:hidden space-y-8 pb-20">
        {sortedNiches.map(nicho => (
          <div key={nicho} className="space-y-4">
            <h3 className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 flex items-center gap-2 ml-4">
               <span className="w-1 h-1 rounded-full bg-emerald-500" />
               Nicho: {nicho || 'Geral'}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 px-1">
              {(groupedGroups[nicho] || []).map(group => (
                <div key={group.id} className={cn(
                  "bg-white p-4 md:p-8 rounded-2xl md:rounded-[3rem] border transition-all relative overflow-hidden",
                  (group.perfil_compartilhando || 'Inativo') === 'Inativo' ? "border-rose-200 bg-rose-50/10 shadow-rose-50" : "border-slate-100 shadow-xl shadow-slate-100/50"
                )}>
                   {/* Priority Indicator */}
                   <div className={cn(
                     "absolute left-0 top-0 bottom-0 w-1.5 md:w-2",
                     group.priorityInfo?.prioridade === 'Alta' ? "bg-rose-500" : 
                     group.priorityInfo?.prioridade === 'Média' ? "bg-amber-500" : "bg-slate-200"
                   )} />

                   <div className="flex flex-col gap-4 md:gap-8">
                     <div className="flex justify-between items-start">
                       <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-2 md:mb-3">
                            <span className={cn(
                              "text-[7px] md:text-[8px] font-black uppercase tracking-[0.2em] px-2 py-0.5 md:px-3 md:py-1 rounded-full",
                              group.priorityInfo?.prioridade === 'Alta' ? "bg-rose-600 text-white shadow-lg shadow-rose-200" :
                              group.priorityInfo?.prioridade === 'Média' ? "bg-amber-500 text-white shadow-lg shadow-amber-100" :
                              "bg-slate-100 text-slate-400"
                            )}>
                              {group.priorityInfo?.prioridade || 'Baixa'}
                            </span>
                            <span className="text-[7px] md:text-[8px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-0.5 md:px-3 md:py-1 rounded-full border border-slate-100">
                               {group.priorityInfo?.score || 0} pts
                            </span>
                          </div>
                          <h4 className="text-sm md:text-xl font-black text-slate-900 leading-tight mb-1 md:mb-2 truncate" title={group.nome_grupo || ''}>{group.nome_grupo || 'Sem Nome'}</h4>
                          <div className="flex flex-wrap items-center gap-2 md:gap-4">
                            <p className="text-[8px] md:text-[10px] text-slate-400 font-black uppercase tracking-[0.15em]">{formatNumber(group.quantidade_membros || 0)} MEMBROS</p>
                            
                            <div className="flex items-center gap-1 px-2 py-0.5 md:px-3 md:py-1 bg-slate-50 rounded-lg border border-slate-100 group/nicho-mobile relative">
                              <div className="w-1 h-1 rounded-full bg-slate-300" />
                              {processingAction?.id === group.id && processingAction?.field === 'nicho' ? (
                                <Loader2 className="w-2.5 h-2.5 text-emerald-500 animate-spin" />
                              ) : (
                                <div className="relative flex items-center gap-1">
                                  <select
                                    value={group.nicho || 'Geral'}
                                    onChange={(e) => handleUpdateNiche(group, e.target.value)}
                                    disabled={!!processingAction}
                                    className="appearance-none bg-transparent border-0 p-0 pr-3 text-[8px] md:text-[9px] text-slate-400 font-black uppercase tracking-wider focus:ring-0 cursor-pointer"
                                  >
                                    {allAvailableNiches.map(n => (
                                      <option key={n} value={n}>{n}</option>
                                    ))}
                                  </select>
                                  <ChevronDown className="w-2.5 h-2.5 absolute right-0 pointer-events-none text-slate-300" />
                                </div>
                              )}
                            </div>

                            {group.link_grupo && (
                              <a 
                                href={ensureAbsoluteUrl(group.link_grupo)} 
                                target="_blank" 
                                rel="noreferrer"
                                className="text-[8px] md:text-[10px] text-blue-600 font-black uppercase tracking-widest flex items-center gap-1"
                              >
                                Link <ExternalLink className="w-2.5 h-2.5 md:w-3 md:h-3" />
                              </a>
                            )}
                          </div>
                       </div>
                       <div className="flex gap-2 shrink-0">
                          <button onClick={() => onEdit(group)} className="p-2 md:p-4 bg-slate-50 text-slate-400 hover:text-emerald-600 rounded-xl md:rounded-[1.5rem] transition-colors"><Edit2 className="w-4 h-4 md:w-5 md:h-5" /></button>
                       </div>
                     </div>

                     <div className="grid grid-cols-2 gap-4 md:gap-8 pt-4 md:pt-8 border-t border-slate-50">
                        <div className="space-y-3">
                          <div className="space-y-0.5">
                            <p className="text-[8px] md:text-[9px] font-black uppercase text-slate-400 tracking-[0.2em]">Locatário</p>
                            <p className={cn(
                              "text-xs md:text-sm font-black uppercase tracking-tight truncate",
                              group.locatario ? "text-slate-900" : "text-emerald-500 italic"
                            )}>
                              {group.locatario || 'Disponível'}
                            </p>
                            {group.whatsapp && <p className="text-[9px] md:text-[10px] font-bold text-slate-300 font-mono">{group.whatsapp}</p>}
                          </div>
                          <div className="space-y-0.5">
                            <p className="text-[8px] md:text-[9px] font-black uppercase text-slate-400 tracking-[0.2em]">Custo</p>
                            <p className="text-xs md:text-sm font-black font-mono text-emerald-600">{formatCurrency(group.valor || 0)}</p>
                          </div>
                        </div>

                        <div className="space-y-3 text-right">
                          <div className="space-y-0.5">
                            <p className="text-[8px] md:text-[9px] font-black uppercase text-slate-400 tracking-[0.2em]">Fim</p>
                            <ExpiryBadge dareStr={group.data_vencimento || ''} status={group.status || 'Disponível'} compact />
                          </div>
                          <div className="space-y-1.5 flex flex-col items-end">
                            <p className="text-[8px] md:text-[9px] font-black uppercase text-slate-400 tracking-[0.2em]">Config</p>
                             <div className="flex gap-2">
                               <button 
                                onClick={(e) => { e.stopPropagation(); handleToggleField(group, 'perfil'); }}
                                disabled={!!processingAction}
                                className="relative active:scale-90 transition-transform p-1 -m-1"
                               >
                                 <div className={cn("w-4 h-4 rounded-full flex items-center justify-center transition-all", 
                                   (group.perfil_compartilhando || 'Inativo') === 'Ativo' 
                                     ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" 
                                     : "bg-rose-400"
                                 )}>
                                   {processingAction?.id === group.id && processingAction?.field === 'perfil' && (
                                     <Loader2 className="w-2 h-2 text-white animate-spin" />
                                   )}
                                 </div>
                               </button>
                               <button 
                                onClick={(e) => { e.stopPropagation(); handleToggleField(group, 'shopee'); }}
                                disabled={!!processingAction}
                                className="relative active:scale-90 transition-transform p-1 -m-1"
                               >
                                 <div className={cn("w-4 h-4 rounded-full flex items-center justify-center transition-all", 
                                   (group.uso_shopee || 'Inativo') === 'Ativo' 
                                     ? "bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.4)]" 
                                     : "bg-slate-200"
                                 )}>
                                   {processingAction?.id === group.id && processingAction?.field === 'shopee' && (
                                     <Loader2 className="w-2 h-2 text-white animate-spin" />
                                   )}
                                 </div>
                               </button>
                            </div>
                          </div>
                        </div>
                     </div>

                     <button 
                       onClick={() => setConfirmDeleteId(group.id)}
                       className="w-full py-3 md:py-5 bg-rose-50 text-rose-600 text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] md:tracking-[0.3em] rounded-xl md:rounded-2xl hover:bg-rose-600 hover:text-white transition-all border border-rose-100"
                     >
                       Remover Grupo
                     </button>
                   </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      
      {filteredGroups.length === 0 && (
        <div className="bg-white p-12 rounded-[2rem] border border-dashed border-gray-200 text-center">
          <p className="text-gray-400 font-medium italic">Nenhum grupo encontrado com os filtros atuais.</p>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-[2rem] p-8 shadow-2xl text-center">
            <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Trash2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Excluir Grupo?</h3>
            <p className="text-gray-500 text-sm mb-8">Esta ação não pode ser desfeita. Tem certeza que deseja remover este grupo?</p>
            <div className="flex gap-3">
              <button 
                onClick={() => setConfirmDeleteId(null)}
                className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold rounded-xl transition-all"
              >
                Cancelar
              </button>
              <button 
                onClick={() => {
                  onDelete(confirmDeleteId);
                  setConfirmDeleteId(null);
                }}
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-red-100"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FilterBadge({ label, value, options, onChange, isCapitalize }: any) {
  return (
    <div className="flex items-center gap-2 md:gap-3 bg-white px-3.5 md:px-5 py-2.5 md:py-4 rounded-[2rem] border border-slate-100 shadow-sm hover:border-emerald-200 transition-all group shrink-0">
      <Filter className="w-3 md:w-3.5 h-3 md:h-3.5 text-slate-300 group-hover:text-emerald-500" />
      <span className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">{label}:</span>
      <select 
        value={value}
        onChange={e => onChange(e.target.value)}
        className={cn(
          "bg-transparent border-0 focus:ring-0 p-0 text-[9px] md:text-[10px] font-black uppercase tracking-widest text-emerald-600 cursor-pointer",
          isCapitalize && "capitalize"
        )}
      >
        {options.map((opt: string) => (
          <option key={opt} value={opt} className={cn(isCapitalize && "capitalize")}>{opt}</option>
        ))}
      </select>
    </div>
  );
}

function ExpiryBadge({ dareStr, status, compact = false }: { dareStr: string, status: string, compact?: boolean }) {
  if (status !== 'Alugado' || !dareStr) return <span className="text-[10px] text-slate-300 font-bold uppercase tracking-widest">-</span>;
  
  const date = parseISO(dareStr);
  const isVenceHoje = isToday(date);
  const isVenceAmanha = isTomorrow(date);
  const isVencido = isPast(date) && !isVenceHoje;

  const colorClass = isVencido ? "text-rose-600" : isVenceHoje ? "text-rose-600" : isVenceAmanha ? "text-amber-600" : "text-slate-600";
  const bgClass = isVencido ? "bg-rose-50 border-rose-100 shadow-rose-50" : isVenceHoje ? "bg-rose-50 border-rose-100 shadow-rose-50" : isVenceAmanha ? "bg-amber-50 border-amber-100 shadow-amber-50" : "bg-slate-50 border-slate-100";

  return (
    <div className={cn(
      "flex flex-col",
      compact ? "items-end" : "items-end"
    )}>
      <span className={cn(
        "text-[10px] font-black font-mono tracking-tighter",
        colorClass
      )}>
        {format(date, 'dd/MM/yyyy')}
      </span>
      {(isVenceHoje || isVenceAmanha || isVencido) && (
        <span className={cn(
          "text-[8px] font-black uppercase px-2 py-0.5 rounded-md mt-1 shadow-sm border",
          bgClass,
          colorClass
        )}>
          {isVencido ? 'Vencido' : isVenceHoje ? 'Vence Hoje' : 'Vence Amanhã'}
        </span>
      )}
    </div>
  );
}
