import type { FunnelStage } from '../types';
import { formatNum, formatRub } from '../utils';

interface Props {
  stages: FunnelStage[];
  color: string;
  bottleneck: string | null;
}

export function FunnelViz({ stages, color, bottleneck }: Props) {
  const volumeStages = stages.filter(s => !s.isConversion);
  const maxVal = volumeStages[0]?.value || 1;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {stages.map((stage, i) => {
        if (stage.isConversion) {
          const isWeak = bottleneck && stage.label.toLowerCase().includes(bottleneck.toLowerCase().split(' ')[0]);
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0 3px 12px' }}>
              <div style={{
                width: 1, height: 16, background: 'var(--border)', marginLeft: 8, flexShrink: 0,
              }} />
              <span style={{
                fontSize: 11, color: isWeak ? 'var(--warning)' : 'var(--text3)',
                display: 'flex', alignItems: 'center', gap: 4,
              }}>
                {isWeak && <span style={{ fontSize: 12, color: 'var(--warning)' }}>⚠️</span>}
                {stage.label}: <strong style={{ color: isWeak ? 'var(--warning)' : 'var(--text2)' }}>
                  {stage.value.toFixed(1)}{stage.unit}
                </strong>
              </span>
            </div>
          );
        }

        const pct = maxVal > 0 ? Math.max(8, (stage.value / maxVal) * 100) : 8;
        const isLast = stage.label === 'Клиенты' || stage.label === 'Выкупили' || (i === stages.length - 1);

        return (
          <div key={i} style={{ padding: '2px 0' }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              marginBottom: 3, fontSize: 11, color: 'var(--text3)',
            }}>
              <span style={{ fontWeight: isLast ? 600 : 400, color: isLast ? 'var(--text)' : 'var(--text2)' }}>
                {stage.label}
              </span>
              <span style={{ fontWeight: 600, color: isLast ? color : 'var(--text2)', fontSize: isLast ? 13 : 11 }}>
                {stage.unit === '₽' ? formatRub(stage.value) : formatNum(stage.value)}
                {stage.unit && stage.unit !== '₽' && stage.unit !== 'шт' ? ` ${stage.unit}` : ''}
              </span>
            </div>
            <div style={{ height: isLast ? 28 : 22, background: 'rgba(255,255,255,0.04)', borderRadius: 6, overflow: 'hidden' }}>
              <div style={{
                width: `${pct}%`,
                height: '100%',
                background: isLast
                  ? `linear-gradient(90deg, ${color}, ${color}cc)`
                  : `${color}44`,
                borderRadius: 6,
                transition: 'width 0.5s cubic-bezier(0.4,0,0.2,1)',
                minWidth: 4,
              }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
