/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type GroupStatus = 'Disponível' | 'Alugado';

export interface Group {
  id: string;
  group_id: string;
  nome_grupo: string;
  link_grupo: string;
  nicho: string;
  status: GroupStatus;
  locatario: string;
  whatsapp: string;
  data_inicio: string;
  data_vencimento: string;
  valor: number;
  quantidade_membros: number;
  observacoes: string;
  updatedAt: string;
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
