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

export function Dashboard({ groups }: DashboardProps) {
  const [selectedPriority, setSelectedPriority] = useState<PriorityLevel | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const groupsWithPriority = useMemo(() => groups.map(g => ({
    ...g,
    priorityInfo: getGroupPriority(g)
  })), [groups]);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setSelectedPriority(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedGroupsList = useMemo(() => {
    if (!selectedPriority) return [];
    return groupsWithPriority
      .filter(g => g.priorityInfo.prioridade === selectedPriority)
      .sort((a, b) => b.priorityInfo.score - a.priorityInfo.score);
  }, [selectedPriority, groupsWithPriority]);

  const stats = {
    total: groups.length,
    alugados: groups.filter(g => g.status === 'Alugado').length,
    disponiveis: groups.filter(g => g.status === 'Disponível').length,
    vencemHoje: groups.filter(g => g.status === 'Alugado' && isToday(parseISO(g.data_vencimento))).length,
    vencemAmanha: groups.filter(g => g.status === 'Alugado' && isTomorrow(parseISO(g.data_vencimento))).length,
    vencidos: groups.filter(g => g.status === 'Alugado' && isPast(parseISO(g.data_vencimento)) && !isToday(parseISO(g.data_vencimento))).length,
    totalMembros: groups.reduce((acc, g) => acc + (g.quantidade_membros || 0), 0),
    perfilAtivo: groups.filter(g => g.perfil_compartilhando === 'Ativo').length,
    perfilInativo: groups.filter(g => g.perfil_compartilhando === 'Inativo' || !g.perfil_compartilhando).length,
    shopeeAtivo: groups.filter(g => g.uso_shopee === 'Ativo').length,
    shopeeInativo: groups.filter(g => g.uso_shopee === 'Inativo' || !g.uso_shopee).length,
    priorityAlta: groupsWithPriority.filter(g => g.priorityInfo.prioridade === 'Alta').length,
    priorityMedia: groupsWithPriority.filter(g => g.priorityInfo.prioridade === 'Média').length,
    priorityBaixa: groupsWithPriority.filter(g => g.priorityInfo.prioridade === 'Baixa').length,
  };

  const alertItems = [
    { count: stats.vencemHoje, label: 'grupos vencem hoje', type: 'error', icon: AlertCircle, emoji: '⚠️' },
    { count: stats.vencemAmanha, label: 'grupos vencem amanhã', type: 'warning', icon: Clock, emoji: '⏰' },
    { count: stats.vencidos, label: 'grupos estão vencidos', type: 'error', icon: AlertCircle, emoji: '❌' },
    { count: stats.perfilInativo, label: 'grupos sem perfil ativo', type: 'error', icon: ShieldAlert, emoji: '🚨' },
  ].filter(item => item.count > 0);

  return (
    <div className="space-y-8">
      {/* Alerts */}
      {alertItems.length > 0 && (
        <div className="space-y-3">
          {alertItems.map((item, idx) => {
            const Icon = item.icon;
            return (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                key={idx}
                className={cn(
                  "flex items-center gap-3 p-4 rounded-2xl border bg-white shadow-sm",
                  item.type === 'error' ? "border-red-100 text-red-700 font-bold" : "border-yellow-100 text-yellow-700 font-bold"
                )}
              >
                <div className={cn(
                  "p-2 rounded-lg shrink-0",
                  item.type === 'error' ? "bg-red-50 text-red-600" : "bg-yellow-50 text-yellow-600"
                )}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-sm md:text-base">
                  {item.emoji} {item.count} {item.label}
                </span>
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <StatCard 
          label="Perfil Ativo" 
          value={stats.perfilAtivo} 
          icon={ShieldCheck} 
          color="green" 
          subValue="Compartilhamento normal"
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
      <section className="space-y-4 relative">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <Target className="w-5 h-5 text-red-500" />
          Prioridade de Postagem
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          <StatCard 
            label="Prioridade Alta" 
            value={stats.priorityAlta} 
            icon={Star} 
            color="red" 
            subValue="Melhores grupos no momento"
            onClick={() => setSelectedPriority(selectedPriority === 'Alta' ? null : 'Alta')}
            isActive={selectedPriority === 'Alta'}
          />
          <StatCard 
            label="Prioridade Média" 
            value={stats.priorityMedia} 
            icon={Star} 
            color="yellow" 
            subValue="Bom engajamento e potencial"
            onClick={() => setSelectedPriority(selectedPriority === 'Média' ? null : 'Média')}
            isActive={selectedPriority === 'Média'}
          />
          <StatCard 
            label="Prioridade Baixa" 
            value={stats.priorityBaixa} 
            icon={Star} 
            color="gray" 
            subValue="Grupos em desenvolvimento"
            onClick={() => setSelectedPriority(selectedPriority === 'Baixa' ? null : 'Baixa')}
            isActive={selectedPriority === 'Baixa'}
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
              <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "w-2 h-2 rounded-full animate-pulse",
                    selectedPriority === 'Alta' ? "bg-red-500" :
                    selectedPriority === 'Média' ? "bg-yellow-500" : "bg-gray-400"
                  )} />
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                    Grupos Prioridade {selectedPriority} ({selectedGroupsList.length})
                  </span>
                </div>
                <button 
                  onClick={() => setSelectedPriority(null)}
                  className="text-gray-400 hover:text-gray-600 text-[10px] font-black uppercase tracking-widest"
                >
                  Fechar
                </button>
              </div>
              <div className="overflow-y-auto p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {selectedGroupsList.map(group => (
                  <div 
                    key={group.id}
                    className="p-3 bg-gray-50 rounded-2xl border border-gray-100 hover:border-gray-200 transition-colors group flex items-center justify-between"
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-bold text-gray-800 line-clamp-1">{group.nome_grupo}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{group.nicho}</span>
                        <span className="text-[9px] font-mono text-gray-400 font-bold bg-white px-1.5 py-0.5 rounded border border-gray-100">
                          {group.priorityInfo.score} pts
                        </span>
                      </div>
                    </div>
                    {group.link_grupo && (
                      <a 
                        href={group.link_grupo} 
                        target="_blank" 
                        rel="noreferrer"
                        className="p-2 bg-white rounded-xl text-gray-400 hover:text-blue-500 hover:shadow-sm transition-all"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
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
      <section className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <ListChecks className="w-5 h-5 text-green-600" />
            Checklist Diário
          </h3>
          <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Dinamismo baseado nos status</span>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ChecklistItem 
              title={`${stats.perfilInativo} grupos inativos para ativar`}
              status={stats.perfilInativo > 0 ? 'error' : 'success'}
              description="Perfis que não estão compartilhando no momento."
            />
            <ChecklistItem 
              title={`${stats.shopeeAtivo} grupos usando Shopee`}
              status="info"
              description="Monitoramento de posts de produtos Shopee."
            />
            <ChecklistItem 
              title={`${stats.vencidos} grupos com aluguel vencido`}
              status={stats.vencidos > 0 ? 'error' : 'success'}
              description="Contatar locatários para renovação ou liberação."
            />
          </div>
          
          <div className="pt-4 border-t border-gray-50 grid grid-cols-1 md:grid-cols-2 gap-4">
            <ChecklistItem 
              title="0 grupos sem atividade para revisar"
              status="success"
              description="Monitoramento automático de posts recentes."
            />
            <ChecklistItem 
              title={`${stats.vencemHoje + stats.vencemAmanha} avisos de vencimento logo`}
              status="info"
              description="Vencimentos previstos para as próximas 48h."
            />
          </div>
        </div>
      </section>

      {/* Niche Summary */}
      <section>
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-gray-400" />
          Resumo por Nicho
        </h3>
        <NicheGrid groups={groups} />
      </section>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color, subValue, onClick, isActive }: any) {
  const colors: any = {
    green: "bg-green-50 text-green-600 border-green-100 ring-green-500",
    blue: "bg-blue-50 text-blue-600 border-blue-100 ring-blue-500",
    gray: "bg-gray-50 text-gray-600 border-gray-100 ring-gray-500",
    orange: "bg-orange-50 text-orange-600 border-orange-100 ring-orange-500",
    red: "bg-red-50 text-red-600 border-red-100 ring-red-500",
    yellow: "bg-yellow-50 text-yellow-600 border-yellow-100 ring-yellow-500",
  };

  return (
    <motion.div 
      whileHover={{ y: onClick ? -4 : 0 }}
      whileTap={{ scale: onClick ? 0.98 : 1 }}
      onClick={onClick}
      className={cn(
        "bg-white p-6 rounded-3xl border transition-all flex flex-col gap-4 text-left",
        onClick ? "cursor-pointer" : "border-gray-100 shadow-sm",
        isActive ? cn("border-transparent ring-2", colors[color]) : "border-gray-100 shadow-sm hover:border-gray-200"
      )}
    >
      <div className="flex items-center justify-between">
        <div className={cn("p-3 rounded-2xl border", colors[color])}>
          <Icon className="w-6 h-6" />
        </div>
        {onClick && (
          <ChevronDown className={cn(
            "w-4 h-4 transition-transform",
            isActive ? "rotate-180 text-gray-900" : "text-gray-300"
          )} />
        )}
      </div>
      <div>
        <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider">{label}</p>
        <p className="text-3xl font-bold tracking-tight mt-1">{value}</p>
        {subValue && <p className="text-xs text-gray-400 mt-1 font-medium italic">{subValue}</p>}
      </div>
    </motion.div>
  );
}

function ChecklistItem({ title, status, description }: { title: string, status: 'success' | 'warning' | 'error' | 'info', description: string }) {
  const styles = {
    success: "border-green-100 bg-green-50/30 text-green-700",
    warning: "border-yellow-100 bg-yellow-50/30 text-yellow-700",
    error: "border-red-100 bg-red-50/30 text-red-700",
    info: "border-blue-100 bg-blue-50/30 text-blue-700",
  };

  const Icon = status === 'success' ? CheckCircle2 : status === 'error' ? AlertCircle : status === 'warning' ? ShieldQuestion : Clock;

  return (
    <div className={cn("p-4 rounded-2xl border flex items-start gap-3 transition-all", styles[status])}>
      <Icon className="w-5 h-5 shrink-0 mt-0.5" />
      <div>
        <h4 className="text-sm font-bold leading-tight">{title}</h4>
        <p className="text-[10px] opacity-70 mt-1 font-medium">{description}</p>
      </div>
    </div>
  );
}

function NicheGrid({ groups }: { groups: Group[] }) {
  const niches = Array.from(new Set(groups.map(g => g.nicho)));
  const nicheStats = niches.map(nicho => {
    const nicheGroups = groups.filter(g => g.nicho === nicho);
    return {
      nicho,
      total: nicheGroups.length,
      alugados: nicheGroups.filter(g => g.status === 'Alugado').length,
      membros: nicheGroups.reduce((acc, g) => acc + (g.quantidade_membros || 0), 0),
    };
  });

  if (nicheStats.length === 0) {
    return <p className="text-gray-400 italic text-sm">Nenhum nicho cadastrado ainda.</p>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {nicheStats.map((stat, idx) => (
        <div key={idx} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="font-bold text-gray-800 capitalize">{stat.nicho}</span>
            <span className="text-xs font-bold px-2 py-1 bg-gray-50 rounded-lg text-gray-500 uppercase tracking-widest">
              {stat.total} {stat.total === 1 ? 'Grupo' : 'Grupos'}
            </span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Alugados</span>
              <span className="font-semibold text-green-600">{stat.alugados}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Membros Total</span>
              <span className="font-semibold">{formatNumber(stat.membros)}</span>
            </div>
            <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden mt-3">
              <div 
                className="bg-green-500 h-full transition-all duration-500"
                style={{ width: `${(stat.alugados / stat.total) * 100}%` }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
