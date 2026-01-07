/**
 * CFA-Level Portfolio Analytics Library
 * Includes IRR, TWR, Sharpe, Sortino, Alpha, Beta, and more
 */

export interface CashFlow {
  date: Date;
  amount: number; // positive = inflow, negative = outflow
}

export interface PortfolioReturn {
  date: Date;
  value: number;
  return: number;
}

export interface RiskMetrics {
  standardDeviation: number;
  downsideDeviation: number;
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdown: number;
  maxDrawdownDate: Date | null;
  beta: number;
  alpha: number;
  treynorRatio: number;
  informationRatio: number;
  trackingError: number;
}

export interface PerformanceMetrics {
  irr: number; // Money-Weighted Return
  twr: number; // Time-Weighted Return
  cagr: number; // Compound Annual Growth Rate
  totalReturn: number;
  annualizedReturn: number;
  ytdReturn: number;
  mtdReturn: number;
  oneYearReturn: number | null;
  threeYearReturn: number | null;
  fiveYearReturn: number | null;
  sinceInceptionReturn: number;
}

export interface BenchmarkComparison {
  portfolioReturn: number;
  benchmarkReturn: number;
  excessReturn: number;
  trackingError: number;
  informationRatio: number;
  beta: number;
  alpha: number;
  correlation: number;
  rSquared: number;
}

/**
 * Calculate Internal Rate of Return (IRR) using Newton-Raphson method
 * This is the money-weighted return that accounts for cash flow timing
 */
export function calculateIRR(cashFlows: CashFlow[], finalValue: number): number {
  if (cashFlows.length === 0) return 0;

  const sortedFlows = [...cashFlows].sort((a, b) => a.date.getTime() - b.date.getTime());
  const startDate = sortedFlows[0].date;
  const endDate = new Date();

  // Convert to years from start
  const flows: { years: number; amount: number }[] = sortedFlows.map(cf => ({
    years: (cf.date.getTime() - startDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000),
    amount: cf.amount,
  }));

  // Add final value as last outflow
  flows.push({
    years: (endDate.getTime() - startDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000),
    amount: -finalValue,
  });

  // Newton-Raphson iteration
  let rate = 0.1; // Initial guess
  const maxIterations = 100;
  const tolerance = 0.0001;

  for (let i = 0; i < maxIterations; i++) {
    let npv = 0;
    let derivative = 0;

    for (const flow of flows) {
      const discountFactor = Math.pow(1 + rate, flow.years);
      npv += flow.amount / discountFactor;
      derivative -= flow.years * flow.amount / Math.pow(1 + rate, flow.years + 1);
    }

    if (Math.abs(npv) < tolerance) break;
    if (derivative === 0) break;

    rate = rate - npv / derivative;

    // Clamp rate to reasonable bounds
    rate = Math.max(-0.99, Math.min(10, rate));
  }

  return rate * 100; // Return as percentage
}

/**
 * Calculate Time-Weighted Return (TWR)
 * This eliminates the impact of cash flows and measures pure investment performance
 */
export function calculateTWR(portfolioReturns: PortfolioReturn[]): number {
  if (portfolioReturns.length < 2) return 0;

  const sorted = [...portfolioReturns].sort((a, b) => a.date.getTime() - b.date.getTime());
  
  let cumulativeReturn = 1;
  for (let i = 1; i < sorted.length; i++) {
    const periodReturn = sorted[i].value / sorted[i - 1].value - 1;
    cumulativeReturn *= (1 + periodReturn);
  }

  return (cumulativeReturn - 1) * 100;
}

/**
 * Calculate Compound Annual Growth Rate (CAGR)
 */
export function calculateCAGR(startValue: number, endValue: number, years: number): number {
  if (startValue <= 0 || endValue <= 0 || years <= 0) return 0;
  return (Math.pow(endValue / startValue, 1 / years) - 1) * 100;
}

/**
 * Calculate Standard Deviation of returns
 */
export function calculateStandardDeviation(returns: number[]): number {
  if (returns.length < 2) return 0;
  
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const squaredDiffs = returns.map(r => Math.pow(r - mean, 2));
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / (returns.length - 1);
  
  return Math.sqrt(variance);
}

/**
 * Calculate Downside Deviation (for Sortino Ratio)
 */
export function calculateDownsideDeviation(returns: number[], targetReturn: number = 0): number {
  const downsideReturns = returns.filter(r => r < targetReturn);
  if (downsideReturns.length === 0) return 0;
  
  const squaredDownside = downsideReturns.map(r => Math.pow(r - targetReturn, 2));
  const variance = squaredDownside.reduce((a, b) => a + b, 0) / returns.length;
  
  return Math.sqrt(variance);
}

/**
 * Calculate Sharpe Ratio
 * (Portfolio Return - Risk Free Rate) / Standard Deviation
 */
export function calculateSharpeRatio(
  portfolioReturn: number,
  riskFreeRate: number,
  standardDeviation: number
): number {
  if (standardDeviation === 0) return 0;
  return (portfolioReturn - riskFreeRate) / standardDeviation;
}

/**
 * Calculate Sortino Ratio
 * (Portfolio Return - Risk Free Rate) / Downside Deviation
 */
export function calculateSortinoRatio(
  portfolioReturn: number,
  riskFreeRate: number,
  downsideDeviation: number
): number {
  if (downsideDeviation === 0) return 0;
  return (portfolioReturn - riskFreeRate) / downsideDeviation;
}

