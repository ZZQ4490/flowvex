-- 002_scraper_tables.sql
-- 爬虫服务相关数据库表

-- 浏览器会话表
CREATE TABLE IF NOT EXISTS browser_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_execution_id UUID REFERENCES workflow_executions(id) ON DELETE CASCADE,
    context_id VARCHAR(100) NOT NULL UNIQUE,
    current_url TEXT,
    page_title TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    config JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_used_at TIMESTAMPTZ DEFAULT NOW(),
    closed_at TIMESTAMPTZ,
    
    CONSTRAINT valid_status CHECK (status IN ('active', 'idle', 'closed'))
);

-- 爬虫执行日志表
CREATE TABLE IF NOT EXISTS scraper_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_execution_id UUID REFERENCES workflow_executions(id) ON DELETE CASCADE,
    browser_session_id UUID REFERENCES browser_sessions(id) ON DELETE SET NULL,
    node_id VARCHAR(100) NOT NULL,
    action VARCHAR(50) NOT NULL,
    selector TEXT,
    config JSONB DEFAULT '{}',
    result JSONB,
    error TEXT,
    duration_ms INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_browser_sessions_execution 
    ON browser_sessions(workflow_execution_id);
CREATE INDEX IF NOT EXISTS idx_browser_sessions_status 
    ON browser_sessions(status);
CREATE INDEX IF NOT EXISTS idx_browser_sessions_context_id 
    ON browser_sessions(context_id);
CREATE INDEX IF NOT EXISTS idx_browser_sessions_last_used 
    ON browser_sessions(last_used_at);

CREATE INDEX IF NOT EXISTS idx_scraper_logs_execution 
    ON scraper_logs(workflow_execution_id);
CREATE INDEX IF NOT EXISTS idx_scraper_logs_session 
    ON scraper_logs(browser_session_id);
CREATE INDEX IF NOT EXISTS idx_scraper_logs_node 
    ON scraper_logs(node_id);
CREATE INDEX IF NOT EXISTS idx_scraper_logs_action 
    ON scraper_logs(action);
CREATE INDEX IF NOT EXISTS idx_scraper_logs_created 
    ON scraper_logs(created_at);

-- 注释
COMMENT ON TABLE browser_sessions IS '浏览器会话表，存储爬虫工作流中的浏览器上下文';
COMMENT ON TABLE scraper_logs IS '爬虫执行日志表，记录每个爬虫动作的执行情况';

COMMENT ON COLUMN browser_sessions.context_id IS '浏览器上下文唯一标识符';
COMMENT ON COLUMN browser_sessions.status IS '会话状态: active(活跃), idle(空闲), closed(已关闭)';
COMMENT ON COLUMN browser_sessions.config IS '浏览器配置，包括 headless, viewport 等';

COMMENT ON COLUMN scraper_logs.action IS '爬虫动作类型: OpenPage, GetText, Click 等';
COMMENT ON COLUMN scraper_logs.selector IS '使用的选择器';
COMMENT ON COLUMN scraper_logs.duration_ms IS '执行耗时（毫秒）';
