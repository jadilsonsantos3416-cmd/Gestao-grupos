import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Group, QuickFilter } from '@/src/types';
import { Search, ExternalLink, Edit2, Trash2, Filter, ArrowUpDown, Download, Loader2, ChevronDown, ClipboardList, Sparkles, Wand2, Trophy, UserPlus, UserMinus, PhoneCall, MoreVertical, Copy, Tag, Camera, CheckCircle2, X, Users, Plus, XCircle, RotateCcw, CalendarClock, AlertCircle } from 'lucide-react';
import { cn, formatNumber, formatCurrency, ensureAbsoluteUrl, parseMembers, calcularValorSugeridoAluguel, normalizeSearchText, extractFacebookGroupId, normalizeNicho } from '@/src/lib/utils';
import { getGroupPriority, PriorityLevel, PriorityInfo } from '@/src/lib/priorityUtils';
import { parseISO, format, isToday, isTomorrow, isPast, addDays, isBefore, isAfter, startOfDay } from 'date-fns';
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
import { listarNichos, adicionarNicho } from '@/src/lib/nichosService';
import { Nicho, Locatario } from '@/src/types';
import { CLOUDINARY_BASE_URL } from '@/src/constants';

interface GroupListProps {
  groups: Group[];
  onEdit: (group: Group) => void;
  onDelete: (id: string) => void;
  onUpdate?: (id: string, updates: Partial<Group>) => Promise<void>;
  activeQuickFilter?: QuickFilter;
  onQuickFilterChange?: (filter: QuickFilter) => void;
  initialSearchTerm?: string;
  onSearchChange?: (val: string) => void;
}

type SortField = 'data_vencimento' | 'quantidade_membros' | 'nome_grupo' | 'prioridade' | 'score' | 'aluguel_sugerido';

interface GroupWithPriority extends Group {
  priorityInfo: PriorityInfo;
}

