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

async function carregarImagemBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url)
    if (!response.ok) return null
    const blob = await response.blob()
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.readAsDataURL(blob)
    })
  } catch (error) {
    console.error("Erro ao carregar imagem:", error)
    return null
  }
}

function addHeader(doc: jsPDF, config?: EmpresaConfig | null, logoBase64?: string | null) {
  // Fundo principal - gradiente simulado
  doc.setFillColor(primary)
  doc.rect(0, 0, 210, 50, "F")
  
  // Logo (se houver) - centralizada e proporcional
  if (logoBase64) {
    try {
      const logoWidth = 40
      const logoHeight = 40
      const logoX = (210 - logoWidth) / 2
      doc.addImage(logoBase64, 'PNG', logoX, 5, logoWidth, logoHeight)
    } catch (e) {
      console.error("Erro ao adicionar logo:", e)
    }
  }
  
  // Nome da empresa - centralizado
  doc.setTextColor("#ffffff")
  doc.setFont("helvetica", "bold")
  doc.setFontSize(16)
  const nomeY = logoBase64 ? 48 : 20
  doc.text(config?.nome_empresa || "Fernandes Sistemas", 105, nomeY, { align: "center" })
}

function addFooter(doc: jsPDF, pageNum: number, totalPages: number) {
  doc.setFillColor(primary)
  doc.rect(0, 282, 210, 18, "F")
  doc.setTextColor("#ffffff")
  doc.setFont("helvetica", "normal")
  doc.setFontSize(8)
  doc.text("Este orçamento é válido por 30 dias.", 105, 291, { align: "center" })
  doc.text(`Gerado em: ${new Date().toLocaleDateString()} às ${new Date().toLocaleTimeString()}`, 105, 297, { align: "center" })
}

export async function saveQuotePdf(input: QuotePdfInput, filename: string) {
  const doc = new jsPDF("p", "mm", "a4")
  const totalPages = 1 // Será atualizado se houver mais páginas
  
  let logoBase64 = null
  if (input.config?.logo_url) {
    logoBase64 = await carregarImagemBase64(input.config.logo_url)
  }
  
  const issuedAt = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date())

  // ============================================
  // PÁGINA 1
  // ============================================
  
  // HEADER
  addHeader(doc, input.config, logoBase64)

  // Título "ORÇAMENTO"
  doc.setTextColor(primary)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(20)
  doc.text("ORÇAMENTO", 105, 68, { align: "center" })

  // Linha decorativa
  doc.setDrawColor(accent)
  doc.setLineWidth(0.8)
  doc.line(60, 74, 150, 74)

  // Informações do documento
  doc.setTextColor(muted)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  doc.text(`Emissão: ${issuedAt}`, 14, 84)
  if (input.numero) {
    doc.text(`Número: ${input.numero}`, 196, 84, { align: "right" })
  }

  // BOX DO CLIENTE
  const clienteY = 94
  doc.setDrawColor("#e5e7eb")
  doc.setFillColor(lightBg)
  doc.roundedRect(14, clienteY, 182, 28, 3, 3, "FD")
  doc.setTextColor(primary)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(9)
  doc.text("CLIENTE", 20, clienteY + 10)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(11)
  doc.setTextColor("#1a1a1a")
  doc.text(input.cliente, 20, clienteY + 21)

  // Processar detalhes
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

  let yAtual = 132

  // STATUS
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
    doc.setFontSize(10)
    doc.setTextColor(accent)
    doc.text(money(servicosExtrasTotal), 114, yAtual + 17)
  }
  
  yAtual += 30

  // LISTA DE SERVIÇOS EXTRAS
  if (servicosExtrasLista.length > 0) {
    const altura = 10 + (servicosExtrasLista.length * 5)
    // Verificar se cabe na página
    if (yAtual + altura > 260) {
      doc.addPage()
      addHeader(doc, input.config, logoBase64)
      yAtual = 60
    }
    
    doc.setFillColor("#fffbeb")
    doc.roundedRect(14, yAtual, 182, altura, 3, 3, "FD")
    
    doc.setFont("helvetica", "bold")
    doc.setFontSize(9)
    doc.setTextColor(primary)
    doc.text("SERVIÇOS CONTRATADOS:", 20, yAtual + 6)
    
    doc.setFont("helvetica", "normal")
    doc.setFontSize(8)
    doc.setTextColor("#4a4a4a")
    let yServico = yAtual + 12
    for (const servico of servicosExtrasLista) {
      doc.text(`• ${servico}`, 20, yServico)
      yServico += 5
    }
    
    yAtual += altura + 6
  }

  // OBSERVAÇÕES
  if (observacoesText && observacoesText.trim() !== "") {
    const linhasObs = doc.splitTextToSize(observacoesText, 170)
    const alturaObs = Math.max(18, linhasObs.length * 5 + 10)
    
    if (yAtual + alturaObs > 260) {
      doc.addPage()
      addHeader(doc, input.config, logoBase64)
      yAtual = 60
    }
    
    doc.setFillColor("#eff6ff")
    doc.roundedRect(14, yAtual, 182, alturaObs, 3, 3, "FD")
    
    doc.setFont("helvetica", "bold")
    doc.setFontSize(9)
    doc.setTextColor(primary)
    doc.text("OBSERVAÇÕES", 20, yAtual + 7)
    
    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)
    doc.setTextColor("#333333")
    doc.text(linhasObs, 20, yAtual + 15)
    
    yAtual += alturaObs + 6
  }

  // ============================================
  // TABELA DE PRODUTOS - SEMPRE COM CABEÇALHO
  // ============================================
  yAtual += 10

  // Verificar se há espaço para a tabela
  const temItens = input.linhas.some(line => line.descricao && line.descricao.trim() !== "")
  
  if (temItens) {
    // Cabeçalho da tabela - DESENHAR SEMPRE
    if (yAtual + 20 > 260) {
      doc.addPage()
      addHeader(doc, input.config, logoBase64)
      yAtual = 60
    }
    
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

    doc.setFont("helvetica", "normal")
    doc.setTextColor("#1a1a1a")
    doc.setFontSize(9)
    
    let linhaCount = 0
    for (const line of input.linhas) {
      if (!line.descricao || line.descricao.trim() === "") continue
      
      // Verificar se precisa de nova página
      if (yAtual + 15 > 260) {
        doc.addPage()
        addHeader(doc, input.config, logoBase64)
        yAtual = 60
        
        // Recriar cabeçalho na nova página
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
        linhaCount = 0
      }

      const description = doc.splitTextToSize(line.descricao, 100)
      const rowHeight = Math.max(11, description.length * 5 + 8)
      const posicaoCentral = yAtual + (rowHeight / 2)
      
      doc.setDrawColor("#e5e7eb")
      doc.line(14, yAtual + rowHeight - 1, 196, yAtual + rowHeight - 1)
      
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
  }

  // TOTAL GERAL
  yAtual += 12
  if (yAtual + 30 > 280) {
    doc.addPage()
    addHeader(doc, input.config, logoBase64)
    yAtual = 60
  }
  
  doc.setFillColor(accent)
  doc.roundedRect(118, yAtual, 78, 24, 3, 3, "F")
  doc.setTextColor("#ffffff")
  doc.setFont("helvetica", "bold")
  doc.setFontSize(10)
  doc.text("TOTAL GERAL", 124, yAtual + 9)
  doc.setFontSize(16)
  doc.text(money(input.total), 192, yAtual + 17, { align: "right" })

  // FOOTER
  addFooter(doc, 1, 1)
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