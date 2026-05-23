import { useState, useEffect } from 'react';
import { Group } from '../types';
import { db } from '../lib/firebase';
import { 
  collection, 
  onSnapshot, 
  query,
  getDocs
} from 'firebase/firestore';
import * as gruposService from '../lib/gruposService';

export function useGroups() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const normalizeGroupData = (id: string, data: any): Group => {
    return {
      id,
      group_id: data.group_id || "",
      nome_grupo: data.nome_grupo || "Sem Nome",
      link_grupo: data.link_grupo || "",
      nicho: data.nicho || 'Geral',
      status: data.status || "Disponível",
      perfil_compartilhando: data.perfil_compartilhando || "Inativo",
      uso_shopee: data.uso_shopee || "Inativo",
      locatario: data.locatario || "",
      whatsapp: data.whatsapp || "",
      data_inicio: data.data_inicio || "",
      data_vencimento: data.data_vencimento || "",
      valor: Number(data.valor) || 0,
      locatarios: data.locatarios || [],
      thumbnail_grupo: data.thumbnail_grupo || data.capa_grupo || data.foto_capa_url || data.imagem_grupo || "",
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
      observacoes_venda: data.observacoes_venda || "",
      privacidade_grupo: data.privacidade_grupo || "Não verificado"
    };
  };

  const sortGroupsInMemory = (items: Group[]): Group[] => {
    return [...items].sort((a, b) => {
      const timeA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const timeB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return timeB - timeA;
    });
  };

  const listarGrupos = async (): Promise<Group[]> => {
    setError(null);
    try {
      console.log("Tentando buscar todos os documentos da coleção: 'grupos'...");
      const colRef = collection(db, 'grupos');
      const snapshot = await getDocs(colRef);
      const docCount = snapshot.size;
      
      console.log(`Leitura concluída. Coleção usada: 'grupos'. Quantidade de documentos encontrados: ${docCount}`);
      
      if (docCount === 0) {
        console.warn(`Coleção 'grupos' retornou 0 documentos. A lista está vazia.`);
      }

      const list: Group[] = [];
      snapshot.forEach(doc => {
        const item = normalizeGroupData(doc.id, doc.data());
        list.push(item);
      });

      const sortedList = sortGroupsInMemory(list);
      setGroups(sortedList);
      setError(null);
      setIsLoaded(true);
      return sortedList;
    } catch (err: any) {
      console.error("Erro real no Firestore ao buscar 'grupos' na função listarGrupos():", err);
      let errorMsg = "Erro ao carregar grupos.";
      if (err?.code === 'permission-denied' || String(err).includes('permission')) {
        errorMsg = "Erro ao carregar grupos: permissão negada no Firestore";
      } else if (err?.code === 'failed-precondition' || String(err).includes('network') || String(err).includes('configure')) {
        errorMsg = "Erro ao conectar ao Firebase";
      }
      setError(errorMsg);
      setIsLoaded(true);
      throw err;
    }
  };

  useEffect(() => {
    const colRef = collection(db, 'grupos');
    
    const unsubscribe = onSnapshot(colRef, (snapshot) => {
      const groupsData: Group[] = [];
      const docCount = snapshot.size;
      
      console.log(`[onSnapshot] Atualização em tempo real. Coleção: 'grupos'. Documentos encontrados: ${docCount}`);
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (!data) return;
        groupsData.push(normalizeGroupData(doc.id, data));
      });
      
      const sorted = sortGroupsInMemory(groupsData);
      setGroups(sorted);
      setIsLoaded(true);
      setError(null);
    }, (err) => {
      console.error("Erro real ao carregar grupos do Firestore (onSnapshot):", err);
      let errorMsg = "Erro ao carregar grupos.";
      if (err?.code === 'permission-denied' || String(err).includes('permission')) {
        errorMsg = "Erro ao carregar grupos: permissão negada no Firestore";
      } else if (err?.code === 'failed-precondition' || String(err).includes('network') || String(err).includes('configure')) {
        errorMsg = "Erro ao conectar ao Firebase";
      }
      setError(errorMsg);
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

  return { groups, addGroup, updateGroup, deleteGroup, isLoaded, error, listarGrupos };
}
