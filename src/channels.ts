import type { ChannelDef, ChannelResult, ParamDef } from './types';

const fmt = (n: number) => Math.round(n);

function safeDiv(a: number, b: number) { return b === 0 ? 0 : a / b; }

function baseResult(): ChannelResult {
  return { funnel: [], leads: 0, clients: 0, revenue: 0, cost: 0, grossProfit: 0, netProfit: 0, cpl: 0, cac: 0, roi: 0, bottleneck: null, valid: false };
}

function checkBottleneck(conversions: Array<{ label: string; value: number; benchmark: number }>): string | null {
  let worst: { label: string; ratio: number } | null = null;
  for (const c of conversions) {
    if (c.benchmark > 0) {
      const ratio = c.value / c.benchmark;
      if (!worst || ratio < worst.ratio) worst = { label: c.label, ratio };
    }
  }
  if (worst && worst.ratio < 0.5) return worst.label;
  return null;
}

const COMMON_PARAMS: ParamDef[] = [
  {
    id: 'avg_check', label: 'Средний чек', unit: '₽', min: 100, step: 500, defaultValue: 50000, isInput: true,
    benchmark: { range: '5 000–5 000 000 ₽', typical: 'зависит от ниши', hint: 'Средняя сумма одной сделки / покупки.' },
  },
  {
    id: 'margin', label: 'Маржинальность', unit: '%', min: 1, max: 100, step: 1, defaultValue: 70, isInput: true,
    benchmark: { range: '20–90%', typical: '40–70%', hint: 'Чистая маржа без учёта рекламных расходов. Услуги: 60–80%, производство: 20–40%.' },
  },
];

// ─── PPC / Яндекс Директ ─────────────────────────────────────────────────────
const ppcCalc = (p: Record<string, number>): ChannelResult => {
  const clicks = fmt(p.impressions * p.ctr / 100);
  const cost = fmt(clicks * p.cpc);
  const leads = fmt(clicks * p.site_conv / 100);
  const clients = fmt(leads * p.sale_conv / 100);
  const revenue = clients * p.avg_check;
  const grossProfit = fmt(revenue * p.margin / 100);
  const netProfit = grossProfit - cost;
  const roi = safeDiv(netProfit, cost);
  const bottleneck = checkBottleneck([
    { label: 'CTR', value: p.ctr, benchmark: 3 },
    { label: 'Конверсию сайта', value: p.site_conv, benchmark: 2 },
    { label: 'Конверсию в продажу', value: p.sale_conv, benchmark: 15 },
  ]);
  return {
    funnel: [
      { label: 'Показы', value: fmt(p.impressions) },
      { label: 'CTR', value: p.ctr, isConversion: true, unit: '%' },
      { label: 'Клики', value: clicks },
      { label: 'Конв. сайта', value: p.site_conv, isConversion: true, unit: '%' },
      { label: 'Лиды', value: leads },
      { label: 'Конв. продажи', value: p.sale_conv, isConversion: true, unit: '%' },
      { label: 'Клиенты', value: clients },
    ],
    leads, clients, revenue: fmt(revenue), cost, grossProfit, netProfit, cpl: fmt(safeDiv(cost, leads)), cac: fmt(safeDiv(cost, clients)), roi, bottleneck, valid: true,
  };
};

// ─── Таргетированная реклама ──────────────────────────────────────────────────
const targetingCalc = (p: Record<string, number>): ChannelResult => {
  const clicks = fmt(p.impressions * p.ctr / 100);
  const cost = fmt(clicks * p.cpc);
  const leads = fmt(clicks * p.site_conv / 100);
  const clients = fmt(leads * p.sale_conv / 100);
  const revenue = clients * p.avg_check;
  const grossProfit = fmt(revenue * p.margin / 100);
  const netProfit = grossProfit - cost;
  const roi = safeDiv(netProfit, cost);
  const bottleneck = checkBottleneck([
    { label: 'CTR', value: p.ctr, benchmark: 1 },
    { label: 'Конверсию сайта', value: p.site_conv, benchmark: 1.5 },
    { label: 'Конверсию в продажу', value: p.sale_conv, benchmark: 12 },
  ]);
  return {
    funnel: [
      { label: 'Показы', value: fmt(p.impressions) },
      { label: 'CTR', value: p.ctr, isConversion: true, unit: '%' },
      { label: 'Клики', value: clicks },
      { label: 'Конв. сайта', value: p.site_conv, isConversion: true, unit: '%' },
      { label: 'Лиды', value: leads },
      { label: 'Конв. продажи', value: p.sale_conv, isConversion: true, unit: '%' },
      { label: 'Клиенты', value: clients },
    ],
    leads, clients, revenue: fmt(revenue), cost, grossProfit, netProfit, cpl: fmt(safeDiv(cost, leads)), cac: fmt(safeDiv(cost, clients)), roi, bottleneck, valid: true,
  };
};

