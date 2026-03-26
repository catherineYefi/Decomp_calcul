import { useState, useMemo, useCallback, useRef } from 'react';
import { Target, TrendingUp, Zap, Download, RotateCcw, ChevronDown, ChevronUp, AlertTriangle, ArrowRight, BookOpen, BarChart2 } from 'lucide-react';
import type { ChannelId, ScenarioKey, ChannelScenarios } from './types';
import { CHANNELS, CHANNEL_MAP, getDefaultParams, applyScenario } from './channels';
import { ParameterInput } from './components/ParameterInput';
import { FunnelViz } from './components/FunnelViz';
import { MetricsGrid } from './components/MetricsGrid';
import { formatRub, formatNum } from './utils';
import { MonthlyPlan } from './components/MonthlyPlan';
import { ReverseCalcPanel } from './components/ReverseCalcPanel';
import './index.css';

const SCENARIO_META: { key: ScenarioKey; label: string }[] = [
  { key: 'pessimist', label: 'Пессимист' },
  { key: 'realist',   label: 'Реалист'   },
  { key: 'optimist',  label: 'Оптимист'  },
];

const WELCOME_STEPS = [
  {
    icon: Target,
    title: 'Декомпозитор целей',
    text: 'Инструмент ULTIMA для декомпозиции финансовой цели по каналам привлечения клиентов.',
  },
  {
    icon: BookOpen,
    title: 'Как это работает',
    text: 'Введи целевую прибыль → выбери 1–3 канала → заполни параметры. Калькулятор покажет сколько нужно показов, лидов и клиентов.',
  },
  {
    icon: BarChart2,
    title: 'Три сценария',
    text: 'Для каждого канала — пессимист, реалист, оптимист. Сравни результаты и найди слабое звено в воронке.',
  },
];

function WelcomeModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);
  const isLast = step === WELCOME_STEPS.length - 1;
  const { icon: Icon, title, text } = WELCOME_STEPS[step];

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(7,13,31,0.85)',
      backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }}>
      <div style={{
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(0,229,255,0.2)',
        borderRadius: 20,
        padding: '32px 32px 28px',
        width: '100%',
        maxWidth: 380,
        textAlign: 'center',
        boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
      }}>
        <div style={{
          width: 52, height: 52,
          borderRadius: 14,
          background: 'linear-gradient(135deg, #00e5ff22, #e91e8c22)',
          border: '1px solid rgba(0,229,255,0.25)',
          margin: '0 auto 18px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={22} style={{ color: '#00e5ff' }} />
        </div>

        <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 10, letterSpacing: '-0.02em' }}>
          {title}
        </div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.7, marginBottom: 24, minHeight: 56 }}>
          {text}
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 22 }}>
          {WELCOME_STEPS.map((_, i) => (
            <div key={i} onClick={() => setStep(i)} style={{
              height: 5, borderRadius: 3, cursor: 'pointer',
              width: i === step ? 20 : 6,
              background: i === step ? '#00e5ff' : 'rgba(255,255,255,0.15)',
              transition: 'all 0.2s',
            }} />
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          {!isLast && (
            <button
              onClick={onClose}
              className="btn btn-ghost"
              style={{ flex: 1, justifyContent: 'center', fontSize: 13 }}
            >
              Пропустить
            </button>
          )}
          <button
            onClick={() => isLast ? onClose() : setStep(s => s + 1)}
            className="btn btn-primary"
            style={{ flex: isLast ? 1 : 1.5, justifyContent: 'center', fontSize: 13 }}
          >
            {isLast ? 'Начать работу' : 'Далее'}
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}


const CHANNEL_INFO: Record<string, {
  description: string;
  bestFor: string[];
  funnel: string;
  typical: { label: string; value: string }[];
}> = {
  ppc: {
    description: 'Контекстная реклама в Яндекс Директ — объявления в поиске и на сайтах РСЯ. Платишь за клики.',
    bestFor: ['Услуги с понятным спросом', 'B2B и B2C', 'Быстрый старт за 1–3 дня'],
    funnel: 'Показы → Клики → Лиды → Клиенты',
    typical: [{ label: 'CTR', value: '2–6%' }, { label: 'Конв. сайта', value: '1–5%' }, { label: 'ROI', value: '100–400%' }],
  },
  targeting: {
    description: 'Таргетированная реклама в ВКонтакте, MyTarget. Работает на аудиторию по интересам и демографии.',
    bestFor: ['B2C продукты', 'Широкая аудитория', 'Визуальные ниши'],
    funnel: 'Показы → Клики → Лиды → Клиенты',
    typical: [{ label: 'CTR', value: '0.5–2%' }, { label: 'CPC', value: '15–80 ₽' }, { label: 'ROI', value: '50–200%' }],
  },
  reels: {
    description: 'Короткие видео в Instagram/YouTube Shorts/TikTok. Органический охват без рекламного бюджета.',
    bestFor: ['Личный бренд', 'EdTech и инфобизнес', 'Услуги с экспертностью'],
    funnel: 'Охват → Переходы → Лиды → Клиенты',
    typical: [{ label: '% переходов', value: '1–4%' }, { label: 'Конв. в лид', value: '3–8%' }, { label: 'ROI', value: '200–1000%' }],
  },
  telegram: {
    description: 'Telegram-канал как инструмент прогрева и продаж. Высокий органический охват, тёплая аудитория.',
    bestFor: ['Инфобизнес', 'B2B экспертиза', 'Долгосрочный прогрев'],
    funnel: 'Подписчики → Охват → Клики → Клиенты',
    typical: [{ label: 'Охват поста', value: '15–30%' }, { label: 'CTR', value: '2–7%' }, { label: 'ROI', value: '300–2000%' }],
  },
  seo: {
    description: 'SEO-продвижение сайта и карточки в Яндекс Картах. Долгосрочный органический трафик.',
    bestFor: ['Локальный бизнес', 'Интернет-магазины', 'Долгий горизонт'],
    funnel: 'Трафик → Лиды → Клиенты',
    typical: [{ label: 'Конв. сайта', value: '1–5%' }, { label: 'Конв. продажи', value: '15–30%' }, { label: 'ROI', value: '200–500%' }],
  },
  cold_calls: {
    description: 'Холодный обзвон базы потенциальных клиентов. Прямые продажи через менеджеров.',
    bestFor: ['B2B продажи', 'Производство', 'Оптовые поставки'],
    funnel: 'Звонки → Разговоры → Встречи → Сделки',
    typical: [{ label: 'Дозвон до ЛПР', value: '10–25%' }, { label: 'Конв. скрипта', value: '7–15%' }, { label: 'Конв. в сделку', value: '15–30%' }],
  },
  email: {
    description: 'Email-рассылка по собственной базе. Эффективна для реактивации и допродаж.',
    bestFor: ['Реактивация базы', 'B2B коммуникации', 'Инфобизнес'],
    funnel: 'База → Прочтения → Клики → Клиенты',
    typical: [{ label: 'Открываемость', value: '12–25%' }, { label: 'CTR', value: '2–6%' }, { label: 'ROI', value: '100–400%' }],
  },
  partners: {
    description: 'Партнёрская сеть — агенты и реферальные партнёры приводят клиентов за комиссию.',
    bestFor: ['Франшизы', 'B2B сервисы', 'Региональный рост'],
    funnel: 'Партнёры → Активные → Сделки → Клиенты',
    typical: [{ label: 'Активных', value: '25–50%' }, { label: 'Сделок/партнёр', value: '1–4/мес' }, { label: 'Комиссия', value: '10–25%' }],
  },
  marketplace: {
    description: 'Wildberries, Ozon и другие маркетплейсы. Платишь комиссию и логистику, получаешь готовый трафик.',
    bestFor: ['Физические товары', 'Масштабирование', 'e-commerce'],
    funnel: 'Показы → Заказы → Выкуп → Продажи',
    typical: [{ label: 'Выкуп', value: '55–80%' }, { label: 'Комиссия МП', value: '15–25%' }, { label: 'Маржа', value: '20–40%' }],
  },
  webinar: {
    description: 'Вебинарная воронка — регистрация → вебинар → продажа. Классика инфобизнеса.',
    bestFor: ['EdTech', 'Онлайн-курсы', 'Консалтинг'],
    funnel: 'Регистрации → Доходимость → Заявки → Продажи',
    typical: [{ label: 'Доходимость', value: '20–40%' }, { label: 'Конв. на вебе', value: '4–12%' }, { label: 'Конв. в оплату', value: '40–75%' }],
  },
  custom: {
    description: 'Любой канал с нестандартной воронкой. Задай свои названия этапов и конверсии.',
    bestFor: ['Нестандартные ниши', 'Сложные воронки', 'Любой бизнес'],
    funnel: 'Этап 1 → Этап 2 → Этап 3 → Клиенты',
    typical: [{ label: 'Гибкость', value: '100%' }, { label: 'Настройка', value: 'полная' }, { label: 'Ниши', value: 'все' }],
  },
};

function ChannelInfoPanel({ channelId, selectedIds }: { channelId: string | null; selectedIds: string[] }) {
  const info = channelId ? CHANNEL_INFO[channelId] : null;
  const ch = channelId ? CHANNEL_MAP[channelId] : null;
  const isSelected = channelId ? selectedIds.includes(channelId) : false;

  if (!info || !ch) {
    return (
      <div className="glass" style={{ padding: 20, minHeight: 200, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 12, textAlign: 'center' }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: 'rgba(0,229,255,0.06)',
          border: '1px solid rgba(0,229,255,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Zap size={18} style={{ color: 'rgba(0,229,255,0.4)' }} />
        </div>
        <div style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.6, maxWidth: 200 }}>
          Наведи на любой канал, чтобы узнать подробности
        </div>
        {selectedIds.length > 0 && (
          <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text3)' }}>
            Выбрано: <span style={{ color: 'var(--cyan)', fontWeight: 600 }}>{selectedIds.length} / 3</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="glass" style={{ padding: 20, transition: 'all 0.2s' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{
          width: 10, height: 10, borderRadius: '50%',
          background: ch.color, flexShrink: 0,
          boxShadow: `0 0 10px ${ch.color}80`,
        }} />
        <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{ch.name}</span>
        {isSelected && (
          <span style={{ marginLeft: 'auto', fontSize: 10, color: ch.color, background: `${ch.color}18`, border: `1px solid ${ch.color}40`, borderRadius: 4, padding: '1px 7px' }}>
            ✓ Выбран
          </span>
        )}
      </div>

      {/* Description */}
      <p style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.65, marginBottom: 14, margin: '0 0 14px' }}>
        {info.description}
      </p>

      {/* Funnel chain */}
      <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Воронка</div>
      <div style={{
        fontSize: 11, color: 'var(--text2)',
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid var(--border)',
        borderRadius: 8, padding: '8px 10px',
        marginBottom: 14,
        lineHeight: 1.5,
      }}>
        {info.funnel}
      </div>

      {/* Best for */}
      <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Подходит для</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 14 }}>
        {info.bestFor.map((item, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: 'var(--text2)' }}>
            <div style={{ width: 4, height: 4, borderRadius: '50%', background: ch.color, flexShrink: 0 }} />
            {item}
          </div>
        ))}
      </div>

      {/* Typical metrics */}
      <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Типичные показатели</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
        {info.typical.map((m, i) => (
          <div key={i} style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid var(--border)',
            borderRadius: 8, padding: '6px 8px', textAlign: 'center',
          }}>
            <div style={{ fontSize: 9, color: 'var(--text3)', marginBottom: 2 }}>{m.label}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: ch.color }}>{m.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function buildInitialScenarios(channelId: ChannelId): ChannelScenarios {
  const base = getDefaultParams(channelId);
  return {
    pessimist: applyScenario(base, 'pessimist'),
    realist:   { ...base },
    optimist:  applyScenario(base, 'optimist'),
  };
}

export default function App() {
  const [showWelcome, setShowWelcome] = useState(() => {
    try { return !localStorage.getItem('ultima_decomp_welcomed'); } catch { return true; }
  });

  const handleCloseWelcome = () => {
    try { localStorage.setItem('ultima_decomp_welcomed', '1'); } catch { /* ignore */ }
    setShowWelcome(false);
  };

  const [goal, setGoal] = useState<number>(1000000);
  const [selectedChannels, setSelectedChannels] = useState<ChannelId[]>(['ppc']);
  const [activeScenario, setActiveScenario] = useState<ScenarioKey>('realist');
  const [channelParams, setChannelParams] = useState<Record<string, ChannelScenarios>>(() => ({
    ppc: buildInitialScenarios('ppc'),
  }));
  // First channel open, rest collapsed by default
  const [expandedChannels, setExpandedChannels] = useState<Record<string, boolean>>({ ppc: true });
  const [activeChannelScenario, setActiveChannelScenario] = useState<Record<string, ScenarioKey>>({});
  const [hoveredChannel, setHoveredChannel] = useState<ChannelId | null>(null);
  const [channelMode, setChannelMode] = useState<Record<string, 'forecast' | 'from_goal'>>({});
  const printRef = useRef<HTMLDivElement>(null);

  const toggleChannel = useCallback((id: ChannelId) => {
    setSelectedChannels(prev => {
      if (prev.includes(id)) {
        if (prev.length === 1) return prev;
        return prev.filter(c => c !== id);
      }
      if (prev.length >= 3) return prev;
      const next = [...prev, id];
      setChannelParams(p => ({
        ...p,
        [id]: p[id] || buildInitialScenarios(id),
      }));
      // New channels start collapsed
      setExpandedChannels(e => ({ ...e, [id]: false }));
      return next;
    });
  }, []);

  const updateParam = useCallback((channelId: string, scenario: ScenarioKey, paramId: string, value: number) => {
    setChannelParams(prev => ({
      ...prev,
      [channelId]: {
        ...prev[channelId],
        [scenario]: {
          ...prev[channelId]?.[scenario],
          [paramId]: value,
        },
      },
    }));
  }, []);

  const getChannelScenario = (chId: string): ScenarioKey =>
    activeChannelScenario[chId] ?? activeScenario;

  const results = useMemo(() => {
    return selectedChannels.map(chId => {
      const chDef = CHANNEL_MAP[chId];
      const sc = getChannelScenario(chId);
      const params = channelParams[chId]?.[sc] || getDefaultParams(chId);
      return { chId, chDef, result: chDef.calculate(params), scenario: sc };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChannels, channelParams, activeScenario, activeChannelScenario]);

  const totalNetProfit = results.reduce((sum, r) => sum + r.result.netProfit, 0);
  const goalProgress = goal > 0 ? Math.min(100, (totalNetProfit / goal) * 100) : 0;
  const goalReached = totalNetProfit >= goal;

  const handleExport = async () => {
    const el = printRef.current;
    if (!el) return;
    try {
      const html2canvas = (await import('html2canvas')).default;
      const jsPDF = (await import('jspdf')).default;
      const canvas = await html2canvas(el, { backgroundColor: '#070d1f', scale: 1.5, useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = (canvas.height * pdfW) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfW, pdfH);
      pdf.save('ULTIMA-декомпозиция.pdf');
    } catch (e) {
      console.error('Export error', e);
      alert('Не удалось экспортировать. Попробуйте ещё раз.');
    }
  };

  const categorizedChannels = [
    { label: 'Платный трафик', ids: ['ppc', 'targeting'] as ChannelId[] },
    { label: 'Органика / контент', ids: ['reels', 'telegram', 'seo'] as ChannelId[] },
    { label: 'Прямые продажи', ids: ['cold_calls', 'email', 'partners'] as ChannelId[] },
    { label: 'Специализированные', ids: ['marketplace', 'webinar', 'custom'] as ChannelId[] },
  ];

  return (
    <div style={{ minHeight: '100vh', padding: '0 0 60px' }}>
      {showWelcome && <WelcomeModal onClose={handleCloseWelcome} />}

      {/* HEADER */}
      <header style={{
        padding: '16px 24px',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'rgba(7,13,31,0.9)',
        backdropFilter: 'blur(12px)',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'linear-gradient(135deg, var(--cyan), var(--magenta))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Target size={16} color="#000" />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, letterSpacing: '-0.02em' }}>
              <span className="grad-text">Декомпозитор целей</span>
            </div>
            <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: -1 }}>ULTIMA · Нечто</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            className="btn btn-ghost"
            onClick={() => setShowWelcome(true)}
            style={{ fontSize: 12, padding: '6px 14px' }}
            title="Показать инструкцию"
          >
            <BookOpen size={13} /> Инструкция
          </button>
          <button className="btn btn-ghost" onClick={handleExport} style={{ fontSize: 12, padding: '6px 14px' }}>
            <Download size={13} /> PDF
          </button>
        </div>
      </header>

      <div ref={printRef} style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px 0' }}>

        {/* ── SECTION 1: GOAL ─────────────────────────────────────────────── */}
        <section style={{ marginBottom: 40 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 24 }}>
            <div style={{ flex: '1 1 320px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Target size={16} style={{ color: 'var(--cyan)' }} />
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--cyan)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Шаг 1 — Цель</span>
              </div>
              <h1 style={{ fontSize: 28, fontWeight: 800, margin: '0 0 6px', letterSpacing: '-0.03em', lineHeight: 1.2 }}>
                Сколько хочешь<br />
                <span className="grad-text">зарабатывать в месяц?</span>
              </h1>
              <p style={{ fontSize: 13, color: 'var(--text2)', margin: '0 0 20px', maxWidth: 420 }}>
                Введи целевую чистую прибыль. Ниже выбери каналы и заполни параметры — всё посчитается автоматически.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 0, maxWidth: 340 }}>
                <input
                  className="inp"
                  type="number"
                  min={0}
                  step={100000}
                  value={goal}
                  onChange={e => setGoal(Number(e.target.value))}
                  style={{ fontSize: 22, fontWeight: 700, paddingRight: 40, height: 56, borderRadius: '10px 0 0 10px', borderRight: 'none' }}
                />
                <div style={{
                  height: 56, padding: '0 16px', display: 'flex', alignItems: 'center',
                  background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)',
                  borderLeft: 'none', borderRadius: '0 10px 10px 0',
                  fontSize: 16, fontWeight: 700, color: 'var(--text2)',
                }}>₽</div>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 8 }}>
                = {formatRub(goal * 12, true)} / год
              </div>
            </div>

            {/* Live summary card */}
            <div className="glass" style={{ flex: '0 0 280px', padding: 20 }}>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Итоговый результат
              </div>
              <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em', color: goalReached ? 'var(--success)' : totalNetProfit > 0 ? 'var(--warning)' : 'var(--danger)' }}>
                {formatRub(totalNetProfit, true)}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 14 }}>
                чистой прибыли по всем каналам
              </div>
              <div className="progress-track" style={{ marginBottom: 8 }}>
                <div className="progress-fill" style={{
                  width: `${Math.max(0, Math.min(100, goalProgress))}%`,
                  background: goalReached
                    ? 'linear-gradient(90deg, var(--success), #69f0ae)'
                    : goalProgress > 60
                    ? 'linear-gradient(90deg, var(--warning), #ffcc02)'
                    : 'linear-gradient(90deg, var(--cyan), var(--magenta))',
                }} />
              </div>
              <div style={{ fontSize: 11, color: 'var(--text2)', display: 'flex', justifyContent: 'space-between' }}>
                <span>{goalProgress.toFixed(0)}% от цели</span>
                {!goalReached && goal > 0 && (
                  <span style={{ color: 'var(--danger)' }}>−{formatRub(goal - totalNetProfit, true)}</span>
                )}
                {goalReached && <span style={{ color: 'var(--success)' }}>✓ Достигнута!</span>}
              </div>
              {results.length > 0 && (
                <div style={{ marginTop: 14, borderTop: '1px solid var(--border)', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {results.map(({ chId, chDef, result }) => (
                    <div key={chId} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: chDef.color, display: 'inline-block', flexShrink: 0 }} />
                        <span style={{ color: 'var(--text2)' }}>{chDef.shortName}</span>
                      </span>
                      <span style={{ fontWeight: 600, color: result.netProfit >= 0 ? 'var(--text)' : 'var(--danger)' }}>
                        {formatRub(result.netProfit, true)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ── SECTION 2: CHANNEL PICKER ─────────────────────────────────── */}
        <section style={{ marginBottom: 40 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Zap size={16} style={{ color: 'var(--cyan)' }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--cyan)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Шаг 2 — Каналы</span>
            <span style={{ fontSize: 11, color: 'var(--text3)' }}>Выбери до 3 каналов</span>
          </div>

          <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
            {/* LEFT: channel buttons */}
            <div style={{ flex: '1 1 0', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {categorizedChannels.map(cat => (
                <div key={cat.label}>
                  <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                    {cat.label}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {cat.ids.map(chId => {
                      const ch = CHANNEL_MAP[chId];
                      const isSelected = selectedChannels.includes(chId);
                      const isDisabled = !isSelected && selectedChannels.length >= 3;
                      return (
                        <button
                          key={chId}
                          className={`ch-btn ${isSelected ? 'selected' : ''}`}
                          onClick={() => toggleChannel(chId)}
                          onMouseEnter={() => setHoveredChannel(chId)}
                          onMouseLeave={() => setHoveredChannel(null)}
                          disabled={isDisabled}
                          style={{
                            borderColor: isSelected ? ch.color : undefined,
                            opacity: isDisabled ? 0.4 : 1,
                            cursor: isDisabled ? 'not-allowed' : 'pointer',
                            minWidth: 110,
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: ch.color, flexShrink: 0 }} />
                            <span style={{ fontSize: 12, fontWeight: 600, color: isSelected ? 'var(--text)' : 'var(--text2)' }}>
                              {ch.shortName}
                            </span>
                          </div>
                          {isSelected && (
                            <span style={{ fontSize: 10, color: ch.color }}>✓ Выбран</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* RIGHT: channel info panel */}
            <div style={{ flex: '0 0 272px', position: 'sticky', top: 80 }}>
              <ChannelInfoPanel channelId={hoveredChannel} selectedIds={selectedChannels} />
            </div>
          </div>
        </section>

        {/* ── SECTION 3: GLOBAL SCENARIO ────────────────────────────────── */}
        <section style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <TrendingUp size={16} style={{ color: 'var(--cyan)' }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--cyan)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Сценарий по умолчанию</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {SCENARIO_META.map(sc => (
              <button
                key={sc.key}
                className={`stab ${activeScenario === sc.key ? `active-${sc.key}` : 'inactive'}`}
                onClick={() => setActiveScenario(sc.key)}
              >
                {sc.label}
              </button>
            ))}
            <button
              className="btn btn-ghost"
              style={{ fontSize: 11, padding: '4px 12px', marginLeft: 'auto' }}
              onClick={() => {
                setChannelParams(Object.fromEntries(
                  selectedChannels.map(id => [id, buildInitialScenarios(id)])
                ));
              }}
            >
              <RotateCcw size={12} /> Сбросить
            </button>
          </div>
        </section>

        {/* ── SECTION 3.5: MONTHLY PLAN ────────────────────────────────── */}
        <MonthlyPlan
          yearGoal={goal * 12}
          monthlyChannelProfit={totalNetProfit}
        />

        {/* ── SECTION 4: CHANNEL CARDS ──────────────────────────────────── */}
        {selectedChannels.length === 0 ? (
          <div className="glass" style={{ padding: 40, textAlign: 'center', color: 'var(--text3)' }}>
            Выбери хотя бы один канал выше ↑
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 40 }}>
            {results.map(({ chId, chDef, result }) => {
              const sc = getChannelScenario(chId);
              const isExpanded = expandedChannels[chId] ?? false;
              const params = channelParams[chId]?.[sc] || getDefaultParams(chId);

              return (
                <div key={chId} className="glass" style={{ overflow: 'hidden' }}>
                  {/* Card header — always visible */}
                  <div
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '14px 20px', cursor: 'pointer',
                      borderBottom: isExpanded ? '1px solid var(--border)' : 'none',
                      transition: 'background 0.15s',
                    }}
                    onClick={() => setExpandedChannels(e => ({ ...e, [chId]: !e[chId] }))}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 10, height: 10, borderRadius: '50%',
                        background: chDef.color,
                        boxShadow: `0 0 8px ${chDef.color}80`,
                      }} />
                      <span style={{ fontWeight: 700, fontSize: 14 }}>{chDef.name}</span>
                      {result.bottleneck && (
                        <span style={{
                          display: 'flex', alignItems: 'center', gap: 4,
                          fontSize: 10, color: 'var(--warning)',
                          background: 'rgba(255,179,0,0.1)',
                          border: '1px solid rgba(255,179,0,0.3)',
                          borderRadius: 4, padding: '1px 7px',
                        }}>
                          <AlertTriangle size={10} /> Слабое звено
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      {/* Mini metrics always visible */}
                      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 10, color: 'var(--text3)' }}>клиентов</div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{formatNum(result.clients)}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 10, color: 'var(--text3)' }}>прибыль</div>
                          <div style={{ fontSize: 15, fontWeight: 800, color: result.netProfit >= 0 ? chDef.color : 'var(--danger)' }}>
                            {formatRub(result.netProfit, true)}
                          </div>
                        </div>
                      </div>
                      <div style={{ color: 'var(--text3)', transition: 'transform 0.2s', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                        <ChevronDown size={15} />
                      </div>
                    </div>
                  </div>

                  {/* Expanded content */}
                  {isExpanded && (
                    <div style={{ padding: '20px' }}>
                      {/* Mode toggle + Scenario tabs */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                        {/* Forecast / From goal switch */}
                        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: 8, padding: 2, gap: 2 }}>
                          {(['forecast', 'from_goal'] as const).map(m => (
                            <button
                              key={m}
                              onClick={e => { e.stopPropagation(); setChannelMode(prev => ({ ...prev, [chId]: m })); }}
                              style={{
                                fontSize: 11, padding: '4px 12px', borderRadius: 6,
                                cursor: 'pointer', border: 'none',
                                background: (channelMode[chId] ?? 'forecast') === m
                                  ? m === 'from_goal' ? chDef.color : 'rgba(255,255,255,0.12)'
                                  : 'transparent',
                                color: (channelMode[chId] ?? 'forecast') === m
                                  ? m === 'from_goal' ? '#000' : 'var(--text)'
                                  : 'var(--text3)',
                                fontWeight: (channelMode[chId] ?? 'forecast') === m ? 700 : 400,
                                transition: 'all 0.15s',
                              }}
                            >
                              {m === 'forecast' ? 'Прогноз' : 'От цели'}
                            </button>
                          ))}
                        </div>

                        {/* Scenario tabs — only in forecast mode */}
                        {(channelMode[chId] ?? 'forecast') === 'forecast' && SCENARIO_META.map(s => (
                          <button
                            key={s.key}
                            className={`stab ${sc === s.key ? `active-${s.key}` : 'inactive'}`}
                            onClick={e => {
                              e.stopPropagation();
                              setActiveChannelScenario(prev => ({ ...prev, [chId]: s.key }));
                            }}
                          >
                            {s.label}
                          </button>
                        ))}
                      </div>

                      {/* Content based on mode */}
                      {(channelMode[chId] ?? 'forecast') === 'from_goal' ? (
                        <ReverseCalcPanel
                          chDef={chDef}
                          params={params}
                          onParamChange={(id, val) => updateParam(chId, sc, id, val)}
                          monthGoal={goal}
                        />
                      ) : (
                        <>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                            {/* LEFT: Parameters */}
                            <div>
                              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
                                Параметры
                              </div>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                {chDef.params.filter(p => p.isInput).map(param => (
                                  <ParameterInput
                                    key={param.id}
                                    param={param}
                                    value={params[param.id] ?? param.defaultValue}
                                    onChange={(id, val) => updateParam(chId, sc, id, val)}
                                  />
                                ))}
                              </div>
                            </div>

                            {/* RIGHT: Funnel */}
                            <div>
                              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
                                Воронка
                              </div>
                              <FunnelViz
                                stages={result.funnel}
                                color={chDef.color}
                                bottleneck={result.bottleneck}
                              />
                              {result.bottleneck && (
                                <div style={{
                                  marginTop: 10, padding: '8px 12px',
                                  background: 'rgba(255,179,0,0.08)',
                                  border: '1px solid rgba(255,179,0,0.25)',
                                  borderRadius: 8, fontSize: 11, color: 'var(--warning)',
                                  display: 'flex', alignItems: 'flex-start', gap: 6,
                                }}>
                                  <AlertTriangle size={12} style={{ flexShrink: 0, marginTop: 1 }} />
                                  <span>Слабое звено: <strong>{result.bottleneck}</strong>. Улучшение этого показателя даст наибольший прирост.</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Metrics row */}
                          <MetricsGrid
                            result={result}
                            color={chDef.color}
                            isMarketplace={chId === 'marketplace'}
                          />
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── SECTION 5: SUMMARY ───────────────────────────────────────── */}
        {results.length > 1 && (
          <section style={{ marginBottom: 40 }}>
            <div className="glass" style={{ padding: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--cyan)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>
                Сводка по всем каналам
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 20 }}>
                {[
                  { label: 'Суммарная выручка', value: formatRub(results.reduce((s, r) => s + r.result.revenue, 0), true) },
                  { label: 'Суммарные расходы', value: formatRub(results.reduce((s, r) => s + r.result.cost, 0), true) },
                  { label: 'Суммарная прибыль', value: formatRub(totalNetProfit, true), highlight: true },
                  { label: 'Всего клиентов', value: formatNum(results.reduce((s, r) => s + r.result.clients, 0)) },
                ].map((m, i) => (
                  <div key={i} style={{
                    background: m.highlight ? 'rgba(0,229,255,0.08)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${m.highlight ? 'rgba(0,229,255,0.25)' : 'var(--border)'}`,
                    borderRadius: 12, padding: '12px 16px',
                  }}>
                    <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>{m.label}</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: m.highlight ? 'var(--cyan)' : 'var(--text)' }}>{m.value}</div>
                  </div>
                ))}
              </div>

              <div style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12 }}>
                  <span style={{ color: 'var(--text2)' }}>Прогресс к цели {formatRub(goal, true)}</span>
                  <span style={{ fontWeight: 700, color: goalReached ? 'var(--success)' : 'var(--text)' }}>
                    {goalProgress.toFixed(0)}%
                    {goalReached ? ' ✓ Достигнута!' : ` (−${formatRub(goal - totalNetProfit, true)})`}
                  </span>
                </div>
                <div className="progress-track" style={{ height: 10 }}>
                  <div className="progress-fill" style={{
                    width: `${Math.max(0, Math.min(100, goalProgress))}%`,
                    background: goalReached
                      ? 'linear-gradient(90deg, var(--success), #69f0ae)'
                      : 'linear-gradient(90deg, var(--cyan), var(--magenta))',
                  }} />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {results.map(({ chId, chDef, result }) => {
                  const maxProfit = Math.max(...results.map(r => Math.abs(r.result.netProfit)), 1);
                  const pct = Math.max(0, (result.netProfit / maxProfit) * 100);
                  return (
                    <div key={chId} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: 11, color: 'var(--text2)', width: 90, flexShrink: 0 }}>{chDef.shortName}</span>
                      <div style={{ flex: 1, height: 20, background: 'rgba(255,255,255,0.04)', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', width: `${pct}%`,
                          background: result.netProfit < 0 ? 'var(--danger)' : chDef.color,
                          borderRadius: 4, transition: 'width 0.5s ease',
                          display: 'flex', alignItems: 'center', paddingLeft: 8,
                          fontSize: 10, fontWeight: 600, color: 'rgba(0,0,0,0.8)',
                          whiteSpace: 'nowrap',
                        }}>
                          {pct > 25 ? formatRub(result.netProfit, true) : ''}
                        </div>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, width: 90, textAlign: 'right', color: result.netProfit >= 0 ? 'var(--text)' : 'var(--danger)' }}>
                        {formatRub(result.netProfit, true)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--text3)', paddingBottom: 20 }}>
          ULTIMA · Декомпозитор целей · Расчёты являются прогнозными
        </div>
      </div>
    </div>
  );
}