-- ============================================================
-- PONTO DIGITAL BM - SCRIPT COMPLETO STANDALONE
-- Sistema de Ponto Eletrônico Online Profissional
-- Multi-tenant | SaaS | Portaria MTP 671/2021
--
-- Este script é AUTO-CONTIDO. Não depende de migrations anteriores.
-- Execute ÚNICA e EXCLUSIVAMENTE este script no SQL Editor do Supabase.
-- ============================================================

-- ============================================================
-- 1. EXTENSÕES
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA public;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 2. LIMPEZA - Remove tabelas existentes para recriar com schema correto
-- ============================================================
DROP TABLE IF EXISTS
  public.ferias,
  public.notificacoes,
  public.auditoria,
  public.ajustes,
  public.banco_horas,
  public.funcionario_escala,
  public.escalas,
  public.registros_ponto,
  public.dispositivos,
  public.funcionarios,
  public.filiais,
  public.tenant_customizations,
  public.conversations,
  public.messages,
  public.tenant_users,
  public.services,
  public.customers,
  public.service_orders,
  public.user_sessions,
  public.tenants
CASCADE;

-- Remove old enum if exists
DROP TYPE IF EXISTS public.order_status CASCADE;

-- ============================================================
-- 3. SCHEMA
-- ============================================================
SET search_path TO public;

-- ============================================================
-- 4. TABELAS BASE (Multi-tenant)
-- ============================================================

-- 4.1. EMPRESAS / TENANTS
CREATE TABLE IF NOT EXISTS public.tenants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  razao_social TEXT,
  nome_fantasia TEXT,
  cnpj TEXT UNIQUE,
  email TEXT,
  telefone TEXT,
  plano TEXT DEFAULT 'basico',
  limite_funcionarios INT DEFAULT 10,
  logo_url TEXT,
  active BOOLEAN DEFAULT true,
  primary_color TEXT DEFAULT '#16a34a',
  max_sessions INTEGER DEFAULT 2,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.2. USUÁRIOS DOS TENANTS
CREATE TABLE IF NOT EXISTS public.tenant_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT DEFAULT 'user' CHECK (role IN ('master', 'admin', 'user')),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, email)
);

-- ============================================================
-- 4. TABELAS DO PONTO DIGITAL
-- ============================================================

-- 4.1. FILIAIS
CREATE TABLE IF NOT EXISTS public.filiais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  endereco TEXT,
  cidade TEXT,
  estado TEXT,
  latitude TEXT,
  longitude TEXT,
  raio_geofence INT DEFAULT 100,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4.2. FUNCIONARIOS
CREATE TABLE IF NOT EXISTS public.funcionarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  filial_id UUID REFERENCES public.filiais(id) ON DELETE SET NULL,
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  matricula TEXT NOT NULL,
  nome TEXT NOT NULL,
  cpf TEXT,
  rg TEXT,
  email TEXT,
  telefone TEXT,
  cargo TEXT,
  setor TEXT,
  tipo_jornada TEXT DEFAULT 'fixa',
  carga_horaria_semanal INT DEFAULT 44,
  horas_diaria INT DEFAULT 8,
  tolerancia_minutos INT DEFAULT 10,
  senha_hash TEXT,
  pin TEXT,
  foto_url TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(empresa_id, matricula),
  UNIQUE(empresa_id, cpf)
);

-- 4.3. DISPOSITIVOS (tablets kiosk, totens)
CREATE TABLE IF NOT EXISTS public.dispositivos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  filial_id UUID REFERENCES public.filiais(id) ON DELETE SET NULL,
  tipo TEXT NOT NULL DEFAULT 'tablet' CHECK (tipo IN ('tablet', 'totem', 'computador', 'biometrico')),
  nome TEXT NOT NULL,
  mac_address TEXT,
  ip TEXT,
  localizacao TEXT,
  ativo BOOLEAN DEFAULT true,
  ultimo_heartbeat TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4.4. REGISTROS DE PONTO
