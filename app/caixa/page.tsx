"use client"

import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabaseClient"

export default function CaixaPage() {
  const [movimentacoes, setMovimentacoes] = useState<any[]>([])
  const [totalEntradas, setTotalEntradas] = useState(0)
  const [totalSaidas, setTotalSaidas] = useState(0)
  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState<any>(null)
  const [form, setForm] = useState({ descricao: "", valor: "", data: "" })

  useEffect(() => {
    carregarMovimentacoes()
  }, [])

  async function carregarMovimentacoes() {
    const { data } = await supabase.from("caixa").select("*").order("data", { ascending: false })
    if (data) {
      setMovimentacoes(data)
      const entradas = data.filter(m => m.tipo_entrada_saida === "entrada").reduce((s, m) => s + m.valor, 0)
      const saidas = data.filter(m => m.tipo_entrada_saida === "saida").reduce((s, m) => s + m.valor, 0)
      setTotalEntradas(entradas)
      setTotalSaidas(saidas)
    }
  }

  async function salvarMovimentacao() {
    if (!form.descricao || !form.valor) {
      alert("Preencha descrição e valor")
      return
    }

    const { data: userData } = await supabase.auth.getUser()
    const dados = {
      descricao: form.descricao,
      valor: parseFloat(form.valor),
      data: form.data || new Date().toISOString().split("T")[0],
      tipo_entrada_saida: "saida",
      user_id: userData.user?.id
    }

    if (editando) {
      await supabase.from("caixa").update(dados).eq("id", editando.id)
    } else {
      await supabase.from("caixa").insert(dados)
    }

    setModalAberto(false)
    setEditando(null)
    setForm({ descricao: "", valor: "", data: "" })
    carregarMovimentacoes()
  }

  async function excluirMovimentacao(id: string) {
    if (confirm("Tem certeza que deseja excluir?")) {
      await supabase.from("caixa").delete().eq("id", id)
      carregarMovimentacoes()
    }
  }

  function editarMovimentacao(item: any) {
    setEditando(item)
    setForm({
      descricao: item.descricao,
      valor: item.valor.toString(),
      data: item.data.split("T")[0]
    })
    setModalAberto(true)
  }

  const saldo = totalEntradas - totalSaidas

  return (
    <div>
      <h1 className="text-2xl font-bold text-[#1a2a4f] mb-6">💰 Caixa</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <p className="text-gray-600">Total Entradas</p>
          <p className="text-2xl font-bold text-green-600">R$ {totalEntradas.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <p className="text-gray-600">Total Saídas</p>
          <p className="text-2xl font-bold text-red-600">R$ {totalSaidas.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <p className="text-gray-600">Saldo Atual</p>
          <p className={`text-2xl font-bold ${saldo >= 0 ? "text-green-600" : "text-red-600"}`}>R$ {saldo.toFixed(2)}</p>
        </div>
      </div>

      <div className="flex justify-end mb-4">
        <button onClick={() => { setEditando(null); setForm({ descricao: "", valor: "", data: "" }); setModalAberto(true) }} className="px-4 py-2 bg-[#c9a03d] text-white rounded-lg">+ Nova Despesa</button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full">
          <thead className="bg-[#1a2a4f] text-white">
            <tr><th className="p-3">Data</th><th className="p-3">Descrição</th><th className="p-3 text-right">Valor</th><th className="p-3 text-center">Ações</th></tr>
          </thead>
          <tbody>
            {movimentacoes.map(m => (
              <tr key={m.id} className="border-b">
                <td className="p-3">{new Date(m.data).toLocaleDateString()}</td>
                <td className="p-3">{m.descricao} {m.pedido_id_referencia && <span className="text-xs text-green-600">(Venda)</span>}</td>
                <td className={`p-3 text-right font-semibold ${m.tipo_entrada_saida === "entrada" ? "text-green-600" : "text-red-600"}`}>
                  {m.tipo_entrada_saida === "entrada" ? "+" : "-"} R$ {m.valor.toFixed(2)}
                </td>
                <td className="p-3 text-center">
                  <button onClick={() => editarMovimentacao(m)} className="text-blue-600 mr-2">✏️ Editar</button>
                  <button onClick={() => excluirMovimentacao(m.id)} className="text-red-600">🗑️ Excluir</button>
                </td>
              </tr>
            ))}
            {movimentacoes.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-gray-500">Nenhuma movimentação</td></tr>}
          </tbody>
        </table>
      </div>

      {modalAberto && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">{editando ? "✏️ Editar" : "➕ Nova"} Despesa</h2>
            <input type="text" placeholder="Descrição" className="w-full p-3 border rounded mb-2" value={form.descricao} onChange={e => setForm({...form, descricao: e.target.value})} />
            <input type="number" step="0.01" placeholder="Valor (R$)" className="w-full p-3 border rounded mb-2" value={form.valor} onChange={e => setForm({...form, valor: e.target.value})} />
            <input type="date" className="w-full p-3 border rounded mb-4" value={form.data} onChange={e => setForm({...form, data: e.target.value})} />
            <div className="flex gap-3">
              <button onClick={salvarMovimentacao} className="flex-1 py-2 bg-[#1a2a4f] text-white rounded">Salvar</button>
              <button onClick={() => setModalAberto(false)} className="flex-1 py-2 bg-gray-200 rounded">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