// ─── Reels / YouTube / Shorts ─────────────────────────────────────────────────
const reelsCalc = (p: Record<string, number>): ChannelResult => {
  const clicks = fmt(p.reach * p.click_rate / 100);
  const leads = fmt(clicks * p.lead_conv / 100);
  const clients = fmt(leads * p.sale_conv / 100);
  const cost = fmt(p.production_cost);
  const revenue = clients * p.avg_check;
  const grossProfit = fmt(revenue * p.margin / 100);
  const netProfit = grossProfit - cost;
  const roi = safeDiv(netProfit, cost);
  const bottleneck = checkBottleneck([
    { label: 'Переходы с контента', value: p.click_rate, benchmark: 2 },
    { label: 'Конверсию в лид', value: p.lead_conv, benchmark: 5 },
    { label: 'Конверсию в продажу', value: p.sale_conv, benchmark: 15 },
  ]);
  return {
    funnel: [
      { label: 'Охват', value: fmt(p.reach) },
      { label: '% переходов', value: p.click_rate, isConversion: true, unit: '%' },
      { label: 'Переходы', value: clicks },
      { label: 'Конв. в лид', value: p.lead_conv, isConversion: true, unit: '%' },
      { label: 'Лиды', value: leads },
      { label: 'Конв. продажи', value: p.sale_conv, isConversion: true, unit: '%' },
      { label: 'Клиенты', value: clients },
    ],
    leads, clients, revenue: fmt(revenue), cost, grossProfit, netProfit, cpl: fmt(safeDiv(cost, leads)), cac: fmt(safeDiv(cost, clients)), roi, bottleneck, valid: true,
  };
};

// ─── Telegram ─────────────────────────────────────────────────────────────────
const telegramCalc = (p: Record<string, number>): ChannelResult => {
  const reach = fmt(p.subscribers * p.reach_rate / 100);
  const clicks = fmt(reach * p.click_rate / 100);
  const leads = fmt(clicks * p.lead_conv / 100);
  const clients = fmt(leads * p.sale_conv / 100);
  const cost = fmt(p.ad_cost);
  const revenue = clients * p.avg_check;
  const grossProfit = fmt(revenue * p.margin / 100);
  const netProfit = grossProfit - cost;
  const roi = safeDiv(netProfit, cost);
  const bottleneck = checkBottleneck([
    { label: 'Охват поста', value: p.reach_rate, benchmark: 20 },
    { label: 'CTR поста', value: p.click_rate, benchmark: 3 },
    { label: 'Конверсию в лид', value: p.lead_conv, benchmark: 8 },
  ]);
  return {
    funnel: [
      { label: 'Подписчики', value: fmt(p.subscribers) },
      { label: 'Охват поста', value: p.reach_rate, isConversion: true, unit: '%' },
      { label: 'Охват', value: reach },
      { label: 'CTR поста', value: p.click_rate, isConversion: true, unit: '%' },
      { label: 'Клики', value: clicks },
      { label: 'Конв. в лид', value: p.lead_conv, isConversion: true, unit: '%' },
      { label: 'Лиды', value: leads },
      { label: 'Конв. продажи', value: p.sale_conv, isConversion: true, unit: '%' },
      { label: 'Клиенты', value: clients },
    ],
    leads, clients, revenue: fmt(revenue), cost, grossProfit, netProfit, cpl: fmt(safeDiv(cost, leads)), cac: fmt(safeDiv(cost, clients)), roi, bottleneck, valid: true,
  };
};

// ─── SEO / Яндекс Карты ───────────────────────────────────────────────────────
const seoCalc = (p: Record<string, number>): ChannelResult => {
  const leads = fmt(p.traffic * p.site_conv / 100);
  const clients = fmt(leads * p.sale_conv / 100);
  const cost = fmt(p.monthly_cost);
  const revenue = clients * p.avg_check;
  const grossProfit = fmt(revenue * p.margin / 100);
  const netProfit = grossProfit - cost;
  const roi = safeDiv(netProfit, cost);
  const bottleneck = checkBottleneck([
    { label: 'Конверсию сайта', value: p.site_conv, benchmark: 2 },
    { label: 'Конверсию в продажу', value: p.sale_conv, benchmark: 15 },
  ]);
  return {
    funnel: [
      { label: 'Трафик', value: fmt(p.traffic) },
      { label: 'Конв. сайта', value: p.site_conv, isConversion: true, unit: '%' },
      { label: 'Лиды', value: leads },
      { label: 'Конв. продажи', value: p.sale_conv, isConversion: true, unit: '%' },
      { label: 'Клиенты', value: clients },
    ],
    leads, clients, revenue: fmt(revenue), cost, grossProfit, netProfit, cpl: fmt(safeDiv(cost, leads)), cac: fmt(safeDiv(cost, clients)), roi, bottleneck, valid: true,
  };
};

// ─── Холодные звонки ──────────────────────────────────────────────────────────
const coldCallsCalc = (p: Record<string, number>): ChannelResult => {
  const conversations = fmt(p.calls * p.contact_rate / 100);
  const meetings = fmt(conversations * p.script_conv / 100);
  const clients = fmt(meetings * p.close_rate / 100);
  const cost = fmt(p.calls * p.cost_per_call);
  const revenue = clients * p.avg_check;
  const grossProfit = fmt(revenue * p.margin / 100);
  const netProfit = grossProfit - cost;
  const roi = safeDiv(netProfit, cost);
  const bottleneck = checkBottleneck([
    { label: 'Дозвон до ЛПР', value: p.contact_rate, benchmark: 15 },
    { label: 'Конв. по скрипту', value: p.script_conv, benchmark: 10 },
    { label: 'Конв. в сделку', value: p.close_rate, benchmark: 15 },
  ]);
  return {
    funnel: [
      { label: 'Звонки', value: fmt(p.calls) },
      { label: 'Дозвон до ЛПР', value: p.contact_rate, isConversion: true, unit: '%' },
      { label: 'Разговоры', value: conversations },
      { label: 'Конв. по скрипту', value: p.script_conv, isConversion: true, unit: '%' },
      { label: 'Встречи / КП', value: meetings },
      { label: 'Конв. в сделку', value: p.close_rate, isConversion: true, unit: '%' },
      { label: 'Клиенты', value: clients },
    ],
    leads: meetings, clients, revenue: fmt(revenue), cost, grossProfit, netProfit, cpl: fmt(safeDiv(cost, meetings)), cac: fmt(safeDiv(cost, clients)), roi, bottleneck, valid: true,
  };
};

