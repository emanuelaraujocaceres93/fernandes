"use client"

import { useState, useEffect } from "react"
import { supabase } from "../../lib/supabaseClient"
import jsPDF from "jspdf"
import html2canvas from "html2canvas"

export default function FretePage() {
  const [origem, setOrigem] = useState("")
  const [destino, setDestino] = useState("")
  const [nomeCliente, setNomeCliente] = useState("")
  const [distancia, setDistancia] = useState<number | "">("")
  const [idaVolta, setIdaVolta] = useState(false)
  const [consumoMedio, setConsumoMedio] = useState<number | "">("")
  const [precoCombustivel, setPrecoCombustivel] = useState<number | "">("")
  const [pedagios, setPedagios] = useState<number | "">("")
  const [margemLucro, setMargemLucro] = useState<number | "">(30)
  const [resultado, setResultado] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [config, setConfig] = useState<any>(null)

  useEffect(() => {
    const precoSalvo = localStorage.getItem("preco_combustivel")
    const consumoSavlo = localStorage.getItem("consumo_medio")
    const margemSalva = localStorage.getItem("margem_lucro")
    if (precoSalvo) setPrecoCombustivel(parseFloat(precoSalvo))
    if (consumoSavlo) setConsumoMedio(parseFloat(consumoSavlo))
    if (margemSalva) setMargemLucro(parseFloat(margemSalva))
    carregarConfig()
  }, [])

  async function carregarConfig() {
    const { data } = await supabase
      .from("configuracoes_empresa")
      .select("*")
      .limit(1)
      .single()
    if (data) setConfig(data)
  }

  const calcularFrete = () => {
    if (!nomeCliente.trim()) { alert("Digite o nome do cliente"); return }
    if (!distancia || distancia <= 0) { alert("Digite a distância"); return }
    if (!consumoMedio || consumoMedio <= 0) { alert("Digite o consumo médio"); return }
    if (!precoCombustivel || precoCombustivel <= 0) { alert("Digite o preço do combustível"); return }

    let distanciaFinal = idaVolta ? distancia * 2 : distancia
    let valorPedagios = (pedagios || 0)
    if (idaVolta && valorPedagios > 0) valorPedagios = valorPedagios * 2
    
    const litrosNecessarios = distanciaFinal / consumoMedio
    const custoCombustivel = litrosNecessarios * precoCombustivel
    const custoTotal = custoCombustivel + valorPedagios
    const valorFinal = custoTotal * (1 + (margemLucro || 0) / 100)

    setResultado({ 
      cliente: nomeCliente, 
      distancia: distanciaFinal, 
      litros: litrosNecessarios,
      combustivel: custoCombustivel,
      pedagios: valorPedagios,
      custoTotal: custoTotal, 
      valorFinal: valorFinal, 
      margem: margemLucro || 0,
      origem,
      destino
    })
  }

  const abrirGoogleMaps = () => {
    if (!origem || !destino) { alert("Preencha origem e destino"); return }
    window.open(`https://www.google.com/maps/dir/${encodeURIComponent(origem)}/${encodeURIComponent(destino)}`, "_blank")
  }

  async function gerarOrcamento() {
    if (!resultado) { alert("Calcule o frete primeiro"); return }
    
    setLoading(true)

    try {
      const { data: userData } = await supabase.auth.getUser()
      
      if (!userData.user) {
        alert("Você precisa estar logado")
        setLoading(false)
        return
      }

      // 🔧 CORRIGIDO: "fretes_orcamentos" → "fretes_orcamento"
      const { error } = await supabase
        .from("fretes_orcamento")
        .insert({
          cliente: resultado.cliente,
          origem: resultado.origem || "",
          destino: resultado.destino || "",
          distancia_km: resultado.distancia,
          custo_combustivel: resultado.combustivel,
          pedagios_valor: resultado.pedagios,
          custo_total: resultado.custoTotal,
          total_frete: resultado.valorFinal,
          status: "pendente",
          user_id: userData.user.id
        })

      if (error) {
        console.error("Erro ao salvar:", error)
        alert("Erro ao salvar: " + error.message)
        setLoading(false)
        return
      }

      const { data: configData } = await supabase
        .from("configuracoes_empresa")
        .select("*")
        .limit(1)
        .single()
      const configAtual = configData || config

      // Gerar PDF
      const element = document.createElement("div")
      element.innerHTML = `
        <div style="width: 800px; margin: 0 auto; background: white; font-family: 'Helvetica', Arial, sans-serif;">
          <div style="text-align: center; padding: 30px; background: linear-gradient(135deg, #1a2a4f 0%, #2c3e66 100%);">
            ${configAtual?.logo_url ? `<img src="${configAtual.logo_url}" style="max-width: 200px; margin: 0 auto 15px auto; display: block;" />` : ""}
            <h1 style="color: white; margin: 0; font-size: 28px;">${configAtual?.nome_empresa || "Fernandes Sistemas"}</h1>
            ${configAtual?.telefone ? `<p style="color: #c9a03d; margin: 5px 0 0;">📞 ${configAtual.telefone}</p>` : ""}
          </div>
          
          <div style="text-align: center; padding: 20px;">
            <h2 style="color: #1a2a4f; font-size: 24px; margin: 0;">ORÇAMENTO DE FRETE</h2>
            <p style="color: #c9a03d; font-size: 14px;">Emitido em: ${new Date().toLocaleDateString()}</p>
          </div>
          
          <div style="padding: 0 30px;">
            <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
              <table style="width: 100%;">
                <tr><td style="padding: 5px;"><strong>📌 Cliente:</strong></td><td>${resultado.cliente}</td></tr>
                <tr><td style="padding: 5px;"><strong>📍 Origem:</strong></td><td>${resultado.origem || "—"}</td></tr>
                <tr><td style="padding: 5px;"><strong>📍 Destino:</strong></td><td>${resultado.destino || "—"}</td></tr>
                <tr><td style="padding: 5px;"><strong>📏 Distância:</strong></td><td>${resultado.distancia.toFixed(1)} km</td></tr>
              </table>
            </div>
            
            <div style="background: #c9a03d; text-align: center; padding: 25px; border-radius: 10px; margin: 20px 0;">
              <h3 style="color: #1a2a4f; margin: 0 0 10px 0;">💰 TOTAL DO FRETE</h3>
              <p style="font-size: 36px; font-weight: bold; color: white; margin: 0;">R$ ${resultado.valorFinal.toFixed(2)}</p>
            </div>
          </div>
          
          <div style="text-align: center; padding: 15px; background: #1a2a4f; color: white; margin-top: 20px;">
            <p style="margin: 0; font-size: 11px;">Este orçamento é válido por 30 dias</p>
          </div>
        </div>
      `
      document.body.appendChild(element)
      await new Promise(resolve => setTimeout(resolve, 500))
      const canvas = await html2canvas(element, { scale: 2, backgroundColor: "#ffffff", useCORS: true })
      const pdf = new jsPDF("p", "mm", "a4")
      const imgWidth = 190
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      pdf.addImage(canvas.toDataURL("image/png"), "PNG", 10, 10, imgWidth, imgHeight)
      pdf.save(`orcamento_frete_${Date.now()}.pdf`)
      document.body.removeChild(element)

      alert("Orçamento gerado com sucesso!")
      setOrigem("")
      setDestino("")
      setNomeCliente("")
      setDistancia("")
      setResultado(null)
    } catch (error) {
      console.error("Erro ao gerar:", error)
      alert("Erro ao gerar orçamento: " + String(error))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-[#1a2a4f] mb-6">📦 Calculadora de Frete</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="font-semibold mb-4">👤 Cliente</h2>
          <input type="text" placeholder="Nome do cliente *" className="w-full p-3 border rounded-lg mb-4" value={nomeCliente} onChange={e => setNomeCliente(e.target.value)} />
          
          <h2 className="font-semibold mb-4">📍 Rota</h2>
          <input type="text" placeholder="Origem" className="w-full p-3 border rounded-lg mb-2" value={origem} onChange={e => setOrigem(e.target.value)} />
          <input type="text" placeholder="Destino" className="w-full p-3 border rounded-lg mb-2" value={destino} onChange={e => setDestino(e.target.value)} />
          <button onClick={abrirGoogleMaps} className="w-full py-2 mb-4 bg-[#c9a03d] text-white rounded-lg">🗺️ Calcular no Google Maps</button>
          
          <div className="mb-4"><label>📏 Distância (km)</label><input type="number" step="0.1" className="w-full p-3 border rounded-lg" value={distancia === "" ? "" : distancia} onChange={e => setDistancia(e.target.value === "" ? "" : parseFloat(e.target.value))} /></div>
          <label className="flex items-center gap-2 mb-4"><input type="checkbox" checked={idaVolta} onChange={e => setIdaVolta(e.target.checked)} /> 🔄 Ida e volta</label>
          
          <h2 className="font-semibold mb-4">🚗 Veículo</h2>
          <div className="mb-4"><label>Consumo médio (km/l)</label><input type="number" step="0.5" className="w-full p-3 border rounded-lg" value={consumoMedio === "" ? "" : consumoMedio} onChange={e => setConsumoMedio(e.target.value === "" ? "" : parseFloat(e.target.value))} /></div>
          <div className="mb-4"><label>Preço combustível (R$/L)</label><input type="number" step="0.1" className="w-full p-3 border rounded-lg" value={precoCombustivel === "" ? "" : precoCombustivel} onChange={e => setPrecoCombustivel(e.target.value === "" ? "" : parseFloat(e.target.value))} /></div>
          <div className="mb-4"><label>Pedágios (R$) - só ida</label><input type="number" step="0.01" className="w-full p-3 border rounded-lg" value={pedagios === "" ? "" : pedagios} onChange={e => setPedagios(e.target.value === "" ? "" : parseFloat(e.target.value))} /></div>
          <div className="mb-6"><label>💰 Margem de Lucro (%)</label><input type="number" step="1" className="w-full p-3 border rounded-lg" value={margemLucro === "" ? "" : margemLucro} onChange={e => setMargemLucro(e.target.value === "" ? "" : parseFloat(e.target.value))} /></div>
          
          <button onClick={calcularFrete} className="w-full py-3 bg-[#1a2a4f] text-white rounded-lg">🔍 Calcular Frete</button>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="font-semibold mb-4">📊 Resultado</h2>
          {resultado ? (
            <div>
              <div className="space-y-2 mb-4">
                <div className="p-2 bg-gray-50 rounded"><strong>Cliente:</strong> {resultado.cliente}</div>
                <div className="p-2 bg-gray-50 rounded"><strong>Distância:</strong> {resultado.distancia.toFixed(1)} km</div>
                <div className="p-2 bg-gray-50 rounded"><strong>Combustível:</strong> R$ {resultado.combustivel.toFixed(2)}</div>
                <div className="p-2 bg-gray-50 rounded"><strong>Pedágios:</strong> R$ {resultado.pedagios.toFixed(2)}</div>
                <div className="p-2 bg-gray-50 rounded"><strong>Custo total:</strong> R$ {resultado.custoTotal.toFixed(2)}</div>
                <div className="p-2 bg-gray-50 rounded"><strong>Margem:</strong> {resultado.margem}%</div>
                <div className="p-4 bg-[#c9a03d] bg-opacity-30 rounded text-center">
                  <span className="font-bold">💰 VALOR DO FRETE:</span>
                  <div className="font-bold text-2xl text-amber-700">R$ {resultado.valorFinal.toFixed(2)}</div>
                </div>
              </div>
              <button onClick={gerarOrcamento} disabled={loading} className="w-full py-3 bg-[#1a2a4f] text-white rounded-lg">
                {loading ? "Gerando..." : "📄 Gerar Orçamento PDF"}
              </button>
            </div>
          ) : <div className="text-center text-gray-500 py-10">Preencha os dados e clique em Calcular Frete</div>}
        </div>
      </div>
    </div>
  )
}