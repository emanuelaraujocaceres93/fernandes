"use client"

import { useEffect, useMemo, useState } from "react"
import { supabase } from "../../lib/supabaseClient"
import { formatCurrency, formatDate, normalizeText, toPositiveNumber } from "../../lib/format"
import type { CaixaMovimentacao } from "../../lib/types"

export default function CaixaPage() {
  const [movimentacoes, setMovimentacoes] = useState<CaixaMovimentacao[]>([])
  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState<CaixaMovimentacao | null>(null)
  const [form, setForm] = useState({ descricao: "", valor: "", data: "" })
  const [erro, setErro] = useState("")

  useEffect(() => {
    carregarMovimentacoes()
  }, [])

  async function carregarMovimentacoes() {
    const { data, error } = await supabase.from("caixa").select("*").order("data", { ascending: false })
    if (data) setMovimentacoes(data as CaixaMovimentacao[])
    if (error) setErro("Nao foi possivel carregar o caixa.")
  }

  const totais = useMemo(() => {
    const entradas = movimentacoes
      .filter((item) => item.tipo_entrada_saida === "entrada")
      .reduce((acc, item) => acc + Number(item.valor || 0), 0)
    const saidas = movimentacoes
      .filter((item) => item.tipo_entrada_saida === "saida")
      .reduce((acc, item) => acc + Number(item.valor || 0), 0)
    return { entradas, saidas, saldo: entradas - saidas }
  }, [movimentacoes])

  async function salvarMovimentacao() {
    setErro("")
    const descricao = normalizeText(form.descricao)
    const valor = toPositiveNumber(form.valor)

    if (!descricao || !valor) {
      setErro("Preencha descricao e valor maior que zero.")
      return
    }

    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) {
      setErro("Sessao expirada. Entre novamente.")
      return
    }

    const dados = {
      descricao,
      valor,
      data: form.data || new Date().toISOString().split("T")[0],
      tipo_entrada_saida: "saida",
      user_id: userData.user.id,
    }

    const { error } = editando
      ? await supabase.from("caixa").update(dados).eq("id", editando.id)
      : await supabase.from("caixa").insert(dados)

    if (error) {
      setErro(error.message)
      return
    }

    setModalAberto(false)
    setEditando(null)
    setForm({ descricao: "", valor: "", data: "" })
    carregarMovimentacoes()
  }

  async function excluirMovimentacao(id: string) {
    if (!confirm("Tem certeza que deseja excluir?")) return
    const { error } = await supabase.from("caixa").delete().eq("id", id)
    if (error) setErro(error.message)
    carregarMovimentacoes()
  }

  function abrirModal(item?: CaixaMovimentacao) {
    setEditando(item || null)
    setForm({
      descricao: item?.descricao || "",
      valor: item?.valor?.toString() || "",
      data: item?.data ? item.data.split("T")[0] : "",
    })
    setModalAberto(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-[#c9a03d]">Financeiro</p>
          <h1 className="text-2xl font-bold text-[#17264a]">Caixa</h1>
        </div>
        <button onClick={() => abrirModal()} className="rounded-lg bg-[#c9a03d] px-4 py-2 font-semibold text-white hover:bg-[#b58d2c]">
          Nova despesa
        </button>
      </div>

      {erro && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{erro}</div>}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Resumo label="Entradas" value={formatCurrency(totais.entradas)} tone="green" />
        <Resumo label="Saidas" value={formatCurrency(totais.saidas)} tone="red" />
        <Resumo label="Saldo atual" value={formatCurrency(totais.saldo)} tone={totais.saldo >= 0 ? "green" : "red"} />
      </div>

      <div className="overflow-x-auto rounded-lg bg-white shadow-sm ring-1 ring-slate-200">
        <table className="w-full min-w-[680px]">
          <thead className="bg-[#17264a] text-white">
            <tr>
              <th className="p-3 text-left text-sm">Data</th>
              <th className="p-3 text-left text-sm">Descricao</th>
              <th className="p-3 text-right text-sm">Valor</th>
              <th className="p-3 text-left text-sm">Acoes</th>
            </tr>
          </thead>
          <tbody>
            {movimentacoes.map((item) => (
              <tr key={item.id} className="border-b border-slate-100">
                <td className="p-3 text-sm">{formatDate(item.data)}</td>
                <td className="p-3 text-sm">
                  {item.descricao} {item.pedido_id_referencia && <span className="text-xs text-green-700">(Venda)</span>}
                </td>
                <td className={`p-3 text-right text-sm font-semibold ${item.tipo_entrada_saida === "entrada" ? "text-green-700" : "text-red-700"}`}>
                  {item.tipo_entrada_saida === "entrada" ? "+" : "-"} {formatCurrency(item.valor)}
                </td>
                <td className="p-3 text-sm">
                  <button onClick={() => abrirModal(item)} className="mr-3 font-semibold text-[#17264a]">Editar</button>
                  <button onClick={() => excluirMovimentacao(item.id)} className="font-semibold text-red-600">Excluir</button>
                </td>
              </tr>
            ))}
            {movimentacoes.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-sm text-slate-500">Nenhuma movimentacao.</td></tr>}
          </tbody>
        </table>
      </div>

      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-xl font-bold text-[#17264a]">{editando ? "Editar despesa" : "Nova despesa"}</h2>
            <input type="text" placeholder="Descricao" className="mb-3 w-full rounded-lg border border-slate-300 p-3" value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
            <input type="number" step="0.01" min="0" placeholder="Valor (R$)" className="mb-3 w-full rounded-lg border border-slate-300 p-3" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} />
            <input type="date" className="mb-4 w-full rounded-lg border border-slate-300 p-3" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} />
            <div className="flex gap-3">
              <button onClick={salvarMovimentacao} className="flex-1 rounded-lg bg-[#17264a] py-2 font-semibold text-white">Salvar</button>
              <button onClick={() => setModalAberto(false)} className="flex-1 rounded-lg bg-slate-200 py-2 font-semibold text-slate-700">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Resumo({ label, value, tone }: { label: string; value: string; tone: "green" | "red" }) {
  return (
    <div className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${tone === "green" ? "text-green-700" : "text-red-700"}`}>{value}</p>
    </div>
  )
}
