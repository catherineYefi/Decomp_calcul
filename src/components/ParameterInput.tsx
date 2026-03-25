import type { ParamDef } from '../types';
import { Tooltip } from './Tooltip';

interface Props {
  param: ParamDef;
  value: number;
  onChange: (id: string, val: number) => void;
}

export function ParameterInput({ param, value, onChange }: Props) {
  const handleChange = (raw: string) => {
    const n = parseFloat(raw.replace(',', '.'));
    if (!isNaN(n)) onChange(param.id, n);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 2, fontSize: 11, color: 'var(--text3)', fontWeight: 500 }}>
        <span>{param.label}</span>
        {param.benchmark && (
          <Tooltip
            hint={param.benchmark.hint}
            range={param.benchmark.range}
            typical={param.benchmark.typical}
          />
        )}
      </div>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <input
          className="inp"
          type="number"
          min={param.min}
          max={param.max}
          step={param.step ?? 1}
          value={value}
          onChange={e => handleChange(e.target.value)}
          style={{ paddingRight: param.unit ? 36 : 12 }}
        />
        {param.unit && (
          <span style={{
            position: 'absolute', right: 10, fontSize: 12,
            color: 'var(--text3)', pointerEvents: 'none',
          }}>
            {param.unit}
          </span>
        )}
      </div>
    </div>
  );
}
