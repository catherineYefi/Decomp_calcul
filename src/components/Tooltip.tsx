import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { HelpCircle } from 'lucide-react';

interface TooltipProps {
  range?: string;
  typical?: string;
  hint: string;
}

export function Tooltip({ range, typical, hint }: TooltipProps) {
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (show && ref.current) {
      const r = ref.current.getBoundingClientRect();
      setPos({
        top: r.top + window.scrollY - 8,
        left: r.left + r.width / 2 + window.scrollX,
      });
    }
  }, [show]);

  const tooltip = show ? createPortal(
    <div style={{
      position: 'absolute',
      top: pos.top,
      left: pos.left,
      transform: 'translate(-50%, -100%)',
      background: '#1a2544',
      border: '1px solid rgba(0,229,255,0.25)',
      borderRadius: 10,
      padding: '10px 14px',
      width: 240,
      fontSize: 12,
      color: 'rgba(255,255,255,0.65)',
      lineHeight: 1.6,
      zIndex: 99999,
      pointerEvents: 'none',
      whiteSpace: 'normal',
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
    }}>
      <div style={{ marginBottom: range || typical ? 6 : 0 }}>{hint}</div>
      {(range || typical) && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 6, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {range && (
            <span style={{ color: 'rgba(255,255,255,0.35)' }}>
              Диапазон: <span style={{ color: 'rgba(255,255,255,0.65)' }}>{range}</span>
            </span>
          )}
          {typical && (
            <span style={{ color: 'rgba(255,255,255,0.35)' }}>
              Типично: <span style={{ color: '#00e5ff', fontWeight: 600 }}>{typical}</span>
            </span>
          )}
        </div>
      )}
      <div style={{
        position: 'absolute',
        top: '100%',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 0, height: 0,
        borderLeft: '6px solid transparent',
        borderRight: '6px solid transparent',
        borderTop: '6px solid rgba(0,229,255,0.25)',
      }} />
    </div>,
    document.body
  ) : null;

  return (
    <span
      ref={ref}
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', cursor: 'help', marginLeft: 4 }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <HelpCircle size={13} style={{ color: 'rgba(255,255,255,0.3)', flexShrink: 0 }} />
      {tooltip}
    </span>
  );
}
