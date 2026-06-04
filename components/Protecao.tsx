"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { supabase } from "../lib/supabaseClient"

export default function Protecao({ children }: { children: React.ReactNode }) {
  const [carregando, setCarregando] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    let ativo = true

    async function verificarLogin() {
      const { data, error } = await supabase.auth.getSession()

      if (!ativo) return

      if (error || (!data.session && pathname !== "/login")) {
        router.replace("/login")
        return
      }

      setCarregando(false)
    }

    verificarLogin()
    return () => {
      ativo = false
    }
  }, [router, pathname])

  if (carregando) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-2 border-slate-200 border-b-[#c9a03d]" />
          <p className="mt-4 text-sm text-slate-600">Verificando acesso...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
