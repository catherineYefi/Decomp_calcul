import { useState, useMemo } from 'react';
import { TrendingUp, RotateCcw, ChevronDown, ChevronUp, GitBranch, Target } from 'lucide-react';
import { formatRub } from '../utils';

const MONTHS = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
type GrowthMode = 'flat' | 'linear' | 'seasonal';
type MissMode = 'redistribute' | 'reduce_goal';

const SEASONAL_WEIGHTS = [0.6, 0.65, 0.85, 0.9, 1.0, 1.05, 0.8, 0.75, 1.0, 1.1, 1.15, 1.2];

function distributeAcross(total: number, count: number, mode: GrowthMode): number[] {
  if (count <= 0) return [];
  if (count === 1) return [total];
  if (mode === 'flat') {
    const base = Math.floor(total / count);
    const rem = total - base * count;
    return Array.from({ length: count }, (_, i) => base + (i < rem ? 1 : 0));
  }
  if (mode === 'linear') {
    const start = (total / count) * 0.6;
    const end = (total / count) * 1.4;
    const step = count > 1 ? (end - start) / (count - 1) : 0;
    const raw = Array.from({ length: count }, (_, i) => start + step * i);
    const rawSum = raw.reduce((a, b) => a + b, 0);
    const scaled = raw.map(v => Math.round(v * total / rawSum));
    // Fix rounding drift
    const diff = total - scaled.reduce((a, b) => a + b, 0);
    scaled[scaled.length - 1] += diff;
    return scaled;
  }
  // seasonal — use first `count` seasonal weights
  const weights = SEASONAL_WEIGHTS.slice(0, count);
  const wSum = weights.reduce((a, b) => a + b, 0);
  const scaled = weights.map(w => Math.round(total * w / wSum));
  const diff = total - scaled.reduce((a, b) => a + b, 0);
  scaled[scaled.length - 1] += diff;
  return scaled;
}

interface MonthData { plan: number; fact: number | null; }

interface Props {
  yearGoal: number;
  monthlyChannelProfit: number;
}

export function MonthlyPlan({ yearGoal: initialYearGoal, monthlyChannelProfit }: Props) {
  const [growthMode, setGrowthMode] = useState<GrowthMode>('linear');
  const [missMode, setMissMode] = useState<MissMode>('redistribute');
  const [effectiveYearGoal, setEffectiveYearGoal] = useState(initialYearGoal);
  const [expanded, setExpanded] = useState(true);
  const currentMonth = new Date().getMonth();

  const initMonths = (goal: number, mode: GrowthMode): MonthData[] => {
    const plans = distributeAcross(goal, 12, mode);
    return plans.map((plan) => ({ plan, fact: null }));
  };

  const [months, setMonths] = useState<MonthData[]>(() => initMonths(initialYearGoal, 'linear'));

  const applyMode = (mode: GrowthMode) => {
    setGrowthMode(mode);
    // Redistribute only future months keeping past facts intact
    setMonths(prev => {
      const pastFact = prev.slice(0, currentMonth).reduce((s, m) => s + (m.fact ?? m.plan), 0);
      const remaining = effectiveYearGoal - pastFact;
      const futurePlans = distributeAcross(remaining, 12 - currentMonth, mode);
      return prev.map((m, i) => i < currentMonth ? m : { ...m, plan: futurePlans[i - currentMonth] ?? m.plan });
    });
  };

  const updateFact = (idx: number, rawValue: string) => {
    const value = rawValue === '' ? null : (Number(rawValue) || 0);
    setMonths(prev => {
      const updated = prev.map((m, i) => i === idx ? { ...m, fact: value } : m);

      const completedFact = updated
        .slice(0, idx + 1)
        .reduce((s, m) => s + (m.fact ?? 0), 0);
      const completedPlan = updated
        .slice(0, idx + 1)
        .reduce((s, m) => s + m.plan, 0);
      const gap = completedPlan - completedFact; // positive = невыполнение

      const futureCount = 12 - (idx + 1);
      if (futureCount <= 0) return updated;

      if (missMode === 'redistribute' && gap !== 0) {
        // Keep year goal, redistribute gap across future months
        const currentFuturePlans = updated.slice(idx + 1).map(m => m.plan);
        const currentFutureTotal = currentFuturePlans.reduce((a, b) => a + b, 0);
        const newFutureTotal = currentFutureTotal + gap;
        if (newFutureTotal > 0) {
          const newFuturePlans = distributeAcross(newFutureTotal, futureCount, growthMode);
          return updated.map((m, i) =>
            i > idx ? { ...m, plan: newFuturePlans[i - (idx + 1)] } : m
          );
        }
      } else if (missMode === 'reduce_goal' && gap !== 0) {
        // Reduce effective year goal, keep future months unchanged
        const newGoal = effectiveYearGoal - gap;
        setEffectiveYearGoal(newGoal);
      }

      return updated;
    });
  };

  const resetFacts = () => {
    setEffectiveYearGoal(initialYearGoal);
    setMonths(initMonths(initialYearGoal, growthMode));
  };

  const stats = useMemo(() => {
    const pastMonths = months.filter(m => m.fact !== null);
    const totalFact = pastMonths.reduce((s, m) => s + (m.fact ?? 0), 0);
    const pastPlanSum = pastMonths.reduce((s, m) => s + m.plan, 0);
    const pctDone = pastPlanSum > 0 ? totalFact / pastPlanSum : 1;
    const remainingPlan = months.slice(currentMonth).reduce((s, m) => s + m.plan, 0);
    const totalPlanSum = months.reduce((s, m) => s + m.plan, 0);
    return { totalFact, totalPlanSum, pctDone, remainingPlan };
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
            {formatRub(effectiveYearGoal, true)} / год
            {effectiveYearGoal !== initialYearGoal && (
              <span style={{ color: 'var(--danger)', marginLeft: 4 }}>
                ({formatRub(effectiveYearGoal - initialYearGoal, true)})
              </span>
            )}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: stats.pctDone >= 1 ? 'var(--success)' : stats.pctDone >= 0.8 ? 'var(--warning)' : 'var(--danger)' }}>
            {months.some(m => m.fact !== null) ? `${(stats.pctDone * 100).toFixed(0)}% выполнено` : 'Заполни факт'}
          </span>
          {expanded ? <ChevronUp size={14} style={{ color: 'var(--text3)' }} /> : <ChevronDown size={14} style={{ color: 'var(--text3)' }} />}
        </div>
      </div>

      {expanded && (
        <div style={{ padding: '20px' }}>

          {/* Controls row */}
          <div style={{ display: 'flex', gap: 20, marginBottom: 20, flexWrap: 'wrap', alignItems: 'flex-start' }}>
            {/* Growth mode */}
            <div>
              <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                Распределение
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {([['flat', 'Равномерно'], ['linear', 'Нарастающий'], ['seasonal', 'Сезонный']] as [GrowthMode, string][]).map(([m, label]) => (
                  <button key={m} onClick={() => applyMode(m)} style={{
                    fontSize: 11, padding: '4px 10px', borderRadius: 6, cursor: 'pointer',
                    border: `1px solid ${growthMode === m ? 'rgba(0,229,255,0.4)' : 'var(--border)'}`,
                    background: growthMode === m ? 'rgba(0,229,255,0.1)' : 'var(--card)',
                    color: growthMode === m ? 'var(--cyan)' : 'var(--text2)',
                    fontWeight: growthMode === m ? 600 : 400,
                  }}>{label}</button>
                ))}
              </div>
            </div>

            {/* Miss mode */}
            <div>
              <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                При невыполнении плана
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => setMissMode('redistribute')} style={{
                  fontSize: 11, padding: '4px 10px', borderRadius: 6, cursor: 'pointer',
                  border: `1px solid ${missMode === 'redistribute' ? 'rgba(0,229,255,0.4)' : 'var(--border)'}`,
                  background: missMode === 'redistribute' ? 'rgba(0,229,255,0.1)' : 'var(--card)',
                  color: missMode === 'redistribute' ? 'var(--cyan)' : 'var(--text2)',
                  fontWeight: missMode === 'redistribute' ? 600 : 400,
                  display: 'flex', alignItems: 'center', gap: 5,
                }}>
                  <GitBranch size={11} /> Перераспределить на будущие
                </button>
                <button onClick={() => setMissMode('reduce_goal')} style={{
                  fontSize: 11, padding: '4px 10px', borderRadius: 6, cursor: 'pointer',
                  border: `1px solid ${missMode === 'reduce_goal' ? 'rgba(233,30,140,0.4)' : 'var(--border)'}`,
                  background: missMode === 'reduce_goal' ? 'rgba(233,30,140,0.08)' : 'var(--card)',
                  color: missMode === 'reduce_goal' ? 'var(--magenta)' : 'var(--text2)',
                  fontWeight: missMode === 'reduce_goal' ? 600 : 400,
                  display: 'flex', alignItems: 'center', gap: 5,
                }}>
                  <Target size={11} /> Снизить годовую цель
                </button>
              </div>
            </div>

            <button onClick={resetFacts} style={{
              fontSize: 11, padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border)',
              background: 'transparent', color: 'var(--text3)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto', alignSelf: 'flex-end',
            }}>
              <RotateCcw size={11} /> Сбросить
            </button>
          </div>

          {/* Mode hint */}
          <div style={{
            fontSize: 11, color: 'var(--text3)', background: 'rgba(255,255,255,0.02)',
            border: '1px solid var(--border)', borderRadius: 8,
            padding: '8px 12px', marginBottom: 16, lineHeight: 1.5,
          }}>
            {missMode === 'redistribute'
              ? 'Перераспределение: если в месяце факт < плана, недостача автоматически прибавляется к будущим месяцам — годовая цель остаётся неизменной.'
              : 'Снижение цели: если в месяце факт < плана, годовая цель уменьшается на недостачу — будущие месяца не меняются.'}
          </div>

          {/* Summary cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
            {[
              { label: 'Годовая цель', value: formatRub(effectiveYearGoal, true), color: effectiveYearGoal < initialYearGoal ? 'var(--danger)' : 'var(--cyan)' },
              { label: 'Факт (выполнено)', value: formatRub(stats.totalFact, true), color: stats.pctDone >= 1 ? 'var(--success)' : stats.pctDone >= 0.8 ? 'var(--warning)' : 'var(--danger)' },
              { label: 'Остаток (план)', value: formatRub(stats.remainingPlan, true), color: 'var(--text2)' },
              { label: 'Расчёт / мес', value: formatRub(monthlyChannelProfit, true), color: 'var(--magenta)' },
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
              const hasFact = m.fact !== null;
              const pct = hasFact ? m.fact! / m.plan : null;
              const barColor = hasFact
                ? (pct! >= 1 ? 'var(--success)' : pct! >= 0.8 ? 'var(--warning)' : 'var(--danger)')
                : isCurrent ? 'var(--cyan)' : 'rgba(255,255,255,0.15)';
              const planH = Math.max((m.plan / maxVal) * 80, 2);
              const factH = hasFact ? Math.max((m.fact! / maxVal) * 80, 2) : 0;

              return (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div style={{ fontSize: 9, color: isCurrent ? 'var(--cyan)' : 'var(--text3)', fontWeight: isCurrent ? 700 : 400, textTransform: 'uppercase' }}>
                    {MONTHS[i]}
                  </div>

                  {/* Bar */}
                  <div style={{ width: '100%', height: 80, display: 'flex', alignItems: 'flex-end', position: 'relative' }}>
                    {/* Plan bar */}
                    <div style={{ width: '100%', height: planH, background: 'rgba(255,255,255,0.08)', borderRadius: '3px 3px 0 0' }} />
                    {/* Fact bar overlay */}
                    {hasFact && (
                      <div style={{
                        position: 'absolute', left: 0, bottom: 0, width: '100%',
                        height: factH, background: barColor, borderRadius: '3px 3px 0 0',
                        opacity: 0.85, transition: 'height 0.3s ease',
                      }} />
                    )}
                    {isCurrent && (
                      <div style={{
                        position: 'absolute', top: -4, left: '50%', transform: 'translateX(-50%)',
                        width: 5, height: 5, borderRadius: '50%',
                        background: 'var(--cyan)', boxShadow: '0 0 6px var(--cyan)',
                      }} />
                    )}
                  </div>

                  {/* Plan value */}
                  <div style={{ fontSize: 8, color: 'var(--text3)', textAlign: 'center' }}>
                    {formatRub(m.plan, true)}
                  </div>

                  {/* Fact input — available for current and past months */}
                  {i <= currentMonth && (
                    <input
                      type="number"
                      value={m.fact ?? ''}
                      placeholder="факт"
                      onChange={e => updateFact(i, e.target.value)}
                      style={{
                        width: '100%', background: 'rgba(255,255,255,0.04)',
                        border: `1px solid ${hasFact ? barColor : 'var(--border)'}`,
                        borderRadius: 4, color: hasFact ? barColor : 'var(--text3)',
                        fontSize: 9, padding: '2px 4px', textAlign: 'center',
                        outline: 'none', fontFamily: 'Manrope, sans-serif',
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', gap: 16, marginTop: 14, fontSize: 10, color: 'var(--text3)', flexWrap: 'wrap' }}>
            {[
              { color: 'rgba(255,255,255,0.08)', label: 'План' },
              { color: 'var(--success)', label: 'Факт ≥100%' },
              { color: 'var(--warning)', label: 'Факт 80–99%' },
              { color: 'var(--danger)', label: 'Факт <80%' },
            ].map((l, i) => (
              <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: l.color, display: 'inline-block', opacity: 0.9 }} />
                {l.label}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}