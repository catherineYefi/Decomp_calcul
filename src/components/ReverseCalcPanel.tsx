import { useState } from 'react';
import { Target, AlertTriangle, ArrowRight } from 'lucide-react';
import type { ChannelDef } from '../types';
import { ParameterInput } from './ParameterInput';
import { formatRub, formatNum } from '../utils';

interface Props {
  chDef: ChannelDef;
  params: Record<string, number>;
  onParamChange: (id: string, val: number) => void;
  monthGoal: number;
}

// Params that drive conversions (not volume inputs) — used in reverse mode
const CONVERSION_PARAM_IDS = new Set([
  'ctr', 'site_conv', 'sale_conv', 'click_rate', 'lead_conv', 'reach_rate',
  'open_rate', 'contact_rate', 'script_conv', 'close_rate', 'active_rate',
  'payment_conv', 'show_rate', 'webinar_conv', 'buyout_rate',
  'conv1', 'conv2', 'conv3',
  'avg_check', 'margin', 'cpc', 'cost_per_call', 'cost_per_email',
  'commission_rate', 'deals_per_active', 'cogs_rate', 'mp_commission',
  'logistics_per_order', 'ads_budget', 'production_cost', 'monthly_cost',
  'platform_cost', 'traffic_cost', 'ad_cost',
]);

export function ReverseCalcPanel({ chDef, params, onParamChange, monthGoal }: Props) {
  const [targetProfit, setTargetProfit] = useState(monthGoal);

  const result = chDef.reverseCalc(targetProfit, params);

  // Only show conversion/price params — not volume inputs
  const conversionParams = chDef.params.filter(p => CONVERSION_PARAM_IDS.has(p.id));

  return (
    <div>
      {/* Target profit input */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
          Целевая чистая прибыль
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, maxWidth: 260 }}>
          <input
            className="inp"
            type="number"
            min={1}
            step={50000}
            value={targetProfit}
            onChange={e => setTargetProfit(Number(e.target.value) || 0)}
            style={{ fontSize: 18, fontWeight: 700, height: 44, borderRadius: '8px 0 0 8px', borderRight: 'none', paddingRight: 8 }}
          />
          <div style={{
            height: 44, padding: '0 12px', display: 'flex', alignItems: 'center',
            background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)',
            borderLeft: 'none', borderRadius: '0 8px 8px 0',
            fontSize: 13, color: 'var(--text3)',
          }}>₽ / мес</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* LEFT: Conversion params to tune */}
        <div>
          <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
            Параметры конверсий
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {conversionParams.map(param => (
              <ParameterInput
                key={param.id}
                param={param}
                value={params[param.id] ?? param.defaultValue}
                onChange={onParamChange}
              />
            ))}
          </div>
        </div>

        {/* RIGHT: What you need to achieve */}
        <div>
          <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
            Нужно обеспечить
          </div>

          {!result.feasible ? (
            <div style={{
              padding: '12px 14px', background: 'rgba(255,82,82,0.08)',
              border: '1px solid rgba(255,82,82,0.25)', borderRadius: 10,
              display: 'flex', gap: 8, alignItems: 'flex-start',
            }}>
              <AlertTriangle size={14} style={{ color: 'var(--danger)', flexShrink: 0, marginTop: 1 }} />
              <div style={{ fontSize: 12, color: 'var(--danger)', lineHeight: 1.6 }}>
                {result.warning}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {result.items.map((item, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: item.isKey ? '10px 14px' : '7px 14px',
                  background: item.isKey ? `${chDef.color}15` : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${item.isKey ? `${chDef.color}40` : 'var(--border)'}`,
                  borderRadius: 8,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {item.isKey && <ArrowRight size={12} style={{ color: chDef.color, flexShrink: 0 }} />}
                    <span style={{
                      fontSize: item.isKey ? 12 : 11,
                      color: item.isKey ? 'var(--text)' : 'var(--text2)',
                      fontWeight: item.isKey ? 600 : 400,
                    }}>
                      {item.label}
                    </span>
                  </div>
                  <span style={{
                    fontSize: item.isKey ? 15 : 12,
                    fontWeight: item.isKey ? 800 : 600,
                    color: item.isKey ? chDef.color : 'var(--text)',
                  }}>
                    {item.unit === '₽'
                      ? formatRub(item.value)
                      : `${formatNum(item.value)} ${item.unit}`}
                  </span>
                </div>
              ))}

              {/* Summary: достижимо? */}
              <div style={{
                marginTop: 6, padding: '8px 12px',
                background: 'rgba(0,229,255,0.05)',
                border: '1px solid rgba(0,229,255,0.15)',
                borderRadius: 8, fontSize: 11, color: 'var(--text3)', lineHeight: 1.5,
              }}>
                <Target size={11} style={{ color: 'var(--cyan)', marginRight: 5, verticalAlign: 'middle' }} />
                Целевая прибыль <span style={{ color: 'var(--cyan)', fontWeight: 700 }}>{formatRub(targetProfit)}</span> — 
                это операционная задача: обеспечить выделенный объём при текущих конверсиях.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}