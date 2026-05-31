"use client"

import { useEffect, useState } from "react"
import { supabase } from "../lib/supabaseClient"
import { useRouter, usePathname } from "next/navigation"

export default function Protecao({ children }: { children: React.ReactNode }) {
  const [carregando, setCarregando] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    async function verificarLogin() {
      const { data: { session } } = await supabase.auth.getSession()
      
      // Páginas que NÃO precisam de login
      const paginasPublicas = ["/login"]
      
      if (!session && !paginasPublicas.includes(pathname)) {
        router.push("/login")
      } else {
        setCarregando(false)
      }
    }
    
    verificarLogin()
  }, [router, pathname])

  if (carregando) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#c9a03d] mx-auto"></div>
          <p className="mt-4 text-gray-600">Verificando acesso...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