export function GroupList({ groups = [], onEdit, onDelete, onUpdate, activeQuickFilter, onQuickFilterChange, initialSearchTerm = '', onSearchChange }: GroupListProps) {
  const desktopFakeScrollRef = useRef<HTMLDivElement>(null);
  const desktopTableWrapperRef = useRef<HTMLDivElement>(null);
  const mobileFakeScrollRef = useRef<HTMLDivElement>(null);
  const mobileTableWrapperRef = useRef<HTMLDivElement>(null);
  const searchTermInputRef = useRef<HTMLInputElement>(null);
  const renterSearchInputRef = useRef<HTMLInputElement>(null);

  const handleSyncScroll = (sourceRef: React.RefObject<HTMLDivElement>, targetRef: React.RefObject<HTMLDivElement>) => {
    if (sourceRef.current && targetRef.current) {
      if (targetRef.current.scrollLeft !== sourceRef.current.scrollLeft) {
        targetRef.current.scrollLeft = sourceRef.current.scrollLeft;
      }
    }
  };

  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);

  useEffect(() => {
    if (initialSearchTerm !== searchTerm) {
      setSearchTerm(initialSearchTerm);
    }
  }, [initialSearchTerm]);

  useEffect(() => {
    const timer = setTimeout(() => {
      onSearchChange?.(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, onSearchChange]);

  const [renterSearch, setRenterSearch] = useState('');
  const [nichoFilter, setNichoFilter] = useState('Todos');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [perfilFilter, setPerfilFilter] = useState('Todos');
  const [shopeeFilter, setShopeeFilter] = useState('Todos');
  const [priorityFilter, setPriorityFilter] = useState('Todos');
  const [onlyReadyForShopee, setOnlyReadyForShopee] = useState(false);
  const [sortField, setSortField] = useState<SortField>('quantidade_membros');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
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
  const [isRenterDropdownOpen, setIsRenterDropdownOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [thumbnailModalGroup, setThumbnailModalGroup] = useState<Group | null>(null);
  const [newThumbnailUrl, setNewThumbnailUrl] = useState('');
  const [isUpdatingThumbnail, setIsUpdatingThumbnail] = useState(false);
  const [openRenterDropdownId, setOpenRenterDropdownId] = useState<string | null>(null);
  const [editingGroupNameId, setEditingGroupNameId] = useState<string | null>(null);
  const [editingGroupLinkId, setEditingGroupLinkId] = useState<string | null>(null);
  const [tempGroupName, setTempGroupName] = useState('');
  const [tempGroupLink, setTempGroupLink] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);
  const [isSavingLink, setIsSavingLink] = useState(false);
  const [editingGroupNicheId, setEditingGroupNicheId] = useState<string | null>(null);
  const [editingSaleStatusId, setEditingSaleStatusId] = useState<string | null>(null);
  const [newNicheInputValue, setNewNicheInputValue] = useState('');
  const [isCreatingNewNiche, setIsCreatingNewNiche] = useState(false);
  const [nicheEditCoords, setNicheEditCoords] = useState({ top: 0, left: 0, openUp: false });
  const [saleEditCoords, setSaleEditCoords] = useState({ top: 0, left: 0, openUp: false });
  const [renterEditCoords, setRenterEditCoords] = useState({ top: 0, left: 0, openUp: false });
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const getMembersCount = (g: any): number => {
    if (typeof g.quantidade_membros === 'number') return g.quantidade_membros;
    if (typeof g.membros === 'number') return g.membros;
    const val = g.quantidade_membros || g.membros || '0';
    return parseMembers(String(val));
  };

  const calculateDropdownPos = (
    rect: DOMRect, 
    menuHeight: number, 
    menuWidth: number,
    offset: number = 8
  ) => {
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const shouldOpenUp = spaceBelow < menuHeight && spaceAbove > menuHeight;
    
    return {
      top: shouldOpenUp ? rect.top - menuHeight - offset : rect.bottom + offset,
      left: Math.max(8, Math.min(rect.left, window.innerWidth - menuWidth - 8)),
      openUp: shouldOpenUp
    };
  };

  const getMergedLocatarios = (group: Group): Locatario[] => {
    const list: Locatario[] = [...(group.locatarios || [])];
    
    if (group.locatario) {
      const alreadyInList = list.some(l => l.nome.toLowerCase() === group.locatario?.toLowerCase());
      if (!alreadyInList) {
        list.unshift({
          id: 'legacy-' + group.id,
          nome: group.locatario,
          whatsapp: group.whatsapp || '',
          valor: String(group.valor || ''),
          status: 'Ativo',
          data_inicio: group.data_inicio || '',
          data_vencimento: group.data_vencimento || ''
        });
      }
    }
    return list;
  };

  const GroupThumbnail = ({ group, size = 'desktop' }: { group: Group, size?: 'desktop' | 'mobile' }) => {
    const [hasError, setHasError] = useState(false);
    const [imageLoaded, setImageLoaded] = useState(false);
    
    // Logic for thumbnail URL:
    // 1. thumbnail_grupo (explicitly saved URL)
    // 2. Automatic Cloudinary URL (if configured and group_id exists)
    // 3. Legacy fields (capa_grupo, etc - fallback from before)
    
    let thumbnailUrl = group.thumbnail_grupo || (group as any).capa_grupo || (group as any).foto_capa_url || (group as any).imagem_grupo || "";
    
    // Check for automatic Cloudinary URL if thumbnail_grupo is empty
    if (!thumbnailUrl && CLOUDINARY_BASE_URL && group.group_id) {
      const baseUrl = CLOUDINARY_BASE_URL.endsWith('/') ? CLOUDINARY_BASE_URL.slice(0, -1) : CLOUDINARY_BASE_URL;
      thumbnailUrl = `${baseUrl}/${group.group_id}.png`;
    }

    const dimensions = size === 'desktop' ? 'w-10 h-10' : 'w-[44px] h-[44px]';
    const borderRadius = 'rounded-[10px]';
    const textSize = size === 'desktop' ? 'text-lg' : 'text-lg';

    return (
      <div 
        className={cn(
          dimensions, 
          borderRadius, 
          "relative group/thumb cursor-pointer overflow-hidden border shadow-sm transition-all active:scale-95",
          thumbnailUrl && !hasError ? "bg-slate-100 border-slate-100" : "bg-emerald-50 border-emerald-100"
        )}
        onClick={(e) => {
          e.stopPropagation();
          setThumbnailModalGroup(group);
          setNewThumbnailUrl(group.thumbnail_grupo || '');
        }}
      >
        {thumbnailUrl && !hasError ? (
          <>
            {!imageLoaded && (
               <div className="absolute inset-0 bg-slate-50 animate-pulse flex items-center justify-center">
                  <div className={cn("text-primary/20 font-black flex items-center justify-center uppercase", textSize)}>
                    {(group.nome_grupo || (group as any).nome || 'G')[0]}
                  </div>
               </div>
            )}
            <img 
              src={thumbnailUrl} 
              alt={group.nome_grupo || ''} 
              className={cn("w-full h-full object-cover transition-opacity duration-300", imageLoaded ? "opacity-100" : "opacity-0")}
              referrerPolicy="no-referrer"
              onLoad={() => setImageLoaded(true)}
              onError={() => {
                setHasError(true);
                setImageLoaded(true);
              }}
            />
          </>
        ) : (
          <div className={cn("w-full h-full text-primary font-black flex items-center justify-center uppercase", textSize)}>
            {(group.nome_grupo || (group as any).nome || 'G')[0]}
          </div>
        )}

        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center">
          <Camera className={cn("text-white", size === 'desktop' ? "w-5 h-5" : "w-4 h-4")} />
        </div>
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
      return getMembersCount(b) - getMembersCount(a);
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
        const suggestion = calcularValorSugeridoAluguel(g);
        return {
          'NOME': (item.nome_grupo || item.nome || "").replace(/\n/g, ' ').trim(),
          'LINK': normalizeFacebookGroupLink(g),
          'MEMBROS': item.quantidade_membros || item.membros || 0,
          'VALOR SUGERIDO': suggestion.valorSugeridoAluguel,
          'VALOR ATUAL': item.valor || 0
        };
      });

      // Create workbook and worksheet
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Grupos FB");

      // Set column widths
      worksheet['!cols'] = [
        { wch: 38 }, // NOME
        { wch: 60 }, // LINK
        { wch: 15 }, // MEMBROS
        { wch: 18 }, // VALOR SUGERIDO
        { wch: 15 }, // VALOR ATUAL
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
      const formatMembersWord = (count: number) => {
        if (count >= 1000) {
          const mil = count / 1000;
          const formatted = mil.toLocaleString('pt-BR', { 
            minimumFractionDigits: 0, 
            maximumFractionDigits: 1 
          });
          return `${formatted} mil Membros`;
        }
        return `${count} Membros`;
      };

      const docChildren: any[] = [
        new Paragraph({
          text: "Lista de Grupos FB",
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
          spacing: { after: 120 },
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: `Exportado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`,
              color: "64748b",
              size: 20,
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
        }),
      ];

      dataToExport.forEach((group, index) => {
        const item = group as any;
        const groupName = (item.nome_grupo || item.nome || "").replace(/\n/g, ' ').trim();
        const groupLink = normalizeFacebookGroupLink(group);
        const membersCount = item.quantidade_membros || item.membros || 0;
        const formattedMembers = formatMembersWord(membersCount);
        const suggestion = calcularValorSugeridoAluguel(group);
        const valorDisplay = item.valor || suggestion.valorSugeridoAluguel;

        docChildren.push(
          new Paragraph({
            children: [
              new TextRun({ text: `${index + 1}. `, bold: true, size: 24 }),
              new TextRun({ text: groupName, bold: true, size: 24 }),
              new TextRun({ text: `  ${formattedMembers}`, bold: false, size: 24 }),
              new TextRun({ text: ` - ${formatCurrency(valorDisplay)}`, bold: true, color: "16a34a", size: 24 }),
            ],
            spacing: { before: 240 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: groupLink, color: "0563C1", underline: { type: "single" }, size: 22 }),
            ],
          })
        );
      });

      const doc = new Document({
        sections: [
          {
            properties: {},
            children: docChildren,
          },
        ],
      });

      const blob = await Packer.toBlob(doc);
      const dateSuffix = new Date().toISOString().split('T')[0];
      saveAs(blob, `grupos_fb_word_${dateSuffix}.docx`);

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
      const headers = ['NOME', 'LINK', 'MEMBROS', 'VALOR_SUGERIDO', 'VALOR_ATUAL'];

      const rows = dataToExport.map(g => {
        const item = g as any;
        const suggestion = calcularValorSugeridoAluguel(g);
        return [
          (item.nome_grupo || item.nome || "").replace(/;/g, ' ').replace(/\n/g, ' ').trim(),
          normalizeFacebookGroupLink(g),
          item.quantidade_membros || item.membros || 0,
          suggestion.valorSugeridoAluguel,
          item.valor || 0
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
        const suggestion = calcularValorSugeridoAluguel(g);
        return [
          (item.nome_grupo || item.nome || "").substring(0, 100),
          normalizeFacebookGroupLink(g),
          (item.quantidade_membros || item.membros || 0).toLocaleString('pt-BR'),
          formatCurrency(suggestion.valorSugeridoAluguel)
        ];
      });

      autoTable(doc, {
        head: [['NOME', 'LINK', 'MEMBROS', 'SUGERIDO']],
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
          0: { cellWidth: 50 },
          1: { cellWidth: 80 },
          2: { cellWidth: 30, halign: 'right' },
          3: { cellWidth: 30, halign: 'right' }
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
    const rawNiches = Array.from(new Set(groups.map(g => g.nicho || 'Geral')));
    const dbNiches = nichos.map(n => n.nome);
    
    const combined = Array.from(new Set([...rawNiches, ...dbNiches]));
    const normalizedMap = new Map<string, string>(); // normalized -> display

    combined.forEach(n => {
      const norm = normalizeNicho(n);
      if (!norm) return;
      
      // Prefer capitalization for the display name if multiple versions exist
      const existing = normalizedMap.get(norm);
      if (!existing || (n.trim().length > 0 && n === n.charAt(0).toUpperCase() + n.slice(1))) {
        normalizedMap.set(norm, n.trim());
      }
    });

    return Array.from(normalizedMap.values()).sort();
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
    
    setProcessingAction({ id: group.id, field: 'perfil' });

    try {
      await onUpdate(group.id, {
        para_venda: true,
        status_venda: 'Disponível',
        valor_venda: group.valor_venda || '',
        observacoes_venda: group.observacoes_venda || '',
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

  const handleRemoveFromSale = async (group: Group) => {
    if (!onUpdate) return;
    
    setProcessingAction({ id: group.id, field: 'perfil' });

    try {
      await onUpdate(group.id, {
        para_venda: false,
        atualizado_em: new Date().toISOString()
      });
      setToast({ message: "Grupo removido da venda", type: 'success' });
    } catch (error) {
      console.error("Erro ao remover da venda:", error);
      setToast({ message: "Erro ao remover da venda", type: 'error' });
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

  const handleApplySuggestedRent = async (group: Group, valor: number) => {
    if (!onUpdate) return;
    try {
      await onUpdate(group.id, {
        valor: valor,
        valor_sugerido_aluguel: valor,
        atualizado_em: new Date().toISOString()
      });
      setToast({ message: "Valor de aluguel aplicado", type: 'success' });
    } catch (error) {
      console.error("Erro ao aplicar valor sugerido:", error);
      setToast({ message: "Erro ao aplicar valor", type: 'error' });
    }
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

  const handleRenew = async (group: Group, locatarioId?: string, days: number = 30) => {
    if (!onUpdate) return;

    const today = startOfDay(new Date());
    let updates: Partial<Group> = {};
    const timestamp = new Date().toISOString();

    if (locatarioId && group.locatarios) {
      // Renew specific locatário in array
      const currentLocatarios = [...group.locatarios];
      const index = currentLocatarios.findIndex(l => l.id === locatarioId);
      if (index >= 0) {
        const loc = currentLocatarios[index];
        const currentExp = loc.data_vencimento ? parseISO(loc.data_vencimento) : today;
        const baseDate = isBefore(currentExp, today) ? today : currentExp;
        const newExp = addDays(baseDate, days);
        
        const historyEntry = {
          data_renovacao: timestamp,
          vencimento_anterior: loc.data_vencimento || '',
          novo_vencimento: format(newExp, 'yyyy-MM-dd'),
          valor: loc.valor || group.valor || 0,
          locatario: loc.nome
        };

        currentLocatarios[index] = {
          ...loc,
          data_vencimento: format(newExp, 'yyyy-MM-dd'),
          status: 'Ativo',
          ultima_renovacao: timestamp,
          historico_renovacoes: [historyEntry, ...(loc.historico_renovacoes || [])].slice(0, 50)
        } as Locatario;
        updates.locatarios = currentLocatarios;
      }
    } else {
      // Renew legacy (single) or primary
      const currentExpStr = group.data_vencimento;
      const currentExp = currentExpStr ? parseISO(currentExpStr) : today;
      const baseDate = isBefore(currentExp, today) ? today : currentExp;
      const newExp = addDays(baseDate, days);
      const newExpStr = format(newExp, 'yyyy-MM-dd');

      const historyEntry = {
        data_renovacao: timestamp,
        vencimento_anterior: currentExpStr || '',
        novo_vencimento: newExpStr,
        valor: group.valor || 0,
        locatario: group.locatario || 'Locatário'
      };

      updates = {
        data_vencimento: newExpStr,
        status: 'Alugado',
        ultima_renovacao: timestamp,
        historico_renovacoes: [historyEntry, ...(group.historico_renovacoes || [])].slice(0, 50)
      };
    }

    updates.atualizado_em = timestamp;

    try {
      await onUpdate(group.id, updates);
    } catch (error) {
      console.error("Erro ao renovar aluguel:", error);
      throw error;
    }
  };

  const handleRenewBatch = async (days: number = 30) => {
    if (!onUpdate || selectedGroupIds.size === 0) return;

    const count = selectedGroupIds.size;
    setProcessingAction({ id: 'batch', field: 'locatario' });
    
    try {
      const promises = Array.from(selectedGroupIds).map(id => {
        const group = groups.find(g => g.id === id);
        if (group) return handleRenew(group, undefined, days);
        return Promise.resolve();
      });
      await Promise.all(promises);
      setSelectedGroupIds(new Set());
      setToast({ message: `${count} aluguéis renovados!`, type: 'success' });
    } catch (error) {
      console.error("Erro na renovação em lote:", error);
      setToast({ message: "Erro em algumas renovações", type: 'error' });
    } finally {
      setProcessingAction(null);
      setIsRenewBatchModalOpen(false);
    }
  };

  const getEffectiveStatus = (group: Group): string => {
    const mergedLocatarios = getMergedLocatarios(group);
    if (mergedLocatarios.length > 0) {
      const hasActive = mergedLocatarios.some(l => l.status === 'Ativo');
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
  const [selectedGroupIds, setSelectedGroupIds] = useState<Set<string>>(new Set());
  const [renewModalGroup, setRenewModalGroup] = useState<Group | null>(null);
  const [isRenewBatchModalOpen, setIsRenewBatchModalOpen] = useState(false);
  const [expirationFilter, setExpirationFilter] = useState<'Todos' | 'Vencidos' | 'Vence Hoje' | 'Próximos 3 dias'>('Todos');

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
    .filter(g => {
      const normalizedSearch = normalizeSearchText(searchTerm);
      const searchFBId = extractFacebookGroupId(searchTerm);
      const groupFBId = String(g.group_id || '');
      
      const nameMatch = (g.nome_grupo || '').toLowerCase().includes(searchTerm.toLowerCase());
      const linkMatch = normalizeSearchText(g.link_grupo || '').includes(normalizedSearch);
      const idMatch = searchFBId && (groupFBId === searchFBId || groupFBId.includes(searchFBId));
      
      const altIdMatch = searchFBId && (
        String((g as any).facebook_id || '').includes(searchFBId) ||
        String((g as any).id_grupo || '').includes(searchFBId)
      );

      const mainSearchMatch = !searchTerm || nameMatch || linkMatch || idMatch || altIdMatch;

      const renterMatch = (
        (g.locatario || '').toLowerCase().includes(renterSearch.toLowerCase()) ||
        (g.locatarios || []).some(l => l.nome.toLowerCase().includes(renterSearch.toLowerCase()))
      );

      const normNichoFilter = normalizeNicho(nichoFilter);
      const isNichoMatch = nichoFilter === 'Todos' || normalizeNicho(g.nicho || 'Geral') === normNichoFilter;

      return mainSearchMatch && 
      renterMatch && 
      isNichoMatch && 
      (statusFilter === 'Todos' || getEffectiveStatus(g) === statusFilter) &&
      (perfilFilter === 'Todos' || (g.perfil_compartilhando || 'Inativo') === perfilFilter) &&
      (shopeeFilter === 'Todos' || (g.uso_shopee || 'Inativo') === shopeeFilter) &&
      (priorityFilter === 'Todos' || g.priorityInfo.prioridade === priorityFilter) &&
      (renterFilter === 'Todos' || (g.locatario || '') === renterFilter || (g.locatarios || []).some(l => l.nome === renterFilter)) &&
      (!onlyReadyForShopee || ((g.perfil_compartilhando || 'Inativo') === 'Ativo' && (g.uso_shopee || 'Inativo') === 'Ativo')) &&
      (expirationFilter === 'Todos' || (() => {
        if (!g.data_vencimento || getEffectiveStatus(g) !== 'Alugado') return false;
        const date = parseISO(g.data_vencimento);
        if (expirationFilter === 'Vencidos') return isPast(date) && !isToday(date);
        if (expirationFilter === 'Vence Hoje') return isToday(date);
        if (expirationFilter === 'Próximos 3 dias') {
          const threeDaysFromNow = addDays(startOfDay(new Date()), 3);
          return (isToday(date) || isAfter(date, startOfDay(new Date()))) && (isBefore(date, threeDaysFromNow) || format(date, 'yyyy-MM-dd') === format(threeDaysFromNow, 'yyyy-MM-dd'));
        }
        return true;
      })())
    })
    .sort((a, b) => {
      // Handle Sorting
      if (sortField === 'nome_grupo') {
        const valA = (a.nome_grupo || '').toLowerCase();
        const valB = (b.nome_grupo || '').toLowerCase();
        return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      
      if (sortField === 'quantidade_membros') {
        const valA = getMembersCount(a);
        const valB = getMembersCount(b);
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

      if (sortField === 'aluguel_sugerido') {
        const valA = calcularValorSugeridoAluguel(a).valorSugeridoAluguel;
        const valB = calcularValorSugeridoAluguel(b).valorSugeridoAluguel;
        return sortOrder === 'asc' ? valA - valB : valB - valA;
      }

      // Default grouping sort logic
      // If we are in "Todos" nicho, we don't sort by nicho name first
      if (nichoFilter !== 'Todos') {
        const nichoA = (a.nicho || 'Geral').toLowerCase();
        const nichoB = (b.nicho || 'Geral').toLowerCase();
        if (nichoA < nichoB) return -1;
        if (nichoA > nichoB) return 1;
      }

      // Fallback sort: Members Descending (maior para o menor)
      const memA = getMembersCount(a);
      const memB = getMembersCount(b);
      if (memB !== memA) return memB - memA;

      // Tertiary sort: Nome do Grupo
      const nameA = (a.nome_grupo || '').toLowerCase();
      const nameB = (b.nome_grupo || '').toLowerCase();
      return nameA.localeCompare(nameB);
    });

  // Grouping for visual separation
  const groupedGroups: { [nicho: string]: GroupWithPriority[] } = filteredGroups.reduce((acc, group) => {
    // When "Todos" filter is used, we show one single global group
    const nichoKey = nichoFilter === 'Todos' ? 'Todos os Grupos' : (group.nicho || 'Sem Nicho');
    
    // We normalize the key for grouping to ensure "Musa" and " musa" end up in the same visual bucket
    // But we keep a representative "nichoFilter" label if it's selected
    const groupNichoNorm = normalizeNicho(group.nicho || 'Geral');
    let bucketName = group.nicho || 'Sem Nicho';
    
    if (nichoFilter !== 'Todos') {
      bucketName = nichoFilter;
    }
    
    const finalKey = nichoFilter === 'Todos' ? 'Todos os Grupos' : bucketName;

    if (!acc[finalKey]) acc[finalKey] = [];
    acc[finalKey].push(group);
    return acc;
  }, {} as { [nicho: string]: GroupWithPriority[] });

  // Get sorted niche names for display
  const sortedNiches = Object.keys(groupedGroups).sort((a, b) => a.localeCompare(b));

  const uniqueRenters = useMemo(() => {
    const renterMap = new Map<string, { nome: string, whatsapp?: string, count: number }>();
    
    groups.forEach(g => {
      // 1. Check legacy locatario string
      if (g.locatario) {
        const nome = g.locatario.trim();
        const existing = renterMap.get(nome.toLowerCase());
        if (existing) {
          existing.count++;
        } else {
          renterMap.set(nome.toLowerCase(), { nome, count: 1 });
        }
      }
      
      // 2. Check locatarios array
      if (g.locatarios && g.locatarios.length > 0) {
        g.locatarios.forEach(l => {
          const nome = l.nome.trim();
          const existing = renterMap.get(nome.toLowerCase());
          if (existing) {
            existing.count++;
            if (!existing.whatsapp) existing.whatsapp = l.whatsapp;
          } else {
            renterMap.set(nome.toLowerCase(), { nome, whatsapp: l.whatsapp, count: 1 });
          }
        });
      }
    });

    return Array.from(renterMap.values()).sort((a, b) => a.nome.localeCompare(b.nome));
  }, [groups]);

  const filteredRenters = useMemo(() => {
    if (!renterSearch) return uniqueRenters;
    return uniqueRenters.filter(r => 
      r.nome.toLowerCase().includes(renterSearch.toLowerCase()) || 
      (r.whatsapp && r.whatsapp.includes(renterSearch))
    );
  }, [uniqueRenters, renterSearch]);

  const handleSaveThumbnail = async () => {
    if (!thumbnailModalGroup || !onUpdate) return;
    
    const url = newThumbnailUrl.trim();
    if (url && !url.startsWith('http')) {
      setToast({ message: "Use uma URL de imagem válida (http:// ou https://)", type: 'error' });
      return;
    }

    setIsUpdatingThumbnail(true);
    try {
      await onUpdate(thumbnailModalGroup.id, {
        thumbnail_grupo: url,
        atualizado_em: new Date().toISOString()
      });
      setToast({ message: "Miniatura atualizada com sucesso!", type: 'success' });
      setThumbnailModalGroup(null);
    } catch (error) {
      console.error("Erro ao atualizar miniatura:", error);
      setToast({ message: "Não foi possível atualizar a miniatura", type: 'error' });
    } finally {
      setIsUpdatingThumbnail(false);
    }
  };

  const handleSaveGroupName = async (groupId: string) => {
    if (!onUpdate) return;
    
    const newName = tempGroupName.trim();
    if (!newName) {
      setToast({ message: "Digite um nome válido", type: 'error' });
      return;
    }

    setIsSavingName(true);
    try {
      await onUpdate(groupId, {
        nome_grupo: newName,
        atualizado_em: new Date().toISOString()
      });
      setToast({ message: "Nome do grupo atualizado", type: 'success' });
      setEditingGroupNameId(null);
    } catch (error) {
      console.error("Erro ao atualizar nome:", error);
      setToast({ message: "Não foi possível atualizar o nome", type: 'error' });
    } finally {
      setIsSavingName(false);
    }
  };

  const handleSaveGroupLink = async (groupId: string) => {
    if (!onUpdate) return;
    
    const newLink = tempGroupLink.trim();
    if (!newLink) {
      setToast({ message: "O link não pode estar vazio", type: 'error' });
      return;
    }

    setIsSavingLink(true);
    try {
      await onUpdate(groupId, {
        link_grupo: newLink,
        atualizado_em: new Date().toISOString()
      });
      setToast({ message: "Link do grupo atualizado", type: 'success' });
      setEditingGroupLinkId(null);
    } catch (error) {
      console.error("Erro ao atualizar link:", error);
      setToast({ message: "Não foi possível atualizar o link", type: 'error' });
    } finally {
      setIsSavingLink(false);
    }
  };

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
    <div className="space-y-4">
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
      <div className="flex flex-col gap-3">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary w-3.5 h-3.5 md:w-4 md:h-4 transition-colors" />
            <input 
              ref={searchTermInputRef}
              type="text" 
              placeholder="Pesquisar por nome, link ou ID do grupo..."
              className="w-full bg-white border border-slate-100 pl-10 md:pl-11 pr-10 py-2 md:py-2.5 rounded-xl md:rounded-2xl shadow-sm focus:ring-4 focus:ring-green-50 focus:border-green-200 outline-none font-bold text-[10px] md:text-xs text-slate-600 placeholder:text-slate-300 transition-all font-mono"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button 
                onClick={() => {
                  setSearchTerm("");
                  searchTermInputRef.current?.focus();
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors p-1 rounded-full hover:bg-slate-50 active:scale-95"
                title="Limpar busca"
              >
                <X className="w-3.5 h-3.5 md:w-4 md:h-4" />
              </button>
            )}
          </div>
          <div className="flex-1 relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 w-3.5 h-3.5 md:w-4 md:h-4 transition-colors" />
            <input 
              ref={renterSearchInputRef}
              type="text" 
              placeholder="Pesquisar por locatário..."
              className="w-full bg-white border border-slate-100 pl-10 md:pl-11 pr-10 py-2 md:py-2.5 rounded-xl md:rounded-2xl shadow-sm focus:ring-4 focus:ring-blue-50 focus:border-blue-200 outline-none font-bold text-[10px] md:text-xs text-slate-600 placeholder:text-slate-300 transition-all"
              value={renterSearch}
              onChange={e => {
                setRenterSearch(e.target.value);
                setIsRenterDropdownOpen(true);
              }}
              onFocus={() => setIsRenterDropdownOpen(true)}
            />
            {renterSearch && (
              <button 
                onClick={() => {
                  setRenterSearch("");
                  setIsRenterDropdownOpen(false);
                  renterSearchInputRef.current?.focus();
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors p-1 rounded-full hover:bg-slate-50 active:scale-95"
                title="Limpar busca"
              >
                <X className="w-3.5 h-3.5 md:w-4 md:h-4" />
              </button>
            )}
            
            <AnimatePresence>
              {isRenterDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsRenterDropdownOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute left-0 right-0 mt-2 bg-white rounded-3xl border border-slate-100 shadow-2xl z-50 overflow-hidden max-h-[400px] flex flex-col"
                  >
                    <div className="p-2 overflow-y-auto">
                      <button
                        onClick={() => {
                          setRenterSearch('');
                          setIsRenterDropdownOpen(false);
                        }}
                        className="w-full text-left px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-50 hover:text-primary rounded-2xl transition-all"
                      >
                        Todos os locatários / Limpar Filtro
                      </button>
                      
                      {filteredRenters.length > 0 ? (
                        filteredRenters.map((renter, i) => (
                          <button
                            key={i}
                            onClick={() => {
                              setRenterSearch(renter.nome);
                              setIsRenterDropdownOpen(false);
                            }}
                            className="w-full text-left px-5 py-4 hover:bg-blue-50/50 rounded-2xl transition-all group/item border border-transparent hover:border-blue-100 mt-1"
                          >
                            <div className="flex flex-col">
                              <span className="text-sm font-black text-slate-700 group-hover/item:text-blue-600 transition-colors">
                                {renter.nome}
                              </span>
                              <div className="flex items-center gap-2 mt-1">
                                {renter.whatsapp && (
                                  <>
                                    <span className="text-[10px] font-bold text-slate-400">
                                      {renter.whatsapp}
                                    </span>
                                    <div className="w-1 h-1 rounded-full bg-slate-200" />
                                  </>
                                )}
                                <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">
                                  {renter.count} {renter.count === 1 ? 'grupo' : 'grupos'}
                                </span>
                              </div>
                            </div>
                          </button>
                        ))
                      ) : (
                        <div className="py-8 text-center">
                          <p className="text-xs font-bold text-slate-400">Nenhum locatário encontrado</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>

          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5 pb-2">
            <div className="grid grid-cols-2 md:grid-cols-3 xl:flex xl:flex-wrap gap-2 w-full">
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
              <FilterBadge 
                label="Vencimento" 
                value={expirationFilter} 
                options={['Todos', 'Vencidos', 'Vence Hoje', 'Próximos 3 dias']} 
                onChange={v => setExpirationFilter(v)} 
                isCapitalize
              />
            
            {selectedGroupIds.size > 0 && (
              <button 
                onClick={() => setIsRenewBatchModalOpen(true)}
                className="h-9 md:h-10 flex items-center justify-center gap-2 px-4 bg-emerald-600 text-white rounded-xl shadow-lg shadow-emerald-100 text-[9px] font-black uppercase tracking-widest hover:bg-emerald-700 active:scale-95 transition-all w-full md:w-auto xl:flex-1 group"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span className="truncate">Renovar Selecionados ({selectedGroupIds.size})</span>
              </button>
            )}

            <button 
              onClick={() => setIsReviewModalOpen(true)}
              className="h-9 md:h-10 flex items-center justify-center gap-2 px-4 bg-slate-50 text-slate-600 rounded-xl border border-slate-100 hover:border-blue-200 text-[9px] font-black uppercase tracking-widest hover:bg-white active:scale-95 transition-all w-full md:w-auto xl:flex-1 group"
            >
              <ClipboardList className="w-3.5 h-3.5 text-blue-500 group-hover:scale-110 transition-transform shrink-0" />
              <span className="truncate">Revisar</span>
            </button>

            <button 
              onClick={() => setIsPostTodayModalOpen(true)}
              className="h-9 md:h-10 flex items-center justify-center gap-2 px-4 bg-slate-900 text-white rounded-xl shadow-lg shadow-slate-200 text-[9px] font-black uppercase tracking-widest hover:bg-primary active:scale-95 transition-all w-full md:w-auto xl:flex-1 group"
            >
              <Trophy className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform shrink-0" />
              <span className="truncate">Postar Hoje</span>
            </button>

            <button 
              onClick={() => setIsGenerateCopyModalOpen(true)}
              className="h-9 md:h-10 flex items-center justify-center gap-2 px-4 bg-white border border-slate-100 rounded-xl shadow-sm text-[9px] font-black uppercase tracking-widest text-slate-600 hover:border-indigo-200 active:scale-95 transition-all w-full md:w-auto xl:flex-1 group"
            >
              <Wand2 className="w-3.5 h-3.5 text-indigo-500 group-hover:scale-110 transition-transform shrink-0" />
              <span className="truncate">Copys</span>
            </button>

            <div className="relative xl:flex-1">
              <button 
                onClick={() => setIsExportDropdownOpen(!isExportDropdownOpen)}
                disabled={isExporting}
                className="h-9 md:h-10 flex items-center justify-center gap-2 px-4 bg-white border border-slate-100 rounded-xl shadow-sm text-[9px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 hover:border-green-200 active:scale-95 transition-all w-full md:w-auto xl:w-full group"
              >
                {isExporting ? (
                  <Loader2 className="w-3.5 h-3.5 text-primary animate-spin shrink-0" />
                ) : (
                  <Download className="w-3.5 h-3.5 text-primary group-hover:scale-110 transition-transform shrink-0" />
                )}
                <span className="truncate">{isExporting ? 'Exportando...' : 'Exportar'}</span>
                <ChevronDown className={cn("w-2.5 h-2.5 transition-transform", isExportDropdownOpen && "rotate-180")} />
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

      {/* Active Filters Summary */}
      {(nichoFilter !== 'Todos' || statusFilter !== 'Todos' || perfilFilter !== 'Todos' || shopeeFilter !== 'Todos' || priorityFilter !== 'Todos' || expirationFilter !== 'Todos' || renterFilter !== 'Todos' || searchTerm) && (
        <div className="mx-4 mb-4 p-3 bg-white border border-slate-100 rounded-2xl flex flex-wrap items-center gap-2 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-2 pr-2 border-r border-slate-100 mr-2">
            <Filter className="w-3.5 h-3.5 text-blue-500" />
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Filtros Ativos:</span>
          </div>
          
          {nichoFilter !== 'Todos' && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-700 rounded-lg border border-amber-100 text-[9px] font-bold">
              <span>Nicho: {nichoFilter}</span>
              <button onClick={() => setNichoFilter('Todos')} className="hover:text-amber-900 transition-colors"><X className="w-3 h-3" /></button>
            </div>
          )}

          {searchTerm && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg border border-blue-100 text-[9px] font-bold">
              <Search className="w-3 h-3" />
              <span className="max-w-[150px] truncate">Busca: {searchTerm}</span>
              <button onClick={() => setSearchTerm('')} className="hover:text-blue-900 transition-colors"><X className="w-3 h-3" /></button>
            </div>
          )}

          {(statusFilter !== 'Todos' || perfilFilter !== 'Todos' || shopeeFilter !== 'Todos' || priorityFilter !== 'Todos' || expirationFilter !== 'Todos' || renterFilter !== 'Todos') && (
             <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 text-slate-600 rounded-lg border border-slate-100 text-[9px] font-bold">
               <span>Outros Filtros</span>
               <button 
                 onClick={() => {
                   setStatusFilter('Todos');
                   setPerfilFilter('Todos');
                   setShopeeFilter('Todos');
                   setPriorityFilter('Todos');
                   setExpirationFilter('Todos');
                   setRenterFilter('Todos');
                 }} 
                 className="flex items-center gap-1 hover:text-rose-600 transition-colors ml-1 border-l border-slate-200 pl-1.5"
               >
                 <span className="text-[8px] uppercase">Limpar</span>
                 <X className="w-3 h-3" />
               </button>
             </div>
          )}

          <button 
            onClick={() => {
              setNichoFilter('Todos');
              setStatusFilter('Todos');
              setPerfilFilter('Todos');
              setShopeeFilter('Todos');
              setPriorityFilter('Todos');
              setExpirationFilter('Todos');
              setRenterFilter('Todos');
              setSearchTerm('');
            }}
            className="ml-auto text-[9px] font-black uppercase text-rose-500 hover:text-rose-600 transition-colors flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-rose-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Limpar Tudo
          </button>
        </div>
      )}

      {/* Desktop Table Content */}
      <div className="hidden lg:block">
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden p-4">
          {/* Top Fake Scrollbar Desktop */}
          <div 
            className="w-full overflow-x-auto overflow-y-hidden h-2 bg-slate-50/50 border-b border-slate-100 rounded-t-xl grupos-scroll-top mb-3" 
            ref={desktopFakeScrollRef}
            onScroll={() => handleSyncScroll(desktopFakeScrollRef, desktopTableWrapperRef)}
          >
            <div className="w-[1100px] h-px"></div>
          </div>
          
          <div 
            className="w-full overflow-x-auto overflow-y-visible grupos-table-wrapper touch-pan-x"
            ref={desktopTableWrapperRef}
            onScroll={() => handleSyncScroll(desktopTableWrapperRef, desktopFakeScrollRef)}
          >
            <div className="min-w-[1100px] grupos-table-content">
              <table className="w-full text-left border-collapse table-fixed">
            <thead className="sticky top-0 z-20 bg-slate-50 shadow-[0_1px_0_rgba(0,0,0,0.05)]">
              <tr className="border-b border-slate-100">
                <th className="w-[3%] px-3 py-2 text-center">
                  <input 
                    type="checkbox"
                    className="w-3.5 h-3.5 rounded border-slate-200 text-primary focus:ring-primary/20 cursor-pointer"
                    checked={filteredGroups.length > 0 && selectedGroupIds.size === filteredGroups.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedGroupIds(new Set(filteredGroups.map(g => g.id)));
                      } else {
                        setSelectedGroupIds(new Set());
                      }
                    }}
                  />
                </th>
                <th className="w-[22%] px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wide cursor-pointer hover:text-slate-900 transition-colors" onClick={() => toggleSort('nome_grupo')}>
                  <div className="flex items-center gap-2">Grupo <ArrowUpDown className="w-3 h-3 opacity-30" /></div>
                </th>
                <th className="w-[8%] px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wide cursor-pointer hover:text-slate-900 transition-colors" onClick={() => toggleSort('quantidade_membros')}>
                  <div className="flex items-center gap-2 text-center justify-center w-full">Membros <ArrowUpDown className="w-3 h-3 opacity-30" /></div>
                </th>
                <th className="w-[8%] px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wide cursor-pointer hover:text-slate-900 transition-colors" onClick={() => toggleSort('prioridade')}>
                  <div className="flex items-center gap-2 text-center justify-center w-full">Prioridade <ArrowUpDown className="w-3 h-3 opacity-30" /></div>
                </th>
                <th className="w-[12%] px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wide text-center">Perfil / Shopee</th>
                <th className="w-[15%] px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wide text-center cursor-pointer hover:text-slate-900 transition-colors" onClick={() => toggleSort('aluguel_sugerido')}>
                  <div className="flex items-center gap-2 justify-center leading-tight">Aluguel<br/>Sugerido <ArrowUpDown className="w-3 h-3 opacity-30" /></div>
                </th>
                <th className="w-[18%] px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wide">Locatário / Info</th>
                <th className="w-[9%] px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wide cursor-pointer hover:text-slate-900 transition-colors text-right" onClick={() => toggleSort('data_vencimento')}>
                  <div className="flex items-center gap-2 justify-end">Vencimento <ArrowUpDown className="w-3 h-3 opacity-30" /></div>
                </th>
                <th className="w-[5%] px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wide text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 font-medium">
              {sortedNiches.map(nicho => (
                <React.Fragment key={nicho}>
                  <tr className="bg-slate-50/50">
                    <td colSpan={9} className="px-3 py-2">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_rgba(16,185,129,0.4)] animate-pulse" />
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-800">
                            NICHO: {nicho}
                          </span>
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                            {groupedGroups[nicho].length} {groupedGroups[nicho].length === 1 ? 'grupo encontrado' : 'grupos encontrados'}
                          </span>
                        </div>
                      </div>
                    </td>
                  </tr>
                  {groupedGroups[nicho].map(group => (
                    <motion.tr 
                      layout
                      key={group.id} 
                      className={cn(
                        "hover:bg-slate-50/50 transition-colors group relative",
                        group.perfil_compartilhando === 'Inativo' && "bg-rose-50/5"
                      )}
                    >
                      <td className="px-3 py-2 text-center">
                        <input 
                          type="checkbox"
                          className="w-3.5 h-3.5 rounded border-slate-200 text-primary focus:ring-primary/20 cursor-pointer"
                          checked={selectedGroupIds.has(group.id)}
                          onChange={() => {
                            const next = new Set(selectedGroupIds);
                            if (next.has(group.id)) next.delete(group.id);
                            else next.add(group.id);
                            setSelectedGroupIds(next);
                          }}
                        />
                      </td>
                      <td className="px-3 py-2 relative">
                        {group.perfil_compartilhando === 'Inativo' && (
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-rose-500" />
                        )}
                        <div className="flex items-center gap-2.5">
                          {/* Thumbnail */}
                          <GroupThumbnail group={group} size="desktop" />

                          <div className="flex flex-col min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              {editingGroupNameId === group.id ? (
                                <div className="flex items-center gap-2 flex-1">
                                  <input
                                    autoFocus
                                    type="text"
                                    value={tempGroupName}
                                    onChange={(e) => setTempGroupName(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') handleSaveGroupName(group.id);
                                      if (e.key === 'Escape') setEditingGroupNameId(null);
                                    }}
                                    className="px-2 py-1 bg-white border-2 border-primary rounded-lg text-sm font-black text-slate-900 focus:outline-none w-full shadow-lg shadow-green-100/50"
                                  />
                                  <div className="flex gap-1">
                                    <button 
                                      onClick={() => handleSaveGroupName(group.id)}
                                      disabled={isSavingName}
                                      className="p-1 bg-primary text-white rounded-lg hover:bg-emerald-600 transition-all active:scale-90"
                                    >
                                      {isSavingName ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                                    </button>
                                    <button 
                                      onClick={() => setEditingGroupNameId(null)}
                                      className="p-1 bg-slate-100 text-slate-400 rounded-lg hover:bg-slate-200 transition-all active:scale-90"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <span className="font-bold text-slate-950 transition-colors text-[12px] truncate" title={group.nome_grupo}>
                                    {group.nome_grupo}
                                  </span>
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingGroupNameId(group.id);
                                      setTempGroupName(group.nome_grupo || '');
                                    }}
                                    className="p-0.5 text-slate-300 hover:text-blue-500 rounded-md transition-all opacity-0 group-hover:opacity-100"
                                    title="Editar Nome"
                                  >
                                    <Edit2 className="w-2.5 h-2.5" />
                                  </button>
                                </>
                              )}
                              {group.para_venda ? (
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                    setSaleEditCoords(calculateDropdownPos(rect, 120, 224));
                                    setEditingSaleStatusId(group.id);
                                  }}
                                  className="bg-amber-50 text-amber-600 text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border border-amber-100 shrink-0 hover:bg-amber-100 transition-colors"
                                >
                                  À Venda
                                </button>
                              ) : (
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMarkForSale(group);
                                  }}
                                  className="text-slate-300 hover:text-amber-500 hover:border-amber-200 text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border border-slate-100 shrink-0 transition-all opacity-0 group-hover:opacity-100"
                                >
                                  + Venda
                                </button>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              {editingGroupLinkId === group.id ? (
                                <div className="flex items-center gap-1 flex-1 max-w-[120px]">
                                  <input
                                    autoFocus
                                    type="url"
                                    value={tempGroupLink}
                                    onChange={(e) => setTempGroupLink(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') handleSaveGroupLink(group.id);
                                      if (e.key === 'Escape') setEditingGroupLinkId(null);
                                    }}
                                    placeholder="Link..."
                                    className="px-1.5 py-0.5 bg-white border border-blue-400 rounded text-[9px] font-bold text-slate-900 focus:outline-none w-full"
                                  />
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5">
                                  {group.link_grupo ? (
                                    <a 
                                      href={normalizeFacebookGroupLink(group)} 
                                      target="_blank" 
                                      rel="noreferrer"
                                      className="text-[9px] text-blue-500 hover:text-blue-700 flex items-center gap-1 font-bold uppercase tracking-widest transition-colors"
                                    >
                                      LINK <ExternalLink className="w-2.5 h-2.5" />
                                    </a>
                                  ) : (
                                    <span className="text-[9px] text-slate-300 font-black uppercase tracking-widest italic">SEM LINK</span>
                                  )}
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingGroupLinkId(group.id);
                                      setTempGroupLink(group.link_grupo || '');
                                    }}
                                    className="p-0.5 text-slate-300 hover:text-blue-500 rounded-md transition-all opacity-0 group-hover:opacity-100"
                                    title="Editar Link"
                                  >
                                    <Edit2 className="w-2.5 h-2.5" />
                                  </button>
                                </div>
                              )}
                              <div className="flex items-center gap-1.5">
                                 <div className="w-1 h-1 rounded-full bg-slate-200" />
                                 <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                    setNicheEditCoords(calculateDropdownPos(rect, 320, 224));
                                    setEditingGroupNicheId(group.id);
                                    setIsCreatingNewNiche(false);
                                  }}
                                  className="text-slate-500 text-[8px] font-bold uppercase tracking-widest truncate max-w-[140px] hover:text-primary transition-colors flex items-center gap-1 group/niche" 
                                  title={group.nicho || 'Geral'}
                                 >
                                    {group.nicho || 'Geral'}
                                    <Edit2 className="w-2 h-2 opacity-0 group-hover/niche:opacity-100 transition-opacity" />
                                 </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-1.5 text-center text-xs font-bold text-slate-900 font-mono tracking-tighter">
                        <div 
                          onClick={() => {
                            setEditingMembersId(group.id);
                            setMembersInputValue(formatNumber(group.quantidade_membros || 0));
                          }}
                          className="cursor-pointer hover:text-primary transition-colors"
                        >
                          {editingMembersId === group.id ? (
                            <input
                              autoFocus
                              type="text"
                              value={membersInputValue}
                              onChange={(e) => setMembersInputValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleUpdateMembers(group);
                                if (e.key === 'Escape') setEditingMembersId(null);
                              }}
                              className="w-16 px-1 py-0.5 border border-primary rounded text-center"
                            />
                          ) : (
                            formatNumber(group.quantidade_membros)
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-1.5 text-center">
                        <div className="flex flex-col items-center gap-0.5">
                          <span className={cn(
                            "text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full border shadow-sm",
                            group.priorityInfo.prioridade === 'Alta' ? "bg-rose-50 text-rose-600 border-rose-100" :
                            group.priorityInfo.prioridade === 'Média' ? "bg-amber-50 text-amber-600 border-amber-100" :
                            "bg-slate-50 text-slate-400 border-slate-100"
                          )}>
                            {group.priorityInfo.prioridade}
                          </span>
                          <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                            {group.priorityInfo.score} pts
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-1.5">
                        <div className="flex flex-col gap-1 items-center justify-center">
                           <button 
                             onClick={() => handleToggleField(group, 'perfil')}
                             disabled={!!processingAction}
                             className={cn(
                               "w-full flex items-center justify-between px-2 py-0.5 rounded-md border transition-all active:scale-95 disabled:opacity-50",
                               group.perfil_compartilhando === 'Ativo' 
                                 ? "bg-emerald-50 border-emerald-100 text-emerald-700" 
                                 : "bg-slate-50 border-slate-100 text-slate-400"
                             )}
                           >
                              <span className="text-[8px] font-black uppercase">Normal</span>
                              <div className={cn("w-1 h-1 rounded-full", 
                                group.perfil_compartilhando === 'Ativo' ? "bg-emerald-500" : "bg-rose-400"
                              )} />
                           </button>

                           <button 
                             onClick={() => handleToggleField(group, 'shopee')}
                             disabled={!!processingAction}
                             className={cn(
                               "w-full flex items-center justify-between px-2 py-0.5 rounded-md border transition-all active:scale-95 disabled:opacity-50",
                               group.uso_shopee === 'Ativo' 
                                 ? "bg-blue-50 border-blue-100 text-blue-700" 
                                 : "bg-slate-50 border-slate-100 text-slate-400"
                             )}
                           >
                              <span className="text-[8px] font-black uppercase">Shopee</span>
                              <div className={cn("w-1 h-1 rounded-full", 
                                group.uso_shopee === 'Ativo' ? "bg-blue-500" : "bg-slate-300"
                              )} />
                           </button>
                        </div>
                      </td>
                      <td className="px-3 py-1.5 text-center">
                        <SuggestedRentDisplay 
                          group={group} 
                          onApply={(val) => handleApplySuggestedRent(group, val)} 
                        />
                      </td>
                      <td className="px-3 py-1.5 relative">
                        <div className="flex flex-col items-center justify-center">
                          {(() => {
                            const mergedLocatarios = getMergedLocatarios(group);
                            const activeLocatarios = mergedLocatarios.filter(l => l.status === 'Ativo');
                            const hasActive = activeLocatarios.length > 0;
                            const isDropdownOpen = openRenterDropdownId === group.id;

                            if (mergedLocatarios.length > 0) {
                              return (
                                <div className="relative">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (isDropdownOpen) {
                                        setOpenRenterDropdownId(null);
                                      } else {
                                        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                        setRenterEditCoords(calculateDropdownPos(rect, 300, 260));
                                        setOpenRenterDropdownId(group.id);
                                      }
                                    }}
                                    className={cn(
                                      "flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all border",
                                      hasActive 
                                        ? "bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100" 
                                        : "bg-slate-50 text-slate-400 border-slate-100 hover:bg-slate-100"
                                    )}
                                  >
                                    <Users className="w-3 h-3" />
                                    {hasActive ? `ALUGADO` : `INATIVO`}
                                    <ChevronDown className={cn("w-2.5 h-2.5 transition-transform duration-300", isDropdownOpen && "rotate-180")} />
                                  </button>

                                  <AnimatePresence>
                                    {/* Portal rendering handled globally at the bottom */}
                                  </AnimatePresence>
                                </div>
                              );
                            }

                            return (
                              <button 
                                onClick={() => {
                                  setLocatarioGroup(group);
                                  setEditingLocatario(null);
                                  setIsLocatarioModalOpen(true);
                                }}
                                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-black text-primary uppercase tracking-widest bg-emerald-50 border border-emerald-100 hover:bg-emerald-100 transition-all shadow-sm active:scale-95"
                              >
                                <UserPlus className="w-3 h-3" />
                                Disponível
                              </button>
                            );
                          })()}
                        </div>
                      </td>
                      <td className="px-3 py-1.5 text-right">
                        <ExpiryBadge 
                          dareStr={group.data_vencimento || ''} 
                          status={getEffectiveStatus(group)} 
                          group={group}
                          onRenew={(g) => setRenewModalGroup(g)}
                        />
                      </td>
                      <td className="px-3 py-1.5 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-60 group-hover:opacity-100 transition-all transform translate-x-1 group-hover:translate-x-0">
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
                            onRenew={() => setRenewModalGroup(group)}
                            onQuickRenew={() => handleRenew(group)}
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
      </div>
    </div>

      {/* Mobile Card Layout */}
      <div className="lg:hidden pb-20 p-1 md:p-0 relative">
        {/* Top Fake Scrollbar Mobile */}
        <div 
          className="w-full overflow-x-auto overflow-y-hidden h-2.5 bg-white/50 mb-3 rounded-full overflow-hidden grupos-scroll-top" 
          ref={mobileFakeScrollRef}
          onScroll={() => handleSyncScroll(mobileFakeScrollRef, mobileTableWrapperRef)}
        >
          <div className="min-w-[600px] h-px"></div>
        </div>

        <div 
          className="w-full overflow-x-auto overflow-y-visible touch-pan-x grupos-table-wrapper"
          ref={mobileTableWrapperRef}
          onScroll={() => handleSyncScroll(mobileTableWrapperRef, mobileFakeScrollRef)}
        >
          <div className="min-w-[600px] space-y-6 grupos-table-content">
        {sortedNiches.map(nicho => (
          <div key={nicho} className="space-y-4">
            <div className="px-4 py-1">
              <div className="flex items-center gap-2.5">
                <div className="w-2 h-2 rounded-full bg-primary shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-800">
                    NICHO: {nicho || 'Geral'}
                  </span>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                    {groupedGroups[nicho].length} {groupedGroups[nicho].length === 1 ? 'grupo encontrado' : 'grupos encontrados'}
                  </span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(groupedGroups[nicho] || []).map(group => (
                <div 
                  key={group.id} 
                  onClick={() => {
                    const next = new Set(selectedGroupIds);
                    if (next.has(group.id)) next.delete(group.id);
                    else next.add(group.id);
                    setSelectedGroupIds(next);
                  }}
                  className={cn(
                    "bg-white p-3 rounded-[1.5rem] border transition-all relative overflow-hidden active:scale-[0.98] group shadow-sm",
                    selectedGroupIds.has(group.id) ? "border-primary/50 bg-primary/5" : 
                    (group.perfil_compartilhando || 'Inativo') === 'Inativo' ? "border-rose-100 bg-rose-50/5" : "border-slate-100"
                  )}
                >
                   {/* Selection Badge for Mobile */}
                   <div className={cn(
                     "absolute top-3 right-11 w-5 h-5 rounded-full flex items-center justify-center shadow-sm border transition-all z-10",
                     selectedGroupIds.has(group.id) ? "bg-primary text-white scale-110 border-primary" : "bg-white text-slate-200 border-slate-50 scale-90"
                   )}>
                     {selectedGroupIds.has(group.id) ? <CheckCircle2 className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                   </div>
                   <div className="flex flex-col gap-3">
                     <div className="flex items-start gap-3">
                        {/* Thumbnail Mobile */}
                        <GroupThumbnail group={group} size="mobile" />

                        <div className="flex-1 min-w-0">
                           <div className="flex flex-wrap items-center gap-1.5 mb-1">
                             <span className={cn(
                               "text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full",
                               group.priorityInfo?.prioridade === 'Alta' ? "bg-rose-600 text-white" :
                               group.priorityInfo?.prioridade === 'Média' ? "bg-amber-500 text-white" :
                               "bg-slate-100 text-slate-400"
                             )}>
                               {group.priorityInfo?.prioridade || 'Baixa'}
                             </span>
                             {group.para_venda ? (
                               <button 
                                 onClick={(e) => {
                                   e.stopPropagation();
                                   const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                   setSaleEditCoords(calculateDropdownPos(rect, 120, 224));
                                   setEditingSaleStatusId(group.id);
                                 }}
                                 className="bg-amber-50 text-amber-600 text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border border-amber-100 active:bg-amber-100 transition-colors"
                               >
                                 À VENDA
                               </button>
                             ) : (
                               <button 
                                 onClick={(e) => {
                                   e.stopPropagation();
                                   handleMarkForSale(group);
                                 }}
                                 className="bg-slate-50 text-slate-400 text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border border-slate-100 active:bg-slate-100 transition-colors"
                               >
                                 Colocar à venda
                               </button>
                             )}
                           </div>
                           {editingGroupNameId === group.id ? (
                              <div className="flex items-center gap-2 mb-1.5">
                                <input
                                  autoFocus
                                  type="text"
                                  value={tempGroupName}
                                  onChange={(e) => setTempGroupName(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSaveGroupName(group.id);
                                    if (e.key === 'Escape') setEditingGroupNameId(null);
                                  }}
                                  className="px-2 py-1 bg-white border border-primary rounded-lg text-xs font-black text-slate-900 focus:outline-none w-full"
                                />
                                <button 
                                  onClick={() => handleSaveGroupName(group.id)}
                                  disabled={isSavingName}
                                  className="p-2 bg-primary text-white rounded-xl shadow-sm active:scale-90"
                                >
                                  {isSavingName ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                                </button>
                                <button 
                                  onClick={() => setEditingGroupNameId(null)}
                                  className="p-2 bg-slate-100 text-slate-400 rounded-xl active:scale-90"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                           ) : (
                             <div className="flex items-center justify-between gap-2 mb-0.5">
                               <h4 className="text-[13px] font-bold text-slate-950 leading-tight truncate" title={group.nome_grupo || ''}>{group.nome_grupo || 'Sem Nome'}</h4>
                               <button
                                 onClick={(e) => {
                                   e.stopPropagation();
                                   setEditingGroupNameId(group.id);
                                   setTempGroupName(group.nome_grupo || '');
                                 }}
                                 className="shrink-0 p-1 text-slate-300 active:text-blue-500 rounded-lg bg-slate-50 transition-colors"
                                >
                                 <Edit2 className="w-2.5 h-2.5" />
                               </button>
                             </div>
                           )}
                           <div className="flex items-center gap-2">
                             <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                setNicheEditCoords(calculateDropdownPos(rect, 320, 224));
                                setEditingGroupNicheId(group.id);
                                setIsCreatingNewNiche(false);
                              }}
                              className="text-[9px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100 active:bg-slate-100 transition-colors flex items-center gap-1"
                             >
                              {group.nicho || 'Geral'}
                              <Edit2 className="w-2 h-2 opacity-50" />
                             </button>

                             <div className="w-1 h-1 rounded-full bg-slate-200" />
                             <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                               {formatNumber(group.quantidade_membros || 0)} MEMBROS
                             </span>
                           </div>

                           {/* Mobile Search Diagnostic */}
                           {searchTerm && (normalizeSearchText(group.link_grupo || '').includes(normalizeSearchText(searchTerm)) || String(group.group_id).includes(extractFacebookGroupId(searchTerm))) && (
                             <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                               <div className="flex items-center gap-2 mb-1">
                                 <AlertCircle className="w-3 h-3 text-blue-500" />
                                 <span className="text-[8px] font-black uppercase text-blue-600 tracking-[0.1em]">Diagnóstico de Filtros</span>
                               </div>
                               <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[8px] font-bold text-slate-500">
                                 <div className="flex justify-between items-center gap-1">
                                   <span className="shrink-0">Nicho Salvo:</span>
                                   <span className={cn("text-slate-900 font-extrabold truncate", normalizeNicho(group.nicho) !== normalizeNicho(nichoFilter) && nichoFilter !== 'Todos' && "text-rose-500 underline decoration-rose-300 underline-offset-2")}>
                                     {group.nicho || 'Geral'}
                                   </span>
                                 </div>
                                 <div className="flex justify-between items-center gap-1">
                                   <span className="shrink-0">Status:</span>
                                   <span className={cn("text-slate-900 font-extrabold", statusFilter !== 'Todos' && getEffectiveStatus(group) !== statusFilter && "text-rose-500 underline decoration-rose-300 underline-offset-2")}>
                                     {getEffectiveStatus(group)}
                                   </span>
                                 </div>
                                 <div className="flex justify-between items-center gap-1">
                                   <span className="shrink-0">Perfil:</span>
                                   <span className={cn("text-slate-900 font-extrabold", perfilFilter !== 'Todos' && (group.perfil_compartilhando || 'Inativo') !== perfilFilter && "text-rose-500 underline decoration-rose-300 underline-offset-2")}>
                                     {group.perfil_compartilhando || 'Inativo'}
                                   </span>
                                 </div>
                                 <div className="flex justify-between items-center gap-1">
                                   <span className="shrink-0">Shopee:</span>
                                   <span className={cn("text-slate-900 font-extrabold", shopeeFilter !== 'Todos' && (group.uso_shopee || 'Inativo') !== shopeeFilter && "text-rose-500 underline decoration-rose-300 underline-offset-2")}>
                                     {group.uso_shopee || 'Inativo'}
                                   </span>
                                 </div>
                               </div>
                               <div className="pt-1 flex gap-1.5">
                                 <button 
                                   onClick={(e) => {
                                     e.stopPropagation();
                                     const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                     setNicheEditCoords(calculateDropdownPos(rect, 320, 224));
                                     setEditingGroupNicheId(group.id);
                                     setIsCreatingNewNiche(false);
                                   }}
                                   className="flex-1 py-2 bg-blue-500 text-white rounded-lg text-[8px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all active:scale-95 flex items-center justify-center gap-1"
                                 >
                                   <Edit2 className="w-2.5 h-2.5" />
                                   Corrigir Nicho
                                 </button>
                                 <button 
                                   onClick={(e) => {
                                     e.stopPropagation();
                                     setNichoFilter('Todos');
                                     setStatusFilter('Todos');
                                     setPerfilFilter('Todos');
                                     setShopeeFilter('Todos');
                                     setPriorityFilter('Todos');
                                     setRenterFilter('Todos');
                                   }}
                                   className="flex-1 py-2 bg-white border border-slate-200 text-slate-500 rounded-lg text-[8px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all active:scale-95 flex items-center justify-center gap-1"
                                 >
                                   <X className="w-2.5 h-2.5" />
                                   Limpar Filtros
                                 </button>
                               </div>
                             </div>
                           )}
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
                            onRenew={() => setRenewModalGroup(group)}
                            onQuickRenew={() => handleRenew(group)}
                          />
                        </div>
                     </div>

                     <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-widest px-1">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400 italic">Vencimento:</span>
                          <ExpiryBadge 
                            dareStr={group.data_vencimento || ''} 
                            status={getEffectiveStatus(group)} 
                            group={group}
                            onRenew={(g) => setRenewModalGroup(g)}
                            compact 
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          {group.link_grupo ? (
                            <a 
                              href={normalizeFacebookGroupLink(group)} 
                              target="_blank" 
                              rel="noreferrer"
                              className="bg-blue-50 text-blue-600 px-3 py-1.5 rounded-full border border-blue-100 flex items-center gap-1.5"
                            >
                              LINK <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          ) : (
                            <span className="text-slate-400 italic">Sem Link</span>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingGroupLinkId(group.id);
                              setTempGroupLink(group.link_grupo || '');
                            }}
                            className="p-1.5 text-slate-300 active:text-blue-500 rounded-lg bg-slate-50 transition-colors"
                          >
                            <Edit2 className="w-2.5 h-2.5" />
                          </button>
                        </div>
                     </div>

                     {editingGroupLinkId === group.id && (
                       <div className="mt-3 bg-blue-50 p-4 rounded-2xl border border-blue-100 animate-in fade-in slide-in-from-top-2 duration-300 relative z-[60]">
                         <label className="text-[9px] font-black uppercase text-blue-400 tracking-widest mb-2 block">Editar Link do Grupo</label>
                         <div className="flex gap-2">
                           <input
                             autoFocus
                             type="url"
                             value={tempGroupLink}
                             onChange={(e) => setTempGroupLink(e.target.value)}
                             placeholder="Cole o novo link aqui..."
                             className="flex-1 px-3 py-2 bg-white border border-blue-200 rounded-xl text-xs font-bold focus:outline-none"
                           />
                           <div className="flex gap-1">
                             <button
                               onClick={() => handleSaveGroupLink(group.id)}
                               disabled={isSavingLink}
                               className="px-4 bg-blue-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-100 active:scale-95 disabled:opacity-50"
                             >
                               {isSavingLink ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Salvar"}
                             </button>
                             <button
                               onClick={() => setEditingGroupLinkId(null)}
                               className="p-2 bg-white text-slate-400 rounded-xl border border-slate-200 active:scale-95"
                             >
                               <X className="w-4 h-4" />
                             </button>
                           </div>
                          </div>
                        </div>
                      )}
                      <div className="pt-2 border-t border-slate-50">
                        <div className="grid grid-cols-2 gap-2">
                          <button 
                            onClick={() => handleToggleField(group, 'perfil')}
                            className={cn(
                              "flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl border transition-all active:scale-95",
                              group.perfil_compartilhando === 'Ativo' 
                                ? "bg-emerald-50 border-emerald-100 text-emerald-700" 
                                : "bg-slate-50 border-slate-100 text-slate-400"
                            )}
                          >
                             <div className={cn("w-1.5 h-1.5 rounded-full",
                               group.perfil_compartilhando === 'Ativo' ? "bg-emerald-500" : "bg-rose-400"
                             )} />
                             <span className="text-[9px] font-black uppercase">Normal</span>
                          </button>
                          <button 
                            onClick={() => handleToggleField(group, 'shopee')}
                            className={cn(
                              "flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl border transition-all active:scale-95",
                              group.uso_shopee === 'Ativo' 
                                ? "bg-blue-50 border-blue-100 text-blue-700" 
                                : "bg-slate-50 border-slate-100 text-slate-400"
                            )}
                          >
                             <div className={cn("w-1.5 h-1.5 rounded-full",
                               group.uso_shopee === 'Ativo' ? "bg-blue-500" : "bg-slate-300"
                             )} />
                             <span className="text-[9px] font-black uppercase">Shopee</span>
                          </button>
                        </div>
                      </div>
                      <div className="border-t border-slate-50 pt-2 flex flex-col gap-2">
                        <div className="flex justify-center mb-1">
                          <SuggestedRentDisplay 
                            group={group} 
                            onApply={(val) => handleApplySuggestedRent(group, val)} 
                            compact
                          />
                        </div>
                        {(() => {
                           const mergedLocatarios = getMergedLocatarios(group);
                           const activeLocatarios = mergedLocatarios.filter(l => l.status === 'Ativo');
                           const hasActive = activeLocatarios.length > 0;
                           const isDropdownOpen = openRenterDropdownId === group.id + '-mobile';

                           if (mergedLocatarios.length > 0) {
                             return (
                               <div className="relative w-full">
                                 <button
                                   onClick={(e) => {
                                     e.stopPropagation();
                                     if (isDropdownOpen) {
                                       setOpenRenterDropdownId(null);
                                     } else {
                                       const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                       setRenterEditCoords(calculateDropdownPos(rect, 300, 260));
                                       setOpenRenterDropdownId(group.id + '-mobile');
                                     }
                                   }}
                                   className={cn(
                                     "w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 border",
                                     hasActive 
                                       ? "bg-emerald-50 text-emerald-700 border-emerald-100" 
                                       : "bg-slate-50 text-slate-400 border-slate-100"
                                   )}
                                 >
                                   <Users className="w-3 h-3" />
                                   {hasActive ? `ALUGADO` : `INATIVO`}
                                   <ChevronDown className={cn("w-2.5 h-2.5 transition-transform duration-300", isDropdownOpen && "rotate-180")} />
                                 </button>

                                 <AnimatePresence>
                                   {/* Portal rendering handled globally at the bottom */}
                                 </AnimatePresence>
                               </div>
                             );
                           }

                           return (
                             <button
                               onClick={(e) => {
                                 e.stopPropagation();
                                 setLocatarioGroup(group);
                                 setEditingLocatario(null);
                                 setIsLocatarioModalOpen(true);
                               }}
                               className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest bg-emerald-50 text-primary border border-emerald-100 shadow-sm transition-all"
                             >
                                <UserPlus className="w-3 h-3" />
                                Disponível
                             </button>
                           );
                        })()}
                     </div>

                     {group.link_grupo && (
                        <a 
                          href={ensureAbsoluteUrl(group.link_grupo)} 
                          target="_blank" 
                          rel="noreferrer"
                          className="w-full flex items-center justify-center gap-2 bg-slate-900 border border-slate-800 text-white font-black uppercase tracking-widest text-[9px] py-2.5 rounded-xl hover:bg-slate-800 transition-all shadow-sm"
                        >
                          Acessar Grupo <ExternalLink className="w-3 h-3" />
                        </a>
                     )}
                   </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        </div>
      </div>
    </div>

      {filteredGroups.length === 0 && (
        <div className="bg-white p-12 rounded-[2rem] border border-dashed border-gray-200 text-center mx-4 my-8">
          <p className="text-gray-400 font-medium italic">Nenhum grupo encontrado com os filtros atuais.</p>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDeleteId && createPortal(
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[100000] flex items-center justify-center p-4 overflow-y-auto pointer-events-auto" onClick={(e) => e.stopPropagation()}>
          <div className="fixed inset-0 pointer-events-auto" onClick={() => setConfirmDeleteId(null)} />
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl text-center relative z-[100001] pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Trash2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-2 uppercase tracking-tight">Excluir Grupo?</h3>
            <p className="text-slate-500 text-sm font-bold mb-8">Esta ação não pode ser desfeita. Tem certeza que deseja remover este grupo?</p>
            <div className="flex gap-3">
              <button 
                onClick={() => setConfirmDeleteId(null)}
                className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition-all active:scale-95 uppercase text-[10px] tracking-widest"
              >
                Cancelar
              </button>
              <button 
                onClick={() => {
                  onDelete(confirmDeleteId);
                  setConfirmDeleteId(null);
                  setToast({ message: "Grupo excluído com sucesso", type: 'success' });
                }}
                className="flex-1 py-3.5 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-xl transition-all shadow-lg shadow-rose-100 active:scale-95 uppercase text-[10px] tracking-widest"
              >
                Excluir
              </button>
            </div>
          </motion.div>
        </div>,
        document.body
      )}

      {/* Quick Niche Edit Dropdown */}
      {editingGroupNicheId && createPortal(
        <>
          <div className="fixed inset-0 z-[100002]" onClick={() => setEditingGroupNicheId(null)} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: nicheEditCoords.openUp ? 10 : -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            style={{ 
              position: 'fixed', 
              top: nicheEditCoords.top, 
              left: nicheEditCoords.left,
              zIndex: 100003
            }}
            className="w-56 bg-white rounded-2xl border border-slate-100 shadow-2xl overflow-hidden p-2"
          >
            {!isCreatingNewNiche ? (
              <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                <div className="p-2 text-[8px] font-black uppercase tracking-[0.2em] text-slate-400 border-b border-slate-50 mb-1">
                  NICHOS EXISTENTES
                </div>
                {allAvailableNiches.map(niche => (
                  <button
                    key={niche}
                    onClick={() => {
                      const group = groups.find(g => g.id === editingGroupNicheId);
                      if (group) handleUpdateNiche(group, niche);
                      setEditingGroupNicheId(null);
                      setToast({ message: "Nicho atualizado!", type: 'success' });
                    }}
                    className="w-full text-left px-3 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-emerald-50 hover:text-emerald-600 rounded-xl transition-all"
                  >
                    {niche}
                  </button>
                ))}
                <button
                  onClick={() => setIsCreatingNewNiche(true)}
                  className="w-full text-left px-3 py-2.5 text-[10px] font-black uppercase tracking-widest text-blue-600 hover:bg-blue-50 bg-blue-50/20 rounded-xl transition-all mt-1 flex items-center gap-2"
                >
                  <Plus className="w-3 h-3" />
                  Criar Novo Nicho
                </button>
              </div>
            ) : (
              <div className="p-2 space-y-3">
                <div className="text-[8px] font-black uppercase tracking-[0.2em] text-blue-600">
                  NOVO NICHO
                </div>
                <input
                  autoFocus
                  type="text"
                  placeholder="Digite o nicho..."
                  value={newNicheInputValue}
                  onChange={(e) => setNewNicheInputValue(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold focus:outline-none focus:border-blue-300"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setIsCreatingNewNiche(false);
                      setNewNicheInputValue('');
                    }}
                    className="flex-1 py-2 text-[8px] font-black uppercase tracking-widest text-slate-400 bg-slate-50 rounded-lg hover:bg-slate-100"
                  >
                    Voltar
                  </button>
                  <button
                    onClick={async () => {
                      const cleanNiche = newNicheInputValue.trim();
                      if (!cleanNiche) return;
                      
                      try {
                        // Check if it's already in the available list (case insensitive)
                        if (!allAvailableNiches.some(n => n.toLowerCase() === cleanNiche.toLowerCase())) {
                          await adicionarNicho(cleanNiche);
                          await loadNichos(); // Reload to update dropdowns
                        }
                        
                        const group = groups.find(g => g.id === editingGroupNicheId);
                        if (group) {
                           await handleUpdateNiche(group, cleanNiche);
                           setToast({ message: "Novo nicho criado e aplicado!", type: 'success' });
                        }
                      } catch (error: any) {
                        console.error("Erro ao criar nicho:", error);
                        setToast({ message: error.message || "Erro ao criar nicho", type: 'error' });
                      } finally {
                        setEditingGroupNicheId(null);
                        setNewNicheInputValue('');
                        setIsCreatingNewNiche(false);
                      }
                    }}
                    className="flex-1 py-2 text-[8px] font-black uppercase tracking-widest text-white bg-blue-500 rounded-lg shadow-sm"
                  >
                    Salvar
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </>,
        document.body
      )}

      {/* Quick Sale Status Dropdown */}
      {editingSaleStatusId && createPortal(
        <>
          <div className="fixed inset-0 z-[100002]" onClick={() => setEditingSaleStatusId(null)} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: saleEditCoords.openUp ? 10 : -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            style={{ 
              position: 'fixed', 
              top: saleEditCoords.top, 
              left: saleEditCoords.left,
              zIndex: 100003
            }}
            className="w-56 bg-white rounded-2xl border border-slate-100 shadow-2xl overflow-hidden p-2"
          >
            <div className="p-2 text-[8px] font-black uppercase tracking-[0.2em] text-slate-400 border-b border-slate-50 mb-1">
              OPÇÕES DE VENDA
            </div>
            <button
              onClick={() => {
                setEditingSaleStatusId(null);
                setToast({ message: "Consulte a aba de Vendas para detalhes", type: 'success' });
              }}
              className="w-full text-left px-3 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 hover:text-primary rounded-xl transition-all flex items-center gap-2"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Ver na lista de venda
            </button>
            <button
              onClick={() => {
                const group = groups.find(g => g.id === editingSaleStatusId);
                if (group) handleRemoveFromSale(group);
                setEditingSaleStatusId(null);
              }}
              className="w-full text-left px-3 py-2.5 text-[10px] font-black uppercase tracking-widest text-rose-600 hover:bg-rose-50 rounded-xl transition-all mt-1 flex items-center gap-2"
            >
              <XCircle className="w-3.5 h-3.5" />
              Remover da venda
            </button>
          </motion.div>
        </>,
        document.body
      )}

      {openRenterDropdownId && createPortal(
        <>
          <div className="fixed inset-0 z-[100002]" onClick={() => setOpenRenterDropdownId(null)} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: renterEditCoords.openUp ? 20 : -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            style={{ 
              position: 'fixed', 
              top: renterEditCoords.top, 
              left: renterEditCoords.left,
              zIndex: 100003
            }}
            className="w-64 bg-white rounded-3xl border border-slate-100 shadow-2xl overflow-hidden"
          >
            {(() => {
              const baseId = openRenterDropdownId.replace('-mobile', '');
              const group = groups.find(g => g.id === baseId);
              if (!group) return null;
              
              const mergedLocatarios = getMergedLocatarios(group);
              const isMobile = openRenterDropdownId.endsWith('-mobile');

              return (
                <div className="p-2 max-h-[300px] overflow-y-auto">
                  {mergedLocatarios.map((l, idx) => (
                    <div 
                      key={l.id || idx} 
                      className={cn(
                        "group/item flex flex-col p-3 hover:bg-slate-50 rounded-2xl transition-all border border-transparent hover:border-slate-100 mt-1",
                        isMobile && "bg-slate-50/50 mb-1 border-slate-100 hover:bg-white"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <span className={cn(
                            "text-xs font-black uppercase tracking-tight block truncate",
                            l.status === 'Ativo' ? "text-slate-900" : "text-slate-400 font-bold"
                          )}>
                            {l.nome}
                          </span>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[9px] text-slate-400 font-bold font-mono">{l.whatsapp}</span>
                            {isMobile && l.valor && (
                              <>
                                <div className="w-1 h-1 rounded-full bg-slate-200" />
                                <span className="text-[10px] font-black text-emerald-600 font-mono">{formatCurrency(Number(l.valor))}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRenew(group, l.id);
                              setOpenRenterDropdownId(null);
                            }}
                            className="p-1.5 text-slate-400 hover:text-emerald-500 rounded-lg hover:bg-white transition-all shadow-sm bg-white md:bg-transparent"
                            title="Renovar Aluguel"
                          >
                            <RotateCcw className="w-3.5 h-3.5 md:w-3 md:h-3" />
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setLocatarioGroup(group);
                              setEditingLocatario(l);
                              setIsLocatarioModalOpen(true);
                              setOpenRenterDropdownId(null);
                            }}
                            className="p-1.5 text-slate-400 hover:text-amber-500 rounded-lg hover:bg-white transition-all shadow-sm bg-white md:bg-transparent"
                          >
                            <Edit2 className="w-3.5 h-3.5 md:w-3 md:h-3" />
                          </button>
                          {isMobile && (
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteLocatario(group, l.id);
                              }}
                              className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg bg-white shadow-sm"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                      <div className={cn(
                        "mt-1 flex items-center justify-between",
                        isMobile && "mt-2"
                      )}>
                        <span className="text-[8px] font-bold text-slate-300">
                          {isMobile ? 'Vence ' : ''}{l.data_vencimento ? format(parseISO(l.data_vencimento), 'dd/MM') : 'N/D'}
                        </span>
                        <span className={cn(
                          "text-[7px] font-black uppercase px-2 py-0.5 rounded-full border",
                          l.status === 'Ativo' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-slate-50 text-slate-400 border-slate-100"
                        )}>
                          {l.status}
                        </span>
                      </div>
                    </div>
                  ))}
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setLocatarioGroup(group);
                      setEditingLocatario(null);
                      setIsLocatarioModalOpen(true);
                      setOpenRenterDropdownId(null);
                    }}
                    className={cn(
                      "w-full flex items-center justify-center gap-2 py-3 mt-1 text-[9px] font-black text-blue-500 uppercase tracking-widest transition-all rounded-2xl border border-dashed",
                      isMobile ? "bg-blue-50/30 border-blue-100" : "hover:bg-blue-50/50 border-blue-100 hover:border-solid"
                    )}
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    {isMobile ? 'Adicionar' : 'Novo'} Locatário
                  </button>
                </div>
              );
            })()}
          </motion.div>
        </>,
        document.body
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

          {/* Renovação Modal - Confirmação Simples */}
          <AnimatePresence>
            {renewModalGroup && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setRenewModalGroup(null)}
                  className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 20 }}
                  className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100 z-[101]"
                >
                  <div className="p-8">
                    <div className="flex items-center gap-5 mb-8">
                      <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center border border-emerald-100 shrink-0">
                        <RotateCcw className="w-8 h-8 text-emerald-600" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Renovar Aluguel</h3>
                        <p className="text-slate-500 font-bold text-sm tracking-tight">{renewModalGroup.nome_grupo}</p>
                      </div>
                    </div>

                    <div className="space-y-4 bg-slate-50/50 p-6 rounded-[2rem] border border-slate-100 mb-8">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400 font-black uppercase tracking-widest text-[10px]">Locatário</span>
                        <span className="text-slate-900 font-black tracking-tight">{renewModalGroup.locatario || (renewModalGroup.locatarios?.[0]?.nome) || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400 font-black uppercase tracking-widest text-[10px]">Vencimento Atual</span>
                        <span className="text-slate-500 font-bold font-mono">
                          {renewModalGroup.data_vencimento ? format(parseISO(renewModalGroup.data_vencimento), 'dd/MM/yyyy') : 'N/A'}
                        </span>
                      </div>
                      <div className="pt-4 border-t border-slate-200 mt-2">
                        <div className="flex justify-between items-center">
                          <span className="text-emerald-600 font-black uppercase tracking-widest text-[10px]">Novo Vencimento (+30 d)</span>
                          <span className="text-emerald-700 font-black font-mono text-xl">
                            {(() => {
                              const today = startOfDay(new Date());
                              const current = renewModalGroup.data_vencimento ? parseISO(renewModalGroup.data_vencimento) : today;
                              const base = isBefore(current, today) ? today : current;
                              return format(addDays(base, 30), 'dd/MM/yyyy');
                            })()}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <button
                        onClick={() => setRenewModalGroup(null)}
                        className="py-4 bg-slate-100 text-slate-500 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={async () => {
                          const group = renewModalGroup;
                          setRenewModalGroup(null);
                          try {
                            await handleRenew(group);
                            setToast({ message: "Aluguel renovado com sucesso!", type: 'success' });
                          } catch (e) {
                            setToast({ message: "Erro ao renovar", type: 'error' });
                          }
                        }}
                        className="py-4 bg-emerald-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-emerald-700 shadow-lg shadow-emerald-100 transition-all active:scale-95 flex items-center justify-center gap-2"
                      >
                        Confirmar
                      </button>
                    </div>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* Renovação em Lote Modal */}
          <AnimatePresence>
            {isRenewBatchModalOpen && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsRenewBatchModalOpen(false)}
                  className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 20 }}
                  className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100 z-[101]"
                >
                  <div className="p-8 text-center">
                    <div className="w-20 h-20 bg-emerald-600 rounded-3xl flex items-center justify-center border border-emerald-700 shrink-0 shadow-lg shadow-emerald-100 mx-auto mb-6">
                      <RotateCcw className="w-10 h-10 text-white" />
                    </div>
                    
                    <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight mb-2">Renovação em Lote</h3>
                    <p className="text-slate-500 font-bold text-sm tracking-tight mb-8">
                      Deseja renovar o aluguel de <span className="text-emerald-600 font-black">{selectedGroupIds.size} grupos</span> selecionados?
                    </p>

                    <div className="p-6 rounded-2xl border-2 border-emerald-50 bg-emerald-50/30 mb-8 text-left">
                      <p className="text-xs font-bold text-slate-600 leading-relaxed uppercase tracking-widest text-center opacity-40 mb-3">Impacto da Renovação:</p>
                      <div className="space-y-3">
                        <div className="flex items-start gap-3">
                          <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 mt-0.5">
                            <CheckCircle2 className="w-3 h-3" />
                          </div>
                          <p className="text-[11px] font-bold text-slate-600">+30 dias adicionados ao vencimento.</p>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 mt-0.5">
                            <CheckCircle2 className="w-3 h-3" />
                          </div>
                          <p className="text-[11px] font-bold text-slate-600">Status atualizado para 'Alugado'.</p>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 mt-0.5">
                            <CheckCircle2 className="w-3 h-3" />
                          </div>
                          <p className="text-[11px] font-bold text-slate-600">Histórico registrado em cada grupo.</p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <button
                        onClick={() => setIsRenewBatchModalOpen(false)}
                        className="py-4 bg-slate-100 text-slate-500 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={() => handleRenewBatch(30)}
                        className="py-4 bg-emerald-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition-all active:scale-95 flex items-center justify-center gap-2"
                      >
                        {processingAction ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <RotateCcw className="w-4 h-4" />}
                        Confirmar Todos
                      </button>
                    </div>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* Modal Alterar Miniatura */}
          <AnimatePresence>
            {thumbnailModalGroup && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[100]"
                  onClick={() => setThumbnailModalGroup(null)}
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 20 }}
                  className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-[2.5rem] p-8 shadow-2xl z-[101]"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h3 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                        <Camera className="w-6 h-6 text-primary" />
                        Alterar Miniatura
                      </h3>
                      <p className="text-slate-400 font-bold text-xs mt-1">Insira a URL da imagem para o grupo</p>
                    </div>
                    <button
                      onClick={() => setThumbnailModalGroup(null)}
                      className="p-3 bg-slate-50 text-slate-400 hover:text-slate-600 rounded-2xl transition-all"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-4 italic">
                        URL da Imagem
                      </label>
                      <input
                        type="url"
                        placeholder="https://exemplo.com/imagem.jpg"
                        className="w-full bg-slate-50 border border-slate-100 px-6 py-4 rounded-2xl font-bold text-sm text-slate-600 placeholder:text-slate-300 focus:ring-4 focus:ring-blue-50 focus:border-blue-200 outline-none transition-all"
                        value={newThumbnailUrl}
                        onChange={(e) => setNewThumbnailUrl(e.target.value)}
                        autoFocus
                      />
                    </div>

                    {/* Preview */}
                    {newThumbnailUrl && newThumbnailUrl.startsWith('http') && (
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <span className="block text-[8px] font-black uppercase text-slate-400 mb-2 ml-1">Prévia:</span>
                        <div className="w-20 h-20 rounded-xl overflow-hidden border border-white shadow-sm mx-auto">
                          <img 
                            src={newThumbnailUrl} 
                            alt="Preview" 
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        </div>
                      </div>
                    )}

                    <div className="flex gap-4 pt-4">
                      <button
                        onClick={() => setThumbnailModalGroup(null)}
                        className="flex-1 py-4 rounded-2xl font-black uppercase tracking-widest text-xs text-slate-400 bg-slate-50 hover:bg-slate-100 transition-all active:scale-95"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleSaveThumbnail}
                        disabled={isUpdatingThumbnail}
                        className="flex-1 bg-primary py-4 rounded-2xl font-black uppercase tracking-widest text-xs text-white shadow-lg shadow-green-100 hover:bg-accent transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {isUpdatingThumbnail ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4" />
                        )}
                        Salvar
                      </button>
                    </div>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}

function MoreActionsDropdown({ group, onEdit, onDelete, onMarkForSale, onCopyResume, onAddLocatario, onRenew, onQuickRenew }: any) {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0, direction: 'down' as 'up' | 'down' });

  const updateCoords = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const menuHeight = 280;
      const menuWidth = 224; // w-56
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const shouldOpenUp = spaceBelow < menuHeight && spaceAbove > menuHeight;

      setCoords({
        top: shouldOpenUp ? rect.top - menuHeight - 8 : rect.bottom + 8,
        left: Math.max(8, Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 8)),
        direction: shouldOpenUp ? 'up' : 'down'
      });
    }
  };

  useEffect(() => {
    if (isOpen) {
      const handleScrollResize = () => setIsOpen(false);
      window.addEventListener('scroll', handleScrollResize, { passive: true });
      window.addEventListener('resize', handleScrollResize, { passive: true });
      return () => {
        window.removeEventListener('scroll', handleScrollResize);
        window.removeEventListener('resize', handleScrollResize);
      };
    }
  }, [isOpen]);

  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <button 
        ref={buttonRef}
        onClick={(e) => {
          e.stopPropagation();
          updateCoords();
          setIsOpen(!isOpen);
        }}
        className="p-1 px-2 bg-white border border-slate-200/60 rounded-lg hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition-all active:scale-95 hover:border-slate-300"
      >
        <MoreVertical className="w-3 h-3" />
      </button>

      {isOpen && createPortal(
        <>
          <div 
            className="fixed inset-0 z-[9998] cursor-default pointer-events-auto" 
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
            }} 
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: coords.direction === 'down' ? -10 : 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: coords.direction === 'down' ? -10 : 10 }}
            onClick={(e) => e.stopPropagation()}
            style={{ 
              position: 'fixed',
              top: coords.top,
              left: coords.left,
            }}
            className="w-56 bg-white rounded-2xl border border-slate-100 shadow-2xl z-[99999] overflow-hidden p-2 pointer-events-auto"
          >
            <button 
              onClick={(e) => { e.stopPropagation(); onEdit(); setIsOpen(false); }}
              className="w-full flex items-center gap-3 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 hover:text-primary rounded-xl transition-all"
            >
              <Edit2 className="w-3.5 h-3.5" />
              Editar Grupo
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onRenew(); setIsOpen(false); }}
              className="w-full flex items-center gap-3 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 hover:text-emerald-500 rounded-xl transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Renovar Aluguel
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onQuickRenew(); setIsOpen(false); }}
              className="w-full flex items-center gap-3 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 hover:text-emerald-600 rounded-xl transition-all"
            >
              <CalendarClock className="w-3.5 h-3.5" />
              Renovar +30 dias
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onAddLocatario(); setIsOpen(false); }}
              className="w-full flex items-center gap-3 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 hover:text-blue-500 rounded-xl transition-all"
            >
              <UserPlus className="w-3.5 h-3.5" />
              + Locatário
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onMarkForSale(); setIsOpen(false); }}
              className="w-full flex items-center gap-3 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 hover:text-amber-600 rounded-xl transition-all"
            >
              <Tag className="w-3.5 h-3.5" />
              Vender Grupo
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onCopyResume(); setIsOpen(false); }}
              className="w-full flex items-center gap-3 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 hover:text-indigo-600 rounded-xl transition-all"
            >
              <Copy className="w-3.5 h-3.5" />
              Copiar Resumo
            </button>
            <div className="h-px bg-slate-50 my-1" />
            <button 
              onClick={(e) => { 
                e.stopPropagation(); 
                onDelete(); 
                setIsOpen(false); 
              }}
              className="w-full flex items-center gap-3 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Excluir Grupo
            </button>
          </motion.div>
        </>,
        document.body
      )}
    </div>
  );
}

