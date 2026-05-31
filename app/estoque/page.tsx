"use client"

import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabaseClient"

export default function EstoquePage() {
  const [produtos, setProdutos] = useState<any[]>([])
  const [modalAberto, setModalAberto] = useState(false)
  const [modalEditarAberto, setModalEditarAberto] = useState(false)
  const [tipoItem, setTipoItem] = useState<"produto" | "servico">("produto")
  const [produtoEditando, setProdutoEditando] = useState<any>(null)
  const [form, setForm] = useState({ 
    nome: "", 
    quantidade: "", 
    quantidade_minima: "", 
    valor_compra: "", 
    valor_venda: "" 
  })

  useEffect(() => { carregarProdutos() }, [])

  async function carregarProdutos() {
    const { data } = await supabase.from("produtos").select("*").order("nome")
    if (data) setProdutos(data)
  }

  async function salvarProduto() {
    if (!form.nome.trim()) { alert("Digite o nome"); return }
    if (!form.valor_venda || parseFloat(form.valor_venda) <= 0) { alert("Digite o valor de venda"); return }
    
    const { data: userData } = await supabase.auth.getUser()
    const dadosParaSalvar: any = {
      nome: form.nome,
      tipo: tipoItem,
      valor_venda: parseFloat(form.valor_venda),
      user_id: userData.user?.id
    }
    
    if (tipoItem === "produto") {
      dadosParaSalvar.quantidade = parseInt(form.quantidade) || 0
      dadosParaSalvar.quantidade_minima = parseInt(form.quantidade_minima) || 0
      dadosParaSalvar.valor_compra = parseFloat(form.valor_compra) || 0
    }
    
    await supabase.from("produtos").insert(dadosParaSalvar)
    setModalAberto(false)
    setForm({ nome: "", quantidade: "", quantidade_minima: "", valor_compra: "", valor_venda: "" })
    carregarProdutos()
    alert("Item cadastrado!")
  }

  async function atualizarProduto() {
    if (!form.nome.trim()) { alert("Digite o nome"); return }
    
    const dadosParaSalvar: any = {
      nome: form.nome,
      tipo: produtoEditando.tipo,
      valor_venda: parseFloat(form.valor_venda)
    }
    
    if (produtoEditando.tipo === "produto") {
      dadosParaSalvar.quantidade = parseInt(form.quantidade) || 0
      dadosParaSalvar.quantidade_minima = parseInt(form.quantidade_minima) || 0
      dadosParaSalvar.valor_compra = parseFloat(form.valor_compra) || 0
    }
    
    await supabase.from("produtos").update(dadosParaSalvar).eq("id", produtoEditando.id)
    setModalEditarAberto(false)
    setProdutoEditando(null)
    carregarProdutos()
    alert("Item atualizado!")
  }

  async function excluirProduto(id: string) {
    if (confirm("Tem certeza que deseja excluir?")) {
      await supabase.from("produtos").delete().eq("id", id)
      carregarProdutos()
    }
  }

  function abrirEdicao(produto: any) {
    setProdutoEditando(produto)
    setForm({
      nome: produto.nome,
      quantidade: produto.quantidade?.toString() || "",
      quantidade_minima: produto.quantidade_minima?.toString() || "",
      valor_compra: produto.valor_compra?.toString() || "",
      valor_venda: produto.valor_venda?.toString() || ""
    })
    setModalEditarAberto(true)
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-[#1a2a4f]">📦 Estoque / Serviços</h1>
        <button onClick={() => setModalAberto(true)} className="px-4 py-2 bg-[#c9a03d] text-white rounded-lg">+ Novo Item</button>
      </div>
      
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full">
          <thead className="bg-[#1a2a4f] text-white">
            <tr><th className="p-3">Tipo</th><th className="p-3">Nome</th><th className="p-3 text-right">Preço</th><th className="p-3 text-center">Ações</th></tr>
          </thead>
          <tbody>
            {produtos.map(p => (
              <tr key={p.id} className="border-b">
                <td className="p-3">{p.tipo === "servico" ? "🔧 Serviço" : "📦 Produto"}</td>
                <td className="p-3 font-medium">{p.nome}</td>
                <td className="p-3 text-right font-semibold text-green-600">R$ {p.valor_venda?.toFixed(2)}</td>
                <td className="p-3 text-center">
                  <button onClick={() => abrirEdicao(p)} className="text-blue-600 mr-2">✏️ Editar</button>
                  <button onClick={() => excluirProduto(p.id)} className="text-red-600">🗑️ Excluir</button>
                </td>
               </tr>
            ))}
            {produtos.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-gray-500">Nenhum item cadastrado.</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Modal Novo */}
      {modalAberto && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">➕ Novo Item</h2>
            <div className="flex gap-3 mb-4">
              <button onClick={() => setTipoItem("produto")} className={`flex-1 py-2 rounded border ${tipoItem === "produto" ? "bg-[#1a2a4f] text-white" : "border-gray-300"}`}>📦 Produto</button>
              <button onClick={() => setTipoItem("servico")} className={`flex-1 py-2 rounded border ${tipoItem === "servico" ? "bg-[#1a2a4f] text-white" : "border-gray-300"}`}>🔧 Serviço</button>
            </div>
            <input type="text" placeholder="Nome" className="w-full p-3 border rounded mb-2" value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} />
            {tipoItem === "produto" && (
              <><div className="grid grid-cols-2 gap-2 mb-2"><input type="number" placeholder="Quantidade" className="p-3 border rounded" value={form.quantidade} onChange={e => setForm({...form, quantidade: e.target.value})} /><input type="number" placeholder="Qtd Mínima" className="p-3 border rounded" value={form.quantidade_minima} onChange={e => setForm({...form, quantidade_minima: e.target.value})} /></div>
              <input type="number" step="0.01" placeholder="Preço Compra" className="w-full p-3 border rounded mb-2" value={form.valor_compra} onChange={e => setForm({...form, valor_compra: e.target.value})} /></>
            )}
            <input type="number" step="0.01" placeholder="Preço Venda" className="w-full p-3 border rounded mb-4" value={form.valor_venda} onChange={e => setForm({...form, valor_venda: e.target.value})} />
            <div className="flex gap-3"><button onClick={salvarProduto} className="flex-1 py-2 bg-[#1a2a4f] text-white rounded">Salvar</button><button onClick={() => setModalAberto(false)} className="flex-1 py-2 bg-gray-200 rounded">Cancelar</button></div>
          </div>
        </div>
      )}

      {/* Modal Editar */}
      {modalEditarAberto && produtoEditando && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">✏️ Editar {produtoEditando.tipo === "servico" ? "Serviço" : "Produto"}</h2>
            <input type="text" placeholder="Nome" className="w-full p-3 border rounded mb-2" value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} />
            {produtoEditando.tipo === "produto" && (
              <><div className="grid grid-cols-2 gap-2 mb-2"><input type="number" placeholder="Quantidade" className="p-3 border rounded" value={form.quantidade} onChange={e => setForm({...form, quantidade: e.target.value})} /><input type="number" placeholder="Qtd Mínima" className="p-3 border rounded" value={form.quantidade_minima} onChange={e => setForm({...form, quantidade_minima: e.target.value})} /></div>
              <input type="number" step="0.01" placeholder="Preço Compra" className="w-full p-3 border rounded mb-2" value={form.valor_compra} onChange={e => setForm({...form, valor_compra: e.target.value})} /></>
            )}
            <input type="number" step="0.01" placeholder="Preço Venda" className="w-full p-3 border rounded mb-4" value={form.valor_venda} onChange={e => setForm({...form, valor_venda: e.target.value})} />
            <div className="flex gap-3"><button onClick={atualizarProduto} className="flex-1 py-2 bg-[#1a2a4f] text-white rounded">Atualizar</button><button onClick={() => setModalEditarAberto(false)} className="flex-1 py-2 bg-gray-200 rounded">Cancelar</button></div>
          </div>
        </div>
      )}
    </div>
  )
}
