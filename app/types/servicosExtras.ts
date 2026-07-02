export interface ServicoExtra {
  id: number
  nome: string
  descricao: string | null
  valor: number
  ativo: boolean
  ordem: number
  categoria: string | null
  created_at: string
  updated_at: string
}

export interface CategoriaServico {
  nome: string
  servicos: ServicoExtra[]
}