-- Just enable RLS on remaining tables without adding policies
-- (policies may have been added in a previous migration)
ALTER TABLE public.api_cost_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transcript_freeze ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.export_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cwi_palette ENABLE ROW LEVEL SECURITY;