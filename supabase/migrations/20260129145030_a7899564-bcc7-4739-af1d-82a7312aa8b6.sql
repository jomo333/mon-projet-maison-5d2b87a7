-- Table pour les événements analytics (clics, navigation, etc.)
CREATE TABLE public.user_analytics_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  event_type TEXT NOT NULL, -- 'button_click', 'page_view', 'project_created', 'repeated_clicks'
  event_name TEXT NOT NULL, -- nom du bouton ou de l'événement
  page_path TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table pour les rapports de bugs
CREATE TABLE public.bug_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  type TEXT NOT NULL DEFAULT 'auto', -- 'auto', 'manual'
  source TEXT NOT NULL, -- 'repeated_clicks', 'error', 'user_report'
  description TEXT,
  page_path TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  resolved BOOLEAN NOT NULL DEFAULT false,
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table pour le suivi des analyses IA
CREATE TABLE public.ai_analysis_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  analysis_type TEXT NOT NULL, -- 'analyze-plan', 'analyze-soumissions', 'analyze-diy-materials', 'search-building-code', 'chat-assistant'
  project_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table agrégée optionnelle pour stats précalculées
CREATE TABLE public.user_analytics_aggregated (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  first_session_at TIMESTAMP WITH TIME ZONE,
  first_project_at TIMESTAMP WITH TIME ZONE,
  time_to_first_project_seconds INTEGER,
  total_sessions INTEGER DEFAULT 0,
  total_time_seconds INTEGER DEFAULT 0,
  last_updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index pour performance
CREATE INDEX idx_analytics_events_user_id ON public.user_analytics_events(user_id);
CREATE INDEX idx_analytics_events_created_at ON public.user_analytics_events(created_at);
CREATE INDEX idx_analytics_events_type ON public.user_analytics_events(event_type);
CREATE INDEX idx_bug_reports_resolved ON public.bug_reports(resolved);
CREATE INDEX idx_bug_reports_created_at ON public.bug_reports(created_at);
CREATE INDEX idx_ai_analysis_usage_user_id ON public.ai_analysis_usage(user_id);
CREATE INDEX idx_ai_analysis_usage_created_at ON public.ai_analysis_usage(created_at);
CREATE INDEX idx_ai_analysis_usage_type ON public.ai_analysis_usage(analysis_type);

-- Enable RLS
ALTER TABLE public.user_analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bug_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_analysis_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_analytics_aggregated ENABLE ROW LEVEL SECURITY;

-- RLS Policies pour user_analytics_events
CREATE POLICY "Users can insert their own events"
ON public.user_analytics_events
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all events"
ON public.user_analytics_events
FOR SELECT
USING (is_admin(auth.uid()));

-- RLS Policies pour bug_reports
CREATE POLICY "Users can insert bug reports"
ON public.bug_reports
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND (user_id IS NULL OR auth.uid() = user_id));

CREATE POLICY "Admins can view all bug reports"
ON public.bug_reports
FOR SELECT
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can update bug reports"
ON public.bug_reports
FOR UPDATE
USING (is_admin(auth.uid()));

-- RLS Policies pour ai_analysis_usage
CREATE POLICY "Users can insert their own AI usage"
ON public.ai_analysis_usage
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all AI usage"
ON public.ai_analysis_usage
FOR SELECT
USING (is_admin(auth.uid()));

-- RLS Policies pour user_analytics_aggregated
CREATE POLICY "Admins can manage aggregated stats"
ON public.user_analytics_aggregated
FOR ALL
USING (is_admin(auth.uid()));

-- Trigger pour updated_at sur bug_reports
CREATE TRIGGER update_bug_reports_updated_at
BEFORE UPDATE ON public.bug_reports
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();