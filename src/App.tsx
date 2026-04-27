import React, { useState, useEffect } from 'react';
import { Shell } from '@/src/components/layout/Shell';
import { Dashboard } from '@/src/components/dashboard/Dashboard';
import { GroupList } from '@/src/components/groups/GroupList';
import { GroupForm } from '@/src/components/groups/GroupForm';
import { WhatsAppTab } from '@/src/components/whatsapp/WhatsAppTab';
import { BulkImporter } from '@/src/components/importer/BulkImporter';
import { DataCleanupModal } from '@/src/components/groups/DataCleanupModal';
import { RankingPage } from '@/src/components/ranking/RankingPage';
import { GrowthAnalysis } from '@/src/components/growth/GrowthAnalysis';
import { CampaignsPage } from '@/src/components/campaigns/CampaignsPage';
import { SalesPage } from '@/src/components/sales/SalesPage';
import { RedirectPage } from '@/src/components/campaigns/RedirectPage';
import { ErrorBoundary } from '@/src/components/common/ErrorBoundary';
import { SplashScreen } from '@/src/components/common/SplashScreen';
import { DashboardSkeleton, GroupListSkeleton } from '@/src/components/common/Skeleton';
import { useGroups } from '@/src/hooks/useGroups';
import { Group, QuickFilter } from '@/src/types';
import { AnimatePresence } from 'motion/react';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showSplash, setShowSplash] = useState(true);
  const path = window.location.pathname;
  const isRedirect = path.startsWith('/l/');

  const [activeFilter, setActiveFilter] = useState<QuickFilter>('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImporterOpen, setIsImporterOpen] = useState(false);
  const [isCleanupOpen, setIsCleanupOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const { groups, addGroup, updateGroup, deleteGroup, isLoaded } = useGroups();

  useEffect(() => {
    // Show splash for at least 1.5 seconds or until data is loaded
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  const handleSaveGroup = async (groupData: any) => {
    if (editingGroup) {
      await updateGroup(editingGroup.id, groupData);
    } else {
      await addGroup(groupData);
    }
  };

  const handleMassUpdate = async (updates: { id: string, nome_grupo: string, quantidade_membros: number }[]) => {
    try {
      const promises = updates.map(update => 
        updateGroup(update.id, { 
          nome_grupo: update.nome_grupo, 
          quantidade_membros: update.quantidade_membros 
        })
      );
      await Promise.all(promises);
      alert(`${updates.length} registros atualizados com sucesso!`);
    } catch (error) {
      console.error("Erro na atualização em massa:", error);
      alert("Houve um erro ao atualizar os registros. Verifique o console.");
    }
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

  if (isRedirect) {
    return <RedirectPage />;
  }

  const isLoading = !isLoaded || showSplash;

  return (
    <ErrorBoundary>
      <SplashScreen isVisible={showSplash} />
      
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
          {isLoading ? (
            <div key="loading">
              {activeTab === 'dashboard' ? <DashboardSkeleton /> : <GroupListSkeleton />}
            </div>
          ) : (
            <React.Fragment key="content">
              {activeTab === 'dashboard' && (
                <ErrorBoundary>
                  <Dashboard groups={groups} />
                </ErrorBoundary>
              )}
              {activeTab === 'groups' && (
                <ErrorBoundary>
                  <GroupList 
                    groups={groups} 
                    onEdit={handleEdit} 
                    onDelete={deleteGroup} 
                    onUpdate={updateGroup}
                    activeQuickFilter={activeFilter}
                    onQuickFilterChange={setActiveFilter}
                  />
                </ErrorBoundary>
              )}
              {activeTab === 'whatsapp' && (
                <ErrorBoundary>
                  <WhatsAppTab groups={groups} />
                </ErrorBoundary>
              )}
              {activeTab === 'ranking' && (
                <ErrorBoundary>
                  <RankingPage groups={groups} activeFilter={activeFilter} />
                </ErrorBoundary>
              )}
              {activeTab === 'growth' && (
                <ErrorBoundary>
                  <GrowthAnalysis groups={groups} updateGroup={updateGroup} />
                </ErrorBoundary>
              )}
              {activeTab === 'campaigns' && (
                <ErrorBoundary>
                  <CampaignsPage groups={groups} />
                </ErrorBoundary>
              )}
              {activeTab === 'sales' && (
                <ErrorBoundary>
                  <SalesPage 
                    groups={groups} 
                    onEdit={handleEdit} 
                    onUpdate={updateGroup}
                  />
                </ErrorBoundary>
              )}
            </React.Fragment>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isFormOpen && (
            <ErrorBoundary>
              <GroupForm 
                onClose={() => setIsFormOpen(false)} 
                onSave={handleSaveGroup}
                editingGroup={editingGroup}
                existingGroups={groups}
              />
            </ErrorBoundary>
          )}
          {isImporterOpen && (
            <ErrorBoundary>
              <BulkImporter 
                onClose={() => setIsImporterOpen(false)}
                onImport={handleBulkImport}
                existingGroups={groups}
              />
            </ErrorBoundary>
          )}
          {isCleanupOpen && (
            <ErrorBoundary>
              <DataCleanupModal 
                onClose={() => setIsCleanupOpen(false)}
                groups={groups}
                onApply={handleMassUpdate}
              />
            </ErrorBoundary>
          )}
        </AnimatePresence>
      </Shell>
    </ErrorBoundary>
  );
}
