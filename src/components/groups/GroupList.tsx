import React, { useState } from 'react';
import { Group } from '@/src/types';
import { Search, ExternalLink, Edit2, Trash2, Filter, ArrowUpDown, Download } from 'lucide-react';
import { cn, formatNumber, formatCurrency, exportToCSV } from '@/src/lib/utils';
import { parseISO, format, isToday, isTomorrow, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface GroupListProps {
  groups: Group[];
  onEdit: (group: Group) => void;
  onDelete: (id: string) => void;
}

type SortField = 'data_vencimento' | 'quantidade_membros' | 'nome_grupo';

export function GroupList({ groups, onEdit, onDelete }: GroupListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [renterSearch, setRenterSearch] = useState('');
  const [nichoFilter, setNichoFilter] = useState('Todos');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [perfilFilter, setPerfilFilter] = useState('Todos');
  const [sortField, setSortField] = useState<SortField>('data_vencimento');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const niches = ['Todos', ...Array.from(new Set(groups.map(g => g.nicho)))].sort();
  const statuses = ['Todos', 'Alugado', 'Disponível'];
  const renters = ['Todos', ...Array.from(new Set(groups.filter(g => g.locatario).map(g => g.locatario)))].sort();
  const perfis = ['Todos', 'Ativo', 'Inativo'];

  const [renterFilter, setRenterFilter] = useState('Todos');

  const filteredGroups = groups
    .filter(g => 
      g.nome_grupo.toLowerCase().includes(searchTerm.toLowerCase()) &&
      g.locatario.toLowerCase().includes(renterSearch.toLowerCase()) &&
      (nichoFilter === 'Todos' || g.nicho === nichoFilter) &&
      (statusFilter === 'Todos' || g.status === statusFilter) &&
      (perfilFilter === 'Todos' || g.perfil_compartilhando === perfilFilter) &&
      (renterFilter === 'Todos' || g.locatario === renterFilter)
    )
    .sort((a, b) => {
      // Primary sort: Nicho (case insensitive)
      const nichoA = a.nicho.toLowerCase();
      const nichoB = b.nicho.toLowerCase();
      if (nichoA < nichoB) return -1;
      if (nichoA > nichoB) return 1;

      // Secondary sort: Nome do Grupo (alphabetical)
      const nameA = a.nome_grupo.toLowerCase();
      const nameB = b.nome_grupo.toLowerCase();
      if (nameA < nameB) return -1;
      if (nameA > nameB) return 1;

      return 0;
    });

  // Grouping for visual separation
  const groupedGroups: { [nicho: string]: Group[] } = filteredGroups.reduce((acc, group) => {
    const nicho = group.nicho || 'Sem Nicho';
    if (!acc[nicho]) acc[nicho] = [];
    acc[nicho].push(group);
    return acc;
  }, {} as { [nicho: string]: Group[] });

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
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input 
              type="text" 
              placeholder="Pesquisar Grupo..."
              className="w-full bg-white border border-gray-100 pl-12 pr-4 py-4 rounded-3xl shadow-sm focus:ring-2 focus:ring-green-100 outline-none font-medium"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input 
              type="text" 
              placeholder="Pesquisar Locatário..."
              className="w-full bg-white border border-gray-100 pl-12 pr-4 py-4 rounded-3xl shadow-sm focus:ring-2 focus:ring-green-100 outline-none font-medium"
              value={renterSearch}
              onChange={e => setRenterSearch(e.target.value)}
            />
          </div>
        </div>
        
        <div className="flex gap-2 shrink-0 overflow-x-auto pb-2 md:pb-0">
          <div className="relative">
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
            <select
              className="bg-white border border-gray-100 pl-10 pr-10 py-3 rounded-2xl shadow-sm focus:ring-2 focus:ring-green-100 outline-none font-bold text-xs appearance-none cursor-pointer whitespace-nowrap min-w-[140px] capitalize"
              value={nichoFilter}
              onChange={e => setNichoFilter(e.target.value)}
            >
              {niches.map(n => <option key={n} value={n} className="capitalize">Nicho: {n}</option>)}
            </select>
          </div>
          <div className="relative">
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
            <select
              className="bg-white border border-gray-100 pl-10 pr-10 py-3 rounded-2xl shadow-sm focus:ring-2 focus:ring-green-100 outline-none font-bold text-xs appearance-none cursor-pointer whitespace-nowrap min-w-[140px]"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              {statuses.map(s => <option key={s} value={s}>Status: {s}</option>)}
            </select>
          </div>
          <div className="relative">
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
            <select
              className="bg-white border border-gray-100 pl-10 pr-10 py-3 rounded-2xl shadow-sm focus:ring-2 focus:ring-green-100 outline-none font-bold text-xs appearance-none cursor-pointer whitespace-nowrap min-w-[140px]"
              value={perfilFilter}
              onChange={e => setPerfilFilter(e.target.value)}
            >
              {perfis.map(p => <option key={p} value={p}>Perfil: {p}</option>)}
            </select>
          </div>
          <div className="relative">
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
            <select
              className="bg-white border border-gray-100 pl-10 pr-10 py-3 rounded-2xl shadow-sm focus:ring-2 focus:ring-green-100 outline-none font-bold text-xs appearance-none cursor-pointer whitespace-nowrap min-w-[140px]"
              value={renterFilter}
              onChange={e => setRenterFilter(e.target.value)}
            >
              {renters.map(r => <option key={r} value={r}>Locatário: {r}</option>)}
            </select>
          </div>
          <button 
            onClick={() => exportToCSV(filteredGroups, `grupos_fb_${new Date().toISOString().split('T')[0]}.csv`)}
            className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-100 rounded-2xl shadow-sm text-xs font-bold text-gray-600 hover:bg-gray-50 active:scale-95 transition-all whitespace-nowrap"
            title="Download da lista atual em CSV"
          >
            <Download className="w-4 h-4 text-green-600" />
            Exportar CSV
          </button>
        </div>
      </div>

      {/* Desktop Table Content */}
      <div className="bg-white rounded-[2rem] border border-gray-100 shadow-xl overflow-hidden hidden md:block">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-gray-50/50">
              <th className="px-6 py-5 text-xs font-bold text-gray-400 uppercase tracking-widest cursor-pointer hover:text-gray-900" onClick={() => toggleSort('nome_grupo')}>
                <div className="flex items-center gap-2">Grupo <ArrowUpDown className="w-3 h-3" /></div>
              </th>
              <th className="px-6 py-5 text-xs font-bold text-gray-400 uppercase tracking-widest cursor-pointer hover:text-gray-900" onClick={() => toggleSort('quantidade_membros')}>
                <div className="flex items-center gap-2">Membros <ArrowUpDown className="w-3 h-3" /></div>
              </th>
              <th className="px-6 py-5 text-xs font-bold text-gray-400 uppercase tracking-widest">Nicho</th>
              <th className="px-6 py-5 text-xs font-bold text-gray-400 uppercase tracking-widest">Locatário</th>
              <th className="px-6 py-5 text-xs font-bold text-gray-400 uppercase tracking-widest cursor-pointer hover:text-gray-900" onClick={() => toggleSort('data_vencimento')}>
                <div className="flex items-center gap-2">Vencimento <ArrowUpDown className="w-3 h-3" /></div>
              </th>
              <th className="px-6 py-5 text-xs font-bold text-gray-400 uppercase tracking-widest text-center">Perfil</th>
              <th className="px-6 py-5 text-xs font-bold text-gray-400 uppercase tracking-widest text-center">Status</th>
              <th className="px-6 py-5 text-xs font-bold text-gray-400 uppercase tracking-widest">Valor</th>
              <th className="px-6 py-5 text-xs font-bold text-gray-400 uppercase tracking-widest text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {sortedNiches.map(nicho => (
              <React.Fragment key={nicho}>
                <tr className="bg-gray-100/50">
                  <td colSpan={8} className="px-6 py-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-green-700 bg-green-100/50 px-3 py-1 rounded-full capitalize">
                      📂 Nicho: {nicho}
                    </span>
                  </td>
                </tr>
                {groupedGroups[nicho].map(group => (
                  <tr key={group.id} className={cn(
                    "hover:bg-gray-50/50 transition-colors group",
                    group.perfil_compartilhando === 'Inativo' && "border-l-4 border-l-red-500 bg-red-50/10"
                  )}>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-gray-900">{group.nome_grupo}</span>
                        <div className="flex items-center gap-3 mt-1">
                          {group.link_grupo && (
                            <a 
                              href={group.link_grupo} 
                              target="_blank" 
                              rel="noreferrer"
                              className="text-[10px] text-blue-500 hover:underline flex items-center gap-1 font-mono uppercase tracking-widest"
                            >
                              Ver link <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          )}
                          <button 
                            onClick={() => onEdit(group)}
                            className="text-[10px] text-green-600 hover:underline flex items-center gap-1 font-mono uppercase tracking-widest"
                          >
                            Editar <Edit2 className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-bold text-gray-600 font-mono">
                        {formatNumber(group.quantidade_membros)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-bold px-2.5 py-1 bg-gray-100 text-gray-600 rounded-lg uppercase tracking-wider capitalize">
                        {group.nicho}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {group.locatario ? (
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-gray-900">{group.locatario}</span>
                          <span className="text-xs text-gray-400 font-medium">{group.whatsapp}</span>
                        </div>
                      ) : (
                        <span className="text-sm italic text-gray-300">Nenhum</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <ExpiryBadge dareStr={group.data_vencimento} status={group.status} />
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={cn(
                        "text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg inline-block",
                        group.perfil_compartilhando === 'Ativo' ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                      )}>
                        {group.perfil_compartilhando === 'Ativo' ? 'Perfil Ativo' : 'Perfil Inativo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={cn(
                        "text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1.5 rounded-full inline-block",
                        group.status === 'Alugado' 
                          ? "bg-green-100 text-green-700" 
                          : "bg-gray-100 text-gray-400"
                      )}>
                        {group.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-bold font-mono text-gray-900">
                        {formatCurrency(group.valor)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => onEdit(group)}
                          className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all"
                          title="Editar Grupo"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => setConfirmDeleteId(group.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          title="Excluir Grupo"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card Layout */}
      <div className="md:hidden space-y-8">
        {sortedNiches.map(nicho => (
          <div key={nicho} className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-green-700 bg-green-50 px-4 py-2 rounded-xl sticky top-20 z-10 shadow-sm border border-green-100">
               📂 Nicho: {nicho}
            </h3>
            <div className="space-y-4">
              {groupedGroups[nicho].map(group => (
                <div key={group.id} className={cn(
                  "bg-white p-5 rounded-[2rem] border shadow-sm relative overflow-hidden",
                  group.perfil_compartilhando === 'Inativo' ? "border-red-200" : "border-gray-100"
                )}>
                   {/* Status Bar */}
                   <div className={cn(
                     "absolute left-0 top-0 bottom-0 w-1.5",
                     group.perfil_compartilhando === 'Ativo' ? "bg-green-500" : "bg-red-500"
                   )} />

                   <div className="flex justify-between items-start mb-4">
                     <div>
                        <h4 className="font-bold text-gray-900">{group.nome_grupo}</h4>
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1 capitalize">{group.nicho} • {formatNumber(group.quantidade_membros)} memb.</p>
                     </div>
                     <div className="flex gap-1">
                        <button onClick={() => onEdit(group)} className="p-2 text-gray-400 bg-gray-50 rounded-xl"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => setConfirmDeleteId(group.id)} className="p-2 text-gray-400 bg-gray-50 rounded-xl"><Trash2 className="w-4 h-4" /></button>
                     </div>
                   </div>

                   <div className="grid grid-cols-2 gap-4 border-t border-gray-50 pt-4">
                      <div>
                        <p className="text-[10px] font-black uppercase text-gray-400 tracking-wider mb-1">Locatário</p>
                        <p className="text-sm font-bold text-gray-700 leading-tight truncate">
                          {group.locatario || 'Disponível'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-black uppercase text-gray-400 tracking-wider mb-1">Vencimento</p>
                        <ExpiryBadge dareStr={group.data_vencimento} status={group.status} compact />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase text-gray-400 tracking-wider mb-1">Valor</p>
                        <p className="text-sm font-bold font-mono text-gray-900">{formatCurrency(group.valor)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-black uppercase text-gray-400 tracking-wider mb-1">Status</p>
                        <span className={cn(
                          "text-[10px] font-black uppercase border px-2 py-0.5 rounded-full inline-block",
                          group.status === 'Alugado' ? "border-green-200 text-green-600 bg-green-50" : "border-gray-200 text-gray-400 bg-gray-50"
                        )}>
                          {group.status}
                        </span>
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase text-gray-400 tracking-wider mb-1">Perfil</p>
                        <span className={cn(
                          "text-[10px] font-black uppercase px-2 py-0.5 rounded-full inline-block",
                          group.perfil_compartilhando === 'Ativo' ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                        )}>
                          {group.perfil_compartilhando === 'Ativo' ? 'Perfil Ativo' : 'Perfil Inativo'}
                        </span>
                      </div>
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

function ExpiryBadge({ dareStr, status, compact = false }: { dareStr: string, status: string, compact?: boolean }) {
  if (status !== 'Alugado' || !dareStr) return <span className="text-sm text-gray-300">-</span>;
  
  const date = parseISO(dareStr);
  const isVenceHoje = isToday(date);
  const isVenceAmanha = isTomorrow(date);
  const isVencido = isPast(date) && !isVenceHoje;

  const colorClass = isVencido ? "text-red-600" : isVenceHoje ? "text-red-700" : isVenceAmanha ? "text-orange-600" : "text-gray-600";
  const bgClass = isVencido ? "bg-red-50" : isVenceHoje ? "bg-red-50" : isVenceAmanha ? "bg-orange-50" : "bg-gray-50";

  return (
    <div className={cn(
      "flex flex-col",
      compact ? "items-end" : "items-start"
    )}>
      <span className={cn(
        "text-sm font-bold font-mono",
        colorClass
      )}>
        {format(date, 'dd/MM/yyyy')}
      </span>
      {(isVenceHoje || isVenceAmanha || isVencido) && (
        <span className={cn(
          "text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md mt-0.5",
          bgClass,
          colorClass
        )}>
          {isVencido ? 'Vencido' : isVenceHoje ? 'Vence Hoje' : 'Vence Amanhã'}
        </span>
      )}
    </div>
  );
}
