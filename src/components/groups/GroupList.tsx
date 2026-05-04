import React, { useState, useEffect, useMemo } from 'react';
import { Group, QuickFilter } from '@/src/types';
import { Search, ExternalLink, Edit2, Trash2, Filter, ArrowUpDown, Download, Loader2, ChevronDown, ClipboardList, Sparkles, Wand2, Trophy, UserPlus, UserMinus, PhoneCall, MoreVertical, Copy, Tag } from 'lucide-react';
import { cn, formatNumber, formatCurrency, ensureAbsoluteUrl, parseMembers } from '@/src/lib/utils';
import { getGroupPriority, PriorityLevel, PriorityInfo } from '@/src/lib/priorityUtils';
import { parseISO, format, isToday, isTomorrow, isPast } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { ptBR } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Document, Packer, Paragraph, Table, TableCell, TableRow, WidthType, TextRun, HeadingLevel, AlignmentType, BorderStyle, VerticalAlign } from 'docx';
import { saveAs } from 'file-saver';
import { MemberReviewModal } from './MemberReviewModal';
import { PostTodayModal } from './PostTodayModal';
import { GenerateCopyModal } from './GenerateCopyModal';
import { NichoModal } from './NichoModal';
import { LocatarioModal } from './LocatarioModal';
import { listarNichos } from '@/src/lib/nichosService';
import { Nicho, Locatario } from '@/src/types';

interface GroupListProps {
  groups: Group[];
  onEdit: (group: Group) => void;
  onDelete: (id: string) => void;
  onUpdate?: (id: string, updates: Partial<Group>) => Promise<void>;
  activeQuickFilter?: QuickFilter;
  onQuickFilterChange?: (filter: QuickFilter) => void;
}

type SortField = 'data_vencimento' | 'quantidade_membros' | 'nome_grupo' | 'prioridade' | 'score';

interface GroupWithPriority extends Group {
  priorityInfo: PriorityInfo;
}

