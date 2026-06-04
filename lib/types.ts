export type EmpresaConfig = {
  id?: string
  nome_empresa?: string | null
  telefone?: string | null
  logo_url?: string | null
}

export type Produto = {
  id: string
  nome: string
  tipo: "produto" | "servico" | string
  quantidade?: number | null
  quantidade_minima?: number | null
  valor_compra?: number | null
  valor_venda: number
  user_id?: string | null
}

export type Cliente = {
  id: string
  nome: string
}

export type ItemCarrinho = Produto & {
  quantidade: number
}

export type Pedido = {
  id: string
  numero_unico?: string | null
  data?: string | null
  total: number
  status: string
  user_id?: string | null
  clientes?: {
    nome?: string | null
  } | null
}

export type FreteOrcamento = {
  id: string
  cliente?: string | null
  origem?: string | null
  destino?: string | null
  distancia_km?: number | null
  custo_combustivel?: number | null
  pedagios_valor?: number | null
  custo_total?: number | null
  total_frete?: number | null
  status?: string | null
  created_at?: string | null
  user_id?: string | null
}

export type CaixaMovimentacao = {
  id: string
  descricao: string
  valor: number
  data: string
  tipo_entrada_saida: "entrada" | "saida"
  pedido_id_referencia?: string | null
}
