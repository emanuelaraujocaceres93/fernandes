"use client"

import { useEffect, useState } from "react"
import { supabase } from "../../../lib/supabaseClient"
import { formatCurrency } from "../../../lib/format"

interface ServicoExtra {
  id: number
  nome: string
  descricao: string | null
  valor: number
  ativo: boolean
  ordem: number
  categoria: string | null
}

interface CategoriaServico {
  nome: string
  servicos: ServicoExtra[]
}

const CATEGORIAS_PADRAO = [
  "Tubulação de Cobre",
  "Cabos Elétricos", 
  "Fixação e Suportes",
  "Componentes de Refrigeração",
  "Serviços",
  "Garantias",
  "Compressores",
  "Outros"
]

export default function GerenciarServicosExtras() {
  const [servicos, setServicos] = useState<ServicoExtra[]>([])
  const [categorias, setCategorias] = useState<CategoriaServico[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState("")
  const [sucesso, setSucesso] = useState("")
  const [editando, setEditando] = useState<ServicoExtra | null>(null)
  const [formData, setFormData] = useState({
    nome: "",
    descricao: "",
    valor: "",
    ativo: true,
    categoria: "Outros"
  })
  const [expandirCategoria, setExpandirCategoria] = useState<{ [key: string]: boolean }>({})

  useEffect(() => {
    carregarServicos()
  }, [])

  async function carregarServicos() {
    setLoading(true)
    const { data, error } = await supabase
      .from("servicos_extras")
      .select("*")
      .order("ordem", { ascending: true })
    
    if (error) {
      setErro("Erro ao carregar serviços extras")
    } else {
      setServicos(data || [])
      
      // Agrupar por categoria
      const agrupado: { [key: string]: ServicoExtra[] } = {}
      ;(data || []).forEach(servico => {
        const cat = servico.categoria || "Outros"
        if (!agrupado[cat]) agrupado[cat] = []
        agrupado[cat].push(servico)
      })
      
      const listaCategorias = Object.keys(agrupado).map(nome => ({
        nome,
        servicos: agrupado[nome]
      }))
      
      setCategorias(listaCategorias)
      
      // Inicializar estado de expansão
      const expandState: { [key: string]: boolean } = {}
      listaCategorias.forEach(cat => { expandState[cat.nome] = true })
      setExpandirCategoria(expandState)
    }
    setLoading(false)
  }

  async function salvarServico(e: React.FormEvent) {
    e.preventDefault()
    setErro("")
    setSucesso("")

    const valorNum = parseFloat(formData.valor.replace(",", "."))

    if (!formData.nome || isNaN(valorNum) || valorNum < 0) {
      setErro("Preencha nome e valor corretamente")
      return
    }

    const { error } = await supabase
      .from("servicos_extras")
      .insert({
        nome: formData.nome,
        descricao: formData.descricao || null,
        valor: valorNum,
        ativo: formData.ativo,
        categoria: formData.categoria,
        ordem: servicos.length
      })

    if (error) {
      setErro("Erro ao salvar serviço extra")
    } else {
      setSucesso("Serviço extra adicionado com sucesso!")
      setFormData({ nome: "", descricao: "", valor: "", ativo: true, categoria: "Outros" })
      carregarServicos()
    }
  }

  async function atualizarServico(e: React.FormEvent) {
    e.preventDefault()
    if (!editando) return

    const valorNum = parseFloat(formData.valor.replace(",", "."))

    if (!formData.nome || isNaN(valorNum) || valorNum < 0) {
      setErro("Preencha nome e valor corretamente")
      return
    }

    const { error } = await supabase
      .from("servicos_extras")
      .update({
        nome: formData.nome,
        descricao: formData.descricao || null,
        valor: valorNum,
        ativo: formData.ativo,
        categoria: formData.categoria
      })
      .eq("id", editando.id)

    if (error) {
      setErro("Erro ao atualizar serviço extra")
    } else {
      setSucesso("Serviço extra atualizado com sucesso!")
      setEditando(null)
      setFormData({ nome: "", descricao: "", valor: "", ativo: true, categoria: "Outros" })
      carregarServicos()
    }
  }

  async function deletarServico(id: number) {
    if (!confirm("Tem certeza que deseja excluir este serviço extra?")) return

    const { error } = await supabase
      .from("servicos_extras")
      .delete()
      .eq("id", id)

    if (error) {
      setErro("Erro ao excluir serviço extra")
    } else {
      setSucesso("Serviço extra excluído com sucesso!")
      carregarServicos()
    }
  }

  function iniciarEdicao(servico: ServicoExtra) {
    setEditando(servico)
    setFormData({
      nome: servico.nome,
      descricao: servico.descricao || "",
      valor: servico.valor.toString(),
      ativo: servico.ativo,
      categoria: servico.categoria || "Outros"
    })
  }

  function cancelarEdicao() {
    setEditando(null)
    setFormData({ nome: "", descricao: "", valor: "", ativo: true, categoria: "Outros" })
  }

  async function alternarAtivo(id: number, ativoAtual: boolean) {
    const { error } = await supabase
      .from("servicos_extras")
      .update({ ativo: !ativoAtual })
      .eq("id", id)

    if (error) {
      setErro("Erro ao alterar status")
    } else {
      carregarServicos()
    }
  }

  function toggleCategoria(categoriaNome: string) {
    setExpandirCategoria(prev => ({
      ...prev,
      [categoriaNome]: !prev[categoriaNome]
    }))
  }

  if (loading) {
    return <div className="p-8 text-center">Carregando...</div>
  }

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#1a2a4f]">⚙️ Gerenciar Serviços Extras</h1>
        <p className="text-gray-600">Adicione, edite ou remova serviços extras organizados por categorias</p>
      </div>

      {(erro || sucesso) && (
        <div className={`mb-4 rounded-lg p-3 ${erro ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>
          {erro || sucesso}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Formulário */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">
            {editando ? "✏️ Editar Serviço Extra" : "➕ Adicionar Novo Serviço Extra"}
          </h2>
          <form onSubmit={editando ? atualizarServico : salvarServico} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
              <input
                type="text"
                value={formData.nome}
                onChange={(e) => setFormData({...formData, nome: e.target.value})}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-[#1a2a4f] focus:ring-1 focus:ring-[#1a2a4f]"
                placeholder="Ex: Cobre de 1/4, Compressor, etc."
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Categoria *</label>
              <select
                value={formData.categoria}
                onChange={(e) => setFormData({...formData, categoria: e.target.value})}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-[#1a2a4f] focus:ring-1 focus:ring-[#1a2a4f]"
                required
              >
                {CATEGORIAS_PADRAO.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
                <option value="Outros">Outros</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descrição (opcional)</label>
              <textarea
                value={formData.descricao}
                onChange={(e) => setFormData({...formData, descricao: e.target.value})}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-[#1a2a4f] focus:ring-1 focus:ring-[#1a2a4f]"
                rows={2}
                placeholder="Descrição detalhada do serviço"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Valor (R$) *</label>
              <input
                type="number"
                step="0.01"
                value={formData.valor}
                onChange={(e) => setFormData({...formData, valor: e.target.value})}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-[#1a2a4f] focus:ring-1 focus:ring-[#1a2a4f]"
                placeholder="0,00"
                required
              />
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={formData.ativo}
                onChange={(e) => setFormData({...formData, ativo: e.target.checked})}
                className="mr-2 w-4 h-4"
              />
              <label className="text-sm text-gray-700">Ativo (aparece no orçamento)</label>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="bg-[#1a2a4f] text-white px-4 py-2 rounded-lg hover:bg-[#24375f]"
              >
                {editando ? "Atualizar" : "Adicionar"}
              </button>
              {editando && (
                <button
                  type="button"
                  onClick={cancelarEdicao}
                  className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Lista de serviços por categoria */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">📋 Serviços Extras por Categoria</h2>
          <div className="space-y-4 max-h-[500px] overflow-y-auto">
            {categorias.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Nenhum serviço extra cadastrado</p>
            ) : (
              categorias.map((categoria) => (
                <div key={categoria.nome} className="border rounded-lg overflow-hidden">
                  <button
                    onClick={() => toggleCategoria(categoria.nome)}
                    className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">
                        {expandirCategoria[categoria.nome] ? "▼" : "▶"}
                      </span>
                      <h3 className="font-semibold text-[#1a2a4f]">{categoria.nome}</h3>
                      <span className="text-xs text-gray-500">({categoria.servicos.length})</span>
                    </div>
                  </button>
                  
                  {expandirCategoria[categoria.nome] && (
                    <div className="divide-y">
                      {categoria.servicos.map((servico) => (
                        <div key={servico.id} className={`p-3 ${!servico.ativo ? "bg-gray-50 opacity-60" : ""}`}>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-medium">{servico.nome}</h4>
                              {servico.descricao && (
                                <p className="text-sm text-gray-500">{servico.descricao}</p>
                              )}
                              <p className="text-md font-bold text-green-600 mt-1">{formatCurrency(servico.valor)}</p>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => alternarAtivo(servico.id, servico.ativo)}
                                className={`px-2 py-1 rounded text-sm ${servico.ativo ? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-green-700"}`}
                              >
                                {servico.ativo ? "Desativar" : "Ativar"}
                              </button>
                              <button
                                onClick={() => iniciarEdicao(servico)}
                                className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm"
                              >
                                Editar
                              </button>
                              <button
                                onClick={() => deletarServico(servico.id)}
                                className="px-2 py-1 bg-red-100 text-red-700 rounded text-sm"
                              >
                                Excluir
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}