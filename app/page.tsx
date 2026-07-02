"use client"

import { useEffect, useMemo, useState } from "react"
import { supabase } from "../lib/supabaseClient"
import { saveQuotePdf } from "../lib/pdf"
import { formatCurrency, normalizeText } from "../lib/format"
import type { Cliente, EmpresaConfig, ItemCarrinho, Produto } from "../lib/types"
import MateriaisOpcoes from "./components/MateriaisOpcoes"

interface ServicoExtra {
  id: number
  nome: string
  descricao: string | null
  valor: number
  ativo: boolean
  ordem: number
  categoria: string | null
}

export default function PDV() {
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([])
  const [busca, setBusca] = useState("")
  const [nomeCliente, setNomeCliente] = useState("")
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState("")
  const [sucesso, setSucesso] = useState("")
  const [config, setConfig] = useState<EmpresaConfig | null>(null)
  const [observacoes, setObservacoes] = useState("")
  const [servicosExtras, setServicosExtras] = useState<ServicoExtra[]>([])
  const [servicosSelecionados, setServicosSelecionados] = useState<{ [key: number]: boolean }>({})
  const [materiaisSelecionados, setMateriaisSelecionados] = useState<any>({})
  const [mostrarMateriais, setMostrarMateriais] = useState(false)

  useEffect(() => {
    carregarDados()
    carregarServicosExtras()
  }, [])

  async function carregarDados() {
    const [produtosResult, clientesResult, configResult] = await Promise.all([
      supabase.from("produtos").select("*").order("nome"),
      supabase.from("clientes").select("*").order("nome"),
      supabase.from("configuracoes_empresa").select("*").limit(1).maybeSingle(),
    ])

    if (produtosResult.data) setProdutos(produtosResult.data as Produto[])
    if (clientesResult.data) setClientes(clientesResult.data as Cliente[])
    if (configResult.data) setConfig(configResult.data as EmpresaConfig)
    if (produtosResult.error || clientesResult.error) {
      setErro("Não foi possível carregar todos os dados. Verifique sua conexão.")
    }
  }

  async function carregarServicosExtras() {
    const { data } = await supabase
      .from("servicos_extras")
      .select("*")
      .eq("ativo", true)
      .order("ordem", { ascending: true })
    
    if (data) {
      setServicosExtras(data)
      const inicial: { [key: number]: boolean } = {}
      data.forEach(s => { inicial[s.id] = false })
      setServicosSelecionados(inicial)
    }
  }

  const produtosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    if (!termo) return produtos
    return produtos.filter((produto) => produto.nome.toLowerCase().includes(termo))
  }, [busca, produtos])

  const totalMateriais = useMemo(() => {
    let total = 0
    Object.entries(materiaisSelecionados).forEach(([catId, itens]: [string, any]) => {
      Object.entries(itens).forEach(([itemId, selecionado]) => {
        if (selecionado) {
          const categorias: any = {
            tubulacao: { cobre_14: 45, cobre_38: 55, cobre_12: 65, cobre_58: 75, cobre_34: 85 },
            cabos: { cabopp_5x15: 120, cabopp_4x15: 95, cabopp_5x25: 180, cabopp_4x25: 145 },
            fixacao: { suporte_cond: 89.90, silver_tape: 12.50, bucha_s10: 1.50, parafuso_10: 2.00, bucha_s6: 1.00, parafuso_6: 1.50 },
            refrigeracao: { compressor: 850, filtro_secador: 45, valvula_schrader: 15, carga_gas: 250 },
            servicos: { higienizacao: 180, limpeza_filtro: 50, carnagem: 120, turbina: 150, reparos_eletricos: 100, troca_cabo: 80 }
          }
          total += categorias[catId]?.[itemId] || 0
        }
      })
    })
    return total
  }, [materiaisSelecionados])

  const totalCarrinho = useMemo(
    () => carrinho.reduce((acc, item) => acc + Number(item.valor_venda || 0) * item.quantidade, 0),
    [carrinho],
  )

  const totalGeral = totalCarrinho + totalMateriais
  
  const totalServicosExtras = useMemo(() => {
    let total = 0
    servicosExtras.forEach(servico => {
      if (servicosSelecionados[servico.id]) {
        total += servico.valor
      }
    })
    return total
  }, [servicosExtras, servicosSelecionados])

  const totalGeralCompleto = totalGeral + totalServicosExtras

  function adicionarAoCarrinho(produto: Produto) {
    setCarrinho((atual) => {
      const existente = atual.find((item) => item.id === produto.id)
      if (!existente) return [...atual, { ...produto, quantidade: 1 }]
      return atual.map((item) =>
        item.id === produto.id ? { ...item, quantidade: item.quantidade + 1 } : item,
      )
    })
  }

  function removerDoCarrinho(produtoId: string) {
    setCarrinho((atual) => atual.filter((item) => item.id !== produtoId))
  }

  function atualizarQuantidade(produtoId: string, quantidade: number) {
    setCarrinho((atual) => {
      if (quantidade <= 0) return atual.filter((item) => item.id !== produtoId)
      return atual.map((item) => (item.id === produtoId ? { ...item, quantidade } : item))
    })
  }

  async function criarClienteSeNecessario() {
    const nome = normalizeText(nomeCliente)
    if (!nome) {
      setErro("Informe o nome do cliente.")
      return null
    }

    const existente = clientes.find((cliente) => cliente.nome.toLowerCase() === nome.toLowerCase())
    if (existente) return existente

    const { data, error } = await supabase
      .from("clientes")
      .insert({ nome })
      .select()
      .single()

    if (error || !data) {
      console.error("Erro ao criar cliente:", error)
      setErro("Não foi possível cadastrar o cliente.")
      return null
    }

    const cliente = data as Cliente
    setClientes((atual) => [...atual, cliente])
    return cliente
  }

  function getMateriaisSelecionadosTexto() {
    const itens: string[] = []
    const categorias: any = {
      tubulacao: { nome: "Tubulação de Cobre", itens: { cobre_14: "Cobre de 1/4", cobre_38: "Cobre 3/8", cobre_12: "Cobre 1/2", cobre_58: "Cobre 5/8", cobre_34: "Cobre 3/4" } },
      cabos: { nome: "Cabos Elétricos", itens: { cabopp_5x15: "Cabo PP 5 vias x 1,5mm", cabopp_4x15: "Cabo PP 4 vias x 1,5mm", cabopp_5x25: "Cabo PP 5 vias x 2,5mm", cabopp_4x25: "Cabo PP 4 vias x 2,5mm" } },
      fixacao: { nome: "Fixação e Suportes", itens: { suporte_cond: "Suporte de condensadora", silver_tape: "Silver tape", bucha_s10: "Bucha S10", parafuso_10: "Parafuso 10 sextavado", bucha_s6: "Bucha S6", parafuso_6: "Parafuso 6 com arruela lisa" } },
      refrigeracao: { nome: "Componentes de Refrigeração", itens: { compressor: "Compressor", filtro_secador: "Filtro secador", valvula_schrader: "Válvula Schrader", carga_gas: "Carga de gás" } },
      servicos: { nome: "Serviços Especializados", itens: { higienizacao: "Higienização completa", limpeza_filtro: "Limpeza de filtro", carnagem: "Carnagem", turbina: "Troca/limpeza de turbina", reparos_eletricos: "Reparos elétricos", troca_cabo: "Troca de cabo de comunicação" } }
    }

    Object.entries(materiaisSelecionados).forEach(([catId, itensObj]: [string, any]) => {
      Object.entries(itensObj).forEach(([itemId, selecionado]) => {
        if (selecionado && categorias[catId]?.itens[itemId]) {
          itens.push(`- ${categorias[catId].itens[itemId]}`)
        }
      })
    })
    return itens
  }

  async function gerarPDF() {
    setErro("")
    setSucesso("")

    if (carrinho.length === 0 && totalMateriais === 0 && totalServicosExtras === 0) {
      setErro("Adicione pelo menos um item ao carrinho, selecione materiais ou serviços extras.")
      return
    }

    const cliente = await criarClienteSeNecessario()
    if (!cliente) return

    setLoading(true)

    try {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) throw new Error("Sessão expirada.")

      // 🔧 CORRIGIDO: user_id existe, então podemos enviar
      const { data: pedido, error: pedidoError } = await supabase
        .from("pedidos")
        .insert({
          cliente_id: cliente.id,
          total: totalGeralCompleto,
          status: "pendente",
          user_id: userData.user.id,
        })
        .select()
        .single()

      if (pedidoError || !pedido) throw new Error(pedidoError?.message || "Erro ao salvar pedido.")

      const itens = carrinho.map((item) => ({
        pedido_id: pedido.id,
        produto_id: item.id,
        quantidade: item.quantidade,
        preco_unitario: Number(item.valor_venda) || 0,
        subtotal: (Number(item.valor_venda) || 0) * item.quantidade,
      }))

      if (itens.length > 0) {
        const { error: itensError } = await supabase.from("itens_pedido").insert(itens)
        if (itensError) throw new Error(itensError.message)
      }

      const linhasPDF = [
        ...carrinho.map(item => ({
          descricao: `${item.nome}${item.tipo === "servico" ? " (Serviço)" : ""}`,
          quantidade: item.quantidade,
          unitario: Number(item.valor_venda) || 0,
          total: (Number(item.valor_venda) || 0) * item.quantidade
        })),
        ...getMateriaisSelecionadosTexto().map(material => ({
          descricao: material,
          quantidade: 1,
          unitario: 0,
          total: 0
        }))
      ]

      const detalhesAdicionais: Array<[string, string]> = [["Status", "Pendente"]]
      
      if (observacoes) {
        detalhesAdicionais.push(["Observações", observacoes])
      }
      if (totalMateriais > 0) {
        detalhesAdicionais.push(["Materiais adicionais", formatCurrency(totalMateriais)])
      }
      if (totalServicosExtras > 0) {
        detalhesAdicionais.push(["Serviços Extras", formatCurrency(totalServicosExtras)])
        servicosExtras.forEach(servico => {
          if (servicosSelecionados[servico.id]) {
            detalhesAdicionais.push([`  • ${servico.nome}`, formatCurrency(servico.valor)])
          }
        })
      }

      saveQuotePdf(
        {
          titulo: "Orçamento",
          numero: pedido.numero_unico,
          cliente: cliente.nome,
          config,
          linhas: linhasPDF,
          total: totalGeralCompleto,
          detalhes: detalhesAdicionais,
        },
        `orcamento_${pedido.numero_unico || pedido.id}.pdf`,
      )

      setCarrinho([])
      setNomeCliente("")
      setObservacoes("")
      setMateriaisSelecionados({})
      setMostrarMateriais(false)
      const resetSelecionados: { [key: number]: boolean } = {}
      servicosExtras.forEach(s => { resetSelecionados[s.id] = false })
      setServicosSelecionados(resetSelecionados)
      setSucesso("Orçamento salvo e PDF gerado com sucesso!")
    } catch (error) {
      console.error("Erro ao gerar orçamento:", error)
      setErro(error instanceof Error ? error.message : "Erro ao gerar orçamento.")
    } finally {
      setLoading(false)
    }
  }

  const servicosPorCategoria = useMemo(() => {
    const agrupado: { [key: string]: ServicoExtra[] } = {}
    servicosExtras.forEach(servico => {
      const cat = servico.categoria || "Outros"
      if (!agrupado[cat]) agrupado[cat] = []
      agrupado[cat].push(servico)
    })
    return agrupado
  }, [servicosExtras])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-[#c9a03d]">PDV</p>
          <h1 className="text-2xl font-bold text-[#17264a]">Venda e orçamento</h1>
        </div>
        <div className="rounded-lg bg-white px-4 py-3 shadow-sm ring-1 ring-slate-200">
          <p className="text-xs uppercase text-slate-500">Total atual</p>
          <p className="text-2xl font-bold text-[#c9a03d]">{formatCurrency(totalGeralCompleto)}</p>
        </div>
      </div>

      {(erro || sucesso) && (
        <div className={`rounded-lg p-3 text-sm ${erro ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>
          {erro || sucesso}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
        <section className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-semibold text-[#17264a]">Produtos e serviços</h2>
            <input
              type="search"
              placeholder="Buscar item"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-[#17264a] focus:ring-2 focus:ring-[#17264a]/10 sm:max-w-xs"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>

          <div className="mb-4">
            <button
              onClick={() => setMostrarMateriais(!mostrarMateriais)}
              className="w-full rounded-lg bg-[#c9a03d] px-4 py-2 font-semibold text-white hover:bg-[#b58d2c]"
            >
              {mostrarMateriais ? "📦 Ocultar materiais" : "🔧 Adicionar materiais e serviços"}
            </button>
            
            {mostrarMateriais && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
                <MateriaisOpcoes 
                  onSelecionadosChange={setMateriaisSelecionados}
                  initialSelecionados={materiaisSelecionados}
                />
              </div>
            )}
          </div>

          <div className="grid max-h-[62vh] gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
            {produtosFiltrados.map((produto) => (
              <button
                key={produto.id}
                onClick={() => adicionarAoCarrinho(produto)}
                className="rounded-lg border border-slate-200 p-4 text-left transition hover:border-[#c9a03d] hover:bg-amber-50/40"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{produto.nome}</p>
                    <p className="mt-1 text-xs uppercase text-slate-500">
                      {produto.tipo === "servico" ? "Serviço" : "Produto"}
                    </p>
                  </div>
                  <span className="font-bold text-[#17264a]">{formatCurrency(produto.valor_venda)}</span>
                </div>
              </button>
            ))}
            {produtosFiltrados.length === 0 && (
              <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 sm:col-span-2">
                Nenhum item encontrado.
              </div>
            )}
          </div>
        </section>

        <section className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <h2 className="mb-4 text-lg font-semibold text-[#17264a]">Carrinho</h2>
          <input
            type="text"
            placeholder="Nome do cliente *"
            className="mb-4 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-[#17264a] focus:ring-2 focus:ring-[#17264a]/10"
            value={nomeCliente}
            onChange={(e) => setNomeCliente(e.target.value)}
            maxLength={120}
          />

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              📝 Observações do orçamento
            </label>
            <textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Adicione observações importantes para o cliente (ex: prazo de entrega, garantia, etc.)..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-[#17264a] focus:ring-2 focus:ring-[#17264a]/10"
              rows={3}
            />
          </div>

          {Object.keys(servicosPorCategoria).length > 0 && (
            <div className="mb-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ✅ Serviços Extras (selecione os que desejar):
              </label>
              {Object.entries(servicosPorCategoria).map(([categoria, servicos]) => (
                <div key={categoria} className="mb-3">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2 border-b pb-1">{categoria}</h4>
                  <div className="space-y-2 pl-2">
                    {servicos.map((servico) => (
                      <label key={servico.id} className="flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={servicosSelecionados[servico.id] || false}
                          onChange={(e) => setServicosSelecionados({
                            ...servicosSelecionados,
                            [servico.id]: e.target.checked
                          })}
                          className="mr-2 w-4 h-4 text-blue-600 rounded"
                        />
                        <span className="text-sm">
                          {servico.nome} - <span className="font-bold text-green-600">{formatCurrency(servico.valor)}</span>
                          {servico.descricao && <span className="text-gray-500 text-xs ml-2">({servico.descricao})</span>}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
              <p className="text-xs text-gray-500 mt-2">
                💡 Gerencie estes serviços em: Configurações &gt; Serviços Extras
              </p>
            </div>
          )}

          <div className="mb-4 max-h-[35vh] space-y-3 overflow-y-auto pr-1">
            {carrinho.map((item) => (
              <div key={item.id} className="rounded-lg border border-slate-200 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{item.nome}</p>
                    <p className="text-sm text-slate-500">{formatCurrency(item.valor_venda)}</p>
                  </div>
                  <button
                    onClick={() => removerDoCarrinho(item.id)}
                    className="rounded-md px-2 py-1 text-sm text-red-600 hover:bg-red-50"
                  >
                    Remover
                  </button>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center rounded-lg border border-slate-200">
                    <button className="px-3 py-1" onClick={() => atualizarQuantidade(item.id, item.quantidade - 1)}>-</button>
                    <span className="min-w-8 text-center text-sm font-semibold">{item.quantidade}</span>
                    <button className="px-3 py-1" onClick={() => atualizarQuantidade(item.id, item.quantidade + 1)}>+</button>
                  </div>
                  <span className="font-semibold">{formatCurrency(item.valor_venda * item.quantidade)}</span>
                </div>
              </div>
            ))}
            {carrinho.length === 0 && totalMateriais === 0 && totalServicosExtras === 0 && (
              <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
                Selecione itens, materiais ou serviços extras para montar o orçamento.
              </div>
            )}
          </div>

          <div className="border-t border-slate-200 pt-4">
            {totalMateriais > 0 && (
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-slate-600">Subtotal produtos:</span>
                <span>{formatCurrency(totalCarrinho)}</span>
              </div>
            )}
            {totalMateriais > 0 && (
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-slate-600">Materiais adicionais:</span>
                <span>{formatCurrency(totalMateriais)}</span>
              </div>
            )}
            {totalServicosExtras > 0 && (
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-slate-600">Serviços Extras:</span>
                <span>{formatCurrency(totalServicosExtras)}</span>
              </div>
            )}
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm font-medium text-slate-600">Total geral</span>
              <span className="text-2xl font-bold text-[#c9a03d]">{formatCurrency(totalGeralCompleto)}</span>
            </div>
            <button
              onClick={gerarPDF}
              disabled={loading || (carrinho.length === 0 && totalMateriais === 0 && totalServicosExtras === 0) || !nomeCliente.trim()}
              className="w-full rounded-lg bg-[#17264a] py-3 font-semibold text-white transition hover:bg-[#24375f] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Gerando..." : "📄 Gerar orçamento PDF"}
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}