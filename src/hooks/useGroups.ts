import { useState, useEffect } from 'react';
import { Group } from '../types';
import { db } from '../lib/firebase';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy
} from 'firebase/firestore';
import * as gruposService from '../lib/gruposService';

export function useGroups() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'grupos'), orderBy('updatedAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const groupsData: Group[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (!data) return;

        // Ensure all fields have fallbacks to prevent crashes in components
        const normalizedGroup: Group = {
          id: doc.id,
          group_id: data.group_id || "",
          nome_grupo: data.nome_grupo || "Sem Nome",
          link_grupo: data.link_grupo || "",
          nicho: data.nicho || "Geral",
          status: data.status || "Disponível",
          perfil_compartilhando: data.perfil_compartilhando || "Inativo",
          uso_shopee: data.uso_shopee || "Inativo",
          locatario: data.locatario || "",
          whatsapp: data.whatsapp || "",
          data_inicio: data.data_inicio || "",
          data_vencimento: data.data_vencimento || "",
          valor: Number(data.valor) || 0,
          quantidade_membros: data.quantidade_membros !== undefined ? Number(data.quantidade_membros) : 0,
          observacoes: data.observacoes || "",
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt || new Date().toISOString(),
          prioridade_postagem: data.prioridade_postagem,
          score_postagem: data.score_postagem,
          growth_tier: data.growth_tier,
          ai_analysis: data.ai_analysis,
          ultima_revisao_membros: data.ultima_revisao_membros,
          ultimo_post: data.ultimo_post,
          // Sale fields
          para_venda: !!data.para_venda,
          valor_venda: data.valor_venda || "",
          status_venda: data.status_venda || "Disponível",
          observacoes_venda: data.observacoes_venda || ""
        };
        
        groupsData.push(normalizedGroup);
      });
      setGroups(groupsData);
      setIsLoaded(true);
    }, (error) => {
      console.error("Erro ao carregar grupos do Firestore:", error);
      setIsLoaded(true);
    });

    return () => unsubscribe();
  }, []);

  const addGroup = async (groupData: Omit<Group, 'id' | 'group_id' | 'updatedAt'>) => {
    return await gruposService.adicionarGrupo(groupData as any);
  };

  const updateGroup = async (id: string, updates: Partial<Group>) => {
    return await gruposService.atualizarGrupo(id, updates as any);
  };

  const deleteGroup = async (id: string) => {
    return await gruposService.deletarGrupo(id);
  };

  return { groups, addGroup, updateGroup, deleteGroup, isLoaded };
}