function SuggestedRentDisplay({ group, onApply, compact = false }: { group: Group, onApply: (val: number) => void, compact?: boolean }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const suggestion = calcularValorSugeridoAluguel(group);

  if (compact) {
    return (
      <div className="flex items-center gap-1.5">
        <div 
          className="relative cursor-help"
          onClick={(e) => {
            e.stopPropagation();
            setShowTooltip(!showTooltip);
          }}
        >
          <div className="bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full border border-emerald-100 flex items-center gap-1.5 shadow-sm active:bg-emerald-100 transition-all">
            <Sparkles className="w-2.5 h-2.5 text-emerald-400" />
            <div className="flex flex-col -space-y-0.5 leading-none">
              <span className="text-[6px] font-black uppercase tracking-tight text-emerald-400">Aluguel Sugerido</span>
              <span className="text-[9px] font-black font-mono">{formatCurrency(suggestion.valorSugeridoAluguel)}/mês</span>
            </div>
          </div>
          
          <AnimatePresence>
            {showTooltip && (
              <>
                <div className="fixed inset-0 z-[100]" onClick={(e) => { e.stopPropagation(); setShowTooltip(false); }} />
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-slate-900 text-white p-3 rounded-2xl text-[10px] shadow-2xl z-[101]"
                  onClick={(e) => e.stopPropagation()}
                >
                  <p className="font-black mb-1 text-emerald-400 uppercase tracking-widest text-[8px]">Justificativa de Aluguel:</p>
                  <p className="font-bold text-slate-200 leading-tight">Valor sugerido para aluguel mensal deste grupo. {suggestion.justificativa}</p>
                  <div className="mt-2 pt-2 border-t border-slate-800 text-slate-400 font-bold italic text-[8px]">
                    {suggestion.faixa}
                  </div>
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-900" />
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
        
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onApply(suggestion.valorSugeridoAluguel);
          }}
          className="text-[8px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-2 py-1 rounded-full border border-blue-100 active:scale-95 transition-all"
        >
          Usar Aluguel
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <div 
        className="relative cursor-help"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onClick={(e) => {
          e.stopPropagation();
          setShowTooltip(!showTooltip);
        }}
      >
        <div className="bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-xl border border-emerald-100 flex flex-col items-center shadow-sm hover:bg-emerald-100 transition-all min-w-[80px]">
          <span className="text-[7px] font-black uppercase tracking-tight text-emerald-400 leading-none mb-0.5">Aluguel Sugerido</span>
          <span className="text-[11px] font-black font-mono">{formatCurrency(suggestion.valorSugeridoAluguel)}/mês</span>
        </div>
        
        <AnimatePresence>
          {showTooltip && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 bg-slate-900 text-white p-4 rounded-[1.5rem] text-[10px] shadow-2xl z-50 pointer-events-none"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <p className="font-black text-emerald-400 uppercase tracking-widest text-[9px]">Análise de Aluguel Mensal</p>
              </div>
              <p className="font-bold text-slate-200 leading-relaxed mb-3">Valor sugerido para aluguel mensal deste grupo. {suggestion.justificativa}</p>
              <div className="bg-slate-800/50 p-2 rounded-xl text-slate-400 font-bold italic text-[8px] border border-slate-800">
                {suggestion.faixa}
              </div>
              <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-900" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      <button 
        onClick={(e) => {
          e.stopPropagation();
          onApply(suggestion.valorSugeridoAluguel);
        }}
        className="text-[9px] font-black text-blue-500 uppercase tracking-widest hover:text-blue-700 active:scale-95 transition-all flex items-center gap-1.5 bg-blue-50/50 px-3 py-1 rounded-full border border-blue-100"
      >
        <CheckCircle2 className="w-3 h-3" />
        Usar valor de Aluguel
      </button>
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
        "flex items-center gap-2 md:gap-3 bg-white px-3 md:px-3.5 h-9 lg:h-10 rounded-xl border transition-all group w-full lg:w-auto xl:flex-1 min-w-[120px] cursor-pointer outline-none relative",
        value !== 'Todos' ? "border-green-200 bg-green-50/10 shadow-sm shadow-green-50" : "border-slate-100 shadow-sm hover:border-green-200"
      )}
    >
      <Filter className={cn(
        "w-3 md:w-3.5 h-3 md:h-3.5 shrink-0 transition-colors",
        value !== 'Todos' ? "text-primary" : "text-slate-300 group-hover:text-primary"
      )} />
      <div className="flex items-center gap-1.5 md:gap-2 flex-1 min-w-0 pointer-events-none">
        <span className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none shrink-0">{label}:</span>
        <select 
          ref={selectRef}
          value={value}
          onChange={e => {
            e.stopPropagation();
            onChange(e.target.value);
          }}
          onClick={e => e.stopPropagation()}
          className={cn(
            "appearance-none bg-transparent border-0 focus:ring-0 p-0 text-[9px] font-black uppercase tracking-widest text-primary cursor-pointer w-full truncate pointer-events-auto pr-6",
            isCapitalize && "capitalize"
          )}
        >
          {options.map((opt: string) => (
            <option key={opt} value={opt} className={cn("bg-white text-slate-900", isCapitalize && "capitalize")}>{opt}</option>
          ))}
        </select>
      </div>
      <ChevronDown className={cn(
        "w-3 h-3 absolute right-4 pointer-events-none transition-colors",
        value !== 'Todos' ? "text-emerald-500" : "text-slate-300 group-hover:text-emerald-400"
      )} />
    </div>
  );
}

