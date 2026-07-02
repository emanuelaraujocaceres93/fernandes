"use client"

import { useEffect, useState } from "react"
import { supabase } from "../../../lib/supabaseClient"
import { useParams } from "next/navigation"
import Link from "next/link"
import { formatCurrency } from "../../../lib/format"

export default function DetalhesOrcamento() {
  const { id } = useParams()
  const [orcamento, setOrcamento] = useState<any>(null)
  const [itens, setItens] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    carregarDetalhes()
  }, [id])

  async function carregarDetalhes() {
    try {
      const { data: pedido } = await supabase
        .from("pedidos")
        .select("*, clientes(nome)")
        .eq("id", id)
        .single()

      const { data: itensPedido } = await supabase
        .from("itens_pedido")
        .select("*, produtos(nome, tipo, valor_venda)")
        .eq("pedido_id", id)

      setOrcamento(pedido)
      setItens(itensPedido || [])
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="p-8 text-center">Carregando...</div>
  }
  
  if (!orcamento) {
    return <div className="p-8 text-center text-red-500">Orçamento não encontrado</div>
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="mb-4">
        <Link href="/orcamentos" className="text-blue-600 hover:underline">
          ← Voltar para lista
        </Link>
      </div>
      <h1 className="text-2xl font-bold mb-4">Detalhes do Orçamento</h1>
      <div className="bg-gray-50 p-4 rounded mb-4">
        <p><strong>Número:</strong> {orcamento.numero_unico || "-"}</p>
        <p><strong>Cliente:</strong> {orcamento.clientes?.nome || "-"}</p>
        <p><strong>Data:</strong> {new Date(orcamento.data).toLocaleDateString()}</p>
        <p><strong>Status:</strong> {orcamento.status}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[#1a2a4f] text-white">
              <th className="p-2 text-left">Produto/Serviço</th>
              <th className="p-2 text-right">Qtde</th>
              <th className="p-2 text-right">Unitário</th>
              <th className="p-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {itens.map((item) => (
              <tr key={item.id} className="border-b">
                <td className="p-2">{item.produtos?.nome || "Produto não encontrado"}</td>
                <td className="p-2 text-right">{item.quantidade}</td>
                {/* 🔧 CORRIGIDO: valor_unitario → preco_unitario */}
                <td className="p-2 text-right">{formatCurrency(item.preco_unitario || 0)}</td>
                {/* 🔧 CORRIGIDO: valor_total → subtotal */}
                <td className="p-2 text-right">{formatCurrency(item.subtotal || 0)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="font-bold bg-gray-100">
              <td colSpan={3} className="p-2 text-right">Total:</td>
              <td className="p-2 text-right">{formatCurrency(orcamento.total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}