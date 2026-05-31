"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { supabase } from "../lib/supabaseClient"

const menuItems = [
  { name: "PDV", href: "/", icon: "🏠" },
  { name: "Estoque", href: "/estoque", icon: "📦" },
  { name: "Frete", href: "/frete", icon: "🚚" },
  { name: "Orçamentos", href: "/orcamentos", icon: "📋" },
  { name: "Caixa", href: "/caixa", icon: "💰" },
  { name: "Configurações", href: "/configuracoes", icon: "⚙️" },
]

export default function MenuLateral({ aberto }: { aberto: boolean }) {
  const pathname = usePathname()
  const router = useRouter()

  async function fazerLogout() {
    await supabase.auth.signOut()
    router.push("/login")
  }

  return (
    <aside className={`fixed top-0 left-0 h-full bg-[#1a2a4f] text-white z-40 transition-all duration-300 ${aberto ? "w-64" : "w-20"}`}>
      <div className="pt-20 flex flex-col h-full">
        <nav className="flex-1 px-2 space-y-1">
          {menuItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link key={item.name} href={item.href} className={`flex items-center px-4 py-3 rounded-lg transition-colors ${isActive ? "bg-[#c9a03d]" : "hover:bg-[#2c3e66]"} ${!aberto && "justify-center"}`}>
                <span className="text-xl">{item.icon}</span>
                {aberto && <span className="ml-3">{item.name}</span>}
              </Link>
            )
          })}
        </nav>
        <div className="px-2 pb-6">
          <button onClick={fazerLogout} className={`flex items-center w-full px-4 py-3 rounded-lg transition-colors hover:bg-red-600 text-red-300 hover:text-white ${!aberto && "justify-center"}`}>
            <span className="text-xl">🚪</span>
            {aberto && <span className="ml-3">Sair</span>}
          </button>
        </div>
      </div>
    </aside>
  )
}
