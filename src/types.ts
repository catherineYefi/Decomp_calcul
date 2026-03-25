export type ChannelId =
  | 'ppc' | 'targeting' | 'reels' | 'telegram' | 'seo'
  | 'cold_calls' | 'email' | 'partners' | 'marketplace' | 'webinar' | 'custom';

export type ScenarioKey = 'pessimist' | 'realist' | 'optimist';

export interface ParamDef {
  id: string;
  label: string;
  unit: '₽' | '%' | 'шт' | '';
  min?: number;
  max?: number;
  step?: number;
  defaultValue: number;
  benchmark?: {
    range: string;
    typical: string;
    hint: string;
  };
  isInput: boolean; // true = user enters, false = calculated
}

export interface FunnelStage {
  label: string;
  value: number;
  isConversion?: boolean;
  unit?: string;
}

export interface ChannelResult {
  funnel: FunnelStage[];
  leads: number;
  clients: number;
  revenue: number;
  cost: number;
  grossProfit: number;
  netProfit: number;
  cpl: number;
  cac: number;
  roi: number;
  bottleneck: string | null;
  valid: boolean;
}

export interface ChannelDef {
  id: ChannelId;
  name: string;
  shortName: string;
  color: string;
  category: 'paid' | 'organic' | 'direct' | 'special';
  categoryLabel: string;
  params: ParamDef[];
  calculate: (inputs: Record<string, number>) => ChannelResult;
  reverseCalc?: (targetProfit: number, inputs: Record<string, number>) => Record<string, number>;
}

export type ScenarioParams = Record<string, number>; // paramId -> value

export interface ChannelScenarios {
  pessimist: ScenarioParams;
  realist: ScenarioParams;
  optimist: ScenarioParams;
}

export interface AppState {
  goal: number;
  mode: 'forecast' | 'from_goal';
  selectedChannels: ChannelId[];
  scenarios: Record<ChannelId, ChannelScenarios>;
  activeScenario: ScenarioKey;
}