CREATE TABLE IF NOT EXISTS public.registros_ponto (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funcionario_id UUID NOT NULL REFERENCES public.funcionarios(id) ON DELETE CASCADE,
  empresa_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  dispositivo_id UUID REFERENCES public.dispositivos(id) ON DELETE SET NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('entrada', 'saida_almoco', 'retorno_almoco', 'saida', 'extra_inicio', 'extra_fim')),
  data_hora TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  latitude TEXT,
  longitude TEXT,
  endereco TEXT,
  selfie_url TEXT,
  reconhecimento_facial BOOLEAN DEFAULT false,
  ip TEXT,
  dispositivo_info TEXT,
  hash_integridade TEXT NOT NULL DEFAULT '',
  sincronizado BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_registros_funcionario_data ON public.registros_ponto(funcionario_id, data_hora DESC);
CREATE INDEX IF NOT EXISTS idx_registros_empresa_data ON public.registros_ponto(empresa_id, data_hora DESC);
CREATE INDEX IF NOT EXISTS idx_registros_data ON public.registros_ponto(data);

-- 4.5. ESCALAS / TURNOS
CREATE TABLE IF NOT EXISTS public.escalas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('5x2', '6x1', '12x36', 'turno_rotativo', 'noturno', 'flexivel', 'personalizado')),
  hora_entrada TIME NOT NULL,
  hora_saida_almoco TIME,
  hora_retorno_almoco TIME,
  hora_saida TIME NOT NULL,
  tolerancia_minutos INT DEFAULT 10,
  carga_horaria_diaria INT DEFAULT 8,
  dias_semana INT[] DEFAULT '{1,2,3,4,5}',
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4.6. FUNCIONARIO X ESCALA
CREATE TABLE IF NOT EXISTS public.funcionario_escala (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funcionario_id UUID NOT NULL REFERENCES public.funcionarios(id) ON DELETE CASCADE,
  escala_id UUID NOT NULL REFERENCES public.escalas(id) ON DELETE CASCADE,
  data_inicio DATE NOT NULL,
  data_fim DATE,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(funcionario_id, data_inicio)
);

-- 4.7. BANCO DE HORAS
CREATE TABLE IF NOT EXISTS public.banco_horas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funcionario_id UUID NOT NULL REFERENCES public.funcionarios(id) ON DELETE CASCADE,
  empresa_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  horas_trabalhadas DECIMAL(10,2) DEFAULT 0,
  horas_previstas DECIMAL(10,2) DEFAULT 0,
  saldo DECIMAL(10,2) DEFAULT 0,
  horas_extras DECIMAL(10,2) DEFAULT 0,
  horas_debito DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(funcionario_id, data)
);

-- 4.8. AJUSTES / SOLICITACOES
CREATE TABLE IF NOT EXISTS public.ajustes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funcionario_id UUID NOT NULL REFERENCES public.funcionarios(id) ON DELETE CASCADE,
  empresa_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('correcao_ponto', 'justificativa_atraso', 'abono_falta', 'alteracao_escala', 'outros')),
  registro_ponto_id UUID REFERENCES public.registros_ponto(id) ON DELETE SET NULL,
  data_referencia DATE NOT NULL,
  justificativa TEXT NOT NULL,
  anexo_url TEXT,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'recusado')),
  aprovado_por UUID REFERENCES public.funcionarios(id) ON DELETE SET NULL,
  observacao_rh TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4.9. AUDITORIA (logs imutáveis)
CREATE TABLE IF NOT EXISTS public.auditoria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  funcionario_id UUID REFERENCES public.funcionarios(id) ON DELETE SET NULL,
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  acao TEXT NOT NULL,
  tabela_afetada TEXT,
  registro_id UUID,
  dados_anteriores JSONB,
  dados_novos JSONB,
  ip TEXT,
  dispositivo TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auditoria_empresa ON public.auditoria(empresa_id, created_at DESC);

