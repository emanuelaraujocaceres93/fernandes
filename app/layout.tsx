"use client"

import { useState, useEffect } from "react"
import MenuLateral from "../components/MenuLateral"
import Topo from "../components/Topo"
import Protecao from "../components/Protecao"
import { usePathname } from "next/navigation"
import "./globals.css"

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [menuAberto, setMenuAberto] = useState(true)
  const pathname = usePathname()
  const isLoginPage = pathname === "/login"

  useEffect(() => {
    const checkMobile = () => {
      if (window.innerWidth < 768) setMenuAberto(false)
    }
    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  const toggleMenu = () => setMenuAberto(!menuAberto)

  return (
    <html lang="pt-BR">
      <body className="bg-gray-100">
        {isLoginPage ? (
          <>{children}</>
        ) : (
          <Protecao>
            <Topo toggleMenu={toggleMenu} />
            <MenuLateral aberto={menuAberto} />
            <main className={`transition-all duration-300 pt-16 ${menuAberto ? "ml-64" : "ml-20"}`}>
              <div className="p-6">{children}</div>
            </main>
          </Protecao>
        )}
      </body>
    </html>
  )
}
