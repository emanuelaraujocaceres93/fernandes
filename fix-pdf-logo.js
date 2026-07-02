// fix-pdf-logo.js
const fs = require('fs');
const path = require('path');

console.log('🔧 CORRIGINDO LOGO NO PDF - SUPABASE\n');

// 1. Verificar o arquivo principal de PDF
const pdfLibPath = path.join(__dirname, 'lib', 'pdf.ts');
let pdfContent = fs.readFileSync(pdfLibPath, 'utf8');

console.log('📄 Arquivo lib/pdf.ts encontrado e analisado...');

// Fazer backup
fs.writeFileSync(pdfLibPath + '.backup_' + Date.now(), pdfContent);
console.log('✅ Backup criado');

// 2. Verificar a página inicial (onde está o botão de gerar PDF)
const homePage = path.join(__dirname, 'app', 'page.tsx');
let homeContent = fs.readFileSync(homePage, 'utf8');
fs.writeFileSync(homePage + '.backup_' + Date.now(), homeContent);
console.log('✅ Backup da página inicial criado');

// 3. Criar componente para buscar logo do Supabase
const componentsDir = path.join(__dirname, 'app', 'components');
const logoFetcherPath = path.join(componentsDir, 'LogoFetcher.tsx');

const logoFetcherContent = `'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

interface EmpresaConfig {
    nome: string;
    telefone: string;
    logo_url: string | null;
    endereco?: string;
    email?: string;
}

export function useEmpresaConfig() {
    const [config, setConfig] = useState<EmpresaConfig | null>(null);
    const [loading, setLoading] = useState(true);
    const supabase = createClientComponentClient();

    useEffect(() => {
        async function fetchConfig() {
            try {
                const { data, error } = await supabase
                    .from('configuracoes_empresa')
                    .select('*')
                    .single();

                if (error) throw error;
                setConfig(data);
            } catch (error) {
                console.error('Erro ao buscar configurações:', error);
                // Configuração padrão
                setConfig({
                    nome: 'Fernandes clima e conforto',
                    telefone: '99547-9729',
                    logo_url: null
                });
            } finally {
                setLoading(false);
            }
        }

        fetchConfig();
    }, [supabase]);

    return { config, loading };
}

export function LogoEmpresa({ className = "", style = {} }: { className?: string; style?: React.CSSProperties }) {
    const { config, loading } = useEmpresaConfig();
    
    if (loading) return <div style={{ width: 80, height: 80, background: '#f0f0f0' }}></div>;
    
    if (config?.logo_url) {
        return (
            <img 
                src={config.logo_url} 
                alt="Logo da empresa" 
                className={className}
                style={{ 
                    maxHeight: '80px', 
                    width: 'auto',
                    objectFit: 'contain',
                    ...style 
                }}
                crossOrigin="anonymous"
            />
        );
    }
    
    return (
        <div style={{ 
            width: 80, 
            height: 80, 
            background: '#f0f0f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 12,
            color: '#999'
        }}>
            Sem logo
        </div>
    );
}
`;

fs.writeFileSync(logoFetcherPath, logoFetcherContent);
console.log('✅ Componente LogoFetcher criado');

// 4. Corrigir o lib/pdf.ts para aceitar logo_url
const correctedPdfContent = pdfContent.replace(
    /interface OrcamentoPDFParams \{([^}]+)\}/,
    (match, group) => {
        return `interface OrcamentoPDFParams {${group}  logo_url?: string | null;\n}`;
    }
);

// Adicionar função para converter imagem remota para base64
const convertToBase64 = `
async function imageToBase64(url: string): Promise<string> {
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.error('Erro ao converter imagem:', error);
        return '';
    }
}
`;

if (!pdfContent.includes('imageToBase64')) {
    const updatedContent = pdfContent.replace(
        /import\s+.*;\n/,
        (imports) => imports + convertToBase64
    );
    fs.writeFileSync(pdfLibPath, updatedContent);
    console.log('✅ lib/pdf.ts atualizado com conversão de imagem');
}

// 5. Criar correção para a página inicial
const homeFixContent = `
// ADICIONE ESTA FUNÇÃO NA PÁGINA INICIAL (app/page.tsx)

const [empresaConfig, setEmpresaConfig] = useState(null);

// Buscar configurações da empresa ao carregar
useEffect(() => {
    async function fetchEmpresaConfig() {
        const supabase = createClientComponentClient();
        const { data } = await supabase
            .from('configuracoes_empresa')
            .select('*')
            .single();
        if (data) {
            setEmpresaConfig(data);
        }
    }
    fetchEmpresaConfig();
}, []);

// NA FUNÇÃO DE GERAR PDF, SUBSTITUA O HEADER:
const generatePDF = async () => {
    const element = document.getElementById('orcamento-content');
    
    // Buscar logo atualizado
    const { data: config } = await supabase
        .from('configuracoes_empresa')
        .select('logo_url')
        .single();
    
    // Adicionar o logo ao conteúdo do PDF
    if (config?.logo_url) {
        const logoImg = document.createElement('img');
        logoImg.src = config.logo_url;
        logoImg.style.maxHeight = '80px';
        logoImg.style.width = 'auto';
        // Inserir no header do PDF
        const header = document.querySelector('.pdf-header');
        if (header) header.prepend(logoImg);
    }
    
    // Resto do código de geração do PDF...
}
`;

console.log('\n📝 CÓDIGO PARA ADICIONAR NA PÁGINA INICIAL:');
console.log(homeFixContent);

// 6. Criar script de migração para garantir que o logo existe
const migrationPath = path.join(__dirname, 'scripts', 'fix-logo-migration.js');
const migrationContent = `
// scripts/fix-logo-migration.js
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Variáveis do Supabase não encontradas');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixLogoConfig() {
    console.log('🔧 Verificando configurações do logo...');
    
    // Verificar se existe configuração da empresa
    const { data: config, error } = await supabase
        .from('configuracoes_empresa')
        .select('*')
        .single();
    
    if (error && error.code === 'PGRST116') {
        console.log('📝 Criando configuração padrão...');
        const { data: newConfig, error: insertError } = await supabase
            .from('configuracoes_empresa')
            .insert({
                nome: 'Fernandes clima e conforto',
                telefone: '99547-9729',
                logo_url: null
            })
            .select()
            .single();
        
        if (insertError) {
            console.error('❌ Erro ao criar configuração:', insertError);
        } else {
            console.log('✅ Configuração padrão criada');
        }
    } else if (config) {
        console.log('✅ Configuração encontrada:', config.nome);
        console.log('   Logo URL:', config.logo_url || 'Nenhum logo configurado');
        
        // Se não tem logo, verificar se existe no public
        if (!config.logo_url) {
            const fs = require('fs');
            const path = require('path');
            const publicLogo = path.join(__dirname, '../public/logo.jpeg');
            
            if (fs.existsSync(publicLogo)) {
                console.log('📤 Enviando logo do public para o Supabase...');
                const logoFile = fs.readFileSync(publicLogo);
                const fileName = \`logo_\${Date.now()}.jpeg\`;
                
                const { data: upload, error: uploadError } = await supabase.storage
                    .from('logos')
                    .upload(fileName, logoFile, {
                        contentType: 'image/jpeg',
                        upsert: true
                    });
                
                if (uploadError) {
                    console.error('❌ Erro no upload:', uploadError);
                } else {
                    const { data: { publicUrl } } = supabase.storage
                        .from('logos')
                        .getPublicUrl(fileName);
                    
                    const { error: updateError } = await supabase
                        .from('configuracoes_empresa')
                        .update({ logo_url: publicUrl })
                        .eq('id', config.id);
                    
                    if (updateError) {
                        console.error('❌ Erro ao atualizar URL:', updateError);
                    } else {
                        console.log('✅ Logo configurado com sucesso!');
                        console.log('   URL:', publicUrl);
                    }
                }
            }
        }
    }
}

fixLogoConfig();
`;

if (!fs.existsSync(path.join(__dirname, 'scripts'))) {
    fs.mkdirSync(path.join(__dirname, 'scripts'));
}
fs.writeFileSync(migrationPath, migrationContent);
console.log('✅ Script de migração criado em:', migrationPath);

console.log('\n' + '='.repeat(60));
console.log('📋 INSTRUÇÕES PARA CORRIGIR O LOGO NO PDF');
console.log('='.repeat(60));

console.log('\n1️⃣ PRIMEIRO, EXECUTE A MIGRAÇÃO:');
console.log('   node scripts/fix-logo-migration.js\n');

console.log('2️⃣ ALTERE O ARQUIVO app/page.tsx:');
console.log('   • Adicione o código sugerido acima');
console.log('   • Importe o useEmpresaConfig do componente criado');
console.log('   • Substitua o header estático pelo dinâmico\n');

console.log('3️⃣ ALTERE O ARQUIVO lib/pdf.ts:');
console.log('   • Use a função imageToBase64 para converter o logo');
console.log('   • Passe o logo_url como parâmetro\n');

console.log('4️⃣ TESTE GERAR O PDF NOVAMENTE\n');

console.log('🔍 VERIFICAÇÃO RÁPIDA:');
console.log('   • O logo está no Supabase Storage?');
console.log('   • A URL do logo é pública?');
console.log('   • O CORS está configurado no Supabase?');
console.log('   • O componente tem acesso ao Supabase Client?\n');

// Criar instruções para o console
console.log('💡 SE O LOGO AINDA NÃO APARECER:');
console.log('   1. Abra o console do navegador (F12)');
console.log('   2. Verifique erros de CORS ou 404');
console.log('   3. Execute este comando para testar a URL do logo:');
console.log('      fetch("URL_DO_LOGO").then(r => console.log(r.status))');
console.log('   4. Compartilhe o erro comigo\n');

console.log('✅ Script finalizado! Execute a migração primeiro.');