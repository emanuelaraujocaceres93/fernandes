import jsPDF from "jspdf"
import html2canvas from "html2canvas"
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

export async function saveQuotePdf(input: QuotePdfInput, filename: string) {
  // ============================================
  // EXTRAIR DADOS DOS DETALHES
  // ============================================
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

  // ============================================
  // GERAR HTML DO PDF (SEM RODAPÉ)
  // ============================================
  const element = document.createElement("div")
  element.style.width = "800px"
  element.style.margin = "0 auto"
  element.style.background = "white"
  element.style.fontFamily = "'Helvetica', Arial, sans-serif"
  element.style.padding = "20px"
  element.style.boxSizing = "border-box"
  
  // Status color
  const statusColors: Record<string, string> = {
    "pendente": "#fef3c7",
    "aceito": "#dcfce7",
    "recusado": "#fee2e2"
  }
  const statusColor = statusColors[statusText.toLowerCase()] || "#f3f4f6"

  // Montar linhas da tabela
  let tabelaHTML = ""
  const itensValidos = input.linhas.filter(line => 
    line.descricao && 
    line.descricao.trim() !== "" &&
    line.descricao !== "undefined" &&
    line.descricao !== "null"
  )

  // Remover duplicatas
  const itensUnicos = []
  const descricoesVistas = new Set()
  for (const item of itensValidos) {
    const chave = item.descricao + item.quantidade + item.unitario + item.total
    if (!descricoesVistas.has(chave)) {
      descricoesVistas.add(chave)
      itensUnicos.push(item)
    }
  }

  if (itensUnicos.length > 0) {
    let linhaCount = 0
    for (const line of itensUnicos) {
      const bgColor = linhaCount % 2 === 0 ? "#fafafa" : "white"
      tabelaHTML += `
        <tr style="background: ${bgColor}; border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 8px 12px; text-align: left; font-size: 13px; color: #1a1a1a; max-width: 300px; word-wrap: break-word;">${line.descricao}</td>
          <td style="padding: 8px 12px; text-align: center; font-size: 13px; color: #1a1a1a;">${line.quantidade}</td>
          <td style="padding: 8px 12px; text-align: right; font-size: 13px; color: #1a1a1a;">${money(line.unitario)}</td>
          <td style="padding: 8px 12px; text-align: right; font-size: 13px; font-weight: bold; color: #1a1a1a;">${money(line.total)}</td>
        </tr>
      `
      linhaCount++
    }
  }

  // Serviços extras lista
  let servicosHTML = ""
  if (servicosExtrasLista.length > 0) {
    const servicosUnicos = [...new Set(servicosExtrasLista)]
    for (const servico of servicosUnicos) {
      servicosHTML += `<li style="margin: 2px 0; font-size: 12px; color: #4a4a4a; list-style: none; padding-left: 16px;">• ${servico}</li>`
    }
  }

  // Observações
  let observacoesHTML = ""
  if (observacoesText && observacoesText.trim() !== "") {
    observacoesHTML = `
      <div style="background: #eff6ff; padding: 12px 16px; border-radius: 8px; margin-top: 15px;">
        <p style="font-weight: bold; font-size: 12px; color: #1a2a4f; margin: 0 0 5px 0;">OBSERVAÇÕES</p>
        <p style="font-size: 12px; color: #333333; margin: 0;">${observacoesText}</p>
      </div>
    `
  }

  element.innerHTML = `
    <!-- HEADER -->
    <div style="text-align: center; padding: 35px 20px; background: linear-gradient(135deg, #1a2a4f 0%, #2c3e66 100%); border-radius: 10px 10px 0 0;">
      ${input.config?.logo_url ? `<img src="${input.config.logo_url}" style="max-width: 150px; margin: 0 auto 15px auto; display: block;" />` : ""}
      <h1 style="color: white; margin: 0; font-size: 26px; letter-spacing: 2px;">${input.config?.nome_empresa || "Fernandes Sistemas"}</h1>
      ${input.config?.telefone ? `<p style="color: #c9a03d; margin: 8px 0 0 0; font-size: 15px;">📞 ${input.config.telefone}</p>` : ""}
    </div>
    
    <!-- TÍTULO -->
    <div style="text-align: center; padding: 20px 0; border-bottom: 3px solid #c9a03d;">
      <h2 style="color: #1a2a4f; font-size: 22px; margin: 0; letter-spacing: 3px;">ORÇAMENTO</h2>
      <p style="color: #64748b; font-size: 12px; margin: 5px 0 0 0;">Emissão: ${new Date().toLocaleDateString()} às ${new Date().toLocaleTimeString()}</p>
      ${input.numero ? `<p style="color: #64748b; font-size: 12px; margin: 2px 0 0 0;">Número: ${input.numero}</p>` : ""}
    </div>
    
    <!-- CLIENTE -->
    <div style="background: #f8fafc; padding: 12px 16px; border-radius: 8px; margin: 15px 0; border: 1px solid #e5e7eb;">
      <p style="font-weight: bold; font-size: 11px; color: #1a2a4f; margin: 0 0 5px 0;">CLIENTE</p>
      <p style="font-size: 15px; color: #1a1a1a; margin: 0;">${input.cliente}</p>
    </div>
    
    <!-- STATUS E SERVIÇOS EXTRAS -->
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 12px 0;">
      <div style="background: ${statusColor}; padding: 10px 14px; border-radius: 8px;">
        <p style="font-weight: bold; font-size: 10px; color: #1a2a4f; margin: 0 0 5px 0;">STATUS</p>
        <p style="font-size: 14px; color: #1a1a1a; margin: 0;">${statusText}</p>
      </div>
      ${servicosExtrasTotal > 0 ? `
        <div style="background: #fef3c7; padding: 10px 14px; border-radius: 8px;">
          <p style="font-weight: bold; font-size: 10px; color: #1a2a4f; margin: 0 0 5px 0;">SERVIÇOS EXTRAS</p>
          <p style="font-size: 14px; color: #c9a03d; font-weight: bold; margin: 0;">${money(servicosExtrasTotal)}</p>
        </div>
      ` : ""}
    </div>
    
    <!-- SERVIÇOS CONTRATADOS -->
    ${servicosHTML ? `
      <div style="background: #fffbeb; padding: 12px 16px; border-radius: 8px; margin: 10px 0;">
        <p style="font-weight: bold; font-size: 12px; color: #1a2a4f; margin: 0 0 8px 0;">SERVIÇOS CONTRATADOS:</p>
        <ul style="margin: 0; padding-left: 0; list-style: none;">${servicosHTML}</ul>
      </div>
    ` : ""}
    
    <!-- OBSERVAÇÕES -->
    ${observacoesHTML}
    
    <!-- TABELA DE PRODUTOS -->
    ${tabelaHTML ? `
      <div style="margin-top: 15px; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
        <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
          <thead style="background: #1a2a4f; color: white;">
            <tr>
              <th style="padding: 8px 12px; text-align: left; font-size: 12px; font-weight: bold;">DESCRIÇÃO</th>
              <th style="padding: 8px 12px; text-align: center; font-size: 12px; font-weight: bold;">QTD</th>
              <th style="padding: 8px 12px; text-align: right; font-size: 12px; font-weight: bold;">UNITÁRIO</th>
              <th style="padding: 8px 12px; text-align: right; font-size: 12px; font-weight: bold;">TOTAL</th>
            </tr>
          </thead>
          <tbody>
            ${tabelaHTML}
          </tbody>
        </table>
      </div>
    ` : ""}
    
    <!-- TOTAL GERAL -->
    <div style="background: linear-gradient(135deg, #c9a03d 0%, #b58d2c 100%); text-align: center; padding: 16px 20px; border-radius: 10px; margin: 15px 0; box-shadow: 0 4px 15px rgba(201, 160, 61, 0.3);">
      <p style="color: #1a2a4f; font-size: 14px; font-weight: bold; margin: 0 0 5px 0; letter-spacing: 2px;">TOTAL GERAL</p>
      <p style="font-size: 32px; font-weight: bold; color: white; margin: 0; text-shadow: 0 2px 4px rgba(0,0,0,0.2);">${money(input.total)}</p>
    </div>
  `

  document.body.appendChild(element)
  await new Promise(resolve => setTimeout(resolve, 500))

  // ============================================
  // CAPTURAR E DIVIDIR EM VÁRIAS PÁGINAS
  // ============================================
  const canvas = await html2canvas(element, { 
    scale: 2,
    backgroundColor: "#ffffff", 
    useCORS: true,
    width: 800,
    height: element.scrollHeight,
    windowWidth: 800
  })

  const pdf = new jsPDF("p", "mm", "a4")
  const imgWidth = 190
  const imgHeight = (canvas.height * imgWidth) / canvas.width
  // 🔧 ALTURA ÚTIL DA PÁGINA (com margem para o rodapé)
  const pageHeight = 270 // Reduzido para caber o rodapé
  const imgHeightMM = imgHeight

  // 🔧 FUNÇÃO PARA ADICIONAR RODAPÉ
  function addFooterToPage(doc: jsPDF) {
    const yPos = 282
    doc.setFillColor("#1a2a4f")
    doc.rect(0, yPos, 210, 15, "F")
    doc.setTextColor("#ffffff")
    doc.setFont("helvetica", "normal")
    doc.setFontSize(7)
    doc.text("Este orçamento é válido por 30 dias", 105, yPos + 6, { align: "center" })
    doc.setFontSize(6)
    doc.text(`${input.config?.nome_empresa || "Fernandes Sistemas"} - Orçamento`, 105, yPos + 11, { align: "center" })
  }

  // 🔧 CALCULAR SE PRECISA DE MÚLTIPLAS PÁGINAS
  const marginTop = 10
  const marginBottom = 20
  const usableHeight = 297 - marginTop - marginBottom // ~267mm

  if (imgHeightMM > usableHeight) {
    // 🔧 MÚLTIPLAS PÁGINAS
    let heightLeft = imgHeightMM
    let position = 0
    let isFirstPage = true

    while (heightLeft > 0) {
      if (!isFirstPage) {
        pdf.addPage()
      }
      
      // Calcular quanto da imagem cabe nesta página
      const yOffset = position
      pdf.addImage(canvas.toDataURL("image/png"), "PNG", 10, yOffset, imgWidth, imgHeight)
      addFooterToPage(pdf)
      
      heightLeft -= usableHeight
      position -= usableHeight
      isFirstPage = false
    }
  } else {
    // 🔧 UMA ÚNICA PÁGINA (sem páginas extras)
    const xPos = (210 - imgWidth) / 2
    const yPos = 10
    pdf.addImage(canvas.toDataURL("image/png"), "PNG", xPos, yPos, imgWidth, imgHeight)
    addFooterToPage(pdf)
  }

  pdf.save(filename)
  document.body.removeChild(element)
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