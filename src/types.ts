/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type GroupStatus = 'Disponível' | 'Alugado';
export type PerfilStatus = 'Ativo' | 'Inativo';
export type ShopeeStatus = 'Ativo' | 'Inativo';
export type GrowthTier = 'High' | 'Medium' | 'Low' | 'Pending';

export type PriorityLevel = 'Alta' | 'Média' | 'Baixa';

export interface Group {
  id: string;
  group_id: string;
  nome_grupo: string;
  link_grupo: string;
  nicho: string;
  status: GroupStatus;
  perfil_compartilhando: PerfilStatus;
  uso_shopee: ShopeeStatus;
  locatario: string;
  whatsapp: string;
  data_inicio: string;
  data_vencimento: string;
  valor: number;
  quantidade_membros: number | null;
  observacoes: string;
  updatedAt: string;
  growth_tier?: GrowthTier;
  ai_analysis?: string;
  prioridade_postagem?: PriorityLevel;
  score_postagem?: number;
}

export interface Renter {
  nome: string;
  whatsapp: string;
  lastValor: number;
  lastVencimento: string;
  groupCount: number;
}

export interface NicheStats {
  nicho: string;
  totalGrupos: number;
  alugados: number;
  totalMembros: number;
}

export type QuickFilter = 'all' | 'perfil_ativo' | 'perfil_inativo' | 'shopee_ativo' | 'shopee_inativo' | 'ready_shopee' | 'priority_alta' | 'priority_media' | 'priority_baixa';
