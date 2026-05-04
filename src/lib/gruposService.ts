import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  query,
  where,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import { extractGroupId } from "./groupParser";
import { calculatePriority } from "./priorityUtils";

// Mantendo os nomes dos campos compatíveis com o restante do app para não quebrar o layout/pesquisa
export type GrupoData = {
  id?: string;
  nome_grupo: string;
  nicho: string;
  quantidade_membros: number;
  locatario: string;
  whatsapp: string;
  data_vencimento: string;
  data_inicio?: string;
  status: string;
  perfil_compartilhando?: string;
  uso_shopee?: string;
  valor: number;
  link_grupo?: string;
  observacoes?: string;
  prioridade_postagem?: string;
  score_postagem?: number;
  ultima_revisao_membros?: string;
  ultimo_post?: string;
  para_venda?: boolean;
  valor_venda?: string;
  status_venda?: string;
  observacoes_venda?: string;
  atualizado_em?: string;
  locatarios?: any[];
  thumbnail_grupo?: string;
};

const gruposRef = collection(db, "grupos");

function cleanLinkForComparison(link?: string) {
  if (!link) return "";
  let l = link.trim().toLowerCase();
  
  // Remover protocolos e www para comparação justa
  l = l.replace(/^https?:\/\//, '');
  l = l.replace(/^www\./, '');
  
  // Remover parâmetros de rastreio (?...) e âncoras (#...)
  l = l.split('?')[0].split('#')[0];
  
  // Remover barras duplicadas e no final
  l = l.replace(/\/+$/, '');
  
  return l;
}

export async function buscarGrupoPorLink(link?: string) {
  const linkLimpo = cleanLinkForComparison(link);

  if (!linkLimpo) return null;

  // 1. Tentar busca pelo link limpo (mais comum)
  // Nota: isso pode requerer que os dados no DB estejam normalizados.
  // Por segurança, vamos buscar e filtrar pra ser à prova de falhas.
  const q = query(gruposRef, where("link_grupo", "==", linkLimpo));
  const snapshot = await getDocs(q);

  if (!snapshot.empty) {
    const docEncontrado = snapshot.docs[0];
    return {
      id: docEncontrado.id,
      ...docEncontrado.data(),
    };
  }

  // 2. Se for Facebook, extrair o ID numérico e buscar por ele
  const group_id = extractGroupId(linkLimpo);
  if (group_id && group_id.length > 5) { // IDs de grupos reais são longos
    const qId = query(gruposRef, where("group_id", "==", group_id));
    const snapshotId = await getDocs(qId);
    if (!snapshotId.empty) {
      const docEncontrado = snapshotId.docs[0];
      return {
        id: docEncontrado.id,
        ...docEncontrado.data(),
      };
    }
  }

  return null;
}

export async function adicionarGrupo(grupo: GrupoData) {
  const linkLimpo = cleanLinkForComparison(grupo.link_grupo);

  if (linkLimpo) {
    const existente: any = await buscarGrupoPorLink(linkLimpo);

    if (existente) {
      throw new Error(`Já existe um grupo cadastrado com esse link ou ID. (Grupo Existente: ${existente.nome_grupo})`);
    }
  }

  const priorityInfo = calculatePriority({
    quantidade_membros: grupo.quantidade_membros,
    perfil_compartilhando: grupo.perfil_compartilhando as any,
    uso_shopee: grupo.uso_shopee as any,
    nicho: grupo.nicho
  });

  const payload = {
    nome_grupo: grupo.nome_grupo.trim(),
    nicho: grupo.nicho.trim(),
    quantidade_membros: Number(grupo.quantidade_membros) || 0,
    locatario: grupo.locatario.trim(),
    whatsapp: grupo.whatsapp.trim(),
    data_inicio: grupo.data_inicio || "",
    data_vencimento: grupo.data_vencimento || "",
    status: grupo.status || "Disponível",
    perfil_compartilhando: grupo.perfil_compartilhando || "Inativo",
    uso_shopee: grupo.uso_shopee || "Inativo",
    valor: Number(grupo.valor) || 0,
    link_grupo: linkLimpo || "",
    group_id: extractGroupId(linkLimpo),
    observacoes: grupo.observacoes || "",
    thumbnail_grupo: grupo.thumbnail_grupo || "",
    prioridade_postagem: priorityInfo.prioridade,
    score_postagem: priorityInfo.score,
    ultima_revisao_membros: grupo.ultima_revisao_membros || null,
    ultimo_post: grupo.ultimo_post || null,
    updatedAt: serverTimestamp(),
  };

  const novoDoc = await addDoc(gruposRef, payload);

  return {
    id: novoDoc.id,
    ...payload,
  };
}

export async function atualizarGrupo(id: string, updates: Partial<GrupoData>) {
  const grupoRef = doc(db, "grupos", id);
  const currentSnap = await getDoc(grupoRef);
  const currentData = currentSnap.exists() ? currentSnap.data() : {};

  // If link is being updated, check for duplicates
  if (updates.link_grupo !== undefined) {
    const linkLimpo = cleanLinkForComparison(updates.link_grupo);
    if (linkLimpo) {
      const existente: any = await buscarGrupoPorLink(linkLimpo);
      if (existente && existente.id !== id) {
        throw new Error(`Já existe outro grupo cadastrado com esse link ou ID. (Conflito: ${existente.nome_grupo})`);
      }
    }
  }

  const payload: any = {
    updatedAt: serverTimestamp(),
  };

  if (updates.nome_grupo !== undefined) payload.nome_grupo = updates.nome_grupo.trim();
  if (updates.nicho !== undefined) payload.nicho = updates.nicho.trim();
  if (updates.quantidade_membros !== undefined) payload.quantidade_membros = Number(updates.quantidade_membros) || 0;
  if (updates.locatario !== undefined) payload.locatario = updates.locatario.trim();
  if (updates.whatsapp !== undefined) payload.whatsapp = updates.whatsapp.trim();
  if (updates.data_vencimento !== undefined) payload.data_vencimento = updates.data_vencimento || "";
  if (updates.data_inicio !== undefined) payload.data_inicio = updates.data_inicio || "";
  if (updates.status !== undefined) payload.status = updates.status || "Disponível";
  if (updates.perfil_compartilhando !== undefined) payload.perfil_compartilhando = updates.perfil_compartilhando || "Inativo";
  if (updates.uso_shopee !== undefined) payload.uso_shopee = updates.uso_shopee || "Inativo";
  if (updates.valor !== undefined) payload.valor = Number(updates.valor) || 0;
  if (updates.link_grupo !== undefined) {
    const linkLimpo = cleanLinkForComparison(updates.link_grupo);
    payload.link_grupo = linkLimpo || "";
    payload.group_id = extractGroupId(linkLimpo);
  }
  if (updates.observacoes !== undefined) payload.observacoes = updates.observacoes || "";
  if (updates.ultima_revisao_membros !== undefined) payload.ultima_revisao_membros = updates.ultima_revisao_membros || null;
  if (updates.ultimo_post !== undefined) payload.ultimo_post = updates.ultimo_post || null;
  if (updates.para_venda !== undefined) payload.para_venda = updates.para_venda;
  if (updates.valor_venda !== undefined) payload.valor_venda = updates.valor_venda || "";
  if (updates.status_venda !== undefined) payload.status_venda = updates.status_venda || "Disponível";
  if (updates.observacoes_venda !== undefined) payload.observacoes_venda = updates.observacoes_venda || "";
  if (updates.atualizado_em !== undefined) payload.atualizado_em = updates.atualizado_em;
  if (updates.locatarios !== undefined) payload.locatarios = updates.locatarios;
  if (updates.thumbnail_grupo !== undefined) payload.thumbnail_grupo = updates.thumbnail_grupo;
  if (updates.para_venda !== undefined) payload.para_venda = updates.para_venda;
  if (updates.valor_venda !== undefined) payload.valor_venda = updates.valor_venda;

  // Always recalculate priority on update if any relevant field changed
  const priorityInfo = calculatePriority({
    quantidade_membros: payload.quantidade_membros ?? updates.quantidade_membros ?? currentData.quantidade_membros,
    perfil_compartilhando: (payload.perfil_compartilhando ?? updates.perfil_compartilhando ?? currentData.perfil_compartilhando) as any,
    uso_shopee: (payload.uso_shopee ?? updates.uso_shopee ?? currentData.uso_shopee) as any,
    nicho: payload.nicho ?? updates.nicho ?? currentData.nicho
  });
  payload.prioridade_postagem = priorityInfo.prioridade;
  payload.score_postagem = priorityInfo.score;

  await updateDoc(grupoRef, payload);
}

export async function deletarGrupo(id: string) {
  const grupoRef = doc(db, "grupos", id);
  await deleteDoc(grupoRef);
}
