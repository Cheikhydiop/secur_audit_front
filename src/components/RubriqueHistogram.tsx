import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LineChart, Line, Legend, AreaChart, Area } from 'recharts';
import { Calendar, TrendingUp, AlertTriangle, CheckCircle, XCircle, Clock, ArrowUpRight, ArrowDownRight, Minus, AlertCircle, BarChart3, LineChart as LineChartIcon } from 'lucide-react';
import { dashboardService, SiteRubriqueStats, RubriqueStats } from '@/services/DashboardService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

// Color mapping based on compliance rate
const getColorForRate = (rate: number): string => {
  if (rate <= 60) return '#ef4444'; // rouge vif - Non-conformité
  if (rate <= 89) return '#f59e0b'; // ambre vif (plus distinct du rouge) - Risque modéré
  return '#10b981'; // émeraude vif - Conforme
};

const getColorName = (rate: number): string => {
  if (rate <= 60) return 'red';
  if (rate <= 89) return 'amber';
  return 'emerald';
};

const getStatusLabel = (rate: number): string => {
  if (rate <= 60) return 'Non-conformité';
  if (rate <= 89) return 'Risque modéré';
  return 'Conforme';
};

const getStatusColorClass = (rate: number): string => {
  if (rate <= 60) return 'bg-red-100 text-red-700 border-red-200';
  if (rate <= 89) return 'bg-amber-100 text-amber-700 border-amber-200';
  return 'bg-emerald-100 text-emerald-700 border-emerald-200';
};

// Format rubric name for display
const formatRubriqueName = (name: string): string => {
  const nameMap: Record<string, string> = {
    'DOCUMENTS_SECURITE': 'Documents Sécurité',
    'CONSIGNES_SECURITE': 'Consignes Sécurité',
    'SECURITE_INCENDIE': 'Sécurité Incendie',
    'VIDEOSURVEILLANCE': 'Vidéosurveillance',
    'CONTROLE_ACCES': 'Contrôle Accès',
    'POSTE_GARDE': 'Poste de Garde',
    'CONFORMITE_AGENT': 'Conformité Agent',
    'INFRASTRUCTURE': 'Infrastructure',
    'Autre': 'Autre'
  };
  return nameMap[name] || name;
};

interface RubriqueHistogramProps {
  siteId: string;
  inspections?: any[];
}

const PREDEFINED_PERIODS = [
  { id: '2026-T1', label: '2026 T1', start: '2026-01-01', end: '2026-03-31' },
  { id: '2026-T2', label: '2026 T2', start: '2026-04-01', end: '2026-06-30' },
  { id: '2025-T4', label: '2025 T4', start: '2025-10-01', end: '2025-12-31' },
  { id: '2025-T3', label: '2025 T3', start: '2025-07-01', end: '2025-09-30' },
  { id: '2025-T2', label: '2025 T2', start: '2025-04-01', end: '2025-06-30' },
  { id: '2025-T1', label: '2025 T1', start: '2025-01-01', end: '2025-03-31' },
];

