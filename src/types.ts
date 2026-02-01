export type MeterType = 'electricity' | 'gas';

export interface Reading {
  id: string;
  date: string; // ISO string 2023-01-01
  value: number;
  type: MeterType;
}

export interface MonthlyStat {
  month: string; // YYYY-MM
  consumption: number;
  days: number;
}