// ─── Email-рассылка ───────────────────────────────────────────────────────────
const emailCalc = (p: Record<string, number>): ChannelResult => {
  const reads = fmt(p.base_size * p.open_rate / 100);
  const clicks = fmt(reads * p.click_rate / 100);
  const leads = fmt(clicks * p.lead_conv / 100);
  const clients = fmt(leads * p.sale_conv / 100);
  const cost = fmt(p.base_size * p.cost_per_email);
  const revenue = clients * p.avg_check;
  const grossProfit = fmt(revenue * p.margin / 100);
  const netProfit = grossProfit - cost;
  const roi = safeDiv(netProfit, cost);
  const bottleneck = checkBottleneck([
    { label: 'Открываемость', value: p.open_rate, benchmark: 15 },
    { label: 'CTR письма', value: p.click_rate, benchmark: 3 },
    { label: 'Конверсию в продажу', value: p.sale_conv, benchmark: 12 },
  ]);
  return {
    funnel: [
      { label: 'База', value: fmt(p.base_size) },
      { label: 'Открываемость', value: p.open_rate, isConversion: true, unit: '%' },
      { label: 'Прочитали', value: reads },
      { label: 'CTR письма', value: p.click_rate, isConversion: true, unit: '%' },
      { label: 'Клики', value: clicks },
      { label: 'Конв. в лид', value: p.lead_conv, isConversion: true, unit: '%' },
      { label: 'Лиды', value: leads },
      { label: 'Конв. продажи', value: p.sale_conv, isConversion: true, unit: '%' },
      { label: 'Клиенты', value: clients },
    ],
    leads, clients, revenue: fmt(revenue), cost, grossProfit, netProfit, cpl: fmt(safeDiv(cost, leads)), cac: fmt(safeDiv(cost, clients)), roi, bottleneck, valid: true,
  };
};

// ─── Партнёры / агенты ────────────────────────────────────────────────────────
const partnersCalc = (p: Record<string, number>): ChannelResult => {
  const active = Math.round(p.partners * p.active_rate / 100);
  const deals = Math.round(active * p.deals_per_active);
  const clients = fmt(deals * p.payment_conv / 100);
  const revenue = clients * p.avg_check;
  const cost = fmt(revenue * p.commission_rate / 100);
  const grossProfit = fmt(revenue * p.margin / 100);
  const netProfit = grossProfit - cost;
  const roi = safeDiv(netProfit, cost);
  const bottleneck = checkBottleneck([
    { label: 'Активных партнёров', value: p.active_rate, benchmark: 30 },
    { label: 'Конв. в оплату', value: p.payment_conv, benchmark: 60 },
  ]);
  return {
    funnel: [
      { label: 'Партнёры', value: fmt(p.partners) },
      { label: '% активных', value: p.active_rate, isConversion: true, unit: '%' },
      { label: 'Активных', value: active },
      { label: 'Сделок / партнёр', value: p.deals_per_active, unit: 'шт' },
      { label: 'Сделки', value: deals },
      { label: 'Конв. в оплату', value: p.payment_conv, isConversion: true, unit: '%' },
      { label: 'Клиенты', value: clients },
    ],
    leads: deals, clients, revenue: fmt(revenue), cost, grossProfit, netProfit, cpl: fmt(safeDiv(cost, deals)), cac: fmt(safeDiv(cost, clients)), roi, bottleneck, valid: true,
  };
};

// ─── Маркетплейсы (упрощённый) ────────────────────────────────────────────────
const marketplaceCalc = (p: Record<string, number>): ChannelResult => {
  const purchases = fmt(p.monthly_orders * p.buyout_rate / 100);
  const revenue = purchases * p.avg_check;
  const cogs = fmt(revenue * p.cogs_rate / 100);
  const mp_fee = fmt(revenue * p.mp_commission / 100);
  const logistics = fmt(purchases * p.logistics_per_order);
  const ads_cost = fmt(p.ads_budget);
  const cost = cogs + mp_fee + logistics + ads_cost;
  const netProfit = fmt(revenue) - cost;
  const grossProfit = netProfit;
  const roi = safeDiv(netProfit, cost);
  const bottleneck = checkBottleneck([
    { label: 'Выкуп', value: p.buyout_rate, benchmark: 60 },
  ]);
  return {
    funnel: [
      { label: 'Заказы / мес', value: fmt(p.monthly_orders) },
      { label: '% выкупа', value: p.buyout_rate, isConversion: true, unit: '%' },
      { label: 'Выкупили', value: purchases },
      { label: 'Выручка', value: fmt(revenue), unit: '₽' },
    ],
    leads: purchases, clients: purchases, revenue: fmt(revenue), cost, grossProfit, netProfit, cpl: 0, cac: fmt(safeDiv(mp_fee + logistics + ads_cost, purchases)), roi, bottleneck, valid: true,
  };
};