export const RubriqueHistogram: React.FC<RubriqueHistogramProps> = ({ siteId, inspections: initialInspections = [] }) => {
  const [stats, setStats] = useState<SiteRubriqueStats | null>(null);
  const [comparisonStats, setComparisonStats] = useState<Record<string, SiteRubriqueStats>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriodIds, setSelectedPeriodIds] = useState<string[]>(['2026-T1']);
  const [isComparisonMode, setIsComparisonMode] = useState(false);
  const [periode, setPeriode] = useState<'3months' | '6months' | '1year' | 'custom' | 'predefined' | 'individual'>('predefined');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedInspectionId, setSelectedInspectionId] = useState<string>('');

  useEffect(() => {
    if (periode === 'predefined') {
      fetchPredefinedStats();
    } else if (periode === 'individual') {
      if (selectedInspectionId) {
        fetchIndividualStats();
      }
    } else if (periode !== 'custom' || (startDate && endDate)) {
      fetchStats();
    }
  }, [siteId, periode, startDate, endDate, selectedPeriodIds, selectedInspectionId]);

  const fetchIndividualStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await dashboardService.getSiteRubriqueStats(siteId, 'custom', undefined, undefined, selectedInspectionId);
      if (resp.data) {
        setStats(resp.data);
      }
    } catch (err) {
      setError('Erreur lors du chargement de l\'audit');
    } finally {
      setLoading(false);
    }
  };

  const fetchPredefinedStats = async () => {
    if (selectedPeriodIds.length === 0) return;

    setLoading(true);
    setError(null);
    try {
      const results: Record<string, SiteRubriqueStats> = {};

      // We fetch all selected periods in parallel
      const promises = selectedPeriodIds.map(async (pid) => {
        const p = PREDEFINED_PERIODS.find(x => x.id === pid);
        if (p) {
          const resp = await dashboardService.getSiteRubriqueStats(siteId, 'custom', p.start, p.end);
          if (resp.data) results[pid] = resp.data;
        }
      });

      await Promise.all(promises);
      setComparisonStats(results);

      // Use the first selected period as the main one for summary cards
      if (selectedPeriodIds.length > 0 && results[selectedPeriodIds[0]]) {
        setStats(results[selectedPeriodIds[0]]);
      }
    } catch (err) {
      setError('Erreur lors du chargement des périodes');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await dashboardService.getSiteRubriqueStats(siteId, periode, startDate, endDate);
      if (response.data) {
        setStats(response.data);
      } else {
        setError('Failed to load rubric statistics');
      }
    } catch (err) {
      setError('Error loading statistics');
      console.error('Error fetching rubric stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const chartData = React.useMemo(() => {
    if (!stats) return [];

    // Mode comparaison: plus d'une période sélectionnée
    if (periode === 'predefined' && selectedPeriodIds.length > 1) {
      const allRubricNames = new Set<string>();
      Object.values(comparisonStats).forEach(s => {
        s.rubriques.forEach(r => allRubricNames.add(r.name));
      });

      return Array.from(allRubricNames).map(rubName => {
        const row: any = {
          name: formatRubriqueName(rubName),
          fullName: rubName
        };

        selectedPeriodIds.forEach(pid => {
          const s = comparisonStats[pid];
          const rub = s?.rubriques.find(r => r.name === rubName);
          row[`taux_${pid}`] = rub ? rub.tauxConformite : 0;
          row[`conforme_${pid}`] = rub ? rub.conforme : 0;
          row[`nonConforme_${pid}`] = rub ? rub.nonConforme : 0;
        });

        return row;
      }).sort((a, b) => {
        const firstPid = selectedPeriodIds[0];
        return (a[`taux_${firstPid}`] || 0) - (b[`taux_${firstPid}`] || 0);
      });
    }

    // Mode simple (une seule période)
    return stats.rubriques.map(rub => ({
      name: formatRubriqueName(rub.name),
      fullName: rub.name,
      tauxConformite: rub.tauxConformite,
      tauxNonConformite: rub.tauxNonConformite,
      conforme: rub.conforme,
      nonConforme: rub.nonConforme,
      couleur: rub.couleur
    })).sort((a, b) => a.tauxConformite - b.tauxConformite);
  }, [stats, comparisonStats, selectedPeriodIds, periode]);

  // Preparation evolution data - ensure chronological ascending order
  const evolutionData = React.useMemo(() => {
    if (!stats) return [];
    return [...stats.monthlyStats]
      .map(m => ({
        month: m.month,
        score: m.globalScore
      }))
      .sort((a, b) => a.month.localeCompare(b.month)); // Chronological ascending
  }, [stats]);

  // Calculate variation
  const variation = React.useMemo(() => {
    if (!stats || !stats.monthlyStats || stats.monthlyStats.length < 2) return null;
    const current = stats.monthlyStats[0].globalScore;
    const previous = stats.monthlyStats[1].globalScore;
    const diff = current - previous;
    return diff;
  }, [stats]);

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Taux de Conformité par Rubrique
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !stats) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Taux de Conformité par Rubrique
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-gray-500">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-yellow-500" />
            <p>{error || 'Aucune donnée disponible'}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Automatic interpretation
  const getInterpretation = () => {
    // Use the primary period for interpretation in comparison mode
    const interpretationData = (periode === 'predefined' && selectedPeriodIds.length > 1)
      ? chartData.map(r => ({ ...r, tauxConformite: r[`taux_${selectedPeriodIds[0]}`] }))
      : chartData;

    const critical = interpretationData.filter(r => r.tauxConformite <= 60);
    const toImprove = interpretationData.filter(r => r.tauxConformite > 60 && r.tauxConformite <= 89);
    const compliant = interpretationData.filter(r => r.tauxConformite >= 90);

    let text = "";
    if (critical.length > 0) {
      text += `Rubriques critiques: ${critical.map(r => `${r.name} (${r.tauxConformite}%)`).join(', ')}. `;
    }
    if (toImprove.length > 0) {
      text += `À améliorer: ${toImprove.map(r => `${r.name} (${r.tauxConformite}%)`).join(', ')}. `;
    }
    if (compliant.length > 0) {
      text += `Conformes: ${compliant.map(r => `${r.name} (${r.tauxConformite}%)`).join(', ')}.`;
    }
    return text;
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-sonatel-orange" />
              <span>Analyse de Conformité</span>
            </div>
            {periode === 'predefined' && selectedPeriodIds.length > 0 && (
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">
                Période: {selectedPeriodIds.map(id => PREDEFINED_PERIODS.find(p => p.id === id)?.label).join(', ')}
                {stats && ` | ${stats.totalInspections} audits`}
              </span>
            )}
            {periode === 'individual' && (
              <span className="text-xs font-black text-muted-foreground uppercase tracking-wider">
                Audit individuel du {stats?.lastInspectionDate ? new Date(stats.lastInspectionDate).toLocaleDateString('fr-FR') : '...'}
              </span>
            )}
          </CardTitle>

          {/* Period selector */}
          <div className="flex items-center gap-2">
            <select
              className="h-9 rounded-xl border-2 border-gray-100 bg-white px-3 text-xs font-black uppercase tracking-tighter outline-none focus:border-sonatel-orange/30 transition-all"
              value={periode}
              onChange={(e) => setPeriode(e.target.value as any)}
            >
              <option value="predefined">Par Trimestre</option>
              <option value="individual">Audit individuel</option>
              <option value="3months">3 derniers mois</option>
              <option value="6months">6 derniers mois</option>
              <option value="1year">1 an</option>
              <option value="custom">Plage perso</option>
            </select>

            {periode === 'individual' && initialInspections.length > 0 && (
              <select
                className="h-9 rounded-xl border-2 border-gray-100 bg-white px-3 text-[10px] font-black uppercase tracking-tighter outline-none focus:border-sonatel-orange/30 transition-all animate-in zoom-in-95 duration-200"
                value={selectedInspectionId}
                onChange={(e) => setSelectedInspectionId(e.target.value)}
              >
                <option value="">Choisir un audit</option>
                {initialInspections.map(insp => (
                  <option key={insp.id} value={insp.id}>
                    {insp.date} - {insp.score}%
                  </option>
                ))}
              </select>
            )}

            {periode === 'predefined' && (
              <div className="flex items-center gap-2 px-3 py-1 bg-gray-50 rounded-xl border border-gray-100">
                {PREDEFINED_PERIODS.map(p => (
                  <label key={p.id} className="flex items-center gap-1.5 cursor-pointer group">
                    <input
                      type="checkbox"
                      className="w-3.5 h-3.5 rounded border-gray-300 text-sonatel-orange focus:ring-sonatel-orange"
                      checked={selectedPeriodIds.includes(p.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedPeriodIds([...selectedPeriodIds, p.id]);
                        } else if (selectedPeriodIds.length > 1) {
                          setSelectedPeriodIds(selectedPeriodIds.filter(id => id !== p.id));
                        }
                      }}
                    />
                    <span className="text-[10px] font-bold text-gray-500 group-hover:text-gray-900 transition-colors">{p.label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Custom Date Range Picker */}
        {periode === 'custom' && (
          <div className="flex items-center gap-3 mt-4 p-3 bg-gray-50 rounded-xl border border-gray-100 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Du</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-white border border-gray-200 rounded-lg px-2 py-1 text-sm font-bold text-gray-700 focus:ring-2 focus:ring-sonatel-orange/20 focus:border-sonatel-orange outline-none transition-all"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Au</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-white border border-gray-200 rounded-lg px-2 py-1 text-sm font-bold text-gray-700 focus:ring-2 focus:ring-sonatel-orange/20 focus:border-sonatel-orange outline-none transition-all"
              />
            </div>
            {!startDate || !endDate ? (
              <p className="text-[10px] text-amber-600 font-bold uppercase tracking-tighter italic">Veuillez choisir les dates</p>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => fetchStats()}
                className="h-8 px-2 text-sonatel-orange hover:bg-sonatel-orange/10"
              >
                Actualiser
              </Button>
            )}
          </div>
        )}

        {/* Visits info */}
        <div className="flex items-center gap-4 text-xs text-gray-500 mt-2">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            <span>Visites {periode === 'custom' ? 'sur la période' : '(3 derniers mois)'}: <strong className="text-gray-900">{stats.visitsLast3Months}</strong></span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>Total inspections: <strong className="text-gray-900">{stats.totalInspections}</strong></span>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Global score */}
        <div className={`mb-6 p-4 rounded-xl border-2 ${getStatusColorClass(stats.global.tauxConformite)}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {(stats.global.couleur === 'green' || stats.global.couleur === 'emerald') && <CheckCircle className="h-5 w-5" />}
              {(stats.global.couleur === 'orange' || stats.global.couleur === 'amber') && <AlertTriangle className="h-5 w-5" />}
              {stats.global.couleur === 'red' && <XCircle className="h-5 w-5" />}
              <div>
                <p className="text-xs font-medium uppercase tracking-wider">Taux Global de Conformité</p>
                <div className="flex items-center gap-2">
                  <p className="text-lg font-bold">{stats.global.tauxConformite}%</p>
                  {variation !== null && variation !== 0 && (
                    <div className={`flex items-center text-xs font-bold ${variation > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {variation > 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                      {Math.abs(variation)}%
                    </div>
                  )}
                  {variation === 0 && (
                    <div className="flex items-center text-xs font-bold text-gray-500">
                      <Minus size={14} />
                      0%
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs">Status</p>
              <p className="text-sm font-bold">{getStatusLabel(stats.global.tauxConformite)}</p>
            </div>
          </div>
          <div className="flex gap-4 mt-2 text-sm">
            <span>Conformes: <strong>{stats.global.conforme}</strong></span>
            <span>Non-conformes: <strong>{stats.global.nonConforme}</strong></span>
            <span>Audits: <strong>{stats.totalInspections}</strong></span>
            {stats.lastInspectionDate && (
              <span>Dernier audit: <strong>{new Date(stats.lastInspectionDate).toLocaleDateString('fr-FR')}</strong></span>
            )}
          </div>
        </div>

        {/* Automatic Interpretation */}
        <div className="mb-6 p-3 bg-orange-50/50 border border-orange-100 rounded-lg text-sm text-orange-900">
          <p className="font-bold mb-1 flex items-center gap-1">
            <AlertCircle size={15} /> Résumé automatique
          </p>
          <p>{getInterpretation()}</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm font-bold mb-4 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-orange-500" />
              Histogramme par rubrique
            </p>
            {/* Bar chart */}
            {chartData.length > 0 ? (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
                    barGap={0}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                    <XAxis
                      type="number"
                      domain={[0, 100]}
                      tickFormatter={(value) => `${value}%`}
                      fontSize={11}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      fontSize={10}
                      width={75}
                      tickLine={false}
                    />
                    <Tooltip
                      formatter={(value: number, name: string, props: any) => {
                        const pid = name.replace('taux_', '');
                        const periodLabel = PREDEFINED_PERIODS.find(p => p.id === pid)?.label || 'Score';
                        const conforme = props.payload[`conforme_${pid}`] || props.payload.conforme;
                        const nonConforme = props.payload[`nonConforme_${pid}`] || props.payload.nonConforme;

                        return [
                          `${value}% (${conforme}C / ${nonConforme}NC)`,
                          periodLabel
                        ];
                      }}
                      labelFormatter={(label) => `Rubrique: ${label}`}
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        fontSize: '12px'
                      }}
                    />

                    {periode === 'predefined' && selectedPeriodIds.length > 1 ? (
                      selectedPeriodIds.map((pid, idx) => (
                        <Bar
                          key={pid}
                          dataKey={`taux_${pid}`}
                          name={PREDEFINED_PERIODS.find(p => p.id === pid)?.label || pid}
                          fill={idx === 0 ? '#f97316' : idx === 1 ? '#fbbf24' : idx === 2 ? '#10b981' : '#a855f7'}
                          radius={[0, 4, 4, 0]}
                          maxBarSize={15}
                        />
                      ))
                    ) : (
                      <Bar
                        dataKey="tauxConformite"
                        radius={[0, 4, 4, 0]}
                        maxBarSize={30}
                      >
                        {chartData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={getColorForRate(entry.tauxConformite)}
                          />
                        ))}
                      </Bar>
                    )}
                    {selectedPeriodIds.length > 1 && <Legend layout="horizontal" verticalAlign="top" align="right" wrapperStyle={{ paddingBottom: '20px', fontSize: '10px' }} />}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>Aucune donnée disponible pour cette période</p>
              </div>
            )}
          </div>

          <div>
            <p className="text-sm font-bold mb-4 flex items-center gap-2">
              <LineChartIcon className="h-4 w-4 text-sonatel-orange" />
              Historique de la conformité
            </p>
            {evolutionData.length > 0 ? (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={evolutionData}
                    margin={{ top: 20, right: 20, left: 0, bottom: 5 }}
                  >
                    <defs>
                      <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="100%">
                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis
                      dataKey="month"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      dy={10}
                    />
                    <YAxis
                      domain={[0, 100]}
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => `${value}%`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#fff',
                        border: 'none',
                        borderRadius: '12px',
                        boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                        fontSize: '12px',
                        fontWeight: 'bold'
                      }}
                      formatter={(value) => [`${value}%`, 'Conformité']}
                    />
                    <Area
                      type="monotone"
                      dataKey="score"
                      stroke="#f97316"
                      strokeWidth={4}
                      fillOpacity={1}
                      fill="url(#colorScore)"
                      label={{
                        position: 'top',
                        fill: '#f97316',
                        fontSize: 11,
                        fontWeight: 'bold',
                        formatter: (val: any) => `${val}%`
                      }}
                      dot={{ r: 6, fill: '#f97316', strokeWidth: 3, stroke: '#fff' }}
                      activeDot={{ r: 8, strokeWidth: 0 }}
                      animationDuration={1500}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>Données d'évolution insuffisantes</p>
              </div>
            )}
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span className="text-xs">1-60% Non-conformité</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-amber-500"></div>
            <span className="text-xs">61-89% Risque modéré</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
            <span className="text-xs">90-100% Conforme</span>
          </div>
        </div>

        {/* Detailed table */}
        {chartData.length > 0 && (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 font-black uppercase tracking-wider text-[11px] text-gray-400">Rubrique</th>
                  <th className="text-center py-2 font-black uppercase tracking-wider text-[11px] text-gray-400">Conforme</th>
                  <th className="text-center py-2 font-black uppercase tracking-wider text-[11px] text-gray-400">Non conforme</th>
                  <th className="text-center py-2 font-black uppercase tracking-wider text-[11px] text-gray-400">Taux</th>
                  <th className="text-center py-2 font-black uppercase tracking-wider text-[11px] text-gray-400">Status</th>
                </tr>
              </thead>
              <tbody>
                {chartData.map((rub, idx) => (
                  <tr key={idx} className="border-b border-gray-100">
                    <td className="py-2.5 font-bold text-gray-900">{rub.name}</td>
                    <td className="text-center py-2.5 text-green-600 font-bold">{rub.conforme}</td>
                    <td className="text-center py-2.5 text-red-600 font-bold">{rub.nonConforme}</td>
                    <td className="text-center py-2.5 font-black text-lg">{rub.tauxConformite}%</td>
                    <td className="text-center py-2.5">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${getStatusColorClass(rub.tauxConformite)}`}>
                        {getStatusLabel(rub.tauxConformite)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
