export function formatCurrency(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') {
    return 'R$ 0,00';
  }
  
  let numero: number;
  if (typeof value === 'string') {
    const cleaned = value.replace(/R\$/g, '').replace(/\./g, '').replace(/,/g, '.').trim();
    numero = parseFloat(cleaned);
  } else {
    numero = Number(value);
  }
  
  if (isNaN(numero) || !isFinite(numero)) {
    return 'R$ 0,00';
  }
  
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(numero);
}

// Função para formatar datas
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '-';
  
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '-';
    
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(d);
  } catch {
    return '-';
  }
}

export function normalizeText(text: string): string {
  return text?.trim() || '';
}

export function toPositiveNumber(value: string | number): number {
  const num = typeof value === 'string' 
    ? parseFloat(value.replace(/\./g, '').replace(',', '.'))
    : Number(value);
  
  if (isNaN(num) || !isFinite(num)) return 0;
  return Math.max(0, num);
}
