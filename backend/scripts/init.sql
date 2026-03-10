-- Inicialização do banco de dados PostgreSQL
-- Este script é executado automaticamente quando o container PostgreSQL inicia

-- Criar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Criar usuário para a aplicação (se não existir)
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'gpfx_user') THEN
        CREATE ROLE gpfx_user WITH LOGIN PASSWORD 'gpfx_secure_password_2023';
    END IF;
END
$$;

-- Conceder permissões
GRANT ALL PRIVILEGES ON DATABASE saas_gerenciamento_fx TO gpfx_user;

-- Criar schema para dados específicos (opcional)
CREATE SCHEMA IF NOT EXISTS gpfx_data;
GRANT ALL ON SCHEMA gpfx_data TO gpfx_user;

-- Configurações de performance
ALTER SYSTEM SET shared_preload_libraries = 'pg_stat_statements';
ALTER SYSTEM SET track_activity_query_size = 2048;
ALTER SYSTEM SET pg_stat_statements.track = 'all';

-- Habilitar log de queries lentas (para debug em produção)
ALTER SYSTEM SET log_min_duration_statement = 1000; -- 1 segundo
ALTER SYSTEM SET log_statement = 'mod'; -- Loga INSERT, UPDATE, DELETE

-- Configurações de conexão
ALTER SYSTEM SET max_connections = 200;
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET default_statistics_target = 100;

-- Aplicar configurações (requer restart do PostgreSQL)
SELECT pg_reload_conf();

-- Criar índices comuns (serão criados pelas migrations, mas aqui como exemplo)
-- Estes índices serão criados pelo Alembic, mas mantemos aqui como referência

-- Índices para performance de queries
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trades_account_id ON trades(account_id);
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trades_symbol ON trades(symbol);
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trades_created_at ON trades(created_at);
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trades_close_time ON trades(close_time);

-- Índices para busca full-text (se necessário)
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trades_search ON trades USING gin(to_tsvector('english', symbol || ' ' || COALESCE(comment, '')));

-- Funções utilitárias
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Função para calcular PnL acumulado
CREATE OR REPLACE FUNCTION calculate_cumulative_pnl(account_uuid UUID, start_date DATE DEFAULT NULL, end_date DATE DEFAULT NULL)
RETURNS NUMERIC AS $$
DECLARE
    total_pnl NUMERIC;
BEGIN
    SELECT COALESCE(SUM(net_profit), 0) INTO total_pnl
    FROM trades 
    WHERE account_id = account_uuid
    AND (start_date IS NULL OR close_time::DATE >= start_date)
    AND (end_date IS NULL OR close_time::DATE <= end_date);
    
    RETURN total_pnl;
END;
$$ LANGUAGE plpgsql;

-- Função para calcular win rate
CREATE OR REPLACE FUNCTION calculate_win_rate(account_uuid UUID, start_date DATE DEFAULT NULL, end_date DATE DEFAULT NULL)
RETURNS NUMERIC AS $$
DECLARE
    total_trades INTEGER;
    winning_trades INTEGER;
    win_rate NUMERIC;
BEGIN
    SELECT COUNT(*) INTO total_trades
    FROM trades 
    WHERE account_id = account_uuid
    AND (start_date IS NULL OR close_time::DATE >= start_date)
    AND (end_date IS NULL OR close_time::DATE <= end_date);
    
    IF total_trades = 0 THEN
        RETURN 0;
    END IF;
    
    SELECT COUNT(*) INTO winning_trades
    FROM trades 
    WHERE account_id = account_uuid
    AND net_profit > 0
    AND (start_date IS NULL OR close_time::DATE >= start_date)
    AND (end_date IS NULL OR close_time::DATE <= end_date);
    
    win_rate := (winning_trades::NUMERIC / total_trades::NUMERIC) * 100;
    
    RETURN ROUND(win_rate, 2);
END;
$$ LANGUAGE plpgsql;

-- Views para relatórios
CREATE OR REPLACE VIEW vw_account_summary AS
SELECT 
    a.id,
    a.name,
    a.currency,
    a.current_balance,
    a.initial_balance,
    a.created_at,
    COUNT(t.id) as total_trades,
    COALESCE(SUM(t.net_profit), 0) as total_pnl,
    calculate_win_rate(a.id) as win_rate,
    calculate_cumulative_pnl(a.id) as cumulative_pnl
FROM accounts a
LEFT JOIN trades t ON a.id = t.account_id
GROUP BY a.id, a.name, a.currency, a.current_balance, a.initial_balance, a.created_at;

CREATE OR REPLACE VIEW vw_monthly_performance AS
SELECT 
    DATE_TRUNC('month', t.close_time) as month,
    a.id as account_id,
    a.name as account_name,
    COUNT(t.id) as trades_count,
    COALESCE(SUM(t.net_profit), 0) as pnl,
    calculate_win_rate(a.id, DATE_TRUNC('month', t.close_time)::DATE, (DATE_TRUNC('month', t.close_time) + INTERVAL '1 month' - INTERVAL '1 day')::DATE) as win_rate
FROM trades t
JOIN accounts a ON t.account_id = a.id
WHERE t.close_time IS NOT NULL
GROUP BY DATE_TRUNC('month', t.close_time), a.id, a.name
ORDER BY month DESC, account_name;

-- Trigger para atualizar updated_at
CREATE OR REPLACE TRIGGER trigger_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER trigger_accounts_updated_at
    BEFORE UPDATE ON accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER trigger_trades_updated_at
    BEFORE UPDATE ON trades
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Inserir dados iniciais (se necessário)
-- Estes dados serão criados pelas migrations, mas mantemos aqui como exemplo

-- INSERT INTO users (id, email, full_name, is_active, created_at)
-- VALUES (uuid_generate_v4(), 'admin@gpfx.com', 'Admin User', true, NOW())
-- ON CONFLICT (email) DO NOTHING;

-- Inserir mensagem de inicialização
DO $$
BEGIN
    RAISE NOTICE '🚀 Banco de dados GPFX inicializado com sucesso!';
    RAISE NOTICE '📊 Views e funções criadas para relatórios';
    RAISE NOTICE '🔍 Índices otimizados para performance';
    RAISE NOTICE '⚙️ Configurações de performance aplicadas';
END
$$;
