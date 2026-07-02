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

const primary = "#1a2a4f"
const accent = "#c9a03d"
const muted = "#64748b"
const lightBg = "#f8fafc"

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

function addHeader(doc: jsPDF, title: string, config?: EmpresaConfig | null) {
  // Fundo principal
  doc.setFillColor(primary)
  doc.rect(0, 0, 210, 50, "F")
  
  // Logo (se houver)
  if (config?.logo_url) {
    try {
      // Tenta adicionar a logo - será processada no front-end
      // Por enquanto, deixamos espaço para a logo
      doc.setFillColor("#ffffff")
      doc.rect(14, 8, 35, 35, "F")
      doc.setFillColor("#e5e7eb")
      doc.rect(14, 8, 35, 35, "F")
      doc.setTextColor("#64748b")
      doc.setFont("helvetica", "normal")
      doc.setFontSize(7)
      doc.text("Logo", 31, 28, { align: "center" })
    } catch (e) {
      // Ignora erro de logo
    }
  }
  
  // Nome da empresa
  doc.setTextColor("#ffffff")
  doc.setFont("helvetica", "bold")
  doc.setFontSize(22)
  doc.text(config?.nome_empresa || "Fernandes Sistemas", config?.logo_url ? 56 : 14, 25)
  
  // Telefone
  doc.setFont("helvetica", "normal")
  doc.setFontSize(10)
  doc.setTextColor("#c9a03d")
  doc.text(config?.telefone || "Sistema de gestão comercial", config?.logo_url ? 56 : 14, 35)

  // Título do documento (alinhado à direita)
  doc.setTextColor(accent)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(16)
  doc.text(title.toUpperCase(), 196, 25, { align: "right" })
  
  // Linha decorativa dourada
  doc.setDrawColor(accent)
  doc.setLineWidth(1)
  doc.line(14, 45, 196, 45)
}

function addFooter(doc: jsPDF) {
  doc.setFillColor(primary)
  doc.rect(0, 282, 210, 18, "F")
  doc.setTextColor("#ffffff")
  doc.setFont("helvetica", "normal")
  doc.setFontSize(8)
  doc.text("Este orçamento é válido por 30 dias.", 105, 291, { align: "center" })
  doc.text(`Gerado em: ${new Date().toLocaleDateString()} às ${new Date().toLocaleTimeString()}`, 105, 297, { align: "center" })
}

