"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "../../lib/supabaseClient"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState("")
  const router = useRouter()

  async function fazerLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setErro("")

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    if (error) {
      setErro("Email ou senha invalidos.")
      setLoading(false)
      return
    }

    router.push("/configuracoes")
    router.refresh()
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#1f8f9b33,transparent_35%),linear-gradient(135deg,#0f172a,#111827)]" />
      <div className="relative w-full max-w-sm rounded-lg border border-white/10 bg-white p-7 shadow-2xl">
        <div className="mb-6 text-center">
          <img src="/favicon.png" alt="Fernandes" className="mx-auto mb-3 h-14 w-14 rounded-full" />
          <h1 className="text-2xl font-bold text-[#1a2a4f]">Fernandes App</h1>
          <p className="mt-1 text-sm text-slate-500">Acesse sua area administrativa</p>
        </div>

        <form onSubmit={fazerLogin}>
          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              className="w-full rounded-lg border border-gray-300 p-3 outline-none transition focus:border-[#1a2a4f] focus:ring-2 focus:ring-[#1a2a4f]/20"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>

          <div className="mb-6">
            <label className="mb-2 block text-sm font-medium text-gray-700">Senha</label>
            <input
              type="password"
              className="w-full rounded-lg border border-gray-300 p-3 outline-none transition focus:border-[#1a2a4f] focus:ring-2 focus:ring-[#1a2a4f]/20"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          {erro && (
            <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {erro}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-[#1a2a4f] py-3 font-semibold text-white transition hover:bg-[#24375f] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  )
}