function ExpiryBadge({ dareStr, status, group, onRenew, compact = false }: { dareStr: string, status: string, group?: Group, onRenew?: (g: Group) => void, compact?: boolean }) {
  if (status !== 'Alugado' || !dareStr) return <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">-</span>;
  
  const date = parseISO(dareStr);
  const isVenceHoje = isToday(date);
  const isVenceAmanha = isTomorrow(date);
  const isVencido = isPast(date) && !isVenceHoje;

  const colorClass = isVencido ? "text-rose-600" : isVenceHoje ? "text-rose-600" : isVenceAmanha ? "text-amber-600" : "text-slate-600";
  const bgClass = isVencido ? "bg-rose-50 border-rose-100 shadow-rose-50" : isVenceHoje ? "bg-rose-50 border-rose-100 shadow-rose-50" : isVenceAmanha ? "bg-amber-50 border-amber-100 shadow-amber-50" : "bg-slate-50 border-slate-100";

  return (
    <div className={cn(
      "flex flex-col group/expiry",
      compact ? "items-end" : "items-end"
    )}>
      <div className="flex items-center gap-1.5">
        {group && onRenew && (isVenceHoje || isVenceAmanha || isVencido) && (
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onRenew(group);
            }}
            className="w-5 h-5 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center border border-emerald-100 hover:bg-emerald-600 hover:text-white transition-all opacity-0 group-hover/expiry:opacity-100 active:scale-95"
            title="Renovar Aluguel"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        )}
        <span className={cn(
          "text-[10px] font-black font-mono tracking-tighter",
          colorClass
        )}>
          {format(date, 'dd/MM/yyyy')}
        </span>
      </div>
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
