// ─── Performance Types ────────────────────────────────────────

export interface Kpi {
  id: number;
  kraId: number;
  metric: string;
  target: number;
  actual: number | null;
  unit: string | null;
  score: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface Kra {
  id: number;
  employeeId: number;
  title: string;
  description: string | null;
  period: string;
  createdAt: string;
  updatedAt: string;
  kpis: Kpi[];
}

export interface PerformanceSummary {
  totalKras: number;
  totalKpis: number;
  scoredKpis: number;
  overallScore: number | null;
}