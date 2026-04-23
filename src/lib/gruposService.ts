import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import { extractGroupId } from "./groupParser";

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
  valor: number;
  link_grupo?: string;
  observacoes?: string;
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
    valor: Number(grupo.valor) || 0,
    link_grupo: linkLimpo || "",
    group_id: extractGroupId(linkLimpo),
    observacoes: grupo.observacoes || "",
    updatedAt: serverTimestamp(),
  };

  const novoDoc = await addDoc(gruposRef, payload);

  return {
    id: novoDoc.id,
    ...payload,
  };
}

export async function atualizarGrupo(id: string, grupo: GrupoData) {
  const linkLimpo = cleanLinkForComparison(grupo.link_grupo);

  if (linkLimpo) {
    const existente: any = await buscarGrupoPorLink(linkLimpo);

    if (existente && existente.id !== id) {
      throw new Error(`Já existe outro grupo cadastrado com esse link ou ID. (Conflito: ${existente.nome_grupo})`);
    }
  }

  const grupoRef = doc(db, "grupos", id);

  const payload = {
    nome_grupo: grupo.nome_grupo.trim(),
    nicho: grupo.nicho.trim(),
    quantidade_membros: Number(grupo.quantidade_membros) || 0,
    locatario: grupo.locatario.trim(),
    whatsapp: grupo.whatsapp.trim(),
    data_vencimento: grupo.data_vencimento || "",
    data_inicio: grupo.data_inicio || "",
    status: grupo.status || "Disponível",
    perfil_compartilhando: grupo.perfil_compartilhando || "Inativo",
    valor: Number(grupo.valor) || 0,
    link_grupo: linkLimpo || "",
    group_id: extractGroupId(linkLimpo),
    observacoes: grupo.observacoes || "",
    updatedAt: serverTimestamp(),
  };

  await updateDoc(grupoRef, payload);
}

export async function deletarGrupo(id: string) {
  const grupoRef = doc(db, "grupos", id);
  await deleteDoc(grupoRef);
}
