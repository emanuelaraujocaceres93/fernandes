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
  // GERAR HTML DO PDF (AJUSTADO PARA CABER EM 1 PÁGINA)
  // ============================================
  const element = document.createElement("div")
  element.style.width = "800px"
  element.style.margin = "0 auto"
  element.style.background = "white"
  element.style.fontFamily = "'Helvetica', Arial, sans-serif"
  element.style.padding = "15px"
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
          <td style="padding: 4px 8px; text-align: left; font-size: 11px; color: #1a1a1a; max-width: 300px; word-wrap: break-word;">${line.descricao}</td>
          <td style="padding: 4px 8px; text-align: center; font-size: 11px; color: #1a1a1a;">${line.quantidade}</td>
          <td style="padding: 4px 8px; text-align: right; font-size: 11px; color: #1a1a1a;">${money(line.unitario)}</td>
          <td style="padding: 4px 8px; text-align: right; font-size: 11px; font-weight: bold; color: #1a1a1a;">${money(line.total)}</td>
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
      servicosHTML += `<li style="margin: 1px 0; font-size: 10px; color: #4a4a4a; list-style: none; padding-left: 16px;">• ${servico}</li>`
    }
  }

  // Observações
  let observacoesHTML = ""
  if (observacoesText && observacoesText.trim() !== "") {
    observacoesHTML = `
      <div style="background: #eff6ff; padding: 8px 12px; border-radius: 6px; margin-top: 8px;">
        <p style="font-weight: bold; font-size: 10px; color: #1a2a4f; margin: 0 0 4px 0;">OBSERVAÇÕES</p>
        <p style="font-size: 10px; color: #333333; margin: 0;">${observacoesText}</p>
      </div>
    `
  }

  // 🔧 HTML AJUSTADO PARA CABER EM UMA PÁGINA
  element.innerHTML = `
    <!-- HEADER -->
    <div style="text-align: center; padding: 25px 20px; background: linear-gradient(135deg, #1a2a4f 0%, #2c3e66 100%); border-radius: 8px 8px 0 0;">
      ${input.config?.logo_url ? `<img src="${input.config.logo_url}" style="max-width: 120px; margin: 0 auto 12px auto; display: block;" />` : ""}
      <h1 style="color: white; margin: 0; font-size: 24px; letter-spacing: 2px;">${input.config?.nome_empresa || "Fernandes Sistemas"}</h1>
      ${input.config?.telefone ? `<p style="color: #c9a03d; margin: 6px 0 0 0; font-size: 14px;">📞 ${input.config.telefone}</p>` : ""}
    </div>
    
    <!-- TÍTULO -->
    <div style="text-align: center; padding: 15px 0; border-bottom: 2px solid #c9a03d;">
      <h2 style="color: #1a2a4f; font-size: 20px; margin: 0; letter-spacing: 3px;">ORÇAMENTO</h2>
      <p style="color: #64748b; font-size: 11px; margin: 4px 0 0 0;">Emissão: ${new Date().toLocaleDateString()} às ${new Date().toLocaleTimeString()}</p>
      ${input.numero ? `<p style="color: #64748b; font-size: 11px; margin: 2px 0 0 0;">Número: ${input.numero}</p>` : ""}
    </div>
    
    <!-- CLIENTE -->
    <div style="background: #f8fafc; padding: 8px 14px; border-radius: 6px; margin: 10px 0; border: 1px solid #e5e7eb;">
      <p style="font-weight: bold; font-size: 10px; color: #1a2a4f; margin: 0 0 4px 0;">CLIENTE</p>
      <p style="font-size: 14px; color: #1a1a1a; margin: 0;">${input.cliente}</p>
    </div>
    
    <!-- STATUS E SERVIÇOS EXTRAS -->
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 8px 0;">
      <div style="background: ${statusColor}; padding: 8px 12px; border-radius: 6px;">
        <p style="font-weight: bold; font-size: 9px; color: #1a2a4f; margin: 0 0 3px 0;">STATUS</p>
        <p style="font-size: 13px; color: #1a1a1a; margin: 0;">${statusText}</p>
      </div>
      ${servicosExtrasTotal > 0 ? `
        <div style="background: #fef3c7; padding: 8px 12px; border-radius: 6px;">
          <p style="font-weight: bold; font-size: 9px; color: #1a2a4f; margin: 0 0 3px 0;">SERVIÇOS EXTRAS</p>
          <p style="font-size: 13px; color: #c9a03d; font-weight: bold; margin: 0;">${money(servicosExtrasTotal)}</p>
        </div>
      ` : ""}
    </div>
    
    <!-- SERVIÇOS CONTRATADOS -->
    ${servicosHTML ? `
      <div style="background: #fffbeb; padding: 8px 14px; border-radius: 6px; margin: 6px 0;">
        <p style="font-weight: bold; font-size: 10px; color: #1a2a4f; margin: 0 0 4px 0;">SERVIÇOS CONTRATADOS:</p>
        <ul style="margin: 0; padding-left: 0; list-style: none;">${servicosHTML}</ul>
      </div>
    ` : ""}
    
    <!-- OBSERVAÇÕES -->
    ${observacoesHTML}
    
    <!-- TABELA DE PRODUTOS -->
    ${tabelaHTML ? `
      <div style="margin-top: 10px; border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden;">
        <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
          <thead style="background: #1a2a4f; color: white;">
            <tr>
              <th style="padding: 4px 8px; text-align: left; font-size: 10px; font-weight: bold;">DESCRIÇÃO</th>
              <th style="padding: 4px 8px; text-align: center; font-size: 10px; font-weight: bold;">QTD</th>
              <th style="padding: 4px 8px; text-align: right; font-size: 10px; font-weight: bold;">UNITÁRIO</th>
              <th style="padding: 4px 8px; text-align: right; font-size: 10px; font-weight: bold;">TOTAL</th>
            </tr>
          </thead>
          <tbody>
            ${tabelaHTML}
          </tbody>
        </table>
      </div>
    ` : ""}
    
    <!-- TOTAL GERAL -->
    <div style="background: linear-gradient(135deg, #c9a03d 0%, #b58d2c 100%); text-align: center; padding: 10px 16px; border-radius: 8px; margin: 12px 0 0 0; box-shadow: 0 3px 12px rgba(201, 160, 61, 0.3);">
      <p style="color: #1a2a4f; font-size: 12px; font-weight: bold; margin: 0 0 4px 0; letter-spacing: 2px;">TOTAL GERAL</p>
      <p style="font-size: 28px; font-weight: bold; color: white; margin: 0; text-shadow: 0 2px 4px rgba(0,0,0,0.2);">${money(input.total)}</p>
    </div>
  `

  document.body.appendChild(element)
  await new Promise(resolve => setTimeout(resolve, 500))

  // ============================================
  // CAPTURAR (SEMPRE UMA PÁGINA)
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

  function addFooterToPage(doc: jsPDF) {
    const yPos = 285
    doc.setFillColor("#1a2a4f")
    doc.rect(0, yPos, 210, 12, "F")
    doc.setTextColor("#ffffff")
    doc.setFont("helvetica", "normal")
    doc.setFontSize(7)
    doc.text("Este orçamento é válido por 30 dias", 105, yPos + 5, { align: "center" })
    doc.setFontSize(6)
    doc.text(`${input.config?.nome_empresa || "Fernandes Sistemas"} - Orçamento`, 105, yPos + 9, { align: "center" })
  }

  // 🔧 SEMPRE UMA PÁGINA
  const xPos = (210 - imgWidth) / 2
  const yPos = 8
  
  // Verificar se cabe na página
  if (imgHeight <= 275) {
    pdf.addImage(canvas.toDataURL("image/png"), "PNG", xPos, yPos, imgWidth, imgHeight)
    addFooterToPage(pdf)
  } else {
    // Se ainda for muito grande, reduzir proporcionalmente
    const scaleFactor = 275 / imgHeight
    const newImgWidth = imgWidth * scaleFactor
    const newImgHeight = imgHeight * scaleFactor
    const newXPos = (210 - newImgWidth) / 2
    pdf.addImage(canvas.toDataURL("image/png"), "PNG", newXPos, yPos, newImgWidth, newImgHeight)
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