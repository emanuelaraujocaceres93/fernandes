
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
                const fileName = `logo_${Date.now()}.jpeg`;
                
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
