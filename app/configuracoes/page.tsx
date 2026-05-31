"use client"

import { useState, useEffect } from "react"
import { supabase } from "../../lib/supabaseClient"

export default function ConfiguracoesPage() {
  const [nome, setNome] = useState("Fernandes Sistemas")
  const [telefone, setTelefone] = useState("")
  const [logoUrl, setLogoUrl] = useState("")
  const [carregando, setCarregando] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [mensagem, setMensagem] = useState("")
  const [configId, setConfigId] = useState<string | null>(null)

  useEffect(() => {
    carregarConfig()
  }, [])

  async function carregarConfig() {
    const { data } = await supabase.from("configuracoes_empresa").select("*").limit(1).single()
    if (data) {
      setNome(data.nome_empresa)
      setTelefone(data.telefone || "")
      setLogoUrl(data.logo_url || "")
      setConfigId(data.id)
    }
  }

  async function salvarConfiguracao() {
    setCarregando(true)
    setMensagem("")
    
    try {
      const { data: userData } = await supabase.auth.getUser()
      
      if (configId) {
        await supabase.from("configuracoes_empresa").update({ 
          nome_empresa: nome, 
          telefone 
        }).eq("id", configId)
      } else {
        const { data } = await supabase.from("configuracoes_empresa").insert({ 
          nome_empresa: nome, 
          telefone,
          user_id: userData.user?.id 
        }).select()
        if (data) setConfigId(data[0].id)
      }
      
      setMensagem("✅ Configuração salva com sucesso!")
      setTimeout(() => setMensagem(""), 3000)
    } catch (error) {
      setMensagem("❌ Erro ao salvar")
    } finally {
      setCarregando(false)
    }
  }

  async function uploadLogo(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.includes("image")) {
      alert("Por favor, selecione uma imagem (PNG, JPG, JPEG)")
      return
    }

    if (file.size > 2 * 1024 * 1024) {
      alert("A imagem deve ter no máximo 2MB")
      return
    }

    setUploading(true)
    setMensagem("")

    try {
      const { data: userData } = await supabase.auth.getUser()
      
      if (!userData.user) {
        alert("Você precisa estar logado para fazer upload")
        setUploading(false)
        return
      }

      const fileExt = file.name.split(".").pop()
      const fileName = `${Date.now()}.${fileExt}`
      const filePath = fileName

      const { error: uploadError } = await supabase.storage
        .from("logos")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true
        })

      if (uploadError) {
        alert("Erro ao fazer upload: " + uploadError.message)
        setUploading(false)
        return
      }

      const { data: publicUrlData } = supabase.storage
        .from("logos")
        .getPublicUrl(filePath)

      const publicUrl = publicUrlData.publicUrl

      if (configId) {
        await supabase.from("configuracoes_empresa").update({ logo_url: publicUrl }).eq("id", configId)
      } else {
        const { data: newConfig } = await supabase.from("configuracoes_empresa").insert({ 
          nome_empresa: nome, 
          telefone,
          logo_url: publicUrl,
          user_id: userData.user.id 
        }).select()
        if (newConfig) setConfigId(newConfig[0].id)
      }

      setLogoUrl(publicUrl)
      setMensagem("✅ Logo enviado com sucesso!")
      setTimeout(() => setMensagem(""), 3000)
      
    } catch (error) {
      alert("Erro ao fazer upload: " + String(error))
    } finally {
      setUploading(false)
    }
  }

  async function removerLogo() {
    if (!logoUrl) return
    
    if (confirm("Tem certeza que deseja remover o logo?")) {
      const filePath = logoUrl.split("/").pop()
      
      if (filePath) {
        await supabase.storage.from("logos").remove([filePath])
      }
      
      await supabase.from("configuracoes_empresa").update({ logo_url: null }).eq("id", configId)
      setLogoUrl("")
      setMensagem("✅ Logo removido com sucesso!")
      setTimeout(() => setMensagem(""), 3000)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-[#1a2a4f] mb-6">⚙️ Configurações</h1>
      
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b">🏢 Informações da Empresa</h2>
        
        <div className="mb-4">
          <label className="block text-gray-700 font-medium mb-1">🏷️ Nome da Empresa</label>
          <input 
            type="text" 
            className="w-full p-3 border border-gray-300 rounded-lg"
            value={nome} 
            onChange={e => setNome(e.target.value)}
          />
        </div>
        
        <div className="mb-6">
          <label className="block text-gray-700 font-medium mb-1">📞 Telefone/Contato</label>
          <input 
            type="text" 
            placeholder="(11) 99999-9999"
            className="w-full p-3 border border-gray-300 rounded-lg"
            value={telefone} 
            onChange={e => setTelefone(e.target.value)}
          />
          <p className="text-xs text-gray-500 mt-1">Aparecerá no rodapé dos PDFs</p>
        </div>
        
        <button 
          onClick={salvarConfiguracao} 
          disabled={carregando} 
          className="w-full py-3 bg-[#1a2a4f] text-white font-semibold rounded-lg"
        >
          {carregando ? "Salvando..." : "💾 Salvar Configurações"}
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b">🖼️ Logo da Empresa</h2>
        
        {logoUrl ? (
          <div className="mb-4 p-4 bg-gray-50 rounded-lg text-center">
            <img 
              src={logoUrl} 
              alt="Logo da empresa" 
              className="max-w-[300px] max-h-[150px] object-contain mx-auto mb-3"
            />
            <button 
              onClick={removerLogo}
              className="text-sm text-red-600 hover:text-red-800"
            >
              🗑️ Remover logo
            </button>
          </div>
        ) : (
          <div className="mb-4 p-4 bg-gray-50 rounded-lg text-center text-gray-400">
            <div className="text-5xl mb-2">🖼️</div>
            <p>Nenhum logo cadastrado</p>
          </div>
        )}
        
        <div className="flex items-center justify-center w-full">
          <label className="w-full flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 border-gray-300 hover:border-[#c9a03d]">
            <div className="flex flex-col items-center justify-center">
              <svg className="w-8 h-8 mb-3 text-gray-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/>
              </svg>
              <p className="mb-2 text-sm text-gray-500">
                <span className="font-semibold">Clique para enviar</span> sua logo
              </p>
              <p className="text-xs text-gray-500">PNG, JPG ou JPEG (máx. 2MB)</p>
            </div>
            <input 
              type="file" 
              accept="image/*"
              className="hidden" 
              onChange={uploadLogo}
              disabled={uploading}
            />
          </label>
        </div>
        
        {uploading && (
          <div className="mt-4 text-center text-gray-600">
            Enviando logo...
          </div>
        )}
      </div>
      
      {mensagem && (
        <div className="mt-4 p-3 bg-green-100 text-green-700 rounded-lg text-center">
          {mensagem}
        </div>
      )}
    </div>
  )
}