// ─── Вебинарная воронка ───────────────────────────────────────────────────────
const webinarCalc = (p: Record<string, number>): ChannelResult => {
  const attended = fmt(p.registrations * p.show_rate / 100);
  const applications = fmt(attended * p.webinar_conv / 100);
  const clients = fmt(applications * p.payment_conv / 100);
  const cost = fmt(p.traffic_cost + p.platform_cost);
  const revenue = clients * p.avg_check;
  const grossProfit = fmt(revenue * p.margin / 100);
  const netProfit = grossProfit - cost;
  const roi = safeDiv(netProfit, cost);
  const costPerReg = fmt(safeDiv(p.traffic_cost, p.registrations));  const bottleneck = checkBottleneck([
    { label: 'Доходимость', value: p.show_rate, benchmark: 30 },
    { label: 'Конв. на вебинаре', value: p.webinar_conv, benchmark: 7 },
    { label: 'Конв. в оплату', value: p.payment_conv, benchmark: 60 },
  ]);
  return {
    funnel: [
      { label: 'Регистрации', value: fmt(p.registrations) },
      { label: 'Цена регистрации', value: costPerReg, unit: '₽' },
      { label: 'Доходимость', value: p.show_rate, isConversion: true, unit: '%' },
      { label: 'Пришли', value: attended },
      { label: 'Конв. на вебинаре', value: p.webinar_conv, isConversion: true, unit: '%' },
      { label: 'Заявки', value: applications },
      { label: 'Конв. в оплату', value: p.payment_conv, isConversion: true, unit: '%' },
      { label: 'Клиенты', value: clients },
    ],
    leads: applications, clients, revenue: fmt(revenue), cost, grossProfit, netProfit, cpl: fmt(safeDiv(cost, applications)), cac: fmt(safeDiv(cost, clients)), roi, bottleneck, valid: true,
  };
};

// ─── Свой канал ───────────────────────────────────────────────────────────────
const customCalc = (p: Record<string, number>): ChannelResult => {
  const s1 = fmt(p.stage1_volume);
  const s2 = fmt(s1 * p.conv1 / 100);
  const s3 = fmt(s2 * p.conv2 / 100);
  const clients = fmt(s3 * p.conv3 / 100);
  const cost = fmt(p.cost);
  const revenue = clients * p.avg_check;
  const grossProfit = fmt(revenue * p.margin / 100);
  const netProfit = grossProfit - cost;
  const roi = safeDiv(netProfit, cost);
  return {
    funnel: [
      { label: 'Этап 1', value: s1 },
      { label: 'Конв. 1→2', value: p.conv1, isConversion: true, unit: '%' },
      { label: 'Этап 2', value: s2 },
      { label: 'Конв. 2→3', value: p.conv2, isConversion: true, unit: '%' },
      { label: 'Этап 3', value: s3 },
      { label: 'Конв. 3→клиент', value: p.conv3, isConversion: true, unit: '%' },
      { label: 'Клиенты', value: clients },
    ],
    leads: s3, clients, revenue: fmt(revenue), cost, grossProfit, netProfit, cpl: fmt(safeDiv(cost, s3)), cac: fmt(safeDiv(cost, clients)), roi, bottleneck: null, valid: true,
  };
};

