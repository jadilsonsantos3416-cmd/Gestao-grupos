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
  orderBy,
  writeBatch,
} from "firebase/firestore";
import { db } from "./firebase";
import { Nicho } from "../types";

const nichosRef = collection(db, "nichos");
const gruposRef = collection(db, "grupos");

export async function listarNichos(): Promise<Nicho[]> {
  const q = query(nichosRef, orderBy("nome", "asc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Nicho));
}

export async function adicionarNicho(nome: string) {
  const nomeLimpo = nome.trim();
  if (!nomeLimpo) throw new Error("O nome do nicho não pode estar vazio.");

  // Verificar se já existe
  const q = query(nichosRef, where("nome", "==", nomeLimpo));
  const snapshot = await getDocs(q);
  if (!snapshot.empty) throw new Error("Este nicho já existe.");

  const payload = {
    nome: nomeLimpo,
    criado_em: serverTimestamp()
  };

  const docRef = await addDoc(nichosRef, payload);
  return {
    id: docRef.id,
    ...payload
  };
}

export async function atualizarNicho(id: string, novoNome: string) {
  const nomeLimpo = novoNome.trim();
  if (!nomeLimpo) throw new Error("O nome do nicho não pode estar vazio.");

  const nichoRef = doc(db, "nichos", id);
  const snap = await getDoc(nichoRef);
  if (!snap.exists()) throw new Error("Nicho não encontrado.");
  
  const antigoNome = snap.data().nome;
  if (antigoNome === nomeLimpo) return;

  // 1. Atualizar o nicho
  await updateDoc(nichoRef, { nome: nomeLimpo });

  // 2. Atualizar todos os grupos que usam esse nicho
  const qGrupos = query(gruposRef, where("nicho", "==", antigoNome));
  const gruposSnap = await getDocs(qGrupos);
  
  if (!gruposSnap.empty) {
    const batch = writeBatch(db);
    gruposSnap.docs.forEach(grupoDoc => {
      batch.update(grupoDoc.ref, { nicho: nomeLimpo });
    });
    await batch.commit();
  }
}

export async function excluirNicho(id: string) {
  const nichoRef = doc(db, "nichos", id);
  await deleteDoc(nichoRef);
}
