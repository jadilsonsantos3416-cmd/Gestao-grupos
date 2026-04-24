import React, { useState } from 'react';
import { Shell } from '@/src/components/layout/Shell';
import { Dashboard } from '@/src/components/dashboard/Dashboard';
import { GroupList } from '@/src/components/groups/GroupList';
import { GroupForm } from '@/src/components/groups/GroupForm';
import { WhatsAppTab } from '@/src/components/whatsapp/WhatsAppTab';
import { BulkImporter } from '@/src/components/importer/BulkImporter';
import { DataCleanupModal } from '@/src/components/groups/DataCleanupModal';
import { RankingPage } from '@/src/components/ranking/RankingPage';
import { GrowthAnalysis } from '@/src/components/growth/GrowthAnalysis';
import { useGroups } from '@/src/hooks/useGroups';
import { Group, QuickFilter } from '@/src/types';
import { AnimatePresence } from 'motion/react';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [activeFilter, setActiveFilter] = useState<QuickFilter>('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImporterOpen, setIsImporterOpen] = useState(false);
  const [isCleanupOpen, setIsCleanupOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const { groups, addGroup, updateGroup, deleteGroup, isLoaded } = useGroups();

  const handleSaveGroup = async (groupData: any) => {
    if (editingGroup) {
      await updateGroup(editingGroup.id, groupData);
    } else {
      await addGroup(groupData);
    }
  };

  const handleMassUpdate = (updates: { id: string, nome_grupo: string, quantidade_membros: number }[]) => {
    updates.forEach(update => {
      updateGroup(update.id, { 
        nome_grupo: update.nome_grupo, 
        quantidade_membros: update.quantidade_membros 
      });
    });
  };

  const handleBulkImport = (itemsToImport: any[]) => {
    itemsToImport.forEach(item => {
      const groupData = {
        nome_grupo: item.nome_grupo,
        link_grupo: item.link_grupo,
        nicho: item.nicho,
        quantidade_membros: item.quantidade_membros,
        perfil_compartilhando: item.perfil_compartilhando || 'Inativo',
        uso_shopee: item.uso_shopee || 'Inativo',
        observacoes: item.observacoes,
        status: 'Disponível' as const,
        locatario: '',
        whatsapp: '',
        data_inicio: '',
        data_vencimento: '',
        valor: 0,
      };

      if (item.importAction === 'update') {
        const existing = groups.find(eg => eg.group_id === item.group_id);
        if (existing) {
          updateGroup(existing.id, groupData as any);
        } else {
          addGroup(groupData as any);
        }
      } else {
        // 'import' or default
        addGroup(groupData as any);
      }
    });
    setIsImporterOpen(false);
  };

  const handleEdit = (group: Group) => {
    setEditingGroup(group);
    setIsFormOpen(true);
  };

  const openNewGroupForm = () => {
    setEditingGroup(null);
    setIsFormOpen(true);
  };

  if (!isLoaded) return null;

  return (
    <Shell 
      activeTab={activeTab} 
      setActiveTab={setActiveTab}
      activeFilter={activeFilter}
      setActiveFilter={setActiveFilter}
      onAddGroup={openNewGroupForm}
      onImportGroups={() => setIsImporterOpen(true)}
      onCleanupData={() => setIsCleanupOpen(true)}
    >
      <AnimatePresence mode="wait">
        {activeTab === 'dashboard' && (
          <Dashboard groups={groups} />
        )}
        {activeTab === 'groups' && (
          <GroupList 
            groups={groups} 
            onEdit={handleEdit} 
            onDelete={deleteGroup} 
            activeQuickFilter={activeFilter}
            onQuickFilterChange={setActiveFilter}
          />
        )}
        {activeTab === 'whatsapp' && (
          <WhatsAppTab groups={groups} />
        )}
        {activeTab === 'ranking' && (
          <RankingPage />
        )}
        {activeTab === 'growth' && (
          <GrowthAnalysis groups={groups} updateGroup={updateGroup} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isFormOpen && (
          <GroupForm 
            onClose={() => setIsFormOpen(false)} 
            onSave={handleSaveGroup}
            editingGroup={editingGroup}
            existingGroups={groups}
          />
        )}
        {isImporterOpen && (
          <BulkImporter 
            onClose={() => setIsImporterOpen(false)}
            onImport={handleBulkImport}
            existingGroups={groups}
          />
        )}
        {isCleanupOpen && (
          <DataCleanupModal 
            onClose={() => setIsCleanupOpen(false)}
            groups={groups}
            onApply={handleMassUpdate}
          />
        )}
      </AnimatePresence>
    </Shell>
  );
}
