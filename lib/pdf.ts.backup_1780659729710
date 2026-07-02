import jsPDF from "jspdf"
import type { EmpresaConfig, ItemCarrinho } from "./types"

type PdfLineItem = {
  descricao: string
  quantidade: number
  unitario: number
  total: number
}

type QuotePdfInput = {
  numero?: string | null
  titulo: string
  cliente: string
  config?: EmpresaConfig | null
  linhas: PdfLineItem[]
  total: number
  detalhes?: Array<[string, string]>
}

const primary = "#17264a"
const accent = "#c69b32"
const muted = "#64748b"

function addHeader(doc: jsPDF, title: string, config?: EmpresaConfig | null) {
  doc.setFillColor(primary)
  doc.rect(0, 0, 210, 35, "F")
  doc.setTextColor("#ffffff")
  doc.setFont("helvetica", "bold")
  doc.setFontSize(18)
  doc.text(config?.nome_empresa || "Fernandes Sistemas", 14, 17)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  doc.text(config?.telefone || "Sistema de gestao comercial", 14, 25)

  doc.setTextColor(accent)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(13)
  doc.text(title.toUpperCase(), 196, 18, { align: "right" })
}

function addFooter(doc: jsPDF) {
  doc.setFillColor(primary)
  doc.rect(0, 282, 210, 15, "F")
  doc.setTextColor("#ffffff")
  doc.setFont("helvetica", "normal")
  doc.setFontSize(8)
  doc.text("Este orcamento e valido por 30 dias.", 105, 291, { align: "center" })
}

function money(value: number): string {
  let valorSeguro = value;
  if (isNaN(valorSeguro) || !isFinite(valorSeguro)) {
    valorSeguro = 0;
  }
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valorSeguro)
}