export function GroupList({ groups = [], onEdit, onDelete, onUpdate, activeQuickFilter, onQuickFilterChange }: GroupListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [renterSearch, setRenterSearch] = useState('');
  const [nichoFilter, setNichoFilter] = useState('Todos');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [perfilFilter, setPerfilFilter] = useState('Todos');
  const [shopeeFilter, setShopeeFilter] = useState('Todos');
  const [priorityFilter, setPriorityFilter] = useState('Todos');
  const [onlyReadyForShopee, setOnlyReadyForShopee] = useState(false);
  const [sortField, setSortField] = useState<SortField>('data_vencimento');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isPostTodayModalOpen, setIsPostTodayModalOpen] = useState(false);
  const [isGenerateCopyModalOpen, setIsGenerateCopyModalOpen] = useState(false);
  const [isNichoModalOpen, setIsNichoModalOpen] = useState(false);
  const [nichoModalInitialAdd, setNichoModalInitialAdd] = useState(false);
  const [nichos, setNichos] = useState<Nicho[]>([]);
  const [loadingNichos, setLoadingNichos] = useState(true);
  const [processingAction, setProcessingAction] = useState<{ id: string, field: 'perfil' | 'shopee' | 'nicho' | 'membros' | 'locatario' } | null>(null);
  const [editingMembersId, setEditingMembersId] = useState<string | null>(null);
  const [isLocatarioModalOpen, setIsLocatarioModalOpen] = useState(false);
  const [locatarioGroup, setLocatarioGroup] = useState<Group | null>(null);
  const [editingLocatario, setEditingLocatario] = useState<Locatario | null>(null);
  const [membersInputValue, setMembersInputValue] = useState('');
  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const GroupThumbnail = ({ group, size = 'desktop' }: { group: Group, size?: 'desktop' | 'mobile' }) => {
    const [hasError, setHasError] = useState(false);
    const thumbnailUrl = group.thumbnail_grupo || (group as any).capa_grupo || (group as any).foto_capa_url || (group as any).imagem_grupo || "";
    
    const dimensions = size === 'desktop' ? 'w-[52px] h-[52px]' : 'w-[44px] h-[44px]';
    const borderRadius = 'rounded-[14px]';
    const textSize = size === 'desktop' ? 'text-xl' : 'text-lg';

    if (thumbnailUrl && !hasError) {
      return (
        <div className={cn(dimensions, borderRadius, "bg-slate-100 flex-shrink-0 overflow-hidden border border-slate-100 shadow-sm flex items-center justify-center")}>
          <img 
            src={thumbnailUrl} 
            alt={group.nome_grupo || ''} 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
            onError={() => setHasError(true)}
          />
        </div>
      );
    }

    return (
      <div className={cn(dimensions, borderRadius, "bg-emerald-50 text-primary font-black flex items-center justify-center uppercase shrink-0 border border-emerald-100 shadow-sm", textSize)}>
        {(group.nome_grupo || (group as any).nome || 'G')[0]}
      </div>
    );
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const normalizeFacebookGroupLink = (group: Group) => {
    // 1. Priority: group_id
    if (group.group_id) {
      const id = String(group.group_id).trim().replace(/\s+/g, '');
      if (id && id.length > 0) {
        return `https://www.facebook.com/groups/${id}/`;
      }
    }

    // 2. Secondary: link_grupo
    let link = (group.link_grupo || '').trim();
    
    // Remove all whitespace and line breaks
    link = link.replace(/\s+/g, '');

    if (!link) return '';

    // If it's just numbers (group ID)
    if (/^\d+$/.test(link)) {
      return `https://www.facebook.com/groups/${link}/`;
    }

    // Handle domain prefixes or group patterns
    if (link.includes('facebook.com')) {
      if (!link.startsWith('http')) {
        link = 'https://' + link;
      }
      // Ensure www. for standard look if explicitly requested or to normalize
      if (!link.includes('www.')) {
        link = link.replace('facebook.com', 'www.facebook.com');
      }
    } else if (link.includes('groups/')) {
      link = 'https://www.facebook.com/' + (link.startsWith('/') ? link.slice(1) : link);
    } else {
      // If none of the above, but has content, treat as part of a group path
      link = 'https://www.facebook.com/groups/' + (link.startsWith('/') ? link.slice(1) : link);
    }

    // Ensure ending slash
    if (link && !link.endsWith('/')) {
      link = link + '/';
    }

    // Final cleanup: ensure no double slashes in path (except after https:)
    return link.replace(/([^:]\/)\/+/g, "$1");
  };

  const getExportData = () => {
    if (filteredGroups.length === 0) return [];

    // Sorting: Strictly by member count descending (maior para o menor)
    return [...filteredGroups].sort((a, b) => {
      const mA = a.quantidade_membros || (a as any).membros || 0;
      const mB = b.quantidade_membros || (b as any).membros || 0;
      return mB - mA;
    });
  };

  const handleExportExcel = async () => {
    const dataToExport = getExportData();
    if (dataToExport.length === 0) {
      alert("Nenhum grupo para exportar");
      return;
    }

    setIsExporting(true);
    try {
      // Prepare data specifically for Excel
      const data = dataToExport.map(g => {
        const item = g as any;
        return {
          'NOME': (item.nome_grupo || item.nome || "").replace(/\n/g, ' ').trim(),
          'LINK': normalizeFacebookGroupLink(g),
          'MEMBROS': item.quantidade_membros || item.membros || 0
        };
      });

      // Create workbook and worksheet
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Grupos FB");

      // Set column widths as requested
      worksheet['!cols'] = [
        { wch: 38 }, // NOME
        { wch: 60 }, // LINK
        { wch: 15 }, // MEMBROS
      ];

      // Freeze first row
      worksheet['!freeze'] = {
        xSplit: 0,
        ySplit: 1,
        topLeftCell: 'A2',
        activePane: 'bottomLeft',
        state: 'frozen'
      };

      const dateSuffix = new Date().toISOString().split('T')[0];
      XLSX.writeFile(workbook, `grupos_fb_${dateSuffix}.xlsx`);
      
      setIsExportDropdownOpen(false);
      setToast({ message: "Exportação concluída com sucesso", type: 'success' });
    } catch (error) {
      console.error("Erro na exportação Excel:", error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportWord = async () => {
    const dataToExport = getExportData();
    if (dataToExport.length === 0) {
      alert("Nenhum grupo para exportar");
      return;
    }

    setIsExporting(true);
    try {
      const doc = new Document({
        sections: [
          {
            properties: {},
            children: [
              new Paragraph({
                text: "Lista de Grupos FB",
                heading: HeadingLevel.HEADING_1,
                alignment: AlignmentType.CENTER,
                spacing: { after: 200 },
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: `Exportado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`,
                    color: "64748b", // slate-400
                    size: 20, // 10pt
                  }),
                ],
                alignment: AlignmentType.CENTER,
                spacing: { after: 400 },
              }),
              new Table({
                width: {
                  size: 100,
                  type: WidthType.PERCENTAGE,
                },
                rows: [
                  new TableRow({
                    children: [
                      new TableCell({
                        children: [new Paragraph({ children: [new TextRun({ text: "NOME", bold: true, color: "ffffff" })], alignment: AlignmentType.CENTER })],
                        shading: { fill: "16a34a" }, // primary green
                        verticalAlign: VerticalAlign.CENTER,
                      }),
                      new TableCell({
                        children: [new Paragraph({ children: [new TextRun({ text: "LINK", bold: true, color: "ffffff" })], alignment: AlignmentType.CENTER })],
                        shading: { fill: "16a34a" },
                        verticalAlign: VerticalAlign.CENTER,
                      }),
                      new TableCell({
                        children: [new Paragraph({ children: [new TextRun({ text: "MEMBROS", bold: true, color: "ffffff" })], alignment: AlignmentType.CENTER })],
                        shading: { fill: "16a34a" },
                        verticalAlign: VerticalAlign.CENTER,
                      }),
                    ],
                  }),
                  ...dataToExport.map(g => {
                    const item = g as any;
                    return new TableRow({
                      children: [
                        new TableCell({
                          children: [new Paragraph({ text: (item.nome_grupo || item.nome || "").replace(/\n/g, ' ').trim() })],
                          verticalAlign: VerticalAlign.CENTER,
                        }),
                        new TableCell({
                          children: [new Paragraph({ text: normalizeFacebookGroupLink(g) })],
                          verticalAlign: VerticalAlign.CENTER,
                        }),
                        new TableCell({
                          children: [new Paragraph({ text: (item.quantidade_membros || item.membros || 0).toLocaleString('pt-BR'), alignment: AlignmentType.RIGHT })],
                          verticalAlign: VerticalAlign.CENTER,
                        }),
                      ],
                    });
                  }),
                ],
              }),
            ],
          },
        ],
      });

      const blob = await Packer.toBlob(doc);
      const dateSuffix = new Date().toISOString().split('T')[0];
      saveAs(blob, `grupos_fb_${dateSuffix}.docx`);

      setIsExportDropdownOpen(false);
      setToast({ message: "Word exportado com sucesso", type: 'success' });
    } catch (error) {
      console.error("Erro na exportação Word:", error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportCSV = async (type: 'csv' | 'sheets') => {
    const dataToExport = getExportData();
    if (dataToExport.length === 0) {
      alert("Nenhum grupo para exportar");
      return;
    }

    setIsExporting(true);
    try {
      const BOM = "\uFEFF";
      const headers = ['NOME', 'LINK', 'MEMBROS'];

      const rows = dataToExport.map(g => {
        const item = g as any;
        return [
          (item.nome_grupo || item.nome || "").replace(/;/g, ' ').replace(/\n/g, ' ').trim(),
          normalizeFacebookGroupLink(g),
          item.quantidade_membros || item.membros || 0
        ];
      });

      const csvContent = [
        headers.join(';'),
        ...rows.map(r => r.join(';'))
      ].join('\n');

      const dateSuffix = new Date().toISOString().split('T')[0];
      const fileName = type === 'sheets' 
        ? `grupos_fb_sheets_${dateSuffix}.csv`
        : `grupos_fb_${dateSuffix}.csv`;

      const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      setIsExportDropdownOpen(false);
      setToast({ message: "Exportação concluída com sucesso", type: 'success' });
    } catch (error) {
      console.error("Erro na exportação CSV:", error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPDF = async () => {
    const dataToExport = getExportData();
    if (dataToExport.length === 0) {
      alert("Nenhum grupo para exportar");
      return;
    }

    setIsExporting(true);
    try {
      const doc = new jsPDF();
      
      // Title
      doc.setFontSize(18);
      doc.setTextColor(15, 23, 42); // slate-900
      doc.text("Lista de Grupos FB", 14, 20);
      
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139); // slate-400
      doc.text(`Exportado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, 14, 28);

      const tableData = dataToExport.map(g => {
        const item = g as any;
        return [
          (item.nome_grupo || item.nome || "").substring(0, 100),
          normalizeFacebookGroupLink(g),
          (item.quantidade_membros || item.membros || 0).toLocaleString('pt-BR')
        ];
      });

      autoTable(doc, {
        head: [['NOME', 'LINK', 'MEMBROS']],
        body: tableData,
        startY: 35,
        theme: 'grid',
        headStyles: { 
          fillColor: [22, 163, 74], // primary green
          textColor: 255,
          fontSize: 10,
          fontStyle: 'bold'
        },
        styles: {
          fontSize: 9,
          cellPadding: 3,
          overflow: 'linebreak'
        },
        columnStyles: {
          0: { cellWidth: 60 },
          1: { cellWidth: 100 },
          2: { cellWidth: 30, halign: 'right' }
        }
      });

      doc.save(`grupos_fb_${new Date().toISOString().split('T')[0]}.pdf`);
      setIsExportDropdownOpen(false);
      setToast({ message: "Exportação concluída com sucesso", type: 'success' });
    } catch (error) {
      console.error("Erro na exportação PDF:", error);
    } finally {
      setIsExporting(false);
    }
  };

  useEffect(() => {
    loadNichos();
  }, []);

  const loadNichos = async (newlyCreatedNicheName?: string) => {
    try {
      const data = await listarNichos();
      setNichos(data);
      if (typeof newlyCreatedNicheName === 'string') {
        setNichoFilter(newlyCreatedNicheName);
      }
    } catch (error) {
      console.error("Erro ao carregar nichos:", error);
    } finally {
      setLoadingNichos(false);
    }
  };

  const handleUpdateMembers = async (group: Group) => {
    if (!onUpdate || processingAction) return;

    const newCount = parseMembers(membersInputValue);
    if (newCount === group.quantidade_membros) {
      setEditingMembersId(null);
      return;
    }

    setProcessingAction({ id: group.id, field: 'membros' });
    setEditingMembersId(null);

    try {
      await onUpdate(group.id, { 
        quantidade_membros: newCount,
        updatedAt: new Date().toISOString() 
      });
    } catch (error) {
      console.error(`Erro ao atualizar membros:`, error);
      alert(`Erro ao atualizar quantidade de membros. Tente novamente.`);
    } finally {
      setProcessingAction(null);
    }
  };

  const defaultNiches = useMemo(() => [
    "Evangélico", "Fã / Música", "Fã / TV", "Musa", "Beleza / Cabelo", "Receitas", "Agro / Notícias", "Geral"
  ], []);

  const allAvailableNiches = useMemo(() => {
    const existingNichesFromGroups = Array.from(new Set(groups.map(g => g.nicho))).filter(Boolean);
    const existingNichesFromDB = nichos.map(n => n.nome);
    return Array.from(new Set([...existingNichesFromGroups, ...existingNichesFromDB])).sort();
  }, [groups, nichos]);

  const handleUpdateNiche = async (group: Group, newNicho: string) => {
    if (!onUpdate || processingAction || group.nicho === newNicho) return;

    setProcessingAction({ id: group.id, field: 'nicho' });

    try {
      await onUpdate(group.id, { 
        nicho: newNicho,
        updatedAt: new Date().toISOString() 
      });
    } catch (error) {
      console.error(`Erro ao atualizar nicho:`, error);
      alert(`Erro ao atualizar nicho. Tente novamente.`);
    } finally {
      setProcessingAction(null);
    }
  };

  const handleToggleField = async (group: Group, field: 'perfil' | 'shopee') => {
    if (!onUpdate || processingAction) return;

    const groupField = field === 'perfil' ? 'perfil_compartilhando' : 'uso_shopee';
    const currentValue = group[groupField] || 'Inativo';
    const newValue = currentValue === 'Ativo' ? 'Inativo' : 'Ativo';

    setProcessingAction({ id: group.id, field });

    try {
      await onUpdate(group.id, { [groupField]: newValue });
    } catch (error) {
      console.error(`Erro ao atualizar ${field}:`, error);
      alert(`Erro ao atualizar ${field === 'perfil' ? 'Perfil' : 'Shopee'}. Tente novamente.`);
    } finally {
      setProcessingAction(null);
    }
  };

  const handleMarkForSale = async (group: Group) => {
    if (!onUpdate) return;
    
    // Check if already for sale
    if (group.para_venda) {
      setToast({ message: "Este grupo já está na lista de venda", type: 'success' });
      return;
    }

    setProcessingAction({ id: group.id, field: 'perfil' }); // Generic field for loading

    try {
      await onUpdate(group.id, {
        para_venda: true,
        status_venda: 'Disponível',
        valor_venda: String(group.valor || ''),
        atualizado_em: new Date().toISOString()
      });
      setToast({ message: "Grupo marcado para venda!", type: 'success' });
    } catch (error) {
      console.error("Erro ao marcar para venda:", error);
      setToast({ message: "Erro ao marcar para venda", type: 'error' });
    } finally {
      setProcessingAction(null);
    }
  };

  const handleCopyResume = (group: Group) => {
    const text = `Nome: ${group.nome_grupo || (group as any).nome || 'Sem nome'}
Nicho: ${group.nicho || 'Geral'}
Membros: ${formatNumber(group.quantidade_membros || 0)}
Link: ${normalizeFacebookGroupLink(group)}`;

    navigator.clipboard.writeText(text);
    setToast({ message: "Resumo copiado com sucesso!", type: 'success' });
  };

  const handleSaveLocatario = async (locatario: Locatario) => {
    if (!onUpdate || !locatarioGroup) return;

    const currentLocatarios = locatarioGroup.locatarios || [];
    let updatedLocatarios: Locatario[];

    const existingIndex = currentLocatarios.findIndex(l => l.id === locatario.id);
    if (existingIndex >= 0) {
      updatedLocatarios = [...currentLocatarios];
      updatedLocatarios[existingIndex] = locatario;
    } else {
      updatedLocatarios = [...currentLocatarios, locatario];
    }

    try {
      await onUpdate(locatarioGroup.id, { 
        locatarios: updatedLocatarios,
        atualizado_em: new Date().toISOString()
      });
      setToast({ message: "Locatário salvo com sucesso", type: 'success' });
    } catch (error) {
      console.error("Erro ao salvar locatário:", error);
      setToast({ message: "Erro ao salvar locatário", type: 'error' });
    }
  };

  const handleDeleteLocatario = async (group: Group, locatarioId: string) => {
    if (!onUpdate) return;

    if (!confirm("Tem certeza que deseja remover este locatário?")) return;

    const updatedLocatarios = (group.locatarios || []).filter(l => l.id !== locatarioId);

    try {
      await onUpdate(group.id, { 
        locatarios: updatedLocatarios,
        atualizado_em: new Date().toISOString()
      });
      setToast({ message: "Locatário removido com sucesso", type: 'success' });
    } catch (error) {
      console.error("Erro ao remover locatário:", error);
      setToast({ message: "Erro ao remover locatário", type: 'error' });
    }
  };

  const getEffectiveStatus = (group: Group): string => {
    if (group.locatarios && group.locatarios.length > 0) {
      const hasActive = group.locatarios.some(l => l.status === 'Ativo');
      return hasActive ? 'Alugado' : 'Disponível';
    }
    return group.status || 'Disponível';
  };

  if (!Array.isArray(groups) || groups.length === 0) {
    if (!activeQuickFilter || activeQuickFilter === 'all') {
      return (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row gap-4 opacity-50">
            <div className="flex-1 h-16 bg-slate-100 rounded-3xl animate-pulse" />
            <div className="flex-1 h-16 bg-slate-100 rounded-3xl animate-pulse" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-48 bg-slate-50 rounded-[2.5rem] border border-slate-100 animate-pulse" />
            ))}
          </div>
        </div>
      );
    }
  }

  const niches = ['Todos', ...Array.from(new Set((groups || []).map(g => g?.nicho || 'Geral')))].sort();
  const statuses = ['Todos', 'Alugado', 'Disponível'];
  const renters = ['Todos', ...Array.from(new Set((groups || []).filter(g => g?.locatario).map(g => g.locatario)))].sort();
  const perfis = ['Todos', 'Ativo', 'Inativo'];
  const shopees = ['Todos', 'Ativo', 'Inativo'];

  const priorities = ['Todos', 'Alta', 'Média', 'Baixa'];

  const [renterFilter, setRenterFilter] = useState('Todos');

  // Add priority info to groups for sorting and filtering
  const groupsWithPriority = useMemo(() => {
    if (!Array.isArray(groups)) return [];
    return groups.map(g => {
      if (!g) return null;
      return {
        ...g,
        priorityInfo: getGroupPriority(g)
      };
    }).filter(g => g !== null) as GroupWithPriority[];
  }, [groups]);

  // Handle Quick Filters from Sidebar
  useEffect(() => {
    if (!activeQuickFilter || activeQuickFilter === 'all') {
      if (activeQuickFilter === 'all') {
        setNichoFilter('Todos');
        setStatusFilter('Todos');
        setPerfilFilter('Todos');
        setShopeeFilter('Todos');
        setPriorityFilter('Todos');
        setRenterFilter('Todos');
        setOnlyReadyForShopee(false);
        setSearchTerm('');
        setRenterSearch('');
      }
      return;
    }

    // Reset standard filters
    setNichoFilter('Todos');
    setStatusFilter('Todos');
    setPerfilFilter('Todos');
    setShopeeFilter('Todos');
    setPriorityFilter('Todos');
    setRenterFilter('Todos');
    setOnlyReadyForShopee(false);
    setSearchTerm('');
    setRenterSearch('');

    switch (activeQuickFilter) {
      case 'perfil_ativo': setPerfilFilter('Ativo'); break;
      case 'perfil_inativo': setPerfilFilter('Inativo'); break;
      case 'shopee_ativo': setShopeeFilter('Ativo'); break;
      case 'shopee_inativo': setShopeeFilter('Inativo'); break;
      case 'ready_shopee': setOnlyReadyForShopee(true); break;
      case 'priority_alta': setPriorityFilter('Alta'); break;
      case 'priority_media': setPriorityFilter('Média'); break;
      case 'priority_baixa': setPriorityFilter('Baixa'); break;
    }
  }, [activeQuickFilter]);

  // If user changes a filter manually, we might want to clear the "Quick Filter" highight in sidebar
  const handleFilterChange = (setter: (val: any) => void, val: any) => {
    setter(val);
    if (onQuickFilterChange && activeQuickFilter !== 'all') {
      onQuickFilterChange('all');
    }
  };

  const priorityOrder: Record<PriorityLevel, number> = {
    'Alta': 0,
    'Média': 1,
    'Baixa': 2
  };

  const filteredGroups = groupsWithPriority
    .filter(g => 
      (g.nome_grupo || '').toLowerCase().includes(searchTerm.toLowerCase()) &&
      (
        (g.locatario || '').toLowerCase().includes(renterSearch.toLowerCase()) ||
        (g.locatarios || []).some(l => l.nome.toLowerCase().includes(renterSearch.toLowerCase()))
      ) &&
      (nichoFilter === 'Todos' || (g.nicho || 'Geral') === nichoFilter) &&
      (statusFilter === 'Todos' || getEffectiveStatus(g) === statusFilter) &&
      (perfilFilter === 'Todos' || (g.perfil_compartilhando || 'Inativo') === perfilFilter) &&
      (shopeeFilter === 'Todos' || (g.uso_shopee || 'Inativo') === shopeeFilter) &&
      (priorityFilter === 'Todos' || g.priorityInfo.prioridade === priorityFilter) &&
      (renterFilter === 'Todos' || (g.locatario || '') === renterFilter || (g.locatarios || []).some(l => l.nome === renterFilter)) &&
      (!onlyReadyForShopee || ((g.perfil_compartilhando || 'Inativo') === 'Ativo' && (g.uso_shopee || 'Inativo') === 'Ativo'))
    )
    .sort((a, b) => {
      // Handle Sorting
      if (sortField === 'nome_grupo') {
        const valA = (a.nome_grupo || '').toLowerCase();
        const valB = (b.nome_grupo || '').toLowerCase();
        return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      
      if (sortField === 'quantidade_membros') {
        const valA = a.quantidade_membros || 0;
        const valB = b.quantidade_membros || 0;
        return sortOrder === 'asc' ? valA - valB : valB - valA;
      }
      
      if (sortField === 'data_vencimento') {
        const valA = a.data_vencimento || '9999-99-99';
        const valB = b.data_vencimento || '9999-99-99';
        return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }

      if (sortField === 'prioridade') {
        const valA = priorityOrder[a.priorityInfo?.prioridade || 'Baixa'];
        const valB = priorityOrder[b.priorityInfo?.prioridade || 'Baixa'];
        return sortOrder === 'asc' ? valA - valB : valB - valA;
      }

      if (sortField === 'score') {
        const valA = a.priorityInfo?.score || 0;
        const valB = b.priorityInfo?.score || 0;
        return sortOrder === 'asc' ? valB - valA : valA - valB;
      }

      // Default grouping sort: Nicho
      const nichoA = (a.nicho || 'Geral').toLowerCase();
      const nichoB = (b.nicho || 'Geral').toLowerCase();
      if (nichoA < nichoB) return -1;
      if (nichoA > nichoB) return 1;

      // Secondary sort: Members Descending (maior para o menor)
      const memA = a.quantidade_membros || 0;
      const memB = b.quantidade_membros || 0;
      if (memB !== memA) return memB - memA;

      // Tertiary sort: Nome do Grupo
      const nameA = (a.nome_grupo || '').toLowerCase();
      const nameB = (b.nome_grupo || '').toLowerCase();
      return nameA.localeCompare(nameB);
    });

  // Grouping for visual separation
  const groupedGroups: { [nicho: string]: GroupWithPriority[] } = filteredGroups.reduce((acc, group) => {
    const nicho = group.nicho || 'Sem Nicho';
    if (!acc[nicho]) acc[nicho] = [];
    acc[nicho].push(group);
    return acc;
  }, {} as { [nicho: string]: GroupWithPriority[] });

  // Get sorted niche names for display
  const sortedNiches = Object.keys(groupedGroups).sort((a, b) => a.localeCompare(b));

  const toggleSort = (field: SortField) => {
    // Note: Manual sort is now secondary to the requested automatic grouping
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  return (
    <div className="space-y-8">
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 50, x: '-50%' }}
            className={cn(
              "fixed bottom-24 left-1/2 z-[100] px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 backdrop-blur-md",
              toast.type === 'success' ? "bg-emerald-500/90 text-white" : "bg-rose-500/90 text-white"
            )}
          >
            {toast.type === 'success' ? (
              <Trophy className="w-4 h-4" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
            <span className="text-xs font-black uppercase tracking-widest">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Controls */}
      <div className="flex flex-col gap-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary w-4 h-4 md:w-5 md:h-5 transition-colors" />
            <input 
              type="text" 
              placeholder="Pesquisar por nome do grupo..."
              className="w-full bg-white border border-slate-100 pl-12 md:pl-14 pr-6 py-3.5 md:py-5 rounded-2xl md:rounded-[2.5rem] shadow-sm focus:ring-4 focus:ring-green-50 focus:border-green-200 outline-none font-bold text-xs md:text-sm text-slate-600 placeholder:text-slate-300 transition-all"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex-1 relative group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 w-4 h-4 md:w-5 md:h-5 transition-colors" />
            <input 
              type="text" 
              placeholder="Pesquisar por locatário..."
              className="w-full bg-white border border-slate-100 pl-12 md:pl-14 pr-6 py-3.5 md:py-5 rounded-2xl md:rounded-[2.5rem] shadow-sm focus:ring-4 focus:ring-blue-50 focus:border-blue-200 outline-none font-bold text-xs md:text-sm text-slate-600 placeholder:text-slate-300 transition-all"
              value={renterSearch}
              onChange={e => setRenterSearch(e.target.value)}
            />
          </div>
        </div>

          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 pb-4 md:pb-6">
            <div className="grid grid-cols-2 md:grid-cols-3 xl:flex xl:flex-wrap gap-2 md:gap-3 w-full">
              <FilterBadge 
                label="Nicho" 
                value={nichoFilter} 
                options={['Todos', ...allAvailableNiches, "+ CRIAR NOVO NICHO"]} 
                onChange={v => {
                  if (v === "+ CRIAR NOVO NICHO") {
                    setNichoModalInitialAdd(true);
                    setIsNichoModalOpen(true);
                  } else {
                    handleFilterChange(setNichoFilter, v);
                  }
                }}
                isCapitalize
              />
              <FilterBadge 
                label="Status" 
                value={statusFilter} 
                options={statuses} 
                onChange={v => handleFilterChange(setStatusFilter, v)} 
              />
            <FilterBadge 
              label="Perfil" 
              value={perfilFilter} 
              options={perfis} 
              onChange={v => handleFilterChange(setPerfilFilter, v)} 
            />
            <FilterBadge 
              label="Shopee" 
              value={shopeeFilter} 
              options={shopees} 
              onChange={v => handleFilterChange(setShopeeFilter, v)} 
            />
              <FilterBadge 
                label="Prioridade" 
                value={priorityFilter} 
                options={priorities} 
                onChange={v => handleFilterChange(setPriorityFilter, v)} 
              />
            
            <button 
              onClick={() => setIsReviewModalOpen(true)}
              className="h-11 md:h-14 flex items-center justify-center gap-2 px-6 bg-slate-50 text-slate-600 rounded-xl md:rounded-2xl border border-slate-100 hover:border-blue-200 text-[9px] md:text-[10px] font-black uppercase tracking-widest hover:bg-white active:scale-95 transition-all w-full md:w-auto xl:flex-1 group"
            >
              <ClipboardList className="w-4 h-4 text-blue-500 group-hover:scale-110 transition-transform shrink-0" />
              <span className="truncate">Revisar</span>
            </button>

            <button 
              onClick={() => setIsPostTodayModalOpen(true)}
              className="h-11 md:h-14 flex items-center justify-center gap-2 px-6 bg-slate-900 text-white rounded-xl md:rounded-2xl shadow-lg shadow-slate-200 text-[9px] md:text-[10px] font-black uppercase tracking-widest hover:bg-primary active:scale-95 transition-all w-full md:w-auto xl:flex-1 group"
            >
              <Trophy className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform shrink-0" />
              <span className="truncate">Postar Hoje</span>
            </button>

            <button 
              onClick={() => setIsGenerateCopyModalOpen(true)}
              className="h-11 md:h-14 flex items-center justify-center gap-2 px-6 bg-white border border-slate-100 rounded-xl md:rounded-2xl shadow-sm text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-600 hover:border-indigo-200 active:scale-95 transition-all w-full md:w-auto xl:flex-1 group"
            >
              <Wand2 className="w-4 h-4 text-indigo-500 group-hover:scale-110 transition-transform shrink-0" />
              <span className="truncate">Copys</span>
            </button>

            <div className="relative xl:flex-1">
              <button 
                onClick={() => setIsExportDropdownOpen(!isExportDropdownOpen)}
                disabled={isExporting}
                className="h-11 md:h-14 flex items-center justify-center gap-2 px-6 bg-white border border-slate-100 rounded-xl md:rounded-2xl shadow-sm text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 hover:border-green-200 active:scale-95 transition-all w-full md:w-auto xl:w-full group"
              >
                {isExporting ? (
                  <Loader2 className="w-4 h-4 text-primary animate-spin shrink-0" />
                ) : (
                  <Download className="w-4 h-4 text-primary group-hover:scale-110 transition-transform shrink-0" />
                )}
                <span className="truncate">{isExporting ? 'Exportando...' : 'Exportar'}</span>
                <ChevronDown className={cn("w-3 h-3 transition-transform", isExportDropdownOpen && "rotate-180")} />
              </button>

              <AnimatePresence>
                {isExportDropdownOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setIsExportDropdownOpen(false)} 
                    />
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-2 w-56 bg-white rounded-2xl border border-slate-100 shadow-xl shadow-slate-200/50 p-2 z-50 overflow-hidden"
                    >
                      <button
                        onClick={() => handleExportExcel()}
                        className="w-full text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 hover:text-emerald-600 rounded-xl transition-all flex items-center gap-3"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Exportar Excel
                      </button>
                      <button
                        onClick={() => handleExportCSV('csv')}
                        className="w-full text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 hover:text-primary rounded-xl transition-all flex items-center gap-3"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Exportar CSV
                      </button>
                      <button
                        onClick={() => handleExportPDF()}
                        className="w-full text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 hover:text-rose-600 rounded-xl transition-all flex items-center gap-3"
                      >
                        <ClipboardList className="w-3.5 h-3.5" />
                        Exportar PDF
                      </button>
                      <button
                        onClick={() => handleExportWord()}
                        className="w-full text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 hover:text-indigo-600 rounded-xl transition-all flex items-center gap-3"
                      >
                        <Wand2 className="w-3.5 h-3.5" />
                        Exportar Word
                      </button>
                      <button
                        onClick={() => handleExportCSV('sheets')}
                        className="w-full text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 hover:text-blue-600 rounded-xl transition-all flex items-center gap-3"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        Exportar Google Docs
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Table Content */}
      <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden hidden lg:block">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] cursor-pointer hover:text-slate-900 transition-colors" onClick={() => toggleSort('nome_grupo')}>
                  <div className="flex items-center gap-2">Grupo <ArrowUpDown className="w-3 h-3 opacity-30" /></div>
                </th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] cursor-pointer hover:text-slate-900 transition-colors" onClick={() => toggleSort('quantidade_membros')}>
                  <div className="flex items-center gap-2 text-center justify-center w-full">Membros <ArrowUpDown className="w-3 h-3 opacity-30" /></div>
                </th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] cursor-pointer hover:text-slate-900 transition-colors" onClick={() => toggleSort('prioridade')}>
                  <div className="flex items-center gap-2 text-center justify-center w-full">Prioridade <ArrowUpDown className="w-3 h-3 opacity-30" /></div>
                </th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Configuração</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Locatário / Info</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] cursor-pointer hover:text-slate-900 transition-colors text-right" onClick={() => toggleSort('data_vencimento')}>
                  <div className="flex items-center gap-2 justify-end">Vencimento <ArrowUpDown className="w-3 h-3 opacity-30" /></div>
                </th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 font-medium">
              {sortedNiches.map(nicho => (
                <React.Fragment key={nicho}>
                  <tr className="bg-slate-50/50">
                    <td colSpan={7} className="px-8 py-3">
                      <div className="flex items-center gap-3">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 capitalize">
                          Nicho: {nicho}
                        </span>
                        <span className="text-[9px] font-bold text-slate-300 ml-auto uppercase tracking-widest">
                          {groupedGroups[nicho].length} Grupos
                        </span>
                      </div>
                    </td>
                  </tr>
                  {groupedGroups[nicho].map(group => (
                    <motion.tr 
                      layout
                      key={group.id} 
                      className={cn(
                        "hover:bg-slate-50/50 transition-colors group relative",
                        group.perfil_compartilhando === 'Inativo' && "bg-rose-50/10"
                      )}
                    >
                      <td className="px-8 py-8 relative">
                        {group.perfil_compartilhando === 'Inativo' && (
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-rose-500" />
                        )}
                        <div className="flex items-center gap-4">
                          {/* Thumbnail */}
                          <GroupThumbnail group={group} size="desktop" />

                          <div className="flex flex-col min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-black text-slate-900 group-hover:text-primary transition-colors text-base truncate" title={group.nome_grupo}>
                                {group.nome_grupo}
                              </span>
                              {group.para_venda && (
                                <span className="bg-amber-50 text-amber-600 text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border border-amber-100">À Venda</span>
                              )}
                            </div>
                            <div className="flex items-center gap-4 mt-2">
                                {group.link_grupo && (
                                <a 
                                  href={normalizeFacebookGroupLink(group)} 
                                  target="_blank" 
                                  rel="noreferrer"
                                  className="text-[10px] text-blue-500 hover:text-blue-700 flex items-center gap-1.5 font-black uppercase tracking-widest transition-colors"
                                >
                                  LINK <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                              <div className="flex items-center gap-1.5">
                                 <div className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                                 <div className="relative flex items-center gap-1 group/nicho-select">
                                    <span className="bg-slate-50 text-slate-500 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border border-slate-100">
                                      {group.nicho || 'Geral'}
                                    </span>
                                 </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-8 text-center">
                        {editingMembersId === group.id ? (
                          <div className="flex flex-col items-center">
                            <div className="flex items-center gap-2">
                              <input
                                autoFocus
                                type="text"
                                value={membersInputValue}
                                onChange={(e) => setMembersInputValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleUpdateMembers(group);
                                  if (e.key === 'Escape') setEditingMembersId(null);
                                }}
                                className="w-24 px-2 py-1 bg-white border-2 border-primary rounded-lg text-center text-sm font-black text-slate-900 focus:outline-none shadow-lg shadow-green-100/50"
                              />
                            </div>
                            <div className="flex gap-2 mt-2">
                              <button 
                                onClick={() => handleUpdateMembers(group)}
                                className="px-3 py-1 bg-primary text-white rounded-md text-[8px] font-black uppercase tracking-widest hover:bg-primary active:scale-90 transition-all"
                              >
                                Salvar
                              </button>
                              <button 
                                onClick={() => setEditingMembersId(null)}
                                className="px-3 py-1 bg-slate-100 text-slate-400 rounded-md text-[8px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
                              >
                                Sair
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div 
                            onClick={() => {
                              setEditingMembersId(group.id);
                              setMembersInputValue(formatNumber(group.quantidade_membros || 0));
                            }}
                            className="flex flex-col items-center cursor-pointer group/membros-edit"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-xl font-black text-slate-900 font-mono tracking-tighter group-hover/membros-edit:text-primary transition-colors">
                                {formatNumber(group.quantidade_membros)}
                              </span>
                              {processingAction?.id === group.id && processingAction?.field === 'membros' && (
                                <Loader2 className="w-3 h-3 text-primary animate-spin" />
                              )}
                            </div>
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Membros</span>
                          </div>
                        )}
                      </td>
                      <td className="px-8 py-8 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <span className={cn(
                            "text-[9px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-full border shadow-sm transition-all",
                            group.priorityInfo.prioridade === 'Alta' ? "bg-rose-50 text-rose-600 border-rose-100 shadow-rose-50" :
                            group.priorityInfo.prioridade === 'Média' ? "bg-amber-50 text-amber-600 border-amber-100 shadow-amber-50" :
                            "bg-slate-50 text-slate-400 border-slate-100 shadow-slate-50"
                          )}>
                            {group.priorityInfo.prioridade}
                          </span>
                          <span className={cn(
                            "text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border",
                            group.quantidade_membros! >= 30000 && group.priorityInfo.score < 3 
                              ? "bg-rose-100 text-rose-700 border-rose-200"
                              : group.priorityInfo.score >= 8 
                                ? "bg-green-100 text-accent border-green-200"
                                : group.priorityInfo.score >= 4
                                  ? "bg-blue-100 text-blue-700 border-blue-200"
                                  : "bg-slate-100 text-slate-500 border-slate-200"
                          )}>
                            {group.quantidade_membros! >= 30000 && group.priorityInfo.score < 3 
                              ? "Baixo Engajamento"
                              : group.priorityInfo.score >= 8 
                                ? "Alto Desempenho"
                                : group.priorityInfo.score >= 4
                                  ? "Médio Desempenho"
                                  : "Baixo Desempenho"}
                          </span>
                          <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest font-mono">
                            {group.priorityInfo.score} pts
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-8">
                        <div className="flex flex-col gap-2.5 items-center justify-center">
                           <button 
                            onClick={() => handleToggleField(group, 'perfil')}
                            disabled={!!processingAction}
                            title={group.perfil_compartilhando === 'Ativo' ? "Perfil Ativo - Clique para Desativar" : "Perfil Inativo - Clique para Ativar"}
                            className="group/btn flex items-center gap-2 bg-slate-50 hover:bg-white px-3 py-1.5 rounded-xl border border-slate-100 hover:border-green-200 transition-all w-full max-w-[120px] justify-between shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                           >
                              <span className="text-[9px] font-black text-slate-400 group-hover/btn:text-primary uppercase tracking-widest">Post</span>
                              {processingAction?.id === group.id && processingAction?.field === 'perfil' ? (
                                <Loader2 className="w-2 h-2 text-primary animate-spin" />
                              ) : (
                                <div className={cn("w-2 h-2 rounded-full transition-all", 
                                  group.perfil_compartilhando === 'Ativo' 
                                    ? "bg-primary shadow-[0_0_8px_rgba(16,185,129,0.5)]" 
                                    : "bg-rose-400"
                                )} />
                              )}
                           </button>
                           <button 
                            onClick={() => handleToggleField(group, 'shopee')}
                            disabled={!!processingAction}
                            title={group.uso_shopee === 'Ativo' ? "Shopee Ativo - Clique para Desativar" : "Shopee Inativo - Clique para Ativar"}
                            className="group/btn flex items-center gap-2 bg-slate-50 hover:bg-white px-3 py-1.5 rounded-xl border border-slate-100 hover:border-blue-200 transition-all w-full max-w-[120px] justify-between shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                           >
                              <span className="text-[9px] font-black text-slate-400 group-hover/btn:text-blue-600 uppercase tracking-widest">Shop</span>
                              {processingAction?.id === group.id && processingAction?.field === 'shopee' ? (
                                <Loader2 className="w-2 h-2 text-blue-500 animate-spin" />
                              ) : (
                                <div className={cn("w-2 h-2 rounded-full transition-all", 
                                  group.uso_shopee === 'Ativo' 
                                    ? "bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" 
                                    : "bg-slate-200"
                                )} />
                              )}
                           </button>
                        </div>
                      </td>
                      <td className="px-8 py-8">
                        <div className="flex flex-col gap-3">
                          {/* Old Locatario */}
                          {group.locatario && (
                            <div className="flex flex-col border-b border-slate-50 pb-2 mb-1 last:border-0 last:pb-0 last:mb-0">
                              <span className="text-sm font-black text-slate-900 group-hover:text-blue-600 transition-colors uppercase tracking-tight">{group.locatario}</span>
                              <div className="flex items-center gap-2 mt-1">
                                 <span className="text-[10px] text-slate-400 font-bold font-mono">{group.whatsapp}</span>
                                 <div className="w-1 h-1 rounded-full bg-slate-200" />
                                 <span className="text-[10px] font-black text-primary font-mono">{formatCurrency(group.valor)}</span>
                              </div>
                            </div>
                          )}

                          {/* New Locatarios Array */}
                          {group.locatarios?.map((l) => (
                            <div key={l.id} className="flex flex-col border-b border-slate-50 pb-2 mb-1 last:border-0 last:pb-0 last:mb-0 group/locatario">
                              <div className="flex items-center justify-between">
                                <span className={cn(
                                  "text-sm font-black transition-colors uppercase tracking-tight",
                                  l.status === 'Ativo' ? "text-slate-900 group-hover/locatario:text-blue-600" : "text-slate-400"
                                )}>
                                  {l.nome}
                                </span>
                                <div className="flex items-center gap-2 opacity-0 group-hover/locatario:opacity-100 transition-opacity">
                                  <button 
                                    onClick={() => {
                                      setLocatarioGroup(group);
                                      setEditingLocatario(l);
                                      setIsLocatarioModalOpen(true);
                                    }}
                                    className="p-1 text-slate-400 hover:text-blue-500 transition-colors"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </button>
                                  <button 
                                    onClick={() => handleDeleteLocatario(group, l.id)}
                                    className="p-1 text-slate-400 hover:text-rose-500 transition-colors"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                 <span className="text-[10px] text-slate-400 font-bold font-mono">{l.whatsapp}</span>
                                 <div className="w-1 h-1 rounded-full bg-slate-200" />
                                 <span className="text-[10px] font-black text-primary font-mono">{formatCurrency(Number(l.valor))}</span>
                                 <div className="w-1 h-1 rounded-full bg-slate-200" />
                                 <span className={cn(
                                   "text-[8px] font-black uppercase px-1.5 py-0.5 rounded border",
                                   l.status === 'Ativo' ? "bg-green-50 text-accent border-green-100" : "bg-slate-50 text-slate-400 border-slate-100"
                                 )}>{l.status}</span>
                              </div>
                            </div>
                          ))}

                          {(!group.locatario && (!group.locatarios || group.locatarios.length === 0)) && (
                            <div className="flex items-center gap-2">
                               <div className="w-2 h-2 rounded-full bg-green-100 animate-pulse" />
                               <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em] italic">Disponível</span>
                            </div>
                          )}

                          <button 
                            onClick={() => {
                              setLocatarioGroup(group);
                              setEditingLocatario(null);
                              setIsLocatarioModalOpen(true);
                            }}
                            className="flex items-center gap-2 text-[9px] font-black text-blue-500 uppercase tracking-[0.2em] hover:text-blue-700 transition-colors mt-2"
                          >
                            <UserPlus className="w-3 h-3" />
                            + Locatário
                          </button>
                        </div>
                      </td>
                      <td className="px-8 py-8 text-right">
                        <ExpiryBadge dareStr={group.data_vencimento} status={group.status} />
                      </td>
                      <td className="px-8 py-8 text-right">
                        <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                           <MoreActionsDropdown 
                            group={group} 
                            onEdit={() => onEdit(group)} 
                            onDelete={() => setConfirmDeleteId(group.id)}
                            onMarkForSale={() => handleMarkForSale(group)}
                            onCopyResume={() => handleCopyResume(group)}
                            onAddLocatario={() => {
                              setLocatarioGroup(group);
                              setEditingLocatario(null);
                              setIsLocatarioModalOpen(true);
                            }}
                          />
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card Layout */}
      <div className="lg:hidden space-y-6 pb-20 p-1 md:p-0">
        {sortedNiches.map(nicho => (
          <div key={nicho} className="space-y-3">
            <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 flex items-center gap-2 ml-4 mb-2">
               <span className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
               Nicho: {nicho || 'Geral'}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(groupedGroups[nicho] || []).map(group => (
                <div key={group.id} className={cn(
                  "bg-white p-5 rounded-[2.5rem] border transition-all relative overflow-hidden active:scale-[0.98] group",
                  (group.perfil_compartilhando || 'Inativo') === 'Inativo' ? "border-rose-100 bg-rose-50/5" : "border-slate-100 shadow-xl shadow-slate-100/40"
                )}>
                   <div className="flex flex-col gap-4">
                     <div className="flex items-start gap-4">
                        {/* Thumbnail Mobile */}
                        <GroupThumbnail group={group} size="mobile" />

                        <div className="flex-1 min-w-0">
                           <div className="flex flex-wrap items-center gap-2 mb-1.5">
                             <span className={cn(
                               "text-[7px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded-full",
                               group.priorityInfo?.prioridade === 'Alta' ? "bg-rose-600 text-white" :
                               group.priorityInfo?.prioridade === 'Média' ? "bg-amber-500 text-white" :
                               "bg-slate-100 text-slate-400"
                             )}>
                               {group.priorityInfo?.prioridade || 'Baixa'}
                             </span>
                             {group.para_venda && (
                               <span className="bg-amber-50 text-amber-600 text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border border-amber-100">À VENDA</span>
                             )}
                           </div>
                           <h4 className="text-sm font-black text-slate-900 leading-tight mb-0.5 truncate" title={group.nome_grupo || ''}>{group.nome_grupo || 'Sem Nome'}</h4>
                           <div className="flex items-center gap-2">
                             <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest bg-slate-50 px-1.5 py-0.5 rounded border border-slate-50 uppercase">{group.nicho || 'Geral'}</span>
                             <div className="w-1 h-1 rounded-full bg-slate-200" />
                             <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                               {formatNumber(group.quantidade_membros || 0)} MEMBROS
                             </span>
                           </div>
                        </div>
                        
                        <div className="relative">
                          <MoreActionsDropdown 
                            group={group} 
                            onEdit={() => onEdit(group)} 
                            onDelete={() => setConfirmDeleteId(group.id)}
                            onMarkForSale={() => handleMarkForSale(group)}
                            onCopyResume={() => handleCopyResume(group)}
                            onAddLocatario={() => {
                              setLocatarioGroup(group);
                              setEditingLocatario(null);
                              setIsLocatarioModalOpen(true);
                            }}
                          />
                        </div>
                     </div>

                     <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest px-1">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-300 italic">Vencimento:</span>
                          <ExpiryBadge dareStr={group.data_vencimento} status={group.status} compact />
                        </div>
                        {group.link_grupo && (
                          <a 
                            href={normalizeFacebookGroupLink(group)} 
                            target="_blank" 
                            rel="noreferrer"
                            className="bg-blue-50 text-blue-600 px-3 py-1.5 rounded-full border border-blue-100 flex items-center gap-1.5"
                          >
                            LINK <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}
                     </div>

                     <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-50">
                       <button 
                         onClick={() => handleToggleField(group, 'perfil')}
                         className={cn(
                           "flex items-center justify-between px-4 py-3 rounded-2xl border transition-all",
                           group.perfil_compartilhando === 'Ativo' 
                             ? "bg-green-50 border-green-100 text-accent font-bold" 
                             : "bg-slate-50 border-slate-100 text-slate-400"
                         )}
                       >
                         <span className="text-[9px] font-black uppercase tracking-widest text-center">Perfil</span>
                         <div className={cn("w-2.5 h-2.5 rounded-full",
                           group.perfil_compartilhando === 'Ativo' ? "bg-primary shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-slate-300"
                         )} />
                       </button>
                       <button 
                         onClick={() => handleToggleField(group, 'shopee')}
                         className={cn(
                           "flex items-center justify-between px-4 py-3 rounded-2xl border transition-all",
                           group.uso_shopee === 'Ativo' 
                             ? "bg-blue-50 border-blue-100 text-blue-700 font-bold" 
                             : "bg-slate-50 border-slate-100 text-slate-400"
                         )}
                       >
                         <span className="text-[9px] font-black uppercase tracking-widest text-center">Shopee</span>
                         <div className={cn("w-2.5 h-2.5 rounded-full",
                           group.uso_shopee === 'Ativo' ? "bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" : "bg-slate-300"
                         )} />
                       </button>
                     </div>

                    <div className="border-t border-slate-50 pt-3 flex flex-col gap-3">
                       {/* Mobile Locatarios */}
                       {group.locatario && (
                         <div className="bg-slate-50/50 p-4 rounded-2xl flex items-center justify-between border border-slate-100">
                           <div className="flex flex-col">
                             <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Locatário (Antigo)</span>
                             <span className="text-xs font-black text-slate-900 truncate max-w-[120px]">{group.locatario}</span>
                           </div>
                           <div className="flex flex-col text-right">
                             <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Valor</span>
                             <span className="text-xs font-black text-primary font-mono">{formatCurrency(group.valor)}</span>
                           </div>
                         </div>
                       )}

                       {group.locatarios?.map((l) => (
                         <div key={l.id} className="bg-slate-50/50 p-4 rounded-2xl flex flex-col gap-3 border border-slate-100 group/mob-loc">
                           <div className="flex items-center justify-between">
                             <div className="flex flex-col">
                               <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Locatário</span>
                               <span className={cn(
                                 "text-xs font-black truncate max-w-[120px]",
                                 l.status === 'Ativo' ? "text-slate-900" : "text-slate-400"
                               )}>{l.nome}</span>
                             </div>
                             <div className="flex items-center gap-2">
                               <button 
                                 onClick={() => {
                                   setLocatarioGroup(group);
                                   setEditingLocatario(l);
                                   setIsLocatarioModalOpen(true);
                                 }}
                                 className="p-2 bg-white border border-slate-100 rounded-lg text-slate-400"
                               >
                                 <Edit2 className="w-3 h-3" />
                               </button>
                               <button 
                                 onClick={() => handleDeleteLocatario(group, l.id)}
                                 className="p-2 bg-white border border-slate-100 rounded-lg text-rose-400"
                               >
                                 <Trash2 className="w-3 h-3" />
                               </button>
                             </div>
                           </div>
                           <div className="flex items-center justify-between">
                             <div className="flex flex-col">
                               <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">WhatsApp</span>
                               <span className="text-[10px] font-bold text-slate-500">{l.whatsapp}</span>
                             </div>
                             <div className="flex flex-col text-right">
                               <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Valor</span>
                               <span className="text-xs font-black text-primary font-mono">{formatCurrency(Number(l.valor))}</span>
                             </div>
                           </div>
                           <div className="flex items-center justify-between pt-2 border-t border-slate-100/50">
                             <div className="flex flex-col">
                               <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Vencimento</span>
                               <span className="text-[10px] font-bold text-slate-500">{l.data_vencimento ? format(parseISO(l.data_vencimento), 'dd/MM/yyyy') : '-'}</span>
                             </div>
                             <span className={cn(
                               "text-[8px] font-black uppercase px-2 py-0.5 rounded border",
                               l.status === 'Ativo' ? "bg-green-100 text-accent border-green-200" : "bg-slate-100 text-slate-400 border-slate-200"
                             )}>{l.status}</span>
                           </div>
                         </div>
                       ))}

                       <button 
                         onClick={() => {
                           setLocatarioGroup(group);
                           setEditingLocatario(null);
                           setIsLocatarioModalOpen(true);
                         }}
                         className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl border-2 border-dashed border-slate-100 text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] hover:bg-slate-50 hover:border-blue-100 transition-all"
                       >
                         <UserPlus className="w-3.5 h-3.5" />
                         Adicionar Locatário
                       </button>
                     </div>

                     {group.link_grupo && (
                        <a 
                          href={ensureAbsoluteUrl(group.link_grupo)} 
                          target="_blank" 
                          rel="noreferrer"
                          className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white font-black uppercase tracking-widest text-[10px] py-4 rounded-2xl hover:bg-primary transition-all shadow-xl shadow-slate-100"
                        >
                          Acessar Grupo <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                     )}
                   </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {filteredGroups.length === 0 && (
        <div className="bg-white p-12 rounded-[2rem] border border-dashed border-gray-200 text-center mx-4 my-8">
          <p className="text-gray-400 font-medium italic">Nenhum grupo encontrado com os filtros atuais.</p>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-[2rem] p-8 shadow-2xl text-center">
            <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Trash2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Excluir Grupo?</h3>
            <p className="text-gray-500 text-sm mb-8">Esta ação não pode ser desfeita. Tem certeza que deseja remover este grupo?</p>
            <div className="flex gap-3">
              <button 
                onClick={() => setConfirmDeleteId(null)}
                className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold rounded-xl transition-all"
              >
                Cancelar
              </button>
              <button 
                onClick={() => {
                  onDelete(confirmDeleteId);
                  setConfirmDeleteId(null);
                }}
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-red-100"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {onUpdate && (
        <>
          <MemberReviewModal
            isOpen={isReviewModalOpen}
            onClose={() => setIsReviewModalOpen(false)}
            groups={groups}
            onUpdate={onUpdate}
          />
          <PostTodayModal
            isOpen={isPostTodayModalOpen}
            onClose={() => setIsPostTodayModalOpen(false)}
            groups={groups}
            onUpdate={onUpdate}
          />
          <GenerateCopyModal
            isOpen={isGenerateCopyModalOpen}
            onClose={() => setIsGenerateCopyModalOpen(false)}
          />
          <NichoModal
            isOpen={isNichoModalOpen}
            onClose={() => {
              setIsNichoModalOpen(false);
              setNichoModalInitialAdd(false);
            }}
            nichos={nichos}
            onUpdate={loadNichos}
            initialAddMode={nichoModalInitialAdd}
          />
          <LocatarioModal
            isOpen={isLocatarioModalOpen}
            onClose={() => {
              setIsLocatarioModalOpen(false);
              setLocatarioGroup(null);
              setEditingLocatario(null);
            }}
            group={locatarioGroup}
            groups={groups}
            onSave={handleSaveLocatario}
            editingLocatario={editingLocatario}
          />
        </>
      )}
    </div>
  );
}

function MoreActionsDropdown({ group, onEdit, onDelete, onMarkForSale, onCopyResume, onAddLocatario }: any) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button 
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="p-3 bg-white border border-slate-100 rounded-2xl hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition-all shadow-sm"
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="absolute right-0 mt-2 w-56 bg-white rounded-2xl border border-slate-100 shadow-2xl z-50 overflow-hidden p-2"
            >
              <button 
                onClick={() => { onEdit(); setIsOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 hover:text-primary rounded-xl transition-all"
              >
                <Edit2 className="w-3.5 h-3.5" />
                Editar Grupo
              </button>
              <button 
                onClick={() => { onAddLocatario(); setIsOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 hover:text-blue-500 rounded-xl transition-all"
              >
                <UserPlus className="w-3.5 h-3.5" />
                + Locatário
              </button>
              <button 
                onClick={() => { onMarkForSale(); setIsOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 hover:text-amber-600 rounded-xl transition-all"
              >
                <Tag className="w-3.5 h-3.5" />
                Vender Grupo
              </button>
              <button 
                onClick={() => { onCopyResume(); setIsOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 hover:text-indigo-600 rounded-xl transition-all"
              >
                <Copy className="w-3.5 h-3.5" />
                Copiar Resumo
              </button>
              <div className="h-px bg-slate-50 my-1" />
              <button 
                onClick={() => { onDelete(); setIsOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Excluir Grupo
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function FilterBadge({ label, value, options, onChange, isCapitalize }: any) {
  const selectRef = React.useRef<HTMLSelectElement>(null);

  const handleClick = () => {
    if (selectRef.current) {
      selectRef.current.focus();
    }
  };

  return (
    <div 
      onClick={handleClick}
      className={cn(
        "flex items-center gap-2 md:gap-3 bg-white px-4 md:px-5 h-12 lg:h-14 rounded-xl md:rounded-2xl border transition-all group w-full lg:w-auto xl:flex-1 min-w-[140px] cursor-pointer outline-none relative",
        value !== 'Todos' ? "border-green-200 bg-green-50/10 shadow-sm shadow-green-50" : "border-slate-100 shadow-sm hover:border-green-200"
      )}
    >
      <Filter className={cn(
        "w-3 md:w-3.5 h-3 md:h-3.5 shrink-0 transition-colors",
        value !== 'Todos' ? "text-primary" : "text-slate-300 group-hover:text-primary"
      )} />
      <div className="flex items-center gap-1.5 md:gap-2 flex-1 min-w-0 pointer-events-none">
        <span className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none shrink-0">{label}:</span>
        <select 
          ref={selectRef}
          value={value}
          onChange={e => {
            e.stopPropagation();
            onChange(e.target.value);
          }}
          onClick={e => e.stopPropagation()}
          className={cn(
            "bg-transparent border-0 focus:ring-0 p-0 text-[10px] font-black uppercase tracking-widest text-primary cursor-pointer w-full truncate pointer-events-auto pr-6",
            isCapitalize && "capitalize"
          )}
        >
          {options.map((opt: string) => (
            <option key={opt} value={opt} className={cn("bg-white text-slate-900", isCapitalize && "capitalize")}>{opt}</option>
          ))}
        </select>
      </div>
      <ChevronDown className="w-3 h-3 text-slate-300 absolute right-4 pointer-events-none group-hover:text-emerald-400 transition-colors" />
    </div>
  );
}

function ExpiryBadge({ dareStr, status, compact = false }: { dareStr: string, status: string, compact?: boolean }) {
  if (status !== 'Alugado' || !dareStr) return <span className="text-[10px] text-slate-300 font-bold uppercase tracking-widest">-</span>;
  
  const date = parseISO(dareStr);
  const isVenceHoje = isToday(date);
  const isVenceAmanha = isTomorrow(date);
  const isVencido = isPast(date) && !isVenceHoje;

  const colorClass = isVencido ? "text-rose-600" : isVenceHoje ? "text-rose-600" : isVenceAmanha ? "text-amber-600" : "text-slate-600";
  const bgClass = isVencido ? "bg-rose-50 border-rose-100 shadow-rose-50" : isVenceHoje ? "bg-rose-50 border-rose-100 shadow-rose-50" : isVenceAmanha ? "bg-amber-50 border-amber-100 shadow-amber-50" : "bg-slate-50 border-slate-100";

  return (
    <div className={cn(
      "flex flex-col",
      compact ? "items-end" : "items-end"
    )}>
      <span className={cn(
        "text-[10px] font-black font-mono tracking-tighter",
        colorClass
      )}>
        {format(date, 'dd/MM/yyyy')}
      </span>
      {(isVenceHoje || isVenceAmanha || isVencido) && (
        <span className={cn(
          "text-[8px] font-black uppercase px-2 py-0.5 rounded-md mt-1 shadow-sm border",
          bgClass,
          colorClass
        )}>
          {isVencido ? 'Vencido' : isVenceHoje ? 'Vence Hoje' : 'Vence Amanhã'}
        </span>
      )}
    </div>
  );
}