/**
 * Calculate Maximum Drawdown
 */
export function calculateMaxDrawdown(values: { date: Date; value: number }[]): { maxDrawdown: number; peakDate: Date | null; troughDate: Date | null } {
  if (values.length < 2) return { maxDrawdown: 0, peakDate: null, troughDate: null };

  const sorted = [...values].sort((a, b) => a.date.getTime() - b.date.getTime());
  
  let maxDrawdown = 0;
  let peak = sorted[0].value;
  let peakDate: Date | null = sorted[0].date;
  let troughDate: Date | null = null;

  for (const point of sorted) {
    if (point.value > peak) {
      peak = point.value;
      peakDate = point.date;
    }
    
    const drawdown = (peak - point.value) / peak;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
      troughDate = point.date;
    }
  }

  return { maxDrawdown: maxDrawdown * 100, peakDate, troughDate };
}

/**
 * Calculate Beta (systematic risk relative to benchmark)
 */
export function calculateBeta(portfolioReturns: number[], benchmarkReturns: number[]): number {
  if (portfolioReturns.length !== benchmarkReturns.length || portfolioReturns.length < 2) return 1;

  const meanPortfolio = portfolioReturns.reduce((a, b) => a + b, 0) / portfolioReturns.length;
  const meanBenchmark = benchmarkReturns.reduce((a, b) => a + b, 0) / benchmarkReturns.length;

  let covariance = 0;
  let benchmarkVariance = 0;

  for (let i = 0; i < portfolioReturns.length; i++) {
    covariance += (portfolioReturns[i] - meanPortfolio) * (benchmarkReturns[i] - meanBenchmark);
    benchmarkVariance += Math.pow(benchmarkReturns[i] - meanBenchmark, 2);
  }

  if (benchmarkVariance === 0) return 1;
  return covariance / benchmarkVariance;
}

/**
 * Calculate Alpha (Jensen's Alpha)
 * Alpha = Portfolio Return - (Risk Free Rate + Beta * (Benchmark Return - Risk Free Rate))
 */
export function calculateAlpha(
  portfolioReturn: number,
  benchmarkReturn: number,
  riskFreeRate: number,
  beta: number
): number {
  return portfolioReturn - (riskFreeRate + beta * (benchmarkReturn - riskFreeRate));
}

/**
 * Calculate Treynor Ratio
 * (Portfolio Return - Risk Free Rate) / Beta
 */
export function calculateTreynorRatio(
  portfolioReturn: number,
  riskFreeRate: number,
  beta: number
): number {
  if (beta === 0) return 0;
  return (portfolioReturn - riskFreeRate) / beta;
}

/**
 * Calculate Tracking Error
 */
export function calculateTrackingError(portfolioReturns: number[], benchmarkReturns: number[]): number {
  if (portfolioReturns.length !== benchmarkReturns.length) return 0;
  
  const excessReturns = portfolioReturns.map((r, i) => r - benchmarkReturns[i]);
  return calculateStandardDeviation(excessReturns);
}

/**
 * Calculate Information Ratio
 */
export function calculateInformationRatio(
  portfolioReturn: number,
  benchmarkReturn: number,
  trackingError: number
): number {
  if (trackingError === 0) return 0;
  return (portfolioReturn - benchmarkReturn) / trackingError;
}

/**
 * Calculate Correlation between two return series
 */
export function calculateCorrelation(returns1: number[], returns2: number[]): number {
  if (returns1.length !== returns2.length || returns1.length < 2) return 0;

  const mean1 = returns1.reduce((a, b) => a + b, 0) / returns1.length;
  const mean2 = returns2.reduce((a, b) => a + b, 0) / returns2.length;

  let covariance = 0;
  let variance1 = 0;
  let variance2 = 0;

  for (let i = 0; i < returns1.length; i++) {
    covariance += (returns1[i] - mean1) * (returns2[i] - mean2);
    variance1 += Math.pow(returns1[i] - mean1, 2);
    variance2 += Math.pow(returns2[i] - mean2, 2);
  }

  const denominator = Math.sqrt(variance1 * variance2);
  if (denominator === 0) return 0;

  return covariance / denominator;
}

/**
 * Calculate R-Squared (coefficient of determination)
 */
export function calculateRSquared(correlation: number): number {
  return Math.pow(correlation, 2);
}

/**
 * DSE Benchmark indices simulation (in production, fetch from API)
 */
export const DSE_BENCHMARKS = {
  DSEX: { name: 'DSE Broad Index', symbol: 'DSEX' },
  DS30: { name: 'DSE 30 Index', symbol: 'DS30' },
  DSES: { name: 'DSE Shariah Index', symbol: 'DSES' },
} as const;

/**
 * Sector benchmarks for Bangladesh market
 */
export const SECTOR_BENCHMARKS = [
  { code: 'BANK', name: 'Banking' },
  { code: 'NBFI', name: 'Non-Bank Financial Institutions' },
  { code: 'PHARMA', name: 'Pharmaceuticals & Chemicals' },
  { code: 'TEXTILE', name: 'Textile' },
  { code: 'ENGG', name: 'Engineering' },
  { code: 'CEMENT', name: 'Cement' },
  { code: 'FOOD', name: 'Food & Allied' },
  { code: 'POWER', name: 'Fuel & Power' },
  { code: 'IT', name: 'IT & Telecom' },
  { code: 'INS', name: 'Insurance' },
] as const;
