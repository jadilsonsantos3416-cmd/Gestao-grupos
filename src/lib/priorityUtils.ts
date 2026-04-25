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

  // Calculate Score: (membros / 10000) + (perfil_ativo ? 5 : 0) + (shopee_ativo ? 5 : 0)
  let score = (membros / 10000) + (perfilAtivo ? 5 : 0) + (shopeeAtivo ? 5 : 0);
  
  // Calculate Priority Level
  let prioridade: PriorityLevel = 'Baixa';

  if (score >= 10 || membros >= 50000) {
    prioridade = 'Alta';
  } else if (score >= 5 || membros >= 20000) {
    prioridade = 'Média';
  } else {
    prioridade = 'Baixa';
  }

  // Round score to 2 decimal places
  score = Math.round(score * 100) / 100;

  return { prioridade, score };
}

export function getGroupPriority(group: Group): PriorityInfo {
  if (!group) return { prioridade: 'Baixa', score: 0 };
  
  if (group.prioridade_postagem && group.score_postagem !== undefined) {
    // Normalizar para garantir que 'Media' vire 'Média' se vir do Firebase antigo ou inconsistente
    let prioridade = group.prioridade_postagem as string;
    if (prioridade === 'Media') prioridade = 'Média';
    
    return {
      prioridade: prioridade as PriorityLevel,
      score: group.score_postagem
    };
  }
  return calculatePriority(group);
}