// ─── CHANNEL DEFINITIONS ─────────────────────────────────────────────────────
export const CHANNELS: ChannelDef[] = [
  {
    id: 'ppc', name: 'PPC / Яндекс Директ', shortName: 'PPC', color: '#7C6EE8',
    category: 'paid', categoryLabel: 'Платный трафик',
    params: [
      { id: 'impressions', label: 'Показы', unit: 'шт', min: 1000, step: 1000, defaultValue: 50000, isInput: true, benchmark: { range: '10 000–1 000 000', typical: '30 000–200 000', hint: 'Сколько раз показывается ваше объявление. Зависит от бюджета и ставок.' } },
      { id: 'ctr', label: 'CTR', unit: '%', min: 0.1, max: 30, step: 0.1, defaultValue: 4, isInput: true, benchmark: { range: '0.5–15%', typical: '2–6%', hint: 'Процент кликов от показов. Поиск выше (3–10%), РСЯ ниже (0.1–0.5%).' } },
      { id: 'cpc', label: 'Цена клика', unit: '₽', min: 1, step: 5, defaultValue: 50, isInput: true, benchmark: { range: '10–1 000 ₽', typical: '30–150 ₽', hint: 'Средняя цена одного клика. Зависит от конкурентности ниши и региона.' } },
      { id: 'site_conv', label: 'Конверсия сайта', unit: '%', min: 0.1, max: 30, step: 0.1, defaultValue: 3, isInput: true, benchmark: { range: '0.5–10%', typical: '1–5%', hint: 'Процент посетителей, ставших лидами (оставили заявку / позвонили).' } },
      { id: 'sale_conv', label: 'Конв. в продажу', unit: '%', min: 1, max: 100, step: 1, defaultValue: 15, isInput: true, benchmark: { range: '5–50%', typical: '10–25%', hint: 'Процент лидов, ставших клиентами. Зависит от качества отдела продаж и оффера.' } },
      ...COMMON_PARAMS,
    ],
    calculate: ppcCalc,
  },
  {
    id: 'targeting', name: 'Таргетированная реклама', shortName: 'Таргет', color: '#9C4EE8',
    category: 'paid', categoryLabel: 'Платный трафик',
    params: [
      { id: 'impressions', label: 'Показы', unit: 'шт', min: 1000, step: 1000, defaultValue: 100000, isInput: true, benchmark: { range: '10 000–5 000 000', typical: '50 000–500 000', hint: 'Количество показов рекламного объявления в ВКонтакте, MyTarget и др.' } },
      { id: 'ctr', label: 'CTR', unit: '%', min: 0.1, max: 10, step: 0.1, defaultValue: 1, isInput: true, benchmark: { range: '0.3–5%', typical: '0.5–2%', hint: 'CTR в таргете обычно ниже, чем в поиске. Хороший показатель — 1–2%.' } },
      { id: 'cpc', label: 'Цена клика', unit: '₽', min: 1, step: 5, defaultValue: 40, isInput: true, benchmark: { range: '5–300 ₽', typical: '15–80 ₽', hint: 'Зависит от аудитории, конкурентности и качества креатива.' } },
      { id: 'site_conv', label: 'Конверсия сайта', unit: '%', min: 0.1, max: 20, step: 0.1, defaultValue: 2, isInput: true, benchmark: { range: '0.3–8%', typical: '0.5–3%', hint: 'Трафик с таргета обычно холоднее, конверсия ниже, чем с поиска.' } },
      { id: 'sale_conv', label: 'Конв. в продажу', unit: '%', min: 1, max: 100, step: 1, defaultValue: 12, isInput: true, benchmark: { range: '5–40%', typical: '10–20%', hint: 'Зависит от прогрева аудитории и качества обработки лидов.' } },
      ...COMMON_PARAMS,
    ],
    calculate: targetingCalc,
  },
  {
    id: 'reels', name: 'Reels / YouTube / Shorts', shortName: 'Reels', color: '#E84E8A',
    category: 'organic', categoryLabel: 'Органика / контент',
    params: [
      { id: 'reach', label: 'Охват (просмотры)', unit: 'шт', min: 100, step: 500, defaultValue: 10000, isInput: true, benchmark: { range: '500–10 000 000', typical: '1 000–100 000', hint: 'Суммарный охват всего контента за месяц. Учитывайте не только рилсы, но и сторис.' } },
      { id: 'click_rate', label: '% переходов на профиль', unit: '%', min: 0.1, max: 20, step: 0.1, defaultValue: 2, isInput: true, benchmark: { range: '0.5–10%', typical: '1–4%', hint: 'Процент зрителей, перешедших на профиль или по ссылке в шапке.' } },
      { id: 'lead_conv', label: 'Конв. в лид', unit: '%', min: 0.1, max: 30, step: 0.5, defaultValue: 5, isInput: true, benchmark: { range: '1–20%', typical: '3–8%', hint: 'Процент посетителей профиля, написавших в директ или оставивших заявку.' } },
      { id: 'sale_conv', label: 'Конв. в продажу', unit: '%', min: 1, max: 100, step: 1, defaultValue: 15, isInput: true, benchmark: { range: '5–50%', typical: '10–30%', hint: 'Лиды из контента обычно теплее — конверсия выше, чем с холодного трафика.' } },
      { id: 'production_cost', label: 'Расходы на контент', unit: '₽', min: 0, step: 1000, defaultValue: 30000, isInput: true, benchmark: { range: '0–500 000 ₽', typical: '15 000–100 000 ₽', hint: 'Съёмка, монтаж, реклама для продвижения контента за месяц.' } },
      ...COMMON_PARAMS,
    ],
    calculate: reelsCalc,
  },
  {
    id: 'telegram', name: 'Telegram-канал', shortName: 'Telegram', color: '#2AABEE',
    category: 'organic', categoryLabel: 'Органика / контент',
    params: [
      { id: 'subscribers', label: 'Подписчики', unit: 'шт', min: 100, step: 100, defaultValue: 5000, isInput: true, benchmark: { range: '100–1 000 000', typical: '500–50 000', hint: 'Текущая аудитория канала. Для монетизации достаточно 1 000+ живых подписчиков.' } },
      { id: 'reach_rate', label: 'Охват поста', unit: '%', min: 1, max: 80, step: 1, defaultValue: 22, isInput: true, benchmark: { range: '5–60%', typical: '15–30%', hint: 'Процент подписчиков, увидевших пост. Telegram даёт высокий органический охват.' } },
      { id: 'click_rate', label: 'CTR поста', unit: '%', min: 0.1, max: 30, step: 0.5, defaultValue: 4, isInput: true, benchmark: { range: '1–15%', typical: '2–7%', hint: 'Процент читателей, кликнувших по ссылке в посте.' } },
      { id: 'lead_conv', label: 'Конв. в лид', unit: '%', min: 0.5, max: 50, step: 0.5, defaultValue: 10, isInput: true, benchmark: { range: '3–30%', typical: '5–15%', hint: 'Тёплая аудитория Telegram даёт высокую конверсию при правильном оффере.' } },
      { id: 'sale_conv', label: 'Конв. в продажу', unit: '%', min: 1, max: 100, step: 1, defaultValue: 20, isInput: true, benchmark: { range: '10–60%', typical: '15–35%', hint: 'Лиды из Telegram — тёплые. Ожидаемая конверсия выше среднего.' } },
      { id: 'ad_cost', label: 'Бюджет на рекламу канала', unit: '₽', min: 0, step: 5000, defaultValue: 50000, isInput: true, benchmark: { range: '0–1 000 000 ₽', typical: '10 000–200 000 ₽', hint: 'Затраты на закуп рекламы в других каналах для привлечения подписчиков.' } },
      ...COMMON_PARAMS,
    ],
    calculate: telegramCalc,
  },
  {
    id: 'seo', name: 'SEO / Яндекс Карты', shortName: 'SEO', color: '#26C17A',
    category: 'organic', categoryLabel: 'Органика / контент',
    params: [
      { id: 'traffic', label: 'Трафик в месяц', unit: 'шт', min: 100, step: 100, defaultValue: 3000, isInput: true, benchmark: { range: '100–1 000 000', typical: '500–30 000', hint: 'Органический трафик на сайт / карточку в Яндекс Картах за месяц.' } },
      { id: 'site_conv', label: 'Конверсия в лид', unit: '%', min: 0.1, max: 20, step: 0.1, defaultValue: 2.5, isInput: true, benchmark: { range: '0.5–10%', typical: '1–5%', hint: 'Процент органических посетителей, оставивших заявку.' } },
      { id: 'sale_conv', label: 'Конв. в продажу', unit: '%', min: 1, max: 100, step: 1, defaultValue: 20, isInput: true, benchmark: { range: '10–50%', typical: '15–30%', hint: 'Органический трафик теплее — конверсия в продажу обычно выше, чем у платного.' } },
      { id: 'monthly_cost', label: 'Ежемес. затраты на SEO', unit: '₽', min: 0, step: 5000, defaultValue: 30000, isInput: true, benchmark: { range: '0–500 000 ₽', typical: '15 000–100 000 ₽', hint: 'Абонентская плата SEO-агентству или зарплата специалиста.' } },
      ...COMMON_PARAMS,
    ],
    calculate: seoCalc,
  },
  {
    id: 'cold_calls', name: 'Холодные звонки', shortName: 'Звонки', color: '#FF7043',
    category: 'direct', categoryLabel: 'Прямые продажи',
    params: [
      { id: 'calls', label: 'Звонков в месяц', unit: 'шт', min: 10, step: 100, defaultValue: 2000, isInput: true, benchmark: { range: '100–20 000', typical: '500–5 000', hint: 'Один менеджер делает 30–60 звонков в день = 600–1 200 в месяц.' } },
      { id: 'contact_rate', label: 'Дозвон до ЛПР', unit: '%', min: 1, max: 80, step: 1, defaultValue: 15, isInput: true, benchmark: { range: '5–40%', typical: '10–25%', hint: 'Процент звонков, когда удалось поговорить с лицом, принимающим решение.' } },
      { id: 'script_conv', label: 'Конв. по скрипту', unit: '%', min: 1, max: 60, step: 1, defaultValue: 10, isInput: true, benchmark: { range: '3–30%', typical: '7–15%', hint: 'Процент разговоров с ЛПР, после которых назначена встреча / отправлено КП.' } },
      { id: 'close_rate', label: 'Конв. в сделку', unit: '%', min: 1, max: 100, step: 1, defaultValue: 20, isInput: true, benchmark: { range: '5–60%', typical: '15–30%', hint: 'Процент встреч / КП, завершившихся оплатой.' } },
      { id: 'cost_per_call', label: 'Стоимость звонка', unit: '₽', min: 1, step: 5, defaultValue: 40, isInput: true, benchmark: { range: '10–200 ₽', typical: '25–80 ₽', hint: 'ФОТ менеджеров + телефония, поделённый на число звонков.' } },
      ...COMMON_PARAMS,
    ],
    calculate: coldCallsCalc,
  },
  {
    id: 'email', name: 'Email-рассылка', shortName: 'Email', color: '#FF9800',
    category: 'direct', categoryLabel: 'Прямые продажи',
    params: [
      { id: 'base_size', label: 'Размер базы', unit: 'шт', min: 100, step: 500, defaultValue: 10000, isInput: true, benchmark: { range: '500–1 000 000', typical: '2 000–100 000', hint: 'Количество активных email-адресов в базе.' } },
      { id: 'open_rate', label: 'Открываемость', unit: '%', min: 1, max: 80, step: 1, defaultValue: 18, isInput: true, benchmark: { range: '5–50%', typical: '12–25%', hint: 'Процент получателей, открывших письмо. Зависит от качества базы и темы письма.' } },
      { id: 'click_rate', label: 'CTR письма', unit: '%', min: 0.1, max: 30, step: 0.5, defaultValue: 3, isInput: true, benchmark: { range: '0.5–15%', typical: '2–6%', hint: 'Процент открывших, кликнувших по ссылке в письме.' } },
      { id: 'lead_conv', label: 'Конв. в лид', unit: '%', min: 1, max: 60, step: 1, defaultValue: 15, isInput: true, benchmark: { range: '5–40%', typical: '10–25%', hint: 'Процент кликнувших, оставивших заявку на сайте.' } },
      { id: 'sale_conv', label: 'Конв. в продажу', unit: '%', min: 1, max: 100, step: 1, defaultValue: 15, isInput: true, benchmark: { range: '5–40%', typical: '10–25%', hint: 'Процент лидов, ставших клиентами.' } },
      { id: 'cost_per_email', label: 'Стоимость отправки', unit: '₽', min: 0.1, max: 10, step: 0.1, defaultValue: 2, isInput: true, benchmark: { range: '0.1–5 ₽', typical: '0.5–3 ₽', hint: 'Стоимость одного отправленного письма (сервис рассылок).' } },
      ...COMMON_PARAMS,
    ],
    calculate: emailCalc,
  },
  {
    id: 'partners', name: 'Партнёры / агенты', shortName: 'Партнёры', color: '#00BCD4',
    category: 'direct', categoryLabel: 'Прямые продажи',
    params: [
      { id: 'partners', label: 'Всего партнёров', unit: 'шт', min: 1, step: 1, defaultValue: 20, isInput: true, benchmark: { range: '2–500', typical: '5–50', hint: 'Общее число партнёров / агентов в вашей сети.' } },
      { id: 'active_rate', label: '% активных партнёров', unit: '%', min: 5, max: 100, step: 5, defaultValue: 35, isInput: true, benchmark: { range: '10–80%', typical: '25–50%', hint: 'Процент партнёров, приносящих хотя бы одну сделку в месяц.' } },
      { id: 'deals_per_active', label: 'Сделок / партнёр / мес', unit: 'шт', min: 0.1, max: 50, step: 0.5, defaultValue: 2, isInput: true, benchmark: { range: '0.5–10', typical: '1–4', hint: 'Среднее число сделок от одного активного партнёра в месяц.' } },
      { id: 'payment_conv', label: 'Конв. в оплату', unit: '%', min: 10, max: 100, step: 5, defaultValue: 65, isInput: true, benchmark: { range: '30–95%', typical: '50–80%', hint: 'Процент сделок, по которым произошла реальная оплата.' } },
      { id: 'commission_rate', label: 'Комиссия партнёрам', unit: '%', min: 1, max: 50, step: 1, defaultValue: 15, isInput: true, benchmark: { range: '5–40%', typical: '10–25%', hint: 'Процент от суммы сделки, который получает партнёр.' } },
      ...COMMON_PARAMS,
    ],
    calculate: partnersCalc,
  },
  {
    id: 'marketplace', name: 'Маркетплейсы (WB / Ozon)', shortName: 'МП', color: '#5B8DEF',
    category: 'special', categoryLabel: 'Специализированные',
    params: [
      { id: 'monthly_orders', label: 'Заказов в месяц', unit: 'шт', min: 10, step: 50, defaultValue: 500, isInput: true, benchmark: { range: '10–100 000', typical: '100–5 000', hint: 'Количество оформленных заказов в месяц до учёта выкупа.' } },
      { id: 'buyout_rate', label: '% выкупа', unit: '%', min: 10, max: 100, step: 1, defaultValue: 65, isInput: true, benchmark: { range: '30–95%', typical: '55–80%', hint: 'Процент заказов, которые забрали покупатели. Одежда: 30–50%, другое: 70–90%.' } },
      { id: 'avg_check', label: 'Средний чек', unit: '₽', min: 100, step: 100, defaultValue: 1500, isInput: true, benchmark: { range: '200–50 000 ₽', typical: '500–5 000 ₽', hint: 'Средняя цена проданного товара (с учётом выкупа).' } },
      { id: 'cogs_rate', label: 'Себестоимость', unit: '%', min: 1, max: 90, step: 1, defaultValue: 35, isInput: true, benchmark: { range: '15–70%', typical: '25–50%', hint: 'Доля себестоимости в цене продажи.' } },
      { id: 'mp_commission', label: 'Комиссия МП', unit: '%', min: 5, max: 35, step: 1, defaultValue: 18, isInput: true, benchmark: { range: '5–35%', typical: '15–25%', hint: 'Комиссия маркетплейса за продажу. WB: 5–25%, Ozon: 4–15%.' } },
      { id: 'logistics_per_order', label: 'Логистика / заказ', unit: '₽', min: 10, step: 10, defaultValue: 120, isInput: true, benchmark: { range: '50–400 ₽', typical: '80–200 ₽', hint: 'Стоимость хранения + доставки на 1 выкупленный заказ.' } },
      { id: 'ads_budget', label: 'Бюджет на рекламу МП', unit: '₽', min: 0, step: 5000, defaultValue: 30000, isInput: true, benchmark: { range: '0–1 000 000 ₽', typical: '10 000–200 000 ₽', hint: 'Внутренняя реклама на WB/Ozon за месяц.' } },
    ],
    calculate: marketplaceCalc,
  },
  {
    id: 'webinar', name: 'Вебинарная воронка', shortName: 'Вебинар', color: '#E8A21E',
    category: 'special', categoryLabel: 'Специализированные',
    params: [
      { id: 'registrations', label: 'Регистраций', unit: 'шт', min: 10, step: 100, defaultValue: 1000, isInput: true, benchmark: { range: '50–100 000', typical: '200–5 000', hint: 'Количество зарегистрировавшихся на вебинар / автовебинар.' } },
      { id: 'show_rate', label: 'Доходимость', unit: '%', min: 5, max: 80, step: 1, defaultValue: 30, isInput: true, benchmark: { range: '10–60%', typical: '20–40%', hint: 'Процент зарегистрировавшихся, которые пришли на вебинар. Прогрев повышает показатель.' } },
      { id: 'webinar_conv', label: 'Конв. на вебинаре', unit: '%', min: 0.5, max: 30, step: 0.5, defaultValue: 7, isInput: true, benchmark: { range: '1–20%', typical: '4–12%', hint: 'Процент присутствовавших, оставивших заявку. Зависит от оффера и качества контента.' } },
      { id: 'payment_conv', label: 'Конв. в оплату', unit: '%', min: 10, max: 100, step: 5, defaultValue: 60, isInput: true, benchmark: { range: '20–90%', typical: '40–75%', hint: 'Процент заявок с вебинара, дошедших до оплаты после обработки ОП.' } },
      { id: 'traffic_cost', label: 'Расходы на трафик', unit: '₽', min: 0, step: 5000, defaultValue: 80000, isInput: true, benchmark: { range: '5 000–2 000 000 ₽', typical: '30 000–300 000 ₽', hint: 'Рекламный бюджет для привлечения регистраций на вебинар.' } },
      { id: 'platform_cost', label: 'Платформа + прочее', unit: '₽', min: 0, step: 1000, defaultValue: 10000, isInput: true, benchmark: { range: '0–100 000 ₽', typical: '3 000–20 000 ₽', hint: 'Стоимость платформы для вебинаров, SMS-напоминания, email-сервис.' } },
      ...COMMON_PARAMS,
    ],
    calculate: webinarCalc,
  },
  {
    id: 'custom', name: 'Свой канал', shortName: 'Свой', color: '#9E9E9E',
    category: 'special', categoryLabel: 'Специализированные',
    params: [
      { id: 'stage1_volume', label: 'Входной объём', unit: 'шт', min: 1, step: 100, defaultValue: 1000, isInput: true, benchmark: { range: 'любое значение', typical: 'зависит от канала', hint: 'Объём на первом этапе воронки. Назовите этот этап как угодно.' } },
      { id: 'conv1', label: 'Конверсия 1→2', unit: '%', min: 0.1, max: 100, step: 0.5, defaultValue: 20, isInput: true, benchmark: { range: '1–90%', typical: 'зависит от канала', hint: 'Конверсия с первого этапа воронки на второй.' } },
      { id: 'conv2', label: 'Конверсия 2→3', unit: '%', min: 0.1, max: 100, step: 0.5, defaultValue: 30, isInput: true, benchmark: { range: '1–90%', typical: 'зависит от канала', hint: 'Конверсия со второго этапа воронки на третий.' } },
      { id: 'conv3', label: 'Конверсия 3→клиент', unit: '%', min: 0.1, max: 100, step: 0.5, defaultValue: 25, isInput: true, benchmark: { range: '1–90%', typical: 'зависит от канала', hint: 'Конверсия с третьего этапа в оплатившего клиента.' } },
      { id: 'cost', label: 'Расходы на канал', unit: '₽', min: 0, step: 1000, defaultValue: 50000, isInput: true, benchmark: { range: 'любое значение', typical: 'зависит от канала', hint: 'Суммарные расходы на этот канал за месяц.' } },
      ...COMMON_PARAMS,
    ],
    calculate: customCalc,
  },
];

