import { useState, useMemo } from 'react';
import { TrendingUp, TrendingDown, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';
import { formatRub } from '../utils';

const MONTHS = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];

type GrowthMode = 'flat' | 'linear' | 'seasonal';

interface MonthData {
  plan: number;
  fact: number | null; // null = ещё не наступил
}

interface Props {
  yearGoal: number;
  monthlyChannelProfit: number; // текущий расчёт за месяц
}

const SEASONAL_WEIGHTS = [0.6, 0.65, 0.85, 0.9, 1.0, 1.05, 0.8, 0.75, 1.0, 1.1, 1.15, 1.2];

function distributeByMode(total: number, mode: GrowthMode): number[] {
  if (mode === 'flat') {
    return Array(12).fill(Math.round(total / 12));
  }
  if (mode === 'linear') {
    // Start at 60% of average, end at 140%
    const avg = total / 12;
    const start = avg * 0.6;
    const end = avg * 1.4;
    const step = (end - start) / 11;
    const raw = Array.from({ length: 12 }, (_, i) => start + step * i);
    const rawSum = raw.reduce((a, b) => a + b, 0);
    return raw.map(v => Math.round(v * total / rawSum));
  }
  // seasonal
  const weightSum = SEASONAL_WEIGHTS.reduce((a, b) => a + b, 0);
  return SEASONAL_WEIGHTS.map(w => Math.round(total * w / weightSum));
}

export function MonthlyPlan({ yearGoal, monthlyChannelProfit }: Props) {
  const [growthMode, setGrowthMode] = useState<GrowthMode>('linear');
  const [months, setMonths] = useState<MonthData[]>(() => {
    const plans = distributeByMode(yearGoal, 'linear');
    const now = new Date().getMonth(); // 0-based
    return plans.map((plan, i) => ({
      plan,
      fact: i < now ? Math.round(plan * (0.85 + Math.random() * 0.3)) : null,
    }));
  });
  const [expanded, setExpanded] = useState(true);
  const currentMonth = new Date().getMonth();

  // Recalculate plans when mode changes
  const applyMode = (mode: GrowthMode) => {
    setGrowthMode(mode);
    const plans = distributeByMode(yearGoal, mode);
    setMonths(prev => prev.map((m, i) => ({ ...m, plan: plans[i] })));
  };

  // When fact is entered for a past month, redistribute the gap across future months
  const updateFact = (idx: number, value: number) => {
    setMonths(prev => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], fact: value };

      // Recalculate remaining months
      const completedProfit = updated
        .slice(0, idx + 1)
        .reduce((sum, m) => sum + (m.fact ?? 0), 0);
      const remaining = yearGoal - completedProfit;
      const futureMonths = 12 - (idx + 1);

      if (futureMonths > 0 && remaining > 0) {
        const futurePlans = distributeByMode(remaining, growthMode);
        // Scale future plans to match remaining
        const futureSum = futurePlans.slice(0, futureMonths).reduce((a, b) => a + b, 0);
        for (let i = idx + 1; i < 12; i++) {
          const weight = futureSum > 0 ? futurePlans[i - (idx + 1)] / futureSum : 1 / futureMonths;
          updated[i] = { ...updated[i], plan: Math.round(remaining * weight) };
        }
      }
      return updated;
    });
  };

  const stats = useMemo(() => {
    const factMonths = months.filter(m => m.fact !== null);
    const totalFact = factMonths.reduce((s, m) => s + (m.fact ?? 0), 0);
    const totalPlan = months.reduce((s, m) => s + m.plan, 0);
    const totalPlanCompleted = factMonths.reduce((s, m) => s + m.plan, 0);
    const pctDone = totalPlanCompleted > 0 ? totalFact / totalPlanCompleted : 0;
    const remainingPlan = months.slice(currentMonth).reduce((s, m) => s + m.plan, 0);
    return { totalFact, totalPlan, pctDone, remainingPlan };
  }, [months, currentMonth]);

  const maxVal = Math.max(...months.map(m => Math.max(m.plan, m.fact ?? 0)), 1);

  return (
    <div className="glass" style={{ marginBottom: 32 }}>
      {/* Header */}
      <div
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', cursor: 'pointer', borderBottom: expanded ? '1px solid var(--border)' : 'none' }}
        onClick={() => setExpanded(e => !e)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <TrendingUp size={16} style={{ color: 'var(--cyan)' }} />
          <span style={{ fontWeight: 700, fontSize: 14 }}>Месячная декомпозиция</span>
          <span style={{ fontSize: 11, color: 'var(--text3)', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: 4, padding: '1px 8px' }}>
            Цель: {formatRub(yearGoal, true)} / год
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 12, color: stats.pctDone >= 1 ? 'var(--success)' : stats.pctDone >= 0.8 ? 'var(--warning)' : 'var(--danger)', fontWeight: 700 }}>
            {(stats.pctDone * 100).toFixed(0)}% выполнено
          </span>
          {expanded ? <ChevronUp size={14} style={{ color: 'var(--text3)' }} /> : <ChevronDown size={14} style={{ color: 'var(--text3)' }} />}
        </div>
      </div>

      {expanded && (
        <div style={{ padding: '20px' }}>
          {/* Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Рост:</span>
            {(['flat', 'linear', 'seasonal'] as GrowthMode[]).map(m => (
              <button
                key={m}
                onClick={() => applyMode(m)}
                style={{
                  fontSize: 11, padding: '4px 12px', borderRadius: 6,
                  border: `1px solid ${growthMode === m ? 'rgba(0,229,255,0.4)' : 'var(--border)'}`,
                  background: growthMode === m ? 'rgba(0,229,255,0.1)' : 'var(--card)',
                  color: growthMode === m ? 'var(--cyan)' : 'var(--text2)',
                  cursor: 'pointer', fontWeight: growthMode === m ? 600 : 400,
                }}
              >
                {m === 'flat' ? 'Равномерно' : m === 'linear' ? 'Нарастающий' : 'Сезонный'}
              </button>
            ))}
            <button
              onClick={() => {
                const plans = distributeByMode(yearGoal, growthMode);
                setMonths(plans.map((plan, i) => ({ plan, fact: null })));
              }}
              style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text3)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto' }}
            >
              <RotateCcw size={11} /> Сбросить факт
            </button>
          </div>

          {/* Summary row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
            {[
              { label: 'Годовой план', value: formatRub(stats.totalPlan, true), color: 'var(--cyan)' },
              { label: 'Факт (прошедшие)', value: formatRub(stats.totalFact, true), color: stats.pctDone >= 1 ? 'var(--success)' : stats.pctDone >= 0.8 ? 'var(--warning)' : 'var(--danger)' },
              { label: 'Остаток (план)', value: formatRub(stats.remainingPlan, true), color: 'var(--text2)' },
              { label: 'Расчёт канала / мес', value: formatRub(monthlyChannelProfit, true), color: 'var(--magenta)' },
            ].map((s, i) => (
              <div key={i} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px' }}>
                <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 3 }}>{s.label}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Monthly bars */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 6 }}>
            {months.map((m, i) => {
              const isCurrent = i === currentMonth;
              const isPast = m.fact !== null;
              const pct = m.fact != null ? m.fact / m.plan : null;
              const barColor = isPast
                ? (pct! >= 1 ? 'var(--success)' : pct! >= 0.8 ? 'var(--warning)' : 'var(--danger)')
                : isCurrent ? 'var(--cyan)' : 'rgba(255,255,255,0.15)';

              return (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  {/* Month label */}
                  <div style={{ fontSize: 9, color: isCurrent ? 'var(--cyan)' : 'var(--text3)', fontWeight: isCurrent ? 700 : 400, textTransform: 'uppercase' }}>
                    {MONTHS[i]}
                  </div>

                  {/* Bar chart */}
                  <div style={{ width: '100%', height: 80, display: 'flex', alignItems: 'flex-end', gap: 2, position: 'relative' }}>
                    {/* Plan bar */}
                    <div style={{
                      flex: 1, height: `${(m.plan / maxVal) * 100}%`,
                      background: 'rgba(255,255,255,0.08)',
                      borderRadius: '3px 3px 0 0',
                      minHeight: 2,
                    }} />
                    {/* Fact bar */}
                    {m.fact != null && (
                      <div style={{
                        position: 'absolute', left: 0, bottom: 0,
                        width: '100%',
                        height: `${(m.fact / maxVal) * 100}%`,
                        background: barColor,
                        borderRadius: '3px 3px 0 0',
                        opacity: 0.85,
                        minHeight: 2,
                        transition: 'height 0.3s ease',
                      }} />
                    )}
                    {/* Current month indicator */}
                    {isCurrent && (
                      <div style={{
                        position: 'absolute', top: -4, left: '50%', transform: 'translateX(-50%)',
                        width: 5, height: 5, borderRadius: '50%',
                        background: 'var(--cyan)',
                        boxShadow: '0 0 6px var(--cyan)',
                      }} />
                    )}
                  </div>

                  {/* Plan value */}
                  <div style={{ fontSize: 8, color: 'var(--text3)', textAlign: 'center', lineHeight: 1.3 }}>
                    {formatRub(m.plan, true)}
                  </div>

                  {/* Fact input for past months */}
                  {i <= currentMonth && (
                    <input
                      type="number"
                      value={m.fact ?? ''}
                      placeholder="факт"
                      onChange={e => updateFact(i, Number(e.target.value) || 0)}
                      style={{
                        width: '100%',
                        background: 'rgba(255,255,255,0.04)',
                        border: `1px solid ${isPast ? barColor : 'var(--border)'}`,
                        borderRadius: 4,
                        color: isPast ? barColor : 'var(--text3)',
                        fontSize: 9,
                        padding: '2px 4px',
                        textAlign: 'center',
                        outline: 'none',
                        fontFamily: 'Manrope, sans-serif',
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', gap: 16, marginTop: 14, fontSize: 10, color: 'var(--text3)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: 'rgba(255,255,255,0.08)', display: 'inline-block' }} /> План
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--success)', display: 'inline-block', opacity: 0.85 }} /> Факт ≥100%
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--warning)', display: 'inline-block', opacity: 0.85 }} /> Факт 80–99%
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--danger)', display: 'inline-block', opacity: 0.85 }} /> Факт &lt;80%
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto', color: 'rgba(255,255,255,0.4)', fontStyle: 'italic' }}>
              При невыполнении — остаток автоматически перераспределяется на будущие месяцы
            </span>
          </div>
        </div>
      )}
    </div>
  );
}