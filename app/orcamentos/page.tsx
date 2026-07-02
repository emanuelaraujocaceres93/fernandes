"use client"

import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabaseClient"
import { formatCurrency } from "../../lib/format"
import { useRouter } from "next/navigation"
import { saveQuotePdf } from "../../lib/pdf"

export default function OrcamentosPage() {
  const router = useRouter()
  const [pedidos, setPedidos] = useState<any[]>([])
  const [fretes, setFretes] = useState<any[]>([])
  const [aba, setAba] = useState<"pdv" | "frete">("pdv")
  const [regenerando, setRegenerando] = useState<string | null>(null)
  const [config, setConfig] = useState<any>(null)

  useEffect(() => {
    carregarPedidos()
    carregarFretes()
    carregarConfig()
  }, [])

  async function carregarConfig() {
    const { data } = await supabase
      .from("configuracoes_empresa")
      .select("*")
      .limit(1)
      .maybeSingle()
    if (data) setConfig(data)
  }

  const verDetalhes = (id: string, tipo: "pdv" | "frete") => {
    if (tipo === "pdv") {
      router.push(`/orcamentos/${id}`)
    } else {
      router.push(`/orcamentos/frete/${id}`)
    }
  }

  async function carregarPedidos() {
    const { data } = await supabase
      .from("pedidos")
      .select("*, clientes(nome)")
      .order("data", { ascending: false })
    if (data) setPedidos(data)
  }

  // 🔧 CARREGAR FRETES - NOME CORRETO DA TABELA
  async function carregarFretes() {
    const { data } = await supabase
      .from("fretes_orcamento")  // ← CORRIGIDO
      .select("*")
      .order("created_at", { ascending: false })
    if (data) setFretes(data)
  }

  // 🔧 FUNÇÃO PARA REGENERAR PDF
  async function regenerarPDF(pedidoId: string) {
    setRegenerando(pedidoId)
    try {
      const { data: pedido } = await supabase
        .from("pedidos")
        .select("*, clientes(nome)")
        .eq("id", pedidoId)
        .single()

      if (!pedido) {
        alert("Pedido não encontrado")
        setRegenerando(null)
        return
      }

      const { data: itens } = await supabase
        .from("itens_pedido")
        .select("*, produtos(nome, tipo)")
        .eq("pedido_id", pedidoId)

      const linhasPDF = (itens || []).map((item: any) => ({
        descricao: `${item.produtos?.nome || "Item"}${item.produtos?.tipo === "servico" ? " (Serviço)" : ""}`,
        quantidade: item.quantidade,
        unitario: Number(item.preco_unitario) || 0,
        total: Number(item.subtotal) || 0,
      }))

      const detalhesAdicionais: Array<[string, string]> = [
        ["Status", pedido.status || "Pendente"]
      ]

      saveQuotePdf(
        {
          titulo: "Orçamento",
          numero: pedido.numero_unico,
          cliente: pedido.clientes?.nome || "Cliente não identificado",
          config,
          linhas: linhasPDF,
          total: pedido.total || 0,
          detalhes: detalhesAdicionais,
        },
        `orcamento_${pedido.numero_unico || pedido.id}.pdf`,
      )
    } catch (error) {
      console.error("Erro ao regenerar PDF:", error)
      alert("Erro ao regenerar PDF")
    } finally {
      setRegenerando(null)
    }
  }

  async function atualizarStatus(id: string, status: string, tipo: "pdv" | "frete") {
    if (tipo === "pdv") {
      const { error } = await supabase.from("pedidos").update({ status }).eq("id", id)
      if (!error) {
        const pedido = pedidos.find(p => p.id === id)
        if (status === "aceito") {
          await supabase.from("caixa_movimentacoes").insert({
            tipo_entrada_saida: "entrada",
            valor: pedido.total,
            descricao: `Venda - ${pedido.numero_unico}`,
            pedido_id_referencia: id,
            user_id: pedido.user_id
          })
          alert(`✅ Orçamento ${pedido.numero_unico} aceito!`)
        } else {
          alert(`❌ Orçamento ${pedido.numero_unico} recusado.`)
        }
        carregarPedidos()
      }
    } else {
      const { error } = await supabase
        .from("fretes_orcamento")  // ← CORRIGIDO
        .update({ status })
        .eq("id", id)
      if (!error) {
        const frete = fretes.find(f => f.id === id)
        if (status === "aceito") {
          await supabase.from("caixa_movimentacoes").insert({
            tipo_entrada_saida: "entrada",
            valor: frete.total_frete,
            descricao: `Frete - ${frete.origem} para ${frete.destino}`,
            user_id: frete.user_id
          })
          alert(`✅ Frete aceito!`)
        } else {
          alert(`❌ Frete recusado.`)
        }
        carregarFretes()
      }
    }
  }

  async function excluirOrcamento(id: string, tipo: "pdv" | "frete") {
    if (confirm("Tem certeza que deseja excluir este orçamento?")) {
      if (tipo === "pdv") {
        await supabase.from("itens_pedido").delete().eq("pedido_id", id)
        await supabase.from("pedidos").delete().eq("id", id)
        carregarPedidos()
      } else {
        await supabase
          .from("fretes_orcamento")  // ← CORRIGIDO
          .delete()
          .eq("id", id)
        carregarFretes()
      }
      alert("Orçamento excluído!")
    }
  }

  const getStatusColor = (status: string) => {
    switch(status) {
      case "pendente": return "bg-yellow-100 text-yellow-800"
      case "aceito": return "bg-green-100 text-green-800"
      case "recusado": return "bg-red-100 text-red-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusText = (status: string) => {
    switch(status) {
      case "pendente": return "⏳ Pendente"
      case "aceito": return "✅ Aceito"
      case "recusado": return "❌ Recusado"
      default: return status
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-[#1a2a4f] mb-6">📋 Orçamentos</h1>
      
      <div className="flex gap-4 mb-6 border-b">
        <button onClick={() => setAba("pdv")} className={`px-6 py-2 font-semibold ${aba === "pdv" ? "text-[#c9a03d] border-b-2 border-[#c9a03d]" : "text-gray-500"}`}>📦 PDV / Serviços ({pedidos.length})</button>
        <button onClick={() => setAba("frete")} className={`px-6 py-2 font-semibold ${aba === "frete" ? "text-[#c9a03d] border-b-2 border-[#c9a03d]" : "text-gray-500"}`}>🚚 Fretes ({fretes.length})</button>
      </div>

      {aba === "pdv" && (
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#1a2a4f] text-white">
              <tr>
                <th className="p-3">Nº</th>
                <th className="p-3">Cliente</th>
                <th className="p-3">Data</th>
                <th className="p-3 text-right">Total</th>
                <th className="p-3">Status</th>
                <th className="p-3">Ações</th>
                <th className="p-3">PDF</th>
              </tr>
            </thead>
            <tbody>
              {pedidos.map(p => (
                <tr key={p.id} className="border-b hover:bg-gray-50">
                  <td className="p-3 font-mono">{p.numero_unico || "-"}</td>
                  <td className="p-3">{p.clientes?.nome}</td>
                  <td className="p-3">{new Date(p.data).toLocaleDateString()}</td>
                  <td className="p-3 text-right font-semibold">{formatCurrency(p.total)}</td>
                  <td className="p-3"><span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(p.status)}`}>{getStatusText(p.status)}</span></td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1">
                      {p.status === "pendente" && (
                        <>
                          <button onClick={() => atualizarStatus(p.id, "aceito", "pdv")} className="px-2 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600">✅</button>
                          <button onClick={() => atualizarStatus(p.id, "recusado", "pdv")} className="px-2 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600">❌</button>
                        </>
                      )}
                      <button onClick={() => excluirOrcamento(p.id, "pdv")} className="px-2 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600">🗑️</button>
                    </div>
                  </td>
                  <td className="p-3">
                    <button
                      onClick={() => regenerarPDF(p.id)}
                      disabled={regenerando === p.id}
                      className="px-3 py-1 bg-[#c9a03d] text-white rounded text-sm hover:bg-[#b58d2c] disabled:opacity-50 flex items-center gap-1"
                    >
                      {regenerando === p.id ? "⏳" : "📄"} PDF
                    </button>
                  </td>
                </tr>
              ))}
              {pedidos.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-gray-500">Nenhum orçamento encontrado</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {aba === "frete" && (
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#1a2a4f] text-white">
              <tr>
                <th className="p-3">Cliente</th>
                <th className="p-3">Origem</th>
                <th className="p-3">Destino</th>
                <th className="p-3 text-right">Total</th>
                <th className="p-3">Data</th>
                <th className="p-3">Status</th>
                <th className="p-3">Ações</th>
                <th className="p-3">PDF</th>
              </tr>
            </thead>
            <tbody>
              {fretes.map(f => (
                <tr key={f.id} className="border-b hover:bg-gray-50">
                  <td className="p-3">{f.cliente}</td>
                  <td className="p-3 truncate max-w-[150px]">{f.origem?.substring(0, 30)}...</td>
                  <td className="p-3 truncate max-w-[150px]">{f.destino?.substring(0, 30)}...</td>
                  <td className="p-3 text-right font-semibold">{formatCurrency(f.total_frete)}</td>
                  <td className="p-3">{new Date(f.created_at).toLocaleDateString()}</td>
                  <td className="p-3"><span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(f.status || "pendente")}`}>{getStatusText(f.status || "pendente")}</span></td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1">
                      {(f.status || "pendente") === "pendente" && (
                        <>
                          <button onClick={() => atualizarStatus(f.id, "aceito", "frete")} className="px-2 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600">✅</button>
                          <button onClick={() => atualizarStatus(f.id, "recusado", "frete")} className="px-2 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600">❌</button>
                        </>
                      )}
                      <button onClick={() => excluirOrcamento(f.id, "frete")} className="px-2 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600">🗑️</button>
                    </div>
                  </td>
                  <td className="p-3">
                    <button
                      disabled
                      className="px-3 py-1 bg-gray-300 text-gray-500 rounded text-sm cursor-not-allowed"
                    >
                      📄 PDF
                    </button>
                  </td>
                </tr>
              ))}
              {fretes.length === 0 && <tr><td colSpan={8} className="p-8 text-center text-gray-500">Nenhum frete encontrado</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}