'use client';

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
