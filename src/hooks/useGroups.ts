import { useState, useEffect } from 'react';
import { Group } from '../types';
import { extractGroupId } from '../lib/groupParser';

import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp
} from 'firebase/firestore';

import { db } from '../lib/firebase';

export function useGroups() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // 🔥 ESCUTA EM TEMPO REAL (WEB + APK SINCRONIZADOS)
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'grupos'), (snapshot) => {
      const data = snapshot.docs.map((docItem) => ({
        id: docItem.id,
        ...docItem.data()
      })) as Group[];

      setGroups(data);
      setIsLoaded(true);
    });

    return () => unsubscribe();
  }, []);

  // ➕ ADICIONAR GRUPO
  const addGroup = async (group: Omit<Group, 'id' | 'group_id' | 'updatedAt'>) => {
    await addDoc(collection(db, 'grupos'), {
      ...group,
      group_id: extractGroupId(group.link_grupo),
      updatedAt: serverTimestamp()
    });
  };

  // ✏️ ATUALIZAR GRUPO
  const updateGroup = async (id: string, updates: Partial<Group>) => {
    const ref = doc(db, 'grupos', id);

    await updateDoc(ref, {
      ...updates,
      group_id: updates.link_grupo
        ? extractGroupId(updates.link_grupo)
        : updates.group_id,
      updatedAt: serverTimestamp()
    });
  };

  // 🗑️ DELETAR GRUPO
  const deleteGroup = async (id: string) => {
    await deleteDoc(doc(db, 'grupos', id));
  };

  return {
    groups,
    addGroup,
    updateGroup,
    deleteGroup,
    isLoaded
  };
}