-- 4.10. NOTIFICACOES
CREATE TABLE IF NOT EXISTS public.notificacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  funcionario_id UUID REFERENCES public.funcionarios(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  titulo TEXT NOT NULL,
  mensagem TEXT,
  lida BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4.11. FERIAS
CREATE TABLE IF NOT EXISTS public.ferias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funcionario_id UUID NOT NULL REFERENCES public.funcionarios(id) ON DELETE CASCADE,
  empresa_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  data_inicio DATE NOT NULL,
  data_fim DATE NOT NULL,
  dias INT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'gozo' CHECK (tipo IN ('gozo', 'abono_pecuniario', 'coletiva')),
  status TEXT NOT NULL DEFAULT 'agendada' CHECK (status IN ('agendada', 'concedida', 'cancelada')),
  aprovado_por UUID REFERENCES public.funcionarios(id) ON DELETE SET NULL,
  observacao TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 5. FUNÇÕES E TRIGGERS
-- ============================================================

-- 5.1. Trigger para gerar hash SHA256 de integridade no registro
CREATE OR REPLACE FUNCTION public.gerar_hash_registro()
RETURNS TRIGGER AS $$
BEGIN
  NEW.hash_integridade := encode(
    sha256(
      (NEW.funcionario_id::text || 
       NEW.data_hora::text || 
       COALESCE(NEW.latitude, '') || 
       COALESCE(NEW.longitude, '') ||
       COALESCE(NEW.endereco, '') ||
       NEW.tipo)::bytea
    ),
    'hex'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_gerar_hash ON public.registros_ponto;
CREATE TRIGGER trg_gerar_hash
  BEFORE INSERT ON public.registros_ponto
  FOR EACH ROW
  EXECUTE FUNCTION public.gerar_hash_registro();

-- 5.2. Trigger de auditoria para qualquer alteração em registros_ponto
CREATE OR REPLACE FUNCTION public.auditoria_registro_ponto()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.auditoria (empresa_id, auth_user_id, acao, tabela_afetada, registro_id, dados_anteriores, dados_novos, ip)
  VALUES (
    COALESCE(NEW.empresa_id, OLD.empresa_id),
    auth.uid(),
    TG_OP,
    'registros_ponto',
    COALESCE(NEW.id, OLD.id),
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN row_to_json(OLD)::jsonb ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW)::jsonb ELSE NULL END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_auditoria_registros ON public.registros_ponto;
CREATE TRIGGER trg_auditoria_registros
  AFTER INSERT OR UPDATE OR DELETE ON public.registros_ponto
  FOR EACH ROW EXECUTE FUNCTION public.auditoria_registro_ponto();

-- ============================================================
-- 6. ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.filiais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funcionarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispositivos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registros_ponto ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escalas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funcionario_escala ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banco_horas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ajustes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auditoria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ferias ENABLE ROW LEVEL SECURITY;

-- 6.1. Políticas para Tenants
DROP POLICY IF EXISTS "Todos veem tenants" ON public.tenants;
CREATE POLICY "Todos veem tenants" ON public.tenants
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Master pode gerenciar tenants" ON public.tenants;
CREATE POLICY "Master pode gerenciar tenants" ON public.tenants
  FOR ALL TO authenticated
  USING (auth.email() IN (SELECT email FROM public.tenant_users WHERE role = 'master'));

-- 6.2. Políticas para tenant_users
DROP POLICY IF EXISTS "Usuários veem users do mesmo tenant" ON public.tenant_users;
CREATE POLICY "Usuários veem users do mesmo tenant" ON public.tenant_users
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Master gerencia tenant_users" ON public.tenant_users;
CREATE POLICY "Master gerencia tenant_users" ON public.tenant_users
  FOR ALL TO authenticated
  USING (auth.email() IN (SELECT email FROM public.tenant_users WHERE role = 'master'));

-- 6.3. Políticas para funcionarios
DROP POLICY IF EXISTS "Funcionarios do mesmo tenant" ON public.funcionarios;
CREATE POLICY "Funcionarios do mesmo tenant" ON public.funcionarios
  FOR SELECT TO authenticated
  USING (
    empresa_id IN (SELECT tenant_id FROM public.tenant_users WHERE email = auth.email())
    OR
    auth_user_id = auth.uid()
  );

DROP POLICY IF EXISTS "Admin insere funcionarios" ON public.funcionarios;
CREATE POLICY "Admin insere funcionarios" ON public.funcionarios
  FOR INSERT TO authenticated
  WITH CHECK (
    empresa_id IN (SELECT tenant_id FROM public.tenant_users WHERE email = auth.email() AND role IN ('admin', 'master'))
  );

DROP POLICY IF EXISTS "Admin atualiza funcionarios" ON public.funcionarios;
CREATE POLICY "Admin atualiza funcionarios" ON public.funcionarios
  FOR UPDATE TO authenticated
  USING (
    empresa_id IN (SELECT tenant_id FROM public.tenant_users WHERE email = auth.email() AND role IN ('admin', 'master'))
  );

DROP POLICY IF EXISTS "Admin deleta funcionarios" ON public.funcionarios;
CREATE POLICY "Admin deleta funcionarios" ON public.funcionarios
  FOR DELETE TO authenticated
  USING (
    empresa_id IN (SELECT tenant_id FROM public.tenant_users WHERE email = auth.email() AND role IN ('admin', 'master'))
  );

-- 6.4. Políticas para registros_ponto
DROP POLICY IF EXISTS "Registros do mesmo tenant ou próprio" ON public.registros_ponto;
CREATE POLICY "Registros do mesmo tenant ou próprio" ON public.registros_ponto
  FOR SELECT TO authenticated
  USING (
    empresa_id IN (SELECT tenant_id FROM public.tenant_users WHERE email = auth.email())
    OR
    funcionario_id IN (SELECT id FROM public.funcionarios WHERE auth_user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Inserir próprio registro" ON public.registros_ponto;
CREATE POLICY "Inserir próprio registro" ON public.registros_ponto
  FOR INSERT TO authenticated
  WITH CHECK (
    funcionario_id IN (SELECT id FROM public.funcionarios WHERE auth_user_id = auth.uid())
    OR
    empresa_id IN (SELECT tenant_id FROM public.tenant_users WHERE email = auth.email() AND role IN ('admin', 'master'))
  );

-- 6.5. Demais tabelas - acesso por tenant
DROP POLICY IF EXISTS "Acesso por tenant" ON public.filiais;
CREATE POLICY "Acesso por tenant" ON public.filiais
  FOR ALL TO authenticated
  USING (empresa_id IN (SELECT tenant_id FROM public.tenant_users WHERE email = auth.email()));

DROP POLICY IF EXISTS "Acesso por tenant dispositivos" ON public.dispositivos;
CREATE POLICY "Acesso por tenant dispositivos" ON public.dispositivos
  FOR ALL TO authenticated
  USING (empresa_id IN (SELECT tenant_id FROM public.tenant_users WHERE email = auth.email()));

DROP POLICY IF EXISTS "Acesso por tenant escalas" ON public.escalas;
CREATE POLICY "Acesso por tenant escalas" ON public.escalas
  FOR ALL TO authenticated
  USING (empresa_id IN (SELECT tenant_id FROM public.tenant_users WHERE email = auth.email()));

DROP POLICY IF EXISTS "Acesso por tenant banco_horas" ON public.banco_horas;
CREATE POLICY "Acesso por tenant banco_horas" ON public.banco_horas
  FOR ALL TO authenticated
  USING (empresa_id IN (SELECT tenant_id FROM public.tenant_users WHERE email = auth.email()));

DROP POLICY IF EXISTS "Acesso por tenant ajustes" ON public.ajustes;
CREATE POLICY "Acesso por tenant ajustes" ON public.ajustes
  FOR ALL TO authenticated
  USING (empresa_id IN (SELECT tenant_id FROM public.tenant_users WHERE email = auth.email()));

-- ============================================================
-- 7. FUNÇÕES AUXILIARES
-- ============================================================

-- 7.1. Calcular banco de horas de um funcionário em uma data
CREATE OR REPLACE FUNCTION public.calcular_banco_horas(
  p_funcionario_id UUID,
  p_data DATE
)
RETURNS TABLE(
  total_trabalhado DECIMAL,
  total_previsto DECIMAL,
  saldo_dia DECIMAL
) LANGUAGE plpgsql AS $$
DECLARE
  v_carga INT;
BEGIN
  SELECT carga_horaria_diaria INTO v_carga
  FROM public.escalas e
  JOIN public.funcionario_escala fe ON fe.escala_id = e.id
  WHERE fe.funcionario_id = p_funcionario_id
    AND fe.data_inicio <= p_data
    AND (fe.data_fim IS NULL OR fe.data_fim >= p_data)
    AND fe.ativo = true
  LIMIT 1;

  IF v_carga IS NULL THEN
    v_carga := 8;
  END IF;

  RETURN QUERY
  SELECT
    COALESCE(SUM(
      EXTRACT(EPOCH FROM (
        LEAD(data_hora) OVER (ORDER BY data_hora) - data_hora
      )) / 3600
    ), 0)::DECIMAL(10,2) as total_trabalhado,
    v_carga::DECIMAL(10,2) as total_previsto,
    (COALESCE(SUM(
      EXTRACT(EPOCH FROM (
        LEAD(data_hora) OVER (ORDER BY data_hora) - data_hora
      )) / 3600
    ), 0) - v_carga)::DECIMAL(10,2) as saldo_dia
  FROM public.registros_ponto
  WHERE funcionario_id = p_funcionario_id
    AND data_hora::date = p_data;
END;
$$;

-- 7.2. Criar tenant_user vinculado a auth user
CREATE OR REPLACE FUNCTION public.criar_tenant_user(
  p_tenant_id UUID,
  p_email TEXT,
  p_role TEXT DEFAULT 'user'
) RETURNS UUID AS $$
DECLARE
  v_user_id UUID;
BEGIN
  INSERT INTO public.tenant_users (tenant_id, email, role)
  VALUES (p_tenant_id, p_email, p_role)
  RETURNING id INTO v_user_id;
  RETURN v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 8. VIEWS
-- ============================================================

-- 8.1. Funcionários online agora
CREATE OR REPLACE VIEW public.vw_funcionarios_online AS
SELECT DISTINCT ON (f.id)
  f.id,
  f.nome,
  f.matricula,
  f.setor,
  f.cargo,
  fi.nome as filial_nome,
  rp.tipo as ultimo_registro,
  rp.data_hora as ultimo_registro_em,
  CASE 
    WHEN rp.tipo IN ('entrada', 'retorno_almoco', 'extra_inicio') THEN 'online'
    ELSE 'offline'
  END as status
FROM public.funcionarios f
LEFT JOIN public.filiais fi ON fi.id = f.filial_id
LEFT JOIN public.registros_ponto rp ON rp.id = (
  SELECT id FROM public.registros_ponto 
  WHERE funcionario_id = f.id 
  ORDER BY data_hora DESC 
  LIMIT 1
)
WHERE f.ativo = true;

-- 8.2. Resumo diário
CREATE OR REPLACE VIEW public.vw_resumo_diario AS
SELECT
  f.empresa_id,
  f.id as funcionario_id,
  f.nome,
  f.matricula,
  CURRENT_DATE as data,
  MIN(rp.data_hora) as primeira_marcacao,
  MAX(rp.data_hora) as ultima_marcacao,
  COUNT(rp.id) as total_marcacoes,
  SUM(CASE WHEN rp.tipo = 'entrada' THEN 1 ELSE 0 END) as qtd_entradas,
  SUM(CASE WHEN rp.tipo = 'saida' THEN 1 ELSE 0 END) as qtd_saidas
FROM public.funcionarios f
LEFT JOIN public.registros_ponto rp ON rp.funcionario_id = f.id AND rp.data_hora::date = CURRENT_DATE
WHERE f.ativo = true
GROUP BY f.empresa_id, f.id, f.nome, f.matricula;

-- ============================================================
-- 9. DADOS INICIAIS
-- ============================================================

-- 9.1. Criar Tenant Master
INSERT INTO public.tenants (name, slug, nome_fantasia, plano, limite_funcionarios, active)
VALUES ('Admin Master', 'master', 'Ponto Digital BM', 'corporativo', 999999, true)
ON CONFLICT (slug) DO NOTHING;

-- 9.2. Criar Tenant de Exemplo
INSERT INTO public.tenants (name, slug, nome_fantasia, cnpj, plano, limite_funcionarios, active)
VALUES ('Empresa Exemplo Ltda', 'empresa-exemplo', 'Empresa Exemplo', '00.000.000/0001-00', 'profissional', 50, true)
ON CONFLICT (slug) DO NOTHING;

-- 9.3. Criar Usuário Master (acesso total ao sistema)
-- Email: master@pontodigital.com
-- Senha: Master@2026
DO $$
DECLARE
  v_instance_id UUID;
  v_master_tenant_id UUID;
  v_example_tenant_id UUID;
  v_master_user_id UUID;
  v_example_user_id UUID;
BEGIN
  -- Get instance ID
  SELECT id INTO v_instance_id FROM auth.instances ORDER BY created_at LIMIT 1;
  IF v_instance_id IS NULL THEN
    v_instance_id := '00000000-0000-0000-0000-000000000000';
  END IF;

  -- Get tenant IDs
  SELECT id INTO v_master_tenant_id FROM public.tenants WHERE slug = 'master';
  SELECT id INTO v_example_tenant_id FROM public.tenants WHERE slug = 'empresa-exemplo';

  -- Criar usuário master no auth
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, confirmation_token, confirmation_sent_at,
    recovery_token, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, is_super_admin
  ) VALUES (
    v_instance_id, gen_random_uuid(), 'authenticated', 'authenticated',
    'master@pontodigital.com',
    crypt('Master@2026', gen_salt('bf')),
    NOW(), '', NOW(), '',
    '{"provider":"email","providers":["email"]}',
    '{"role":"master"}',
    NOW(), NOW(), true
  ) ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
  RETURNING id INTO v_master_user_id;

  -- Vincular master ao tenant master
  INSERT INTO public.tenant_users (tenant_id, email, role, active)
  VALUES (v_master_tenant_id, 'master@pontodigital.com', 'master', true)
  ON CONFLICT (tenant_id, email) DO NOTHING;

  -- Criar usuário admin da empresa exemplo
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, confirmation_token, confirmation_sent_at,
    recovery_token, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at
  ) VALUES (
    v_instance_id, gen_random_uuid(), 'authenticated', 'authenticated',
    'admin@exemplo.com',
    crypt('Admin@2026', gen_salt('bf')),
    NOW(), '', NOW(), '',
    '{"provider":"email","providers":["email"]}',
    '{"role":"admin"}',
    NOW(), NOW()
  ) ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
  RETURNING id INTO v_example_user_id;

  -- Vincular admin à empresa exemplo
  INSERT INTO public.tenant_users (tenant_id, email, role, active)
  VALUES (v_example_tenant_id, 'admin@exemplo.com', 'admin', true)
  ON CONFLICT (tenant_id, email) DO NOTHING;

  -- Criar funcionário de exemplo vinculado ao admin
  INSERT INTO public.funcionarios (empresa_id, matricula, nome, email, cargo, setor, pin, ativo)
  VALUES (v_example_tenant_id, '001', 'Administrador', 'admin@exemplo.com', 'Administrador RH', 'Administrativo', '1234', true)
  ON CONFLICT (empresa_id, matricula) DO NOTHING;

  INSERT INTO public.funcionarios (empresa_id, matricula, nome, email, cargo, setor, pin, ativo)
  VALUES (v_example_tenant_id, '002', 'Funcionário Exemplo', 'funcionario@exemplo.com', 'Auxiliar', 'Produção', '5678', true)
  ON CONFLICT (empresa_id, matricula) DO NOTHING;

  -- Criar escala exemplo
  INSERT INTO public.escalas (empresa_id, nome, tipo, hora_entrada, hora_saida_almoco, hora_retorno_almoco, hora_saida, carga_horaria_diaria)
  VALUES (v_example_tenant_id, 'Administrativo', '5x2', '08:00', '12:00', '13:00', '18:00', 8)
  ON CONFLICT DO NOTHING;
END $$;

-- ============================================================
-- 10. PERMISSÕES
-- ============================================================
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;

-- ============================================================
-- FIM
-- ============================================================
