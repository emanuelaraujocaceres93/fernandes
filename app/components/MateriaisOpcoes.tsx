'use client';

import { useState } from 'react';

interface MateriaisOpcoesProps {
  onSelecionadosChange?: (selecionados: any) => void;
  initialSelecionados?: any;
}

const categoriasMateriais = {
  tubulacao: {
    nome: "Tubulação de Cobre",
    itens: [
      { id: "cobre_14", nome: "Cobre de 1/4", preco: 45.00 },
      { id: "cobre_38", nome: "Cobre 3/8", preco: 55.00 },
      { id: "cobre_12", nome: "Cobre 1/2", preco: 65.00 },
      { id: "cobre_58", nome: "Cobre 5/8", preco: 75.00 },
      { id: "cobre_34", nome: "Cobre 3/4", preco: 85.00 }
    ]
  },
  cabos: {
    nome: "Cabos Elétricos",
    itens: [
      { id: "cabopp_5x15", nome: "Cabo PP 5 vias x 1,5mm", preco: 120.00 },
      { id: "cabopp_4x15", nome: "Cabo PP 4 vias x 1,5mm", preco: 95.00 },
      { id: "cabopp_5x25", nome: "Cabo PP 5 vias x 2,5mm", preco: 180.00 },
      { id: "cabopp_4x25", nome: "Cabo PP 4 vias x 2,5mm", preco: 145.00 }
    ]
  },
  fixacao: {
    nome: "Fixação e Suportes",
    itens: [
      { id: "suporte_cond", nome: "Suporte de condensadora", preco: 89.90 },
      { id: "silver_tape", nome: "Silver tape", preco: 12.50 },
      { id: "bucha_s10", nome: "Bucha S10", preco: 1.50 },
      { id: "parafuso_10", nome: "Parafuso 10 sextavado", preco: 2.00 },
      { id: "bucha_s6", nome: "Bucha S6", preco: 1.00 },
      { id: "parafuso_6", nome: "Parafuso 6 com arruela lisa", preco: 1.50 }
    ]
  },
  refrigeracao: {
    nome: "Componentes de Refrigeração",
    itens: [
      { id: "compressor", nome: "Compressor", preco: 850.00 },
      { id: "filtro_secador", nome: "Filtro secador", preco: 45.00 },
      { id: "valvula_schrader", nome: "Válvula Schrader", preco: 15.00 },
      { id: "carga_gas", nome: "Carga de gás", preco: 250.00 }
    ]
  },
  servicos: {
    nome: "Serviços Especializados",
    itens: [
      { id: "higienizacao", nome: "Higienização completa", preco: 180.00 },
      { id: "limpeza_filtro", nome: "Limpeza de filtro", preco: 50.00 },
      { id: "carnagem", nome: "Carnagem", preco: 120.00 },
      { id: "turbina", nome: "Troca/limpeza de turbina", preco: 150.00 },
      { id: "reparos_eletricos", nome: "Reparos elétricos", preco: 100.00 },
      { id: "troca_cabo", nome: "Troca de cabo de comunicação", preco: 80.00 }
    ]
  }
};

export default function MateriaisOpcoes({ onSelecionadosChange, initialSelecionados = {} }: MateriaisOpcoesProps) {
  const [selecionados, setSelecionados] = useState<any>(initialSelecionados);
  const [categoriasAbertas, setCategoriasAbertas] = useState<Record<string, boolean>>({
    tubulacao: true,
    cabos: true,
    fixacao: true,
    refrigeracao: true,
    servicos: true
  });

  const toggleItem = (categoriaId: string, itemId: string) => {
    const novoSelecionados = { ...selecionados };
    if (!novoSelecionados[categoriaId]) {
      novoSelecionados[categoriaId] = {};
    }
    novoSelecionados[categoriaId][itemId] = !novoSelecionados[categoriaId][itemId];
    setSelecionados(novoSelecionados);
    if (onSelecionadosChange) {
      onSelecionadosChange(novoSelecionados);
    }
  };

  const toggleCategoria = (categoriaId: string) => {
    setCategoriasAbertas({
      ...categoriasAbertas,
      [categoriaId]: !categoriasAbertas[categoriaId]
    });
  };

  const calcularTotal = () => {
    let total = 0;
    Object.entries(categoriasMateriais).forEach(([catId, categoria]) => {
      Object.entries(selecionados[catId] || {}).forEach(([itemId, selecionado]) => {
        if (selecionado) {
          const item = categoria.itens.find(i => i.id === itemId);
          if (item) total += item.preco;
        }
      });
    });
    return total;
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 p-4 rounded-lg">
        <h3 className="font-bold text-lg mb-2">📋 Materiais e Serviços Adicionais</h3>
        <p className="text-sm text-gray-600">Selecione os materiais e serviços que serão utilizados</p>
      </div>

      {Object.entries(categoriasMateriais).map(([catId, categoria]) => (
        <div key={catId} className="border rounded-lg overflow-hidden">
          <button
            onClick={() => toggleCategoria(catId)}
            className="w-full bg-gray-100 p-3 text-left font-semibold hover:bg-gray-200 transition flex justify-between items-center"
          >
            <span>{categoria.nome}</span>
            <span>{categoriasAbertas[catId] ? '▼' : '▶'}</span>
          </button>
          
          {categoriasAbertas[catId] && (
            <div className="p-3 space-y-2">
              {categoria.itens.map((item) => (
                <label key={item.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded cursor-pointer">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selecionados[catId]?.[item.id] || false}
                      onChange={() => toggleItem(catId, item.id)}
                      className="w-5 h-5 text-blue-600 rounded"
                    />
                    <span>{item.nome}</span>
                  </div>
                  <span className="text-green-600 font-semibold">
                    R$ {item.preco.toFixed(2)}
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>
      ))}

      {calcularTotal() > 0 && (
        <div className="bg-green-50 p-4 rounded-lg border-2 border-green-200">
          <div className="flex justify-between items-center">
            <span className="font-bold text-lg">Total em materiais adicionais:</span>
            <span className="text-2xl font-bold text-green-600">R$ {calcularTotal().toFixed(2)}</span>
          </div>
        </div>
      )}
    </div>
  );
}