import { Group, PerfilStatus, ShopeeStatus } from '../types';

export type PriorityLevel = 'Alta' | 'Média' | 'Baixa';

export interface PriorityInfo {
  prioridade: PriorityLevel;
  score: number;
}

export function calculatePriority(group: Partial<Group>): PriorityInfo {
  const membros = Number(group?.quantidade_membros) || 0;
  const perfilAtivo = group?.perfil_compartilhando === 'Ativo';
  const shopeeAtivo = group?.uso_shopee === 'Ativo';
  const nicho = group?.nicho || '';

  // Calculate Score
  let score = 0;
  
  if (membros >= 30000) score += 3;
  else if (membros >= 20000) score += 2;
  else if (membros >= 10000) score += 1;

  if (perfilAtivo) score += 3;
  if (shopeeAtivo) score += 3;

  const priorityNiches = ["Evangélico", "Musa", "Beleza / Cabelo", "Receitas", "Agro / Notícias"];
  if (priorityNiches.some(n => nicho.includes(n))) {
    score += 2;
  }

  // Calculate Priority Level
  let prioridade: PriorityLevel = 'Baixa';

  if (membros >= 30000 || (perfilAtivo && shopeeAtivo)) {
    prioridade = 'Alta';
  } else if (membros >= 10000 || perfilAtivo || shopeeAtivo) {
    prioridade = 'Média';
  } else {
    prioridade = 'Baixa';
  }

  return { prioridade, score };
}

export function getGroupPriority(group: Group): PriorityInfo {
  if (!group) return { prioridade: 'Baixa', score: 0 };
  
  if (group.prioridade_postagem && group.score_postagem !== undefined) {
    return {
      prioridade: group.prioridade_postagem,
      score: group.score_postagem
    };
  }
  return calculatePriority(group);
}
