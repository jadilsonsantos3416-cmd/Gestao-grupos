import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Group } from '@/src/types';
import { Users, CheckCircle2, XCircle, Clock, AlertCircle, TrendingUp, ListChecks, ShieldCheck, ShieldAlert, ShieldQuestion, Star, Target, ExternalLink, ChevronDown } from 'lucide-react';
import { isToday, isTomorrow, isPast, parseISO } from 'date-fns';
import { cn, formatNumber } from '@/src/lib/utils';
import { getGroupPriority, PriorityLevel } from '@/src/lib/priorityUtils';
import { motion, AnimatePresence } from 'motion/react';

interface DashboardProps {
  groups: Group[];
}

export function Dashboard({ groups = [] }: DashboardProps) {
  const [selectedPriority, setSelectedPriority] = useState<PriorityLevel | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const groupsWithPriority = useMemo(() => {
    if (!Array.isArray(groups)) return [];
    return groups.map(g => ({
      ...g,
      priorityInfo: getGroupPriority(g)
    }));
  }, [groups]);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement;
      // Skip if clicking a priority card (let its own onClick handle it)
      if (target.closest('[data-priority-trigger]')) return;
      
      if (dropdownRef.current && !dropdownRef.current.contains(target)) {
        setSelectedPriority(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const togglePriority = (priority: PriorityLevel) => {
    setSelectedPriority(prev => prev === priority ? null : priority);
  };

  const selectedGroupsList = useMemo(() => {
    if (!selectedPriority) return [];
    return groupsWithPriority
      .filter(g => g.priorityInfo.prioridade === selectedPriority)
      .sort((a, b) => (Number(b.quantidade_membros) || 0) - (Number(a.quantidade_membros) || 0));
  }, [selectedPriority, groupsWithPriority]);

  const stats = {
    total: groups.length,
    alugados: groups.filter(g => g.status === 'Alugado').length,
    disponiveis: groups.filter(g => g.status === 'Disponível').length,
    vencemHoje: groups.filter(g => g.status === 'Alugado' && g.data_vencimento && isToday(parseISO(g.data_vencimento))).length,
    vencemAmanha: groups.filter(g => g.status === 'Alugado' && g.data_vencimento && isTomorrow(parseISO(g.data_vencimento))).length,
    vencidos: groups.filter(g => g.status === 'Alugado' && g.data_vencimento && isPast(parseISO(g.data_vencimento)) && !isToday(parseISO(g.data_vencimento))).length,
    totalMembros: groups.reduce((acc, g) => acc + (Number(g.quantidade_membros) || 0), 0),
    perfilAtivo: groups.filter(g => g.perfil_compartilhando === 'Ativo').length,
    perfilInativo: groups.filter(g => g.perfil_compartilhando === 'Inativo' || !g.perfil_compartilhando).length,
    shopeeAtivo: groups.filter(g => g.uso_shopee === 'Ativo').length,
    shopeeInativo: groups.filter(g => g.uso_shopee === 'Inativo' || !g.uso_shopee).length,
    priorityAlta: groupsWithPriority.filter(g => g.priorityInfo?.prioridade === 'Alta').length,
    priorityMedia: groupsWithPriority.filter(g => g.priorityInfo?.prioridade === 'Média').length,
    priorityBaixa: groupsWithPriority.filter(g => g.priorityInfo?.prioridade === 'Baixa').length,
  };

  const alertItems = [
    { count: stats.vencemHoje, label: 'grupos vencem hoje', type: 'error', icon: AlertCircle, emoji: '⚠️' },
    { count: stats.vencemAmanha, label: 'grupos vencem amanhã', type: 'warning', icon: Clock, emoji: '⏰' },
    { count: stats.vencidos, label: 'grupos estão vencidos', type: 'error', icon: AlertCircle, emoji: '❌' },
    { count: stats.perfilInativo, label: 'grupos sem perfil ativo', type: 'error', icon: ShieldAlert, emoji: '🚨' },
  ].filter(item => item.count > 0);

  return (
    <div className="space-y-8 md:space-y-12 animate-in fade-in duration-700 pb-20 p-2 md:p-0">
      {/* Header Section */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-slate-900 rounded-lg shadow-lg shadow-slate-200">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">Painel de Controle</h1>
          </div>
          <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[8px] md:text-[9px] ml-[44px]">Visão geral da performance</p>
        </div>
      </header>

      {/* Alerts */}
      {alertItems.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
          {alertItems.map((item, idx) => {
            const Icon = item.icon;
            return (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                key={idx}
                className={cn(
                  "flex items-center gap-3 md:gap-4 p-3 md:p-5 rounded-2xl md:rounded-[2rem] border bg-white shadow-xl shadow-slate-100/50 relative overflow-hidden group",
                  item.type === 'error' ? "border-rose-100" : "border-amber-100"
                )}
              >
                <div className={cn(
                  "p-2 md:p-3 rounded-xl md:rounded-2xl shrink-0 transition-transform group-hover:scale-110",
                  item.type === 'error' ? "bg-rose-50 text-rose-600" : "bg-amber-50 text-amber-600"
                )}>
                  <Icon className="w-4 h-4 md:w-5 h-5" />
                </div>
                <div className="flex flex-col">
                  <span className={cn(
                    "text-[9px] md:text-[10px] font-bold uppercase tracking-[0.1em]",
                    item.type === 'error' ? "text-rose-600" : "text-amber-600"
                  )}>
                    Atenção
                  </span>
                  <span className="text-xs md:text-sm font-semibold text-slate-600 mt-0.5">
                    {item.count} {item.label}
                  </span>
                </div>
                <div className="ml-auto text-xl md:text-2xl grayscale group-hover:grayscale-0 transition-all">{item.emoji}</div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <StatCard 
          label="Total de Grupos" 
          value={stats.total} 
          icon={Users} 
          color="blue"
          subValue={`${formatNumber(stats.totalMembros)} membros`}
        />
        <StatCard 
          label="Alugados" 
          value={stats.alugados} 
          icon={CheckCircle2} 
          color="green" 
          subValue={`${Math.round((stats.alugados / (stats.total || 1)) * 100)}% de ocupação`}
        />
        <StatCard 
          label="Disponíveis" 
          value={stats.disponiveis} 
          icon={XCircle} 
          color="gray" 
          subValue={`${stats.disponiveis} grupos vagos`}
        />
        <StatCard 
          label="Vencem Hoje/Amanhã" 
          value={stats.vencemHoje + stats.vencemAmanha} 
          icon={Clock} 
          color="orange" 
          subValue="Atenção necessária"
        />
      </div>

      {/* Perfil & Shopee Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
        <StatCard 
          label="Perfil Ativo" 
          value={stats.perfilAtivo} 
          icon={ShieldCheck} 
          color="green" 
          subValue="Compartilhamento"
        />
        <StatCard 
          label="Perfil Inativo" 
          value={stats.perfilInativo} 
          icon={ShieldAlert} 
          color="red" 
          subValue="Ação necessária"
        />
        <StatCard 
          label="Shopee Ativo" 
          value={stats.shopeeAtivo} 
          icon={TrendingUp} 
          color="green" 
          subValue="Postando links shopee"
        />
        <StatCard 
          label="Shopee Inativo" 
          value={stats.shopeeInativo} 
          icon={AlertCircle} 
          color="gray" 
          subValue="Sem uso para shopee"
        />
      </div>

      {/* Prioridade de Postagem */}
      <section className="space-y-6 relative">
        <div className="flex items-center gap-3">
          <div className="w-1 h-6 bg-rose-500 rounded-full" />
          <h3 className="text-lg font-bold text-slate-900 tracking-tight">
            Prioridade de Postagem
          </h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-6">
          <StatCard 
            label="Prioridade Alta" 
            value={stats.priorityAlta} 
            icon={Star} 
            color="red" 
            subValue="Melhores"
            onClick={() => togglePriority('Alta')}
            isActive={selectedPriority === 'Alta'}
            data-priority-trigger="Alta"
          />
          <StatCard 
            label="Prioridade Média" 
            value={stats.priorityMedia} 
            icon={Star} 
            color="yellow" 
            subValue="Bom engajamento e potencial"
            onClick={() => togglePriority('Média')}
            isActive={selectedPriority === 'Média'}
            data-priority-trigger="Média"
          />
          <StatCard 
            label="Prioridade Baixa" 
            value={stats.priorityBaixa} 
            icon={Star} 
            color="gray" 
            subValue="Grupos em desenvolvimento"
            onClick={() => togglePriority('Baixa')}
            isActive={selectedPriority === 'Baixa'}
            data-priority-trigger="Baixa"
          />
        </div>

        {/* Groups Dropdown */}
        <AnimatePresence>
          {selectedPriority && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              ref={dropdownRef}
              className="absolute left-0 right-0 z-50 mt-2 bg-white rounded-3xl border border-gray-100 shadow-2xl overflow-hidden max-h-[400px] flex flex-col"
            >
              <div className="px-8 py-5 bg-slate-50 border-b border-slate-100 flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-2.5 h-2.5 rounded-full animate-pulse",
                    selectedPriority === 'Alta' ? "bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]" :
                    selectedPriority === 'Média' ? "bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]" : "bg-slate-400"
                  )} />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                    Grupos Prioridade {selectedPriority} <span className="text-slate-300 ml-1">({selectedGroupsList.length})</span>
                  </span>
                </div>
                <button 
                  onClick={() => setSelectedPriority(null)}
                  className="p-2 hover:bg-slate-100 rounded-xl transition-colors group"
                >
                  <ChevronDown className="w-4 h-4 text-slate-300 group-hover:text-slate-600" />
                </button>
              </div>
              <div className="overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 no-scrollbar">
                {selectedGroupsList.map(group => (
                  <div 
                    key={group.id}
                    className="p-5 bg-white rounded-3xl border border-slate-100 hover:border-slate-200 hover:shadow-xl hover:shadow-slate-100/50 transition-all group flex items-center justify-between"
                  >
                    <div className="flex flex-col gap-1.5">
                      <span className="text-sm font-black text-slate-900 line-clamp-1 group-hover:text-blue-600 transition-colors uppercase tracking-tight">{group.nome_grupo}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{group.nicho}</span>
                        <div className="w-1 h-1 rounded-full bg-slate-100" />
                        <span className="text-[10px] font-black text-primary font-mono">
                          {group.priorityInfo.score} pts
                        </span>
                      </div>
                    </div>
                    {group.link_grupo && (
                      <a 
                        href={group.link_grupo} 
                        target="_blank" 
                        rel="noreferrer"
                        className="p-3 bg-slate-50 rounded-2xl text-slate-300 hover:text-blue-600 hover:bg-blue-50 transition-all border border-transparent hover:border-blue-100"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
              {selectedGroupsList.length === 0 && (
                <div className="p-10 text-center text-gray-400 text-sm italic">
                  Nenhum grupo nesta prioridade.
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* Checklist Diário Section */}
      <section className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-10 py-6 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-3">
            <ListChecks className="w-6 h-6 text-primary" />
            Checklist de Operação
          </h3>
          <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-300">Monitoramento Ativo</span>
        </div>
        <div className="p-10 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ChecklistItem 
              title={`${stats.perfilInativo} perfis inativos`}
              status={stats.perfilInativo > 0 ? 'error' : 'success'}
              description="Ação sugerida: Verificar conexão dos perfis nas extensões."
            />
            <ChecklistItem 
              title={`${stats.shopeeAtivo} canais Shopee`}
              status="info"
              description="Status: Postagens automáticas em execução constante."
            />
          </div>
          
          <div className="pt-6 border-t border-slate-50 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <ChecklistItem 
              title={`${stats.vencidos} aluguéis expirados`}
              status={stats.vencidos > 0 ? 'error' : 'success'}
              description="Cobranças pendentes identificadas no banco de dados."
            />
            <ChecklistItem 
              title={`${stats.vencemHoje + stats.vencemAmanha} avisos próximos`}
              status="info"
              description="Próximas 48h com renovações programadas."
            />
            <ChecklistItem 
              title="Operação Estável"
              status="success"
              description="Sem anomalias detectadas no fluxo de compartilhamento."
            />
          </div>
        </div>
      </section>

      {/* Niche Summary */}
      <section className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-1 h-6 bg-blue-500 rounded-full" />
          <h3 className="text-lg font-bold text-slate-900 tracking-tight">
            Performance por Nicho
          </h3>
        </div>
        <NicheGrid groups={groups} />
      </section>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color, subValue, onClick, isActive, ...props }: any) {
  const colors: any = {
    green: "bg-green-50 text-primary border-green-100 ring-primary",
    blue: "bg-blue-50 text-blue-600 border-blue-100 ring-blue-500",
    gray: "bg-slate-50 text-slate-600 border-slate-100 ring-slate-500",
    orange: "bg-amber-50 text-amber-600 border-amber-100 ring-amber-500",
    red: "bg-rose-50 text-rose-600 border-rose-100 ring-rose-500",
    yellow: "bg-yellow-50 text-yellow-600 border-yellow-100 ring-yellow-500",
  };

  return (
    <motion.div 
      whileHover={{ y: -4, shadow: "0 10px 25px -5px rgba(0, 0, 0, 0.05)" }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        "bg-white p-3.5 md:p-6 rounded-[1.5rem] md:rounded-[2rem] border transition-all flex flex-col gap-3 md:gap-5 text-left relative overflow-hidden group",
        onClick ? "cursor-pointer" : "border-slate-100 shadow-sm",
        isActive ? cn("border-transparent ring-2", colors[color]) : "border-slate-100 shadow-sm hover:border-slate-200"
      )}
      {...props}
    >
      <div className="flex items-center justify-between">
        <div className={cn("p-2 md:p-3 rounded-xl md:rounded-[1.25rem] border transition-colors", colors[color])}>
          <Icon className="w-4 h-4 md:w-6 h-6" />
        </div>
        {onClick && (
          <ChevronDown className={cn(
            "w-3 h-3 md:w-4 h-4 transition-transform duration-300",
            isActive ? "rotate-180 text-slate-900" : "text-slate-300 group-hover:text-slate-400"
          )} />
        )}
      </div>
      <div>
        <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] mb-0.5 md:mb-1 truncate">{label}</p>
        <div className="flex items-baseline gap-2">
          <p className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">{value}</p>
        </div>
        {subValue && (
          <p className="text-[8px] md:text-[9px] text-slate-400 mt-1 md:mt-2 font-medium uppercase tracking-wider flex items-center gap-1 md:gap-1.5 truncate">
            <span className={cn("w-1 h-1 rounded-full shrink-0", colors[color].split(' ')[1])} />
            {subValue}
          </p>
        )}
      </div>
      
      {/* Decorative background element */}
      <div className={cn(
        "absolute -right-4 -bottom-4 w-24 h-24 rounded-full opacity-[0.03] transform scale-150 transition-transform group-hover:scale-[1.7]",
        colors[color].split(' ')[0]
      )} />
    </motion.div>
  );
}

function ChecklistItem({ title, status, description }: { title: string, status: 'success' | 'warning' | 'error' | 'info', description: string }) {
  const styles = {
    success: "border-green-100 bg-green-50/20 text-accent shadow-sm",
    warning: "border-amber-100 bg-amber-50/20 text-amber-700 shadow-sm",
    error: "border-rose-100 bg-rose-50/20 text-rose-700 shadow-sm",
    info: "border-blue-100 bg-blue-50/20 text-blue-700 shadow-sm",
  };

  const Icon = status === 'success' ? CheckCircle2 : status === 'error' ? AlertCircle : status === 'warning' ? ShieldQuestion : Clock;

  return (
    <div className={cn("p-3.5 md:p-5 rounded-[1.25rem] md:rounded-[1.5rem] border flex items-start gap-3 md:gap-4 transition-all hover:scale-[1.01]", styles[status])}>
      <div className={cn("p-1.5 md:p-2 rounded-lg md:rounded-xl bg-white/50 backdrop-blur-sm shadow-sm", styles[status].split(' ')[2])}>
        <Icon className="w-4 h-4 md:w-5 md:h-5 shrink-0" />
      </div>
      <div>
        <h4 className="text-xs md:text-sm font-bold uppercase tracking-tight leading-tight">{title}</h4>
        <p className="text-[8px] md:text-[9px] opacity-60 mt-0.5 md:mt-1 font-medium uppercase tracking-wider">{description}</p>
      </div>
    </div>
  );
}

function NicheGrid({ groups }: { groups: Group[] }) {
  const niches = Array.from(new Set(groups.map(g => g?.nicho || 'Geral')));
  const nicheStats = niches.map(nicho => {
    const nicheGroups = groups.filter(g => (g?.nicho || 'Geral') === nicho);
    return {
      nicho,
      total: nicheGroups.length,
      alugados: nicheGroups.filter(g => g.status === 'Alugado').length,
      membros: nicheGroups.reduce((acc, g) => acc + (Number(g.quantidade_membros) || 0), 0),
    };
  }).sort((a, b) => b.membros - a.membros);

  if (nicheStats.length === 0) {
    return <p className="text-slate-400 italic font-bold uppercase tracking-widest text-xs py-10 text-center">Nenhum nicho cadastrado ainda.</p>;
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
      {nicheStats.map((stat, idx) => (
        <div key={idx} className="bg-white p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-100/50 hover:shadow-2xl hover:shadow-slate-200/50 transition-all group overflow-hidden relative">
          <div className="flex items-center justify-between mb-3 md:mb-4 relative z-10">
            <span className="text-sm md:text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors uppercase tracking-tight truncate mr-2">{stat.nicho}</span>
            <div className="p-1 px-2 md:p-2 bg-slate-50 rounded-lg md:rounded-xl border border-slate-100 shrink-0">
               <span className="text-[8px] md:text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                {stat.total}
              </span>
            </div>
          </div>
          
          <div className="space-y-3 md:space-y-4 relative z-10">
            <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-2 md:gap-0">
              <div className="flex flex-col">
                <span className="text-[8px] md:text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5 md:mb-1">Ocupação</span>
                <span className="text-sm md:text-lg font-bold text-primary font-mono tracking-tighter">{stat.alugados} <span className="text-slate-300 text-[10px] md:text-xs font-medium">/ {stat.total}</span></span>
              </div>
              <div className="flex flex-col md:text-right">
                <span className="text-[8px] md:text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5 md:mb-1">Membros</span>
                <span className="text-sm md:text-lg font-bold text-slate-900 font-mono tracking-tighter">{formatNumber(stat.membros)}</span>
              </div>
            </div>
            
            <div className="w-full bg-slate-100 h-1.5 md:h-2 rounded-full overflow-hidden mt-2 md:mt-4 border border-slate-50">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${(stat.alugados / stat.total) * 100}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="bg-primary h-full rounded-full shadow-[0_0_8px_rgba(22,163,74,0.3)]"
              />
            </div>
          </div>


          <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50/50 rounded-bl-[4rem] -mr-16 -mt-16 transition-transform group-hover:scale-110" />
        </div>
      ))}
    </div>
  );
}
