"use client"

import { useEffect, useState } from "react"
import { supabase } from "../../../../lib/supabaseClient"
import { useParams } from "next/navigation"
import Link from "next/link"
import { formatCurrency } from "../../../../lib/format"

export default function DetalhesFrete() {
  const { id } = useParams()
  const [frete, setFrete] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    carregarDetalhes()
  }, [id])

  async function carregarDetalhes() {
    try {
      // 🔧 CORRIGIDO: "fretes_orcamentos" → "fretes_orcamento"
      const { data } = await supabase
        .from("fretes_orcamento")
        .select("*")
        .eq("id", id)
        .single()

      setFrete(data)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="p-8 text-center">Carregando...</div>
  }
  
  if (!frete) {
    return <div className="p-8 text-center text-red-500">Frete não encontrado</div>
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="mb-4">
        <Link href="/orcamentos" className="text-blue-600 hover:underline">
          ← Voltar para lista
        </Link>
      </div>
      <h1 className="text-2xl font-bold mb-4">Detalhes do Frete</h1>
      <div className="bg-gray-50 p-4 rounded mb-4 space-y-2">
        <p><strong>Cliente:</strong> {frete.cliente || "-"}</p>
        <p><strong>Origem:</strong> {frete.origem || "-"}</p>
        <p><strong>Destino:</strong> {frete.destino || "-"}</p>
        <p><strong>Distância:</strong> {frete.distancia_km ? `${frete.distancia_km} km` : "-"}</p>
        <p><strong>Data:</strong> {new Date(frete.created_at).toLocaleDateString()}</p>
        <p><strong>Status:</strong> {frete.status || "pendente"}</p>
        <p className="text-lg font-bold mt-4">Valor total: {formatCurrency(frete.total_frete)}</p>
      </div>
    </div>
  )
}