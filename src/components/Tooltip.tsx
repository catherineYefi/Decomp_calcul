import { useState } from 'react';
import { HelpCircle } from 'lucide-react';

interface TooltipProps {
  range?: string;
  typical?: string;
  hint: string;
}

export function Tooltip({ range, typical, hint }: TooltipProps) {
  const [show, setShow] = useState(false);

  return (
    <span
      className="tooltip-wrap"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      style={{ cursor: 'help', marginLeft: 4 }}
    >
      <HelpCircle size={13} style={{ color: 'var(--text3)', flexShrink: 0 }} />
      {show && (
        <div className="tooltip-box">
          <div style={{ marginBottom: hint && (range || typical) ? 6 : 0 }}>{hint}</div>
          {range && (
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 4, borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 6 }}>
              <span style={{ color: 'var(--text3)' }}>Диапазон: <span style={{ color: 'var(--text2)' }}>{range}</span></span>
            </div>
          )}
          {typical && (
            <div style={{ marginTop: 2 }}>
              <span style={{ color: 'var(--text3)' }}>Типично: <span style={{ color: 'var(--cyan)', fontWeight: 600 }}>{typical}</span></span>
            </div>
          )}
        </div>
      )}
    </span>
  );
}
