import type { ServiceEvent, EventCostEstimate } from '../types';

export interface CostConfig {
  fuelCostPerKm: number;
  workerHourlyRate: number;
  equipmentAmortizationPerHour: number;
  tollCost: number;
  otherCosts: number;
}

export const DEFAULT_COST_CONFIG: CostConfig = {
  fuelCostPerKm: 0.65,
  workerHourlyRate: 45,
  equipmentAmortizationPerHour: 15,
  tollCost: 0,
  otherCosts: 0,
};

export function estimateEventCost(
  event: ServiceEvent,
  distanceKm: number,
  config: Partial<CostConfig> = {}
): EventCostEstimate {
  const c = { ...DEFAULT_COST_CONFIG, ...config };
  const workerHours    = event.estimatedDurationMinutes / 60;
  const workerCount    = Math.max(1, event.assignedWorkers.length);
  const fuelCost       = distanceKm * 2 * c.fuelCostPerKm;
  const workerCost     = workerHours * c.workerHourlyRate * workerCount;
  const equipmentCost  = workerHours * c.equipmentAmortizationPerHour;
  const totalCost      = fuelCost + workerCost + equipmentCost + c.tollCost + c.otherCosts;
  const revenue        = event.price ?? 0;
  const profit         = revenue - totalCost;
  const profitMarginPercent = revenue > 0 ? Math.round((profit / revenue) * 100) : 0;

  return {
    eventId: event.id,
    distanceKm,
    fuelCost:  r2(fuelCost),
    workerCost: r2(workerCost),
    equipmentCost: r2(equipmentCost),
    tollCost: c.tollCost,
    otherCosts: c.otherCosts,
    totalCost: r2(totalCost),
    revenue,
    profit: r2(profit),
    profitMarginPercent,
    currency: event.currency,
  };
}

function r2(n: number) { return Math.round(n * 100) / 100; }
