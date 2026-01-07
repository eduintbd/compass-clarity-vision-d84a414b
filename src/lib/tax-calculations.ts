/**
 * Tax Calculation Library for Bangladesh Investment Income
 * Includes capital gains, dividend tax, and cost basis methods
 */

export interface TaxLot {
  id: string;
  symbol: string;
  quantity: number;
  purchaseDate: Date;
  purchasePrice: number;
  costBasis: number;
}

export interface SaleTransaction {
  symbol: string;
  quantity: number;
  saleDate: Date;
  salePrice: number;
  proceeds: number;
}

export interface CapitalGain {
  symbol: string;
  quantity: number;
  purchaseDate: Date;
  saleDate: Date;
  costBasis: number;
  proceeds: number;
  gain: number;
  holdingPeriod: number; // days
  isLongTerm: boolean; // > 1 year
  taxRate: number;
  taxAmount: number;
}

export interface DividendIncome {
  symbol: string;
  paymentDate: Date;
  grossAmount: number;
  taxWithheld: number;
  netAmount: number;
  isQualified: boolean;
}

export interface TaxSummary {
  fiscalYear: string;
  shortTermGains: number;
  longTermGains: number;
  totalGains: number;
  shortTermLosses: number;
  longTermLosses: number;
  totalLosses: number;
  netGain: number;
  qualifiedDividends: number;
  ordinaryDividends: number;
  totalDividends: number;
  dividendTaxWithheld: number;
  estimatedTaxLiability: number;
}

export type CostBasisMethod = 'FIFO' | 'LIFO' | 'HIFO' | 'SPECIFIC_ID' | 'AVERAGE';

// Bangladesh tax rates (simplified)
export const BD_TAX_RATES = {
  CAPITAL_GAINS_LISTED: 0.10, // 10% on listed securities
  CAPITAL_GAINS_UNLISTED: 0.15, // 15% on unlisted
  DIVIDEND_TAX: 0.10, // 10% AIT on dividends
  TAX_FREE_DIVIDEND_LIMIT: 50000, // First 50,000 BDT tax-free
};

/**
 * Calculate holding period in days
 */
