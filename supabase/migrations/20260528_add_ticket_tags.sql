-- Add tags array column to tickets table
ALTER TABLE tickets
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- Index for fast tag filtering
CREATE INDEX IF NOT EXISTS idx_tickets_tags
ON tickets USING GIN(tags);

-- RPC for popular tags
CREATE OR REPLACE FUNCTION get_popular_tags(p_company_id TEXT, p_limit INT DEFAULT 20)
RETURNS TABLE(tag TEXT, count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT unnested_tag AS tag, COUNT(*) AS count
  FROM (
    SELECT unnest(tags) AS unnested_tag
    FROM tickets
    WHERE company_id = p_company_id
  ) sub
  GROUP BY unnested_tag
  ORDER BY count DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;