export function saveQuotePdf(input: QuotePdfInput, filename: string) {
  const doc = new jsPDF("p", "mm", "a4")
  const issuedAt = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date())

  addHeader(doc, input.titulo, input.config)

  // Título
  doc.setTextColor(primary)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(24)
  doc.text(input.titulo, 14, 68)

  // Data e número
  doc.setFontSize(10)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(muted)
  doc.text(`Emissão: ${issuedAt}`, 14, 78)
  if (input.numero) {
    doc.text(`Número: ${input.numero}`, 196, 78, { align: "right" })
  }

  // BOX DO CLIENTE
  doc.setDrawColor("#e5e7eb")
  doc.setFillColor(lightBg)
  doc.roundedRect(14, 88, 182, 30, 3, 3, "FD")
  doc.setTextColor(primary)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(9)
  doc.text("CLIENTE", 20, 98)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(12)
  doc.setTextColor("#1a1a1a")
  doc.text(input.cliente, 20, 110)

  let yAtual = 130

  // EXTRAIR DADOS DOS DETALHES
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
      servicosExtrasTotal = parseFloat(value.replace("R$", "").replace(/\./g, "").replace(",", ".")) || 0
    } else if (label.startsWith("  •")) {
      servicosExtrasLista.push(label.replace("  •", "").trim())
    }
  }

  // STATUS - com cor dinâmica
  const statusColors: Record<string, string> = {
    "pendente": "#fef3c7",
    "aceito": "#dcfce7",
    "recusado": "#fee2e2"
  }
  const statusColor = statusColors[statusText.toLowerCase()] || "#f3f4f6"
  
  doc.setFillColor(statusColor)
  doc.roundedRect(14, yAtual, 88, 22, 3, 3, "FD")
  doc.setFont("helvetica", "bold")
  doc.setFontSize(9)
  doc.setTextColor(primary)
  doc.text("STATUS", 20, yAtual + 7)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(10)
  doc.setTextColor("#1a1a1a")
  doc.text(statusText, 20, yAtual + 17)
  
  // SERVIÇOS EXTRAS (total)
  if (servicosExtrasTotal > 0) {
    doc.setFillColor("#fef3c7")
    doc.roundedRect(108, yAtual, 88, 22, 3, 3, "FD")
    doc.setFont("helvetica", "bold")
    doc.setFontSize(9)
    doc.setTextColor(primary)
    doc.text("SERVIÇOS EXTRAS", 114, yAtual + 7)
    doc.setFont("helvetica", "normal")
    doc.setFontSize(11)
    doc.setTextColor(accent)
    doc.text(money(servicosExtrasTotal), 114, yAtual + 17)
  }
  
  yAtual += 28

  // LISTA DE SERVIÇOS EXTRAS (detalhada)
  if (servicosExtrasLista.length > 0) {
    const altura = 12 + (servicosExtrasLista.length * 5.5)
    doc.setFillColor("#fffbeb")
    doc.roundedRect(14, yAtual, 182, altura, 3, 3, "FD")
    
    doc.setFont("helvetica", "bold")
    doc.setFontSize(9)
    doc.setTextColor(primary)
    doc.text("SERVIÇOS CONTRATADOS:", 20, yAtual + 7)
    
    doc.setFont("helvetica", "normal")
    doc.setFontSize(8)
    doc.setTextColor("#4a4a4a")
    let yServico = yAtual + 14
    for (const servico of servicosExtrasLista) {
      doc.text(`• ${servico}`, 20, yServico)
      yServico += 5.5
    }
    
    yAtual += altura + 6
  }

  // OBSERVAÇÕES
  if (observacoesText && observacoesText.trim() !== "") {
    const linhasObs = doc.splitTextToSize(observacoesText, 170)
    const alturaObs = Math.max(20, linhasObs.length * 5 + 12)
    
    doc.setFillColor("#eff6ff")
    doc.roundedRect(14, yAtual, 182, alturaObs, 3, 3, "FD")
    
    doc.setFont("helvetica", "bold")
    doc.setFontSize(9)
    doc.setTextColor(primary)
    doc.text("OBSERVAÇÕES", 20, yAtual + 7)
    
    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)
    doc.setTextColor("#333333")
    doc.text(linhasObs, 20, yAtual + 16)
    
    yAtual += alturaObs + 6
  }

  // TABELA DE PRODUTOS
  yAtual += 8
  
  // Cabeçalho da tabela
  doc.setFillColor(primary)
  doc.rect(14, yAtual - 8, 182, 12, "F")
  doc.setTextColor("#ffffff")
  doc.setFont("helvetica", "bold")
  doc.setFontSize(9)
  doc.text("DESCRIÇÃO", 18, yAtual + 2)
  doc.text("QTD", 140, yAtual + 2, { align: "right" })
  doc.text("UNITÁRIO", 165, yAtual + 2, { align: "right" })
  doc.text("TOTAL", 192, yAtual + 2, { align: "right" })

  doc.setFont("helvetica", "normal")
  doc.setTextColor("#1a1a1a")
  doc.setFontSize(9)
  
  let linhaCount = 0
  for (const line of input.linhas) {
    // Verificar se precisa de nova página
    if (yAtual > 255) {
      addFooter(doc)
      doc.addPage()
      addHeader(doc, input.titulo, input.config)
      yAtual = 60
      // Recriar cabeçalho da tabela na nova página
      doc.setFillColor(primary)
      doc.rect(14, yAtual - 8, 182, 12, "F")
      doc.setTextColor("#ffffff")
      doc.setFont("helvetica", "bold")
      doc.setFontSize(9)
      doc.text("DESCRIÇÃO", 18, yAtual + 2)
      doc.text("QTD", 140, yAtual + 2, { align: "right" })
      doc.text("UNITÁRIO", 165, yAtual + 2, { align: "right" })
      doc.text("TOTAL", 192, yAtual + 2, { align: "right" })
      yAtual += 12
    }

    const description = doc.splitTextToSize(line.descricao, 100)
    const rowHeight = Math.max(11, description.length * 5 + 8)
    const posicaoCentral = yAtual + (rowHeight / 2)
    
    // Linha de separação
    doc.setDrawColor("#e5e7eb")
    doc.line(14, yAtual + rowHeight - 1, 196, yAtual + rowHeight - 1)
    
    // Alternar cores das linhas
    if (linhaCount % 2 === 0) {
      doc.setFillColor("#fafafa")
      doc.rect(14, yAtual, 182, rowHeight - 1, "F")
    }
    
    doc.text(description, 18, posicaoCentral)
    doc.text(String(line.quantidade), 140, posicaoCentral, { align: "right" })
    doc.text(money(line.unitario), 165, posicaoCentral, { align: "right" })
    doc.text(money(line.total), 192, posicaoCentral, { align: "right" })
    
    yAtual += rowHeight + 1
    linhaCount++
  }

  // TOTAL GERAL - DESTAQUE
  yAtual += 10
  doc.setFillColor(accent)
  doc.roundedRect(118, yAtual, 78, 24, 3, 3, "F")
  doc.setTextColor("#ffffff")
  doc.setFont("helvetica", "bold")
  doc.setFontSize(10)
  doc.text("TOTAL GERAL", 124, yAtual + 9)
  doc.setFontSize(16)
  doc.text(money(input.total), 192, yAtual + 17, { align: "right" })

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
      descricao: `${item.nome}${item.tipo === "servico" ? " (Serviço)" : ""}`,
      quantidade: quantidade,
      unitario: valorUnitario,
      total: valorUnitario * quantidade,
    };
  });
}