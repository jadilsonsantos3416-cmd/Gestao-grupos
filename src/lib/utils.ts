import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(num: number | null | undefined): string {
  if (num === null || num === undefined) return '-';
  return new Intl.NumberFormat('pt-BR').format(num);
}

export function formatCurrency(num: number | null | undefined): string {
  if (num === null || num === undefined) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(num);
}

export function exportToCSV(data: any[], filename: string) {
  if (data.length === 0) return;

  const headers = Object.keys(data[0]);
  const csvRows = [];

  // Add headers
  csvRows.push(headers.join(','));

  // Add data rows
  for (const row of data) {
    const values = headers.map(header => {
      const val = row[header];
      const escaped = ('' + val).replace(/"/g, '\\"');
      return `"${escaped}"`;
    });
    csvRows.push(values.join(','));
  }

  const csvContent = csvRows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function ensureAbsoluteUrl(link: string): string {
  if (!link) return '';
  
  const trimmedLink = link.trim();
  
  // If it's just a numeric ID, assume it's a Facebook group ID
  if (/^\d+$/.test(trimmedLink)) {
    return `https://www.facebook.com/groups/${trimmedLink}`;
  }

  // If it's an ID that looks like facebook numeric ID but might have alphabets if it's a vanity URL/slug
  // Actually, if it doesn't have a protocol and doesn't have dots, it's probably an ID
  if (!trimmedLink.includes('://') && !trimmedLink.includes('.')) {
    return `https://www.facebook.com/groups/${trimmedLink}`;
  }

  // If it doesn't start with http or https, add it
  if (!/^https?:\/\//i.test(trimmedLink)) {
    return `https://${trimmedLink}`;
  }

  return trimmedLink;
}
