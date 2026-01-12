-- 1. Tabela de Registros Brutos (Fonte da Verdade)
CREATE TABLE IF NOT EXISTS rd_registros (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    user_id UUID REFERENCES auth.users(id), -- Quem criou
    foreman_id TEXT,
    foreman_name TEXT,
    supervisor_id TEXT,
    supervisor_name TEXT,
    date DATE NOT NULL,
    team TEXT,
    shift TEXT,
    category TEXT, -- Capina, Roçagem, etc.
    street TEXT,
    neighborhood TEXT,
    metrics JSONB, -- { capinaM: 100, rocagemM2: 500 }
    photos JSONB, -- URLs das fotos
    location JSONB, -- { lat, lng }
    status TEXT DEFAULT 'Pendente'
);

-- 2. Tabela Agregada: Indicadores Diários (Performance)
CREATE TABLE IF NOT EXISTS rd_indicadores_dia (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    supervisor_id TEXT,
    foreman_id TEXT,
    team TEXT,
    
    -- Métricas Agregadas
    total_capina_m NUMERIC DEFAULT 0,
    total_rocagem_m2 NUMERIC DEFAULT 0,
    total_pintura_m NUMERIC DEFAULT 0,
    total_postes_und NUMERIC DEFAULT 0,
    
    -- Metas
    meta_batida_capina BOOLEAN DEFAULT FALSE,
    meta_batida_rocagem BOOLEAN DEFAULT FALSE,
    
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    UNIQUE(date, supervisor_id, foreman_id) -- Chave única para upsert
);

-- 3. Trigger Function: Atualiza Indicadores Automaticamente
CREATE OR REPLACE FUNCTION update_indicadores() RETURNS TRIGGER AS $$
DECLARE
    m_capina NUMERIC;
    m_rocagem NUMERIC;
    m_pintura NUMERIC;
    m_postes NUMERIC;
    meta_cap CONSTANT NUMERIC := 1950;
    meta_roc CONSTANT NUMERIC := 1000;
BEGIN
    -- Determina os valores baseados na operação
    IF (TG_OP = 'DELETE') THEN
        -- Lógica para subtração se necessário, ou recalculo total (mais seguro recalcular)
        -- Para simplificar, vamos recalcular o dia afetado
        DELETE FROM rd_indicadores_dia 
        WHERE date = OLD.date AND supervisor_id = OLD.supervisor_id AND foreman_id = OLD.foreman_id;
    END IF;

    -- Recalcula para o Supervisor/Encarregado no dia específico
    -- (Nota: Em produção massiva, isso pode ser otimizado para não recalcular tudo,
    -- mas para o volume de RDs de limpeza urbana é mto rápido e seguro)
    
    SELECT 
        COALESCE(SUM((metrics->>'capinaM')::numeric), 0),
        COALESCE(SUM((metrics->>'rocagemM2')::numeric), 0),
        COALESCE(SUM((metrics->>'pinturaViasM')::numeric), 0),
        COALESCE(SUM((metrics->>'pinturaPostesUnd')::numeric), 0)
    INTO m_capina, m_rocagem, m_pintura, m_postes
    FROM rd_registros
    WHERE date = NEW.date 
      AND supervisor_id = NEW.supervisor_id 
      AND foreman_id = NEW.foreman_id;

    -- Upsert na tabela de indicadores
    INSERT INTO rd_indicadores_dia (
        date, supervisor_id, foreman_id, team,
        total_capina_m, total_rocagem_m2, total_pintura_m, total_postes_und,
        meta_batida_capina, meta_batida_rocagem, last_updated
    ) VALUES (
        NEW.date, NEW.supervisor_id, NEW.foreman_id, NEW.team,
        m_capina, m_rocagem, m_pintura, m_postes,
        (m_capina >= meta_cap), (m_rocagem >= meta_roc), now()
    )
    ON CONFLICT (date, supervisor_id, foreman_id) DO UPDATE SET
        total_capina_m = EXCLUDED.total_capina_m,
        total_rocagem_m2 = EXCLUDED.total_rocagem_m2,
        total_pintura_m = EXCLUDED.total_pintura_m,
        total_postes_und = EXCLUDED.total_postes_und,
        meta_batida_capina = EXCLUDED.meta_batida_capina,
        meta_batida_rocagem = EXCLUDED.meta_batida_rocagem,
        last_updated = now();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Trigger
DROP TRIGGER IF EXISTS trg_update_indicadores ON rd_registros;
CREATE TRIGGER trg_update_indicadores
AFTER INSERT OR UPDATE OR DELETE ON rd_registros
FOR EACH ROW EXECUTE FUNCTION update_indicadores();

-- 5. Storage Bucket (Executar via Dashboard se falhar aqui)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('rd-photos', 'rd-photos', true)
ON CONFLICT (id) DO NOTHING;

-- 6. RLS (Segurança)
ALTER TABLE rd_registros ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can see only their own inserts or admin" ON rd_registros
FOR SELECT USING (auth.uid() = user_id OR auth.jwt()->>'role' = 'service_role');
CREATE POLICY "Users can insert their own" ON rd_registros
FOR INSERT WITH CHECK (auth.uid() = user_id);

ALTER TABLE rd_indicadores_dia ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read for analysis" ON rd_indicadores_dia FOR SELECT USING (true);