export const CHANNEL_MAP: Record<string, ChannelDef> = Object.fromEntries(CHANNELS.map(c => [c.id, c]));

export function getDefaultParams(channelId: string): Record<string, number> {
  const ch = CHANNEL_MAP[channelId];
  if (!ch) return {};
  return Object.fromEntries(ch.params.map(p => [p.id, p.defaultValue]));
}

export const SCENARIO_MULTIPLIERS: Record<string, Record<string, number>> = {
  pessimist: { impressions: 0.6, reach: 0.6, base_size: 1, subscribers: 1, calls: 0.6, partners: 1, monthly_orders: 0.6, registrations: 0.6, stage1_volume: 0.6, ctr: 0.7, click_rate: 0.7, reach_rate: 0.7, site_conv: 0.7, lead_conv: 0.7, sale_conv: 0.7, open_rate: 0.7, contact_rate: 0.7, script_conv: 0.7, close_rate: 0.7, active_rate: 0.7, payment_conv: 0.7, show_rate: 0.7, webinar_conv: 0.7, buyout_rate: 0.85, conv1: 0.7, conv2: 0.7, conv3: 0.7 },
  realist: {},
  optimist: { impressions: 1.5, reach: 1.5, base_size: 1, subscribers: 1, calls: 1.5, partners: 1, monthly_orders: 1.5, registrations: 1.5, stage1_volume: 1.5, ctr: 1.3, click_rate: 1.3, reach_rate: 1.2, site_conv: 1.3, lead_conv: 1.3, sale_conv: 1.3, open_rate: 1.2, contact_rate: 1.2, script_conv: 1.3, close_rate: 1.3, active_rate: 1.2, payment_conv: 1.2, show_rate: 1.3, webinar_conv: 1.4, buyout_rate: 1.1, conv1: 1.3, conv2: 1.3, conv3: 1.3 },
};

export function applyScenario(params: Record<string, number>, scenario: string): Record<string, number> {
  const multipliers = SCENARIO_MULTIPLIERS[scenario] || {};
  const result: Record<string, number> = {};
  for (const [k, v] of Object.entries(params)) {
    const m = multipliers[k] ?? 1;
    const paramDef = Object.values(CHANNEL_MAP).flatMap(c => c.params).find(p => p.id === k);
    let val = v * m;
    if (paramDef?.max) val = Math.min(val, paramDef.max);
    if (paramDef?.min !== undefined) val = Math.max(val, paramDef.min ?? 0);
    result[k] = Math.round(val * 100) / 100;
  }
  return result;
}