export function saveQuotePdf(input: QuotePdfInput, filename: string) {
  const doc = new jsPDF("p", "mm", "a4")
  const issuedAt = new Intl.DateTimeFormat("pt-BR").format(new Date())

  addHeader(doc, input.titulo, input.config)

  doc.setTextColor(primary)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(20)
  doc.text(input.titulo, 14, 52)

  doc.setFontSize(10)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(muted)
  doc.text(`Emissao: ${issuedAt}`, 14, 60)
  if (input.numero) doc.text(`Numero: ${input.numero}`, 196, 60, { align: "right" })

  // BOX DO CLIENTE - CORRIGIDO
  doc.setDrawColor("#e5e7eb")
  doc.setFillColor("#f8fafc")
  doc.roundedRect(14, 70, 182, 22, 2, 2, "FD")
  doc.setTextColor(primary)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(9)
  doc.text("Cliente", 20, 79)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(10)
  doc.text(input.cliente, 20, 87) 

  let yAtual = 105

  // EXTRAIR DADOS CORRETAMENTE
  let statusText = "Pendente"
  let observacoesText = ""
  let servicosExtrasTotal = 0
  const servicosExtrasLista: string[] = []

  for (const [label, value] of input.detalhes || []) {
    if (label === "Status") {
      statusText = value
    } else if (label === "Observações") {
      observacoesText = value
    } else if (label === "Serviços Extras") {
      servicosExtrasTotal = parseFloat(value.replace("R$", "").replace(".", "").replace(",", ".")) || 0
    } else if (label.startsWith("  •")) {
      servicosExtrasLista.push(label.replace("  •", "").trim())
    }
  }

  // STATUS
  doc.setFillColor("#f0fdf4")
  doc.roundedRect(14, yAtual, 88, 18, 2, 2, "FD")
  doc.setFont("helvetica", "bold")
  doc.setFontSize(9)
  doc.setTextColor(primary)
  doc.text("Status", 20, yAtual + 6)
  doc.setFont("helvetica", "normal")
  doc.text(statusText, 20, yAtual + 13)
  
  // SERVIÇOS EXTRAS (apenas o total)
  if (servicosExtrasTotal > 0) {
    doc.setFillColor("#fff7e0")
    doc.roundedRect(108, yAtual, 88, 18, 2, 2, "FD")
    doc.setFont("helvetica", "bold")
    doc.text("Servicos Extras", 114, yAtual + 6)
    doc.setFont("helvetica", "normal")
    doc.text(money(servicosExtrasTotal), 114, yAtual + 13)
  }
  
  yAtual += 24

  // LISTA DE SERVIÇOS EXTRAS (detalhada)
  if (servicosExtrasLista.length > 0) {
    doc.setFillColor("#fef3c7")
    doc.roundedRect(14, yAtual, 182, 10 + (servicosExtrasLista.length * 5), 2, 2, "FD")
    
    doc.setFont("helvetica", "bold")
    doc.setFontSize(9)
    doc.setTextColor(primary)
    doc.text("Servicos contratados:", 20, yAtual + 6)
    
    doc.setFont("helvetica", "normal")
    doc.setFontSize(8)
    let yServico = yAtual + 12
    for (const servico of servicosExtrasLista) {
      doc.text(`• ${servico}`, 20, yServico)
      yServico += 5
    }
    
    yAtual += 15 + (servicosExtrasLista.length * 5)
  }

  // OBSERVAÇÕES
  if (observacoesText && observacoesText.trim() !== "") {
    const linhasObs = doc.splitTextToSize(observacoesText, 170)
    const alturaObs = Math.max(18, linhasObs.length * 5 + 8)
    
    doc.setFillColor("#e0f2fe")
    doc.roundedRect(14, yAtual, 182, alturaObs, 2, 2, "FD")
    
    doc.setFont("helvetica", "bold")
    doc.setFontSize(9)
    doc.setTextColor(primary)
    doc.text("Observacoes", 20, yAtual + 6)
    
    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)
    doc.setTextColor("#333333")
    doc.text(linhasObs, 20, yAtual + 13)
    
    yAtual += alturaObs + 5
  }

  // TABELA DE PRODUTOS
  yAtual += 5
  
  // Cabeçalho da tabela
  doc.setFillColor(primary)
  doc.rect(14, yAtual - 10, 182, 12, "F")
  doc.setTextColor("#ffffff")
  doc.setFont("helvetica", "bold")
  doc.setFontSize(9)
  doc.text("Descricao", 18, yAtual - 3)
  doc.text("Qtd", 140, yAtual - 3, { align: "right" })
  doc.text("Unitario", 165, yAtual - 3, { align: "right" })
  doc.text("Total", 192, yAtual - 3, { align: "right" })

  doc.setFont("helvetica", "normal")
  doc.setTextColor("#111827")
  doc.setFontSize(9)
  
  for (const line of input.linhas) {
    if (yAtual > 260) {
      addFooter(doc)
      doc.addPage()
      addHeader(doc, input.titulo, input.config)
      yAtual = 60
    }

    const description = doc.splitTextToSize(line.descricao, 100)
    const rowHeight = Math.max(12, description.length * 5 + 10)
    const posicaoCentral = yAtual + (rowHeight / 2)
    
    doc.setDrawColor("#e5e7eb")
    doc.line(14, yAtual + rowHeight - 2, 196, yAtual + rowHeight - 2)
    doc.text(description, 18, posicaoCentral)
    doc.text(String(line.quantidade), 140, posicaoCentral, { align: "right" })
    doc.text(money(line.unitario), 165, posicaoCentral, { align: "right" })
    doc.text(money(line.total), 192, posicaoCentral, { align: "right" })
    
    yAtual += rowHeight + 2
  }

  // TOTAL GERAL
  yAtual += 8
  doc.setFillColor("#fff7e0")
  doc.roundedRect(118, yAtual, 78, 18, 2, 2, "F")
  doc.setTextColor(primary)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(10)
  doc.text("Total geral", 124, yAtual + 12)
  doc.setTextColor(accent)
  doc.setFontSize(16)
  doc.text(money(input.total), 192, yAtual + 12, { align: "right" })

  addFooter(doc)
  doc.save(filename)
}

export function cartToPdfLines(items: ItemCarrinho[]) {
  return items.map((item) => {
    let valorUnitario = 0;
    const valorVenda: any = item.valor_venda;
    
    if (valorVenda !== null && valorVenda !== undefined) {
      if (typeof valorVenda === "string") {
        let valorLimpo = valorVenda.replace(/R\$/g, "");
        valorLimpo = valorLimpo.replace(/\./g, "");
        valorLimpo = valorLimpo.replace(/,/g, ".");
        valorLimpo = valorLimpo.trim();
        valorUnitario = parseFloat(valorLimpo);
      } else {
        valorUnitario = Number(valorVenda);
      }
    }
    
    if (isNaN(valorUnitario)) {
      valorUnitario = 0;
    }
    
    const quantidade = Number(item.quantidade) || 1;
    
    return {
      descricao: `${item.nome}${item.tipo === "servico" ? " (Servico)" : ""}`,
      quantidade: quantidade,
      unitario: valorUnitario,
      total: valorUnitario * quantidade,
    };
  });
}

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

