"use client"

import { Bars3Icon } from "@heroicons/react/24/outline"
import { useEffect, useState } from "react"
import { supabase } from "../lib/supabaseClient"

export default function Topo({ toggleMenu }: { toggleMenu: () => void }) {
  const [nomeEmpresa, setNomeEmpresa] = useState("Fernandes Sistemas")

  useEffect(() => {
    async function carregarNome() {
      const { data } = await supabase
        .from("configuracoes_empresa")
        .select("nome_empresa")
        .limit(1)
        .maybeSingle()

      if (data?.nome_empresa) setNomeEmpresa(data.nome_empresa)
    }

    carregarNome()
  }, [])

  return (
    <header className="fixed left-0 right-0 top-0 z-30 border-b border-white/10 bg-[#17264a] shadow-sm">
      <div className="flex items-center justify-between px-4 py-3">
        <button
          type="button"
          onClick={toggleMenu}
          aria-label="Abrir ou fechar menu"
          className="min-h-11 min-w-11 rounded-lg p-2 transition-colors hover:bg-white/10 active:bg-white/15"
        >
          <Bars3Icon className="h-6 w-6 text-white" />
        </button>
        <h1 className="truncate px-3 text-base font-semibold text-white sm:text-lg">{nomeEmpresa}</h1>
        <div className="w-10" />
      </div>
    </header>
  )
}
