"use client"

import { useEffect, useState } from "react"
import { supabase } from "../lib/supabaseClient"
import jsPDF from "jspdf"
import html2canvas from "html2canvas"

type ProdutoType = {
  id: string
  nome: string
  tipo: string
  valor_venda: number
}

type ItemCarrinhoType = ProdutoType & {
  quantidade: number
}

type ClienteType = {
  id: string
  nome: string
}

export default function PDV() {
  const [produtos, setProdutos] = useState<ProdutoType[]>([])
  const [carrinho, setCarrinho] = useState<ItemCarrinhoType[]>([])
  const [busca, setBusca] = useState<string>("")
  const [nomeCliente, setNomeCliente] = useState<string>("")
  const [clientes, setClientes] = useState<ClienteType[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [config, setConfig] = useState<any>(null)

  useEffect(() => {
    carregarDados()
  }, [])

  async function carregarDados() {
    await carregarProdutos()
    await carregarClientes()
    await carregarConfig()
  }

  async function carregarProdutos() {
    const { data } = await supabase.from("produtos").select("*").order("nome")
    if (data) setProdutos(data as ProdutoType[])
  }

  async function carregarClientes() {
    const { data } = await supabase.from("clientes").select("*").order("nome")
    if (data) setClientes(data as ClienteType[])
  }

  async function carregarConfig() {
    const { data } = await supabase.from("configuracoes_empresa").select("*").limit(1).single()
    if (data) setConfig(data)
  }

  const produtosFiltrados = produtos.filter(p => p.nome.toLowerCase().includes(busca.toLowerCase()))

  const adicionarAoCarrinho = (produto: ProdutoType) => {
    const existe = carrinho.find(item => item.id === produto.id)
    if (existe) {
      setCarrinho(carrinho.map(item =>
        item.id === produto.id ? { ...item, quantidade: item.quantidade + 1 } : item
      ))
    } else {
      setCarrinho([...carrinho, { ...produto, quantidade: 1 }])
    }
  }

  const removerDoCarrinho = (produtoId: string) => {
    setCarrinho(carrinho.filter(item => item.id !== produtoId))
  }

  const atualizarQuantidade = (produtoId: string, quantidade: number) => {
    if (quantidade <= 0) {
      removerDoCarrinho(produtoId)
    } else {
      setCarrinho(carrinho.map(item =>
        item.id === produtoId ? { ...item, quantidade } : item
      ))
    }
  }

  const calcularTotal = () => {
    return carrinho.reduce((total, item) => total + (item.valor_venda * item.quantidade), 0)
  }

  async function criarClienteSeNecessario() {
    if (!nomeCliente.trim()) {
      alert("Digite o nome do cliente")
      return null
    }

    let cliente = clientes.find(c => c.nome.toLowerCase() === nomeCliente.toLowerCase())
    
    if (!cliente) {
      const { data: userData } = await supabase.auth.getUser()
      const { data } = await supabase
        .from("clientes")
        .insert({ nome: nomeCliente, user_id: userData.user?.id })
        .select()
        .single()
      
      if (data) {
        cliente = data as ClienteType
        setClientes([...clientes, data as ClienteType])
      }
    }
    return cliente
  }

  async function gerarPDF() {
    if (carrinho.length === 0) {
      alert("Adicione itens ao carrinho")
      return
    }

    const cliente = await criarClienteSeNecessario()
    if (!cliente) return

    setLoading(true)

    try {
      const { data: userData } = await supabase.auth.getUser()
      const total = calcularTotal()
      
      const { data: pedido, error: pedidoError } = await supabase
        .from("pedidos")
        .insert({ 
          cliente_id: cliente.id, 
          total: total, 
          status: "pendente",
          user_id: userData.user?.id 
        })
        .select()
        .single()

      if (pedidoError) {
        alert("Erro ao salvar: " + pedidoError.message)
        setLoading(false)
        return
      }

      for (const item of carrinho) {
        await supabase.from("itens_pedido").insert({
          pedido_id: pedido.id,
          produto_id: item.id,
          quantidade: item.quantidade,
          unitario: item.valor_venda,
          total: item.valor_venda * item.quantidade
        })
      }

      const { data: configData } = await supabase.from("configuracoes_empresa").select("*").limit(1).single()
      const configAtual = configData || config

      const element = document.createElement("div")
      element.innerHTML = `
        <div style="width: 800px; margin: 0 auto; background: white; font-family: 'Helvetica', Arial, sans-serif;">
          <div style="text-align: center; padding: 30px; background: linear-gradient(135deg, #1a2a4f 0%, #2c3e66 100%);">
            ${configAtual?.logo_url ? `<img src="${configAtual.logo_url}" style="max-width: 200px; margin: 0 auto 15px auto; display: block;" />` : ""}
            <h1 style="color: white; margin: 0; font-size: 28px;">${configAtual?.nome_empresa || "Fernandes Sistemas"}</h1>
            ${configAtual?.telefone ? `<p style="color: #c9a03d; margin: 5px 0 0;">📞 ${configAtual.telefone}</p>` : ""}
          </div>
          
          <div style="text-align: center; padding: 20px;">
            <h2 style="color: #1a2a4f; font-size: 24px; margin: 0;">ORÇAMENTO</h2>
            <p style="color: #c9a03d; font-size: 14px; font-weight: bold;">Nº ${pedido.numero_unico}</p>
          </div>
          
          <div style="padding: 0 30px;">
            <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
              <table style="width: 100%;">
                <tr><td style="padding: 5px;"><strong>📌 Cliente:</strong></td><td>${cliente.nome}</td></tr>
                <tr><td style="padding: 5px;"><strong>📅 Data:</strong></td><td>${new Date().toLocaleDateString()}</td></tr>
                <tr><td style="padding: 5px;"><strong>⏳ Status:</strong></td><td><span style="background: #f39c12; color: white; padding: 5px 15px; border-radius: 15px; display: inline-block;">PENDENTE</span></td></tr>
              </table>
            </div>
            
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="background: #1a2a4f; color: white;">
                  <th style="padding: 12px; text-align: left;">Descrição</th>
                  <th style="padding: 12px; text-align: center;">Qtd</th>
                  <th style="padding: 12px; text-align: right;">Unitário</th>
                  <th style="padding: 12px; text-align: right;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${carrinho.map(item => `
                  <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 10px;">${item.nome}${item.tipo === "servico" ? ' <span style="color: #c9a03d;">(Serviço)</span>' : ''}</td>
                    <td style="padding: 10px; text-align: center;">${item.quantidade}</td>
                    <td style="padding: 10px; text-align: right;">R$ ${item.valor_venda.toFixed(2)}</td>
                    <td style="padding: 10px; text-align: right;">R$ ${(item.valor_venda * item.quantidade).toFixed(2)}</td>
                  </tr>
                `).join("")}
              </tbody>
              <tfoot>
                <tr style="background: #c9a03d20;">
                  <td colspan="3" style="padding: 12px; text-align: right; font-weight: bold;">TOTAL GERAL:</td>
                  <td style="padding: 12px; text-align: right; font-size: 22px; font-weight: bold; color: #c9a03d;">R$ ${total.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
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
      pdf.save(`orcamento_${pedido.numero_unico}.pdf`)
      document.body.removeChild(element)

      setCarrinho([])
      setNomeCliente("")
      alert("Orçamento gerado com sucesso!")
    } catch (error) {
      console.error(error)
      alert("Erro ao gerar orçamento: " + String(error))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <div className="lg:w-1/2">
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-xl font-bold text-[#1a2a4f] mb-4">📋 Produtos/Serviços</h2>
          <input type="text" placeholder="Buscar..." className="w-full p-3 border rounded-lg mb-4" value={busca} onChange={e => setBusca(e.target.value)} />
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {produtosFiltrados.map((produto) => (
              <div key={produto.id} className="flex justify-between items-center p-3 border rounded-lg">
                <div>
                  <p className="font-semibold">{produto.nome}</p>
                  <p className="text-sm text-gray-500">R$ {produto.valor_venda.toFixed(2)}</p>
                </div>
                <button onClick={() => adicionarAoCarrinho(produto)} className="px-4 py-2 bg-[#c9a03d] text-white rounded-lg">+</button>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="lg:w-1/2">
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-xl font-bold text-[#1a2a4f] mb-4">🛒 Carrinho</h2>
          <input type="text" placeholder="Nome do cliente *" className="w-full p-3 border rounded-lg mb-4" value={nomeCliente} onChange={e => setNomeCliente(e.target.value)} />
          <div className="space-y-2 max-h-96 overflow-y-auto mb-4">
            {carrinho.map((item) => (
              <div key={item.id} className="flex justify-between items-center p-3 border rounded-lg">
                <div>
                  <p className="font-semibold">{item.nome}</p>
                  <p className="text-sm">R$ {item.valor_venda.toFixed(2)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => atualizarQuantidade(item.id, item.quantidade - 1)} className="px-3 py-1 bg-gray-200 rounded">-</button>
                  <span>{item.quantidade}</span>
                  <button onClick={() => atualizarQuantidade(item.id, item.quantidade + 1)} className="px-3 py-1 bg-gray-200 rounded">+</button>
                  <button onClick={() => removerDoCarrinho(item.id)} className="px-3 py-1 bg-red-500 text-white rounded">×</button>
                </div>
              </div>
            ))}
          </div>
          <div className="border-t pt-4">
            <div className="flex justify-between mb-4">
              <span className="font-bold">TOTAL:</span>
              <span className="font-bold text-2xl text-[#c9a03d]">R$ {calcularTotal().toFixed(2)}</span>
            </div>
            <button onClick={gerarPDF} disabled={loading || carrinho.length === 0 || !nomeCliente} className="w-full py-3 bg-[#1a2a4f] text-white rounded-lg">
              {loading ? "Gerando..." : "📄 Gerar Orçamento PDF"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