export function calculateHoldingPeriod(purchaseDate: Date, saleDate: Date): number {
  return Math.floor((saleDate.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Determine if holding is long-term (> 1 year)
 */
export function isLongTermHolding(purchaseDate: Date, saleDate: Date): boolean {
  return calculateHoldingPeriod(purchaseDate, saleDate) > 365;
}

/**
 * FIFO (First In, First Out) cost basis calculation
 */
export function calculateFIFO(lots: TaxLot[], sale: SaleTransaction): CapitalGain[] {
  const sortedLots = [...lots]
    .filter(l => l.symbol === sale.symbol && l.quantity > 0)
    .sort((a, b) => a.purchaseDate.getTime() - b.purchaseDate.getTime());

  const gains: CapitalGain[] = [];
  let remainingQty = sale.quantity;

  for (const lot of sortedLots) {
    if (remainingQty <= 0) break;

    const qtyFromLot = Math.min(lot.quantity, remainingQty);
    const costBasis = qtyFromLot * lot.purchasePrice;
    const proceeds = qtyFromLot * sale.salePrice;
    const gain = proceeds - costBasis;
    const holdingPeriod = calculateHoldingPeriod(lot.purchaseDate, sale.saleDate);
    const longTerm = isLongTermHolding(lot.purchaseDate, sale.saleDate);
    const taxRate = BD_TAX_RATES.CAPITAL_GAINS_LISTED;

    gains.push({
      symbol: sale.symbol,
      quantity: qtyFromLot,
      purchaseDate: lot.purchaseDate,
      saleDate: sale.saleDate,
      costBasis,
      proceeds,
      gain,
      holdingPeriod,
      isLongTerm: longTerm,
      taxRate,
      taxAmount: Math.max(0, gain * taxRate),
    });

    remainingQty -= qtyFromLot;
  }

  return gains;
}

/**
 * LIFO (Last In, First Out) cost basis calculation
 */
export function calculateLIFO(lots: TaxLot[], sale: SaleTransaction): CapitalGain[] {
  const sortedLots = [...lots]
    .filter(l => l.symbol === sale.symbol && l.quantity > 0)
    .sort((a, b) => b.purchaseDate.getTime() - a.purchaseDate.getTime());

  const gains: CapitalGain[] = [];
  let remainingQty = sale.quantity;

  for (const lot of sortedLots) {
    if (remainingQty <= 0) break;

    const qtyFromLot = Math.min(lot.quantity, remainingQty);
    const costBasis = qtyFromLot * lot.purchasePrice;
    const proceeds = qtyFromLot * sale.salePrice;
    const gain = proceeds - costBasis;
    const holdingPeriod = calculateHoldingPeriod(lot.purchaseDate, sale.saleDate);
    const longTerm = isLongTermHolding(lot.purchaseDate, sale.saleDate);
    const taxRate = BD_TAX_RATES.CAPITAL_GAINS_LISTED;

    gains.push({
      symbol: sale.symbol,
      quantity: qtyFromLot,
      purchaseDate: lot.purchaseDate,
      saleDate: sale.saleDate,
      costBasis,
      proceeds,
      gain,
      holdingPeriod,
      isLongTerm: longTerm,
      taxRate,
      taxAmount: Math.max(0, gain * taxRate),
    });

    remainingQty -= qtyFromLot;
  }

  return gains;
}

/**
 * HIFO (Highest In, First Out) - Tax-loss harvesting optimization
 */
export function calculateHIFO(lots: TaxLot[], sale: SaleTransaction): CapitalGain[] {
  const sortedLots = [...lots]
    .filter(l => l.symbol === sale.symbol && l.quantity > 0)
    .sort((a, b) => b.purchasePrice - a.purchasePrice);

  const gains: CapitalGain[] = [];
  let remainingQty = sale.quantity;

  for (const lot of sortedLots) {
    if (remainingQty <= 0) break;

    const qtyFromLot = Math.min(lot.quantity, remainingQty);
    const costBasis = qtyFromLot * lot.purchasePrice;
    const proceeds = qtyFromLot * sale.salePrice;
    const gain = proceeds - costBasis;
    const holdingPeriod = calculateHoldingPeriod(lot.purchaseDate, sale.saleDate);
    const longTerm = isLongTermHolding(lot.purchaseDate, sale.saleDate);
    const taxRate = BD_TAX_RATES.CAPITAL_GAINS_LISTED;

    gains.push({
      symbol: sale.symbol,
      quantity: qtyFromLot,
      purchaseDate: lot.purchaseDate,
      saleDate: sale.saleDate,
      costBasis,
      proceeds,
      gain,
      holdingPeriod,
      isLongTerm: longTerm,
      taxRate,
      taxAmount: Math.max(0, gain * taxRate),
    });

    remainingQty -= qtyFromLot;
  }

  return gains;
}

/**
 * Average Cost Basis calculation
 */
export function calculateAverageCost(lots: TaxLot[], sale: SaleTransaction): CapitalGain[] {
  const symbolLots = lots.filter(l => l.symbol === sale.symbol && l.quantity > 0);
  if (symbolLots.length === 0) return [];

  const totalCost = symbolLots.reduce((sum, l) => sum + l.costBasis, 0);
  const totalQty = symbolLots.reduce((sum, l) => sum + l.quantity, 0);
  const avgCost = totalCost / totalQty;

  // Find earliest purchase date for holding period
  const earliestPurchase = symbolLots.reduce(
    (earliest, l) => (l.purchaseDate < earliest ? l.purchaseDate : earliest),
    symbolLots[0].purchaseDate
  );

  const costBasis = sale.quantity * avgCost;
  const proceeds = sale.proceeds;
  const gain = proceeds - costBasis;
  const holdingPeriod = calculateHoldingPeriod(earliestPurchase, sale.saleDate);
  const longTerm = isLongTermHolding(earliestPurchase, sale.saleDate);
  const taxRate = BD_TAX_RATES.CAPITAL_GAINS_LISTED;

  return [{
    symbol: sale.symbol,
    quantity: sale.quantity,
    purchaseDate: earliestPurchase,
    saleDate: sale.saleDate,
    costBasis,
    proceeds,
    gain,
    holdingPeriod,
    isLongTerm: longTerm,
    taxRate,
    taxAmount: Math.max(0, gain * taxRate),
  }];
}

/**
 * Calculate capital gains using specified method
 */
export function calculateCapitalGains(
  lots: TaxLot[],
  sale: SaleTransaction,
  method: CostBasisMethod
): CapitalGain[] {
  switch (method) {
    case 'FIFO':
      return calculateFIFO(lots, sale);
    case 'LIFO':
      return calculateLIFO(lots, sale);
    case 'HIFO':
      return calculateHIFO(lots, sale);
    case 'AVERAGE':
      return calculateAverageCost(lots, sale);
    default:
      return calculateFIFO(lots, sale);
  }
}

/**
 * Calculate dividend tax
 */
export function calculateDividendTax(dividends: DividendIncome[]): {
  totalGross: number;
  totalTaxWithheld: number;
  totalNet: number;
  qualified: number;
  ordinary: number;
  additionalTaxDue: number;
} {
  const totalGross = dividends.reduce((sum, d) => sum + d.grossAmount, 0);
  const totalTaxWithheld = dividends.reduce((sum, d) => sum + d.taxWithheld, 0);
  const qualified = dividends.filter(d => d.isQualified).reduce((sum, d) => sum + d.grossAmount, 0);
  const ordinary = dividends.filter(d => !d.isQualified).reduce((sum, d) => sum + d.grossAmount, 0);

  // Calculate additional tax (if any)
  const taxableAmount = Math.max(0, totalGross - BD_TAX_RATES.TAX_FREE_DIVIDEND_LIMIT);
  const totalTaxDue = taxableAmount * BD_TAX_RATES.DIVIDEND_TAX;
  const additionalTaxDue = Math.max(0, totalTaxDue - totalTaxWithheld);

  return {
    totalGross,
    totalTaxWithheld,
    totalNet: totalGross - totalTaxWithheld,
    qualified,
    ordinary,
    additionalTaxDue,
  };
}

/**
 * Generate comprehensive tax summary for a fiscal year
 */
export function generateTaxSummary(
  gains: CapitalGain[],
  dividends: DividendIncome[],
  fiscalYear: string
): TaxSummary {
  const shortTermGains = gains
    .filter(g => !g.isLongTerm && g.gain > 0)
    .reduce((sum, g) => sum + g.gain, 0);

  const longTermGains = gains
    .filter(g => g.isLongTerm && g.gain > 0)
    .reduce((sum, g) => sum + g.gain, 0);

  const shortTermLosses = Math.abs(
    gains.filter(g => !g.isLongTerm && g.gain < 0).reduce((sum, g) => sum + g.gain, 0)
  );

  const longTermLosses = Math.abs(
    gains.filter(g => g.isLongTerm && g.gain < 0).reduce((sum, g) => sum + g.gain, 0)
  );

  const dividendSummary = calculateDividendTax(dividends);

  const capitalGainsTax = gains.reduce((sum, g) => sum + g.taxAmount, 0);
  const estimatedTaxLiability = capitalGainsTax + dividendSummary.additionalTaxDue;

  return {
    fiscalYear,
    shortTermGains,
    longTermGains,
    totalGains: shortTermGains + longTermGains,
    shortTermLosses,
    longTermLosses,
    totalLosses: shortTermLosses + longTermLosses,
    netGain: shortTermGains + longTermGains - shortTermLosses - longTermLosses,
    qualifiedDividends: dividendSummary.qualified,
    ordinaryDividends: dividendSummary.ordinary,
    totalDividends: dividendSummary.totalGross,
    dividendTaxWithheld: dividendSummary.totalTaxWithheld,
    estimatedTaxLiability,
  };
}

/**
 * Format tax document for export
 */
export function formatTaxReport(summary: TaxSummary): string {
  return `
INVESTMENT INCOME TAX SUMMARY
Fiscal Year: ${summary.fiscalYear}
Generated: ${new Date().toLocaleDateString()}

═══════════════════════════════════════════════════════════════

CAPITAL GAINS & LOSSES
───────────────────────────────────────────────────────────────
Short-Term Gains (≤1 year):     ${formatAmount(summary.shortTermGains)}
Long-Term Gains (>1 year):      ${formatAmount(summary.longTermGains)}
Total Capital Gains:            ${formatAmount(summary.totalGains)}

Short-Term Losses:              ${formatAmount(summary.shortTermLosses)}
Long-Term Losses:               ${formatAmount(summary.longTermLosses)}
Total Capital Losses:           ${formatAmount(summary.totalLosses)}

NET CAPITAL GAIN/(LOSS):        ${formatAmount(summary.netGain)}

═══════════════════════════════════════════════════════════════

DIVIDEND INCOME
───────────────────────────────────────────────────────────────
Qualified Dividends:            ${formatAmount(summary.qualifiedDividends)}
Ordinary Dividends:             ${formatAmount(summary.ordinaryDividends)}
Total Dividends:                ${formatAmount(summary.totalDividends)}
Tax Withheld (AIT):             ${formatAmount(summary.dividendTaxWithheld)}

═══════════════════════════════════════════════════════════════

TAX LIABILITY ESTIMATE
───────────────────────────────────────────────────────────────
Estimated Total Tax:            ${formatAmount(summary.estimatedTaxLiability)}

═══════════════════════════════════════════════════════════════

Note: This is an estimate for informational purposes only.
Consult a tax professional for accurate tax filing.
  `.trim();
}

function formatAmount(amount: number): string {
  return new Intl.NumberFormat('en-BD', {
    style: 'currency',
    currency: 'BDT',
    minimumFractionDigits: 2,
  }).format(amount);
}
