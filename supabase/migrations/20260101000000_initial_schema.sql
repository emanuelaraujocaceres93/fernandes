-- ============================================
-- MIGRAÇÃO INICIAL - RECUPERAÇÃO DO BANCO
-- ============================================

-- 1. Tabela: EmpresaConfig
CREATE TABLE IF NOT EXISTS empresa_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome_empresa TEXT,
    telefone TEXT,
    logo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabela: Cliente
CREATE TABLE IF NOT EXISTS clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabela: Produto
CREATE TABLE IF NOT EXISTS produtos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('produto', 'servico')),
    quantidade INTEGER DEFAULT 0,
    quantidade_minima INTEGER DEFAULT 0,
    valor_compra DECIMAL(10,2),
    valor_venda DECIMAL(10,2) NOT NULL,
    user_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabela: Pedido
CREATE TABLE IF NOT EXISTS pedidos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero_unico TEXT UNIQUE,
    data TIMESTAMPTZ DEFAULT NOW(),
    total DECIMAL(10,2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'pendente',
    user_id UUID,
    cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Tabela: Itens do Pedido (ItemCarrinho)
CREATE TABLE IF NOT EXISTS itens_pedido (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pedido_id UUID NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
    produto_id UUID NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
    quantidade INTEGER NOT NULL,
    preco_unitario DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Tabela: FreteOrcamento
CREATE TABLE IF NOT EXISTS fretes_orcamento (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente TEXT,
    origem TEXT,
    destino TEXT,
    distancia_km DECIMAL(10,2),
    custo_combustivel DECIMAL(10,2),
    pedagios_valor DECIMAL(10,2),
    custo_total DECIMAL(10,2),
    total_frete DECIMAL(10,2),
    status TEXT DEFAULT 'pendente',
    user_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Tabela: CaixaMovimentacao
CREATE TABLE IF NOT EXISTS caixa_movimentacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    descricao TEXT NOT NULL,
    valor DECIMAL(10,2) NOT NULL,
    data TIMESTAMPTZ DEFAULT NOW(),
    tipo_entrada_saida TEXT NOT NULL CHECK (tipo_entrada_saida IN ('entrada', 'saida')),
    pedido_id_referencia UUID REFERENCES pedidos(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ÍNDICES PARA PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_produtos_nome ON produtos(nome);
CREATE INDEX IF NOT EXISTS idx_produtos_tipo ON produtos(tipo);
CREATE INDEX IF NOT EXISTS idx_pedidos_status ON pedidos(status);
CREATE INDEX IF NOT EXISTS idx_pedidos_data ON pedidos(data);
CREATE INDEX IF NOT EXISTS idx_pedidos_cliente_id ON pedidos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_itens_pedido_pedido_id ON itens_pedido(pedido_id);
CREATE INDEX IF NOT EXISTS idx_itens_pedido_produto_id ON itens_pedido(produto_id);
CREATE INDEX IF NOT EXISTS idx_fretes_status ON fretes_orcamento(status);
CREATE INDEX IF NOT EXISTS idx_caixa_data ON caixa_movimentacoes(data);

-- ============================================
-- TRIGGERS PARA ATUALIZAR updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_empresa_config_updated_at 
    BEFORE UPDATE ON empresa_config 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clientes_updated_at 
    BEFORE UPDATE ON clientes 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_produtos_updated_at 
    BEFORE UPDATE ON produtos 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pedidos_updated_at 
    BEFORE UPDATE ON pedidos 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fretes_updated_at 
    BEFORE UPDATE ON fretes_orcamento 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- RLS (ROW LEVEL SECURITY) - SEGURANÇA
-- ============================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE empresa_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE itens_pedido ENABLE ROW LEVEL SECURITY;
ALTER TABLE fretes_orcamento ENABLE ROW LEVEL SECURITY;
ALTER TABLE caixa_movimentacoes ENABLE ROW LEVEL SECURITY;

-- Políticas básicas (ajuste conforme sua necessidade)
CREATE POLICY "Enable all for authenticated users" ON empresa_config
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable all for authenticated users" ON clientes
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable all for authenticated users" ON produtos
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable all for authenticated users" ON pedidos
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable all for authenticated users" ON itens_pedido
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable all for authenticated users" ON fretes_orcamento
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable all for authenticated users" ON caixa_movimentacoes
    FOR ALL USING (auth.role() = 'authenticated');npm install -g supabase