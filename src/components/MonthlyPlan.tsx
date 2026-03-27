import { useState, useMemo, useEffect, useCallback } from 'react';
import { TrendingUp, RotateCcw, ChevronDown, ChevronUp, GitBranch, Target } from 'lucide-react';
import { formatRub } from '../utils';

const MONTHS = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
type GrowthMode = 'flat' | 'linear' | 'seasonal';
type MissMode = 'redistribute' | 'reduce_goal';

const SEASONAL_WEIGHTS = [0.6, 0.65, 0.85, 0.9, 1.0, 1.05, 0.8, 0.75, 1.0, 1.1, 1.15, 1.2];

function distributeAcross(total: number, count: number, mode: GrowthMode): number[] {
  if (count <= 0) return [];
  if (count === 1) return [Math.round(total)];
  if (mode === 'flat') {
    const base = Math.floor(total / count);
    const rem = total - base * count;
    return Array.from({ length: count }, (_, i) => base + (i < rem ? 1 : 0));
  }
  if (mode === 'linear') {
    const avg = total / count;
    const start = avg * 0.6;
    const end = avg * 1.4;
    const step = (end - start) / (count - 1);
    const raw = Array.from({ length: count }, (_, i) => start + step * i);
    const rawSum = raw.reduce((a, b) => a + b, 0);
    const scaled = raw.map(v => Math.round(v * total / rawSum));
    const diff = total - scaled.reduce((a, b) => a + b, 0);
    scaled[scaled.length - 1] += diff;
    return scaled;
  }
  const weights = SEASONAL_WEIGHTS.slice(0, count);
  const wSum = weights.reduce((a, b) => a + b, 0);
  const scaled = weights.map(w => Math.round(total * w / wSum));
  const diff = total - scaled.reduce((a, b) => a + b, 0);
  scaled[scaled.length - 1] += diff;
  return scaled;
}

function makePlan(goal: number, mode: GrowthMode) {
  return distributeAcross(goal, 12, mode).map(plan => ({ plan, fact: null as number | null }));
}

interface Props {
  yearGoal: number;
  monthlyChannelProfit: number;
}

export function MonthlyPlan({ yearGoal, monthlyChannelProfit }: Props) {
  const [growthMode, setGrowthMode] = useState<GrowthMode>('linear');
  const [missMode, setMissMode] = useState<MissMode>('redistribute');
  const [expanded, setExpanded] = useState(true);
  const [months, setMonths] = useState(() => makePlan(yearGoal, 'linear'));
  const [goalOverride, setGoalOverride] = useState<number | null>(null); // for reduce_goal mode
  const currentMonth = new Date().getMonth();

  // FIX 1: Sync months when yearGoal prop changes (user changes goal in Step 1)
  useEffect(() => {
    setGoalOverride(null);
    setMonths(prev => {
      // Preserve existing facts, only recalculate plans
      const hasFacts = prev.some(m => m.fact !== null);
      if (!hasFacts) return makePlan(yearGoal, growthMode);
      // If there are facts already, redistribute remaining from current month
      const doneFact = prev.slice(0, currentMonth).reduce((s, m) => s + (m.fact ?? m.plan), 0);
      const remaining = yearGoal - doneFact;
      const futurePlans = distributeAcross(Math.max(0, remaining), 12 - currentMonth, growthMode);
      return prev.map((m, i) =>
        i < currentMonth ? m : { ...m, plan: futurePlans[i - currentMonth] ?? m.plan }
      );
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yearGoal]);

  const applyMode = (mode: GrowthMode) => {
    setGrowthMode(mode);
    setGoalOverride(null);
    setMonths(prev => {
      const doneFact = prev.slice(0, currentMonth).reduce((s, m) => s + (m.fact ?? m.plan), 0);
      const remaining = yearGoal - doneFact;
      const futurePlans = distributeAcross(Math.max(0, remaining), 12 - currentMonth, mode);
      return prev.map((m, i) =>
        i < currentMonth ? m : { ...m, plan: futurePlans[i - currentMonth] ?? m.plan }
      );
    });
  };

  // FIX 2: Separate updateFact from any secondary state setter inside setMonths updater
  const updateFact = useCallback((idx: number, rawValue: string) => {
    const parsed = rawValue === '' ? null : parseFloat(rawValue);
    const value = (parsed !== null && !isNaN(parsed)) ? parsed : (rawValue === '' ? null : 0);

    setMonths(prev => {
      const updated = prev.map((m, i) => i === idx ? { ...m, fact: value } : m);
      if (value === null) return updated;

      const completedFact = updated.slice(0, idx + 1).reduce((s, m) => s + (m.fact ?? 0), 0);
      const completedPlan = updated.slice(0, idx + 1).reduce((s, m) => s + m.plan, 0);
      const gap = completedPlan - completedFact;
      const futureCount = 12 - (idx + 1);

      if (futureCount <= 0 || gap === 0) return updated;

      if (missMode === 'redistribute') {
        const currentFutureTotal = updated.slice(idx + 1).reduce((s, m) => s + m.plan, 0);
        const newFutureTotal = currentFutureTotal + gap;
        if (newFutureTotal > 0) {
          const newPlans = distributeAcross(newFutureTotal, futureCount, growthMode);
          return updated.map((m, i) =>
            i > idx ? { ...m, plan: newPlans[i - (idx + 1)] } : m
          );
        }
      }
      // reduce_goal: plans don't change, we just track the goal offset
      return updated;
    });

    // FIX 2b: For reduce_goal, update goalOverride outside setMonths
    if (missMode === 'reduce_goal' && value !== null) {
      setMonths(prev => {
        const completedFact = prev.map((m, i) => i === idx ? { ...m, fact: value } : m)
          .slice(0, idx + 1).reduce((s, m) => s + (m.fact ?? 0), 0);
        const completedPlan = prev.slice(0, idx + 1).reduce((s, m) => s + m.plan, 0);
        const gap = completedPlan - completedFact;
        setGoalOverride(yearGoal - gap);
        return prev;
      });
    }
  }, [missMode, growthMode, yearGoal]);

  const reset = () => {
    setGoalOverride(null);
    setMonths(makePlan(yearGoal, growthMode));
  };

  const effectiveGoal = goalOverride ?? yearGoal;

  const stats = useMemo(() => {
    const withFact = months.filter(m => m.fact !== null);
    const totalFact = withFact.reduce((s, m) => s + m.fact!, 0);
    const planForFact = withFact.reduce((s, m) => s + m.plan, 0);
    const pct = planForFact > 0 ? totalFact / planForFact : 1;
    const remaining = months.slice(currentMonth).reduce((s, m) => s + m.plan, 0);
    return { totalFact, pct, remaining };
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
            {formatRub(effectiveGoal, true)} / год
            {goalOverride !== null && goalOverride !== yearGoal && (
              <span style={{ color: 'var(--danger)', marginLeft: 4 }}>
                ({formatRub(goalOverride - yearGoal, true)})
              </span>
            )}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: stats.pct >= 1 ? 'var(--success)' : stats.pct >= 0.8 ? 'var(--warning)' : 'var(--danger)' }}>
            {months.some(m => m.fact !== null) ? `${(stats.pct * 100).toFixed(0)}% выполнено` : 'Введи факт'}
          </span>
          {expanded ? <ChevronUp size={14} style={{ color: 'var(--text3)' }} /> : <ChevronDown size={14} style={{ color: 'var(--text3)' }} />}
        </div>
      </div>

      {expanded && (
        <div style={{ padding: '20px' }}>
          {/* Controls */}
          <div style={{ display: 'flex', gap: 20, marginBottom: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Распределение</div>
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

            <div>
              <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>При невыполнении</div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => setMissMode('redistribute')} style={{
                  fontSize: 11, padding: '4px 10px', borderRadius: 6, cursor: 'pointer',
                  border: `1px solid ${missMode === 'redistribute' ? 'rgba(0,229,255,0.4)' : 'var(--border)'}`,
                  background: missMode === 'redistribute' ? 'rgba(0,229,255,0.1)' : 'var(--card)',
                  color: missMode === 'redistribute' ? 'var(--cyan)' : 'var(--text2)',
                  fontWeight: missMode === 'redistribute' ? 600 : 400,
                  display: 'flex', alignItems: 'center', gap: 5,
                }}>
                  <GitBranch size={11} /> Перераспределить
                </button>
                <button onClick={() => setMissMode('reduce_goal')} style={{
                  fontSize: 11, padding: '4px 10px', borderRadius: 6, cursor: 'pointer',
                  border: `1px solid ${missMode === 'reduce_goal' ? 'rgba(233,30,140,0.4)' : 'var(--border)'}`,
                  background: missMode === 'reduce_goal' ? 'rgba(233,30,140,0.08)' : 'var(--card)',
                  color: missMode === 'reduce_goal' ? 'var(--magenta)' : 'var(--text2)',
                  fontWeight: missMode === 'reduce_goal' ? 600 : 400,
                  display: 'flex', alignItems: 'center', gap: 5,
                }}>
                  <Target size={11} /> Снизить цель
                </button>
              </div>
            </div>

            <button onClick={reset} style={{
              fontSize: 11, padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border)',
              background: 'transparent', color: 'var(--text3)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto', alignSelf: 'flex-end',
            }}>
              <RotateCcw size={11} /> Сбросить
            </button>
          </div>

          {/* Hint */}
          <div style={{ fontSize: 11, color: 'var(--text3)', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 12px', marginBottom: 16, lineHeight: 1.5 }}>
            {missMode === 'redistribute'
              ? 'Недостача за месяц автоматически распределяется на будущие месяцы — годовая цель не меняется.'
              : 'Недостача за месяц вычитается из годовой цели — планы будущих месяцев не меняются.'}
          </div>

          {/* Summary */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
            {[
              { label: 'Годовая цель', value: formatRub(effectiveGoal, true), color: goalOverride !== null && goalOverride < yearGoal ? 'var(--danger)' : 'var(--cyan)' },
              { label: 'Факт (итого)', value: formatRub(stats.totalFact, true), color: stats.pct >= 1 ? 'var(--success)' : stats.pct >= 0.8 ? 'var(--warning)' : stats.totalFact > 0 ? 'var(--danger)' : 'var(--text3)' },
              { label: 'Остаток (план)', value: formatRub(stats.remaining, true), color: 'var(--text2)' },
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

                  <div style={{ width: '100%', height: 80, display: 'flex', alignItems: 'flex-end', position: 'relative' }}>
                    <div style={{ width: '100%', height: planH, background: 'rgba(255,255,255,0.08)', borderRadius: '3px 3px 0 0' }} />
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

                  <div style={{ fontSize: 8, color: 'var(--text3)', textAlign: 'center' }}>
                    {formatRub(m.plan, true)}
                  </div>

                  {i <= currentMonth && (
                    <input
                      type="number"
                      value={m.fact !== null ? m.fact : ''}
                      placeholder="факт"
                      onChange={e => updateFact(i, e.target.value)}
                      style={{
                        width: '100%', background: 'rgba(255,255,255,0.04)',
                        border: `1px solid ${hasFact ? barColor : 'var(--border)'}`,
                        borderRadius: 4, color: hasFact ? barColor : 'var(--text3)',
                        fontSize: 9, padding: '2px 4px', textAlign: 'center',
                        outline: 'none', fontFamily: 'Manrope, sans-serif',
                        MozAppearance: 'textfield',
                      } as React.CSSProperties}
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
              { color: 'var(--success)', label: '≥100%' },
              { color: 'var(--warning)', label: '80–99%' },
              { color: 'var(--danger)', label: '<80%' },
            ].map((l, i) => (
              <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: l.color, display: 'inline-block' }} />
                {l.label}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}