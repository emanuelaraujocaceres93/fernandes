"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import MenuLateral from "../components/MenuLateral"
import Topo from "../components/Topo"
import Protecao from "../components/Protecao"
import "./globals.css"

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [menuAberto, setMenuAberto] = useState(true)
  const pathname = usePathname()
  const isLoginPage = pathname === "/login"

  useEffect(() => {
    const checkMobile = () => {
      setMenuAberto(window.innerWidth >= 768)
    }

    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  const toggleMenu = () => setMenuAberto((aberto) => !aberto)
  const closeMenuMobile = () => {
    if (window.innerWidth < 768) {
      setMenuAberto(false)
    }
  }

  return (
    <html lang="pt-BR">
      <head><meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=yes" />
        <title>Fernandes App</title>
        <meta name="description" content="Sistema de gestao para vendas, fretes, estoque, orcamentos e caixa." />
        <meta name="application-name" content="Fernandes App" />
        <meta name="apple-mobile-web-app-title" content="Fernandes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#17264a" />
        <link rel="icon" type="image/png" sizes="64x64" href="/favicon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.webmanifest" />
      </head>
      <body className="bg-slate-100 text-slate-900">
        {isLoginPage ? (
          <>{children}</>
        ) : (
          <Protecao>
            <Topo toggleMenu={toggleMenu} />
            <MenuLateral aberto={menuAberto} onClose={closeMenuMobile} />
            <main
              className={`min-h-screen pt-16 transition-all duration-300 ${
                menuAberto ? "md:ml-64" : "md:ml-20"
              }`}
            >
              <div className="mx-auto w-full max-w-7xl p-4 sm:p-6">{children}</div>
            </main>
          </Protecao>
        )}
      </body>
    </html>
  )
}
