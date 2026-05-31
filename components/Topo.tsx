"use client"

import { Bars3Icon } from "@heroicons/react/24/outline"
import { useEffect, useState } from "react"
import { supabase } from "../lib/supabaseClient"

export default function Topo({ toggleMenu }: { toggleMenu: () => void }) {
  const [nomeEmpresa, setNomeEmpresa] = useState("Fernandes Sistemas")

  async function carregarNome() {
    const { data } = await supabase.from("configuracoes_empresa").select("nome_empresa").limit(1).single()
    if (data) setNomeEmpresa(data.nome_empresa)
  }

  useEffect(() => {
    carregarNome()
    // Recarregar a cada 5 segundos
    const interval = setInterval(carregarNome, 5000)
    return () => clearInterval(interval)
  }, [])

  return (
    <header className="fixed top-0 left-0 right-0 bg-[#1a2a4f] shadow-md z-30">
      <div className="flex items-center justify-between px-4 py-3">
        <button onClick={toggleMenu} className="p-2 rounded-lg hover:bg-[#2c3e66] transition-colors">
          <Bars3Icon className="h-6 w-6 text-white" />
        </button>
        <h1 className="text-lg font-bold text-white">{nomeEmpresa}</h1>
        <div className="w-10"></div>
      </div>
    </header>
  )
}
