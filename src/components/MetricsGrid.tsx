import type { ChannelResult } from '../types';
import { formatRub, formatNum, formatRoi, roiClass } from '../utils';

interface Props {
  result: ChannelResult;
  color: string;
  isMarketplace?: boolean;
}

export function MetricsGrid({ result, color, isMarketplace }: Props) {
  const metrics = isMarketplace
    ? [
        { label: 'Покупки', value: formatNum(result.clients), sub: '' },
        { label: 'Выручка', value: formatRub(result.revenue, true), sub: '' },
        { label: 'Все расходы', value: formatRub(result.cost, true), sub: '' },
        { label: 'Чистая прибыль', value: formatRub(result.netProfit, true), sub: '', highlight: true },
        { label: 'CAC', value: formatRub(result.cac, true), sub: '' },
        { label: 'ROI', value: formatRoi(result.roi), sub: '', roiVal: result.roi },
      ]
    : [
        { label: 'Клиентов', value: formatNum(result.clients), sub: '' },
        { label: 'Выручка', value: formatRub(result.revenue, true), sub: '' },
        { label: 'Расходы', value: formatRub(result.cost, true), sub: '' },
        { label: 'Чистая прибыль', value: formatRub(result.netProfit, true), sub: '', highlight: true },
        { label: 'Цена лида (CPL)', value: result.cpl > 0 ? formatRub(result.cpl) : '—', sub: '' },
        { label: 'Цена клиента (CAC)', value: formatRub(result.cac), sub: '' },
        { label: 'ROI', value: formatRoi(result.roi), sub: '', roiVal: result.roi },
      ];

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
      gap: 8,
      marginTop: 12,
    }}>
      {metrics.map((m, i) => (
        <div key={i} style={{
          background: m.highlight ? `${color}18` : 'rgba(255,255,255,0.03)',
          border: `1px solid ${m.highlight ? `${color}44` : 'var(--border)'}`,
          borderRadius: 10,
          padding: '8px 10px',
        }}>
          <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 3, lineHeight: 1.2 }}>{m.label}</div>
          <div style={{
            fontSize: 13, fontWeight: 700,
            color: m.highlight ? color : m.roiVal !== undefined ? `var(--${roiClass(m.roiVal).replace('roi-', '')})` === 'var(--positive)' ? 'var(--success)' : m.roiVal >= 0 ? 'var(--warning)' : 'var(--danger)' : 'var(--text)',
            ...(m.highlight ? { color } : {}),
            ...(m.roiVal !== undefined ? { color: m.roiVal >= 1 ? 'var(--success)' : m.roiVal >= 0 ? 'var(--warning)' : 'var(--danger)' } : {}),
          }}>
            {m.value}
          </div>
        </div>
      ))}
    </div>
  );
}
