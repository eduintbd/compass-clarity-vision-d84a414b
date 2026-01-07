import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Upload, FileText, Loader2, CheckCircle } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { PortfolioChangesSummary } from './PortfolioChangesSummary';

// Load PDF.js dynamically from CDN to avoid build issues
const loadPdfJs = async () => {
  if ((window as any).pdfjsLib) return (window as any).pdfjsLib;
  
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.onload = () => {
      const pdfjsLib = (window as any).pdfjsLib;
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      resolve(pdfjsLib);
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });
};

interface ParsedHolding {
  symbol: string;
  companyName: string | null;
  quantity: number;
  averageCost: number;
  costBasis: number;
  currentPrice: number;
  marketValue: number;
  unrealizedGain: number;
  unrealizedGainPercent: number;
  dayChange?: number;
  dayChangePercent?: number;
  sector?: string;
  assetClass?: string;
  acquisitionDate?: string;
  isMarginable?: boolean;
}

interface ParsedDividend {
  symbol: string;
  dividendDate?: string;
  amount: number;
  taxWithheld?: number;
  netAmount?: number;
  dividendType?: string;
  isQualified?: boolean;
}

interface ParsedPortfolio {
  accountInfo: {
    accountNumber: string;
    accountName?: string;
    brokerName?: string;
    asOfDate?: string;
    accountType?: string;
    currency?: string;
  };
  holdings: ParsedHolding[];
  summary: {
    totalCostBasis: number;
    totalMarketValue: number;
    totalUnrealizedGain: number;
    totalRealizedGain?: number;
    ledgerBalance?: number;
    cashBalance: number;
    marginBalance?: number;
    totalDividendsReceived?: number;
    accruedFees?: number;
    accruedDividends?: number;
    totalDeposit?: number;
    totalWithdraw?: number;
  };
  dividends?: ParsedDividend[];
  confidence: number;
}

interface PortfolioChanges {
  previousPortfolio: {
    total_market_value: number;
    total_cost_basis: number;
    total_unrealized_gain: number;
    as_of_date: string | null;
  };
  newPortfolio: {
    total_market_value: number;
    total_cost_basis: number;
    total_unrealized_gain: number;
    as_of_date: string | null;
  };
  holdingChanges: Array<{
    symbol: string;
    companyName?: string;
    status: 'new' | 'closed' | 'increased' | 'decreased' | 'unchanged';
    oldQuantity?: number;
    newQuantity?: number;
    quantityChange?: number;
    oldValue?: number;
    newValue?: number;
    valueChange?: number;
  }>;
}

export const PortfolioUpload = ({ onSaveSuccess }: { onSaveSuccess?: () => void }) => {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [parsedPortfolios, setParsedPortfolios] = useState<ParsedPortfolio[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [pasteText, setPasteText] = useState('');
  const [portfolioChanges, setPortfolioChanges] = useState<PortfolioChanges | null>(null);

  const extractTextFromPDF = useCallback(async (file: File): Promise<string> => {
    const pdfjsLib = await loadPdfJs() as any;
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      fullText += pageText + '\n';
    }
    
    return fullText;
  }, []);

  const parsePortfolio = useCallback(async (text: string): Promise<ParsedPortfolio[]> => {
    // Get current session
    let { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      toast({
        title: "Authentication required",
        description: "Please sign in to parse portfolio documents",
        variant: "destructive",
      });
      return [];
    }

    // Check if token is about to expire (within 60 seconds) and refresh
    const expiresAt = session.expires_at ? session.expires_at * 1000 : 0;
    const now = Date.now();
    if (expiresAt - now < 60000) {
      console.log("Session expiring soon, refreshing...");
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError) {
        console.error("Failed to refresh session:", refreshError);
        toast({
          title: "Session expired",
          description: "Please sign in again",
          variant: "destructive",
        });
        return [];
      }
      session = refreshData.session;
      if (!session) {
        toast({
          title: "Authentication required",
          description: "Please sign in to parse portfolio documents",
          variant: "destructive",
        });
        return [];
      }
    }

    console.log("Invoking parse-portfolio with token length:", session.access_token.length);

    const { data, error } = await supabase.functions.invoke('parse-portfolio', {
      body: { 
        documentText: text,
        documentType: 'portfolio-statement'
      },
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (error) {
      console.error("Parse portfolio error:", error);
      throw new Error(error.message || "Failed to invoke parse function");
    }

    if (data?.success && data?.data) {
      // data.data is now an array of portfolios
      return Array.isArray(data.data) ? data.data : [data.data];
    } else {
      throw new Error(data?.error || "Failed to parse portfolio");
    }
  }, [toast]);

  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast({
        title: "Invalid file type",
        description: "Please upload a PDF file",
        variant: "destructive",
      });
      return;
    }

    setFileName(file.name);
    setIsProcessing(true);
    setParsedPortfolios([]);

    try {
      const text = await extractTextFromPDF(file);
      
      if (text.length < 50) {
        toast({
          title: "Could not extract text",
          description: "The PDF might be image-based. Please use the manual paste option.",
          variant: "destructive",
        });
        setIsProcessing(false);
        return;
      }

      console.log("Extracted PDF text length:", text.length);
      
      const result = await parsePortfolio(text);
      if (result && result.length > 0) {
        setParsedPortfolios(result);
        const totalHoldings = result.reduce((sum, p) => sum + (p.holdings?.length || 0), 0);
        toast({
          title: "Portfolio parsed successfully",
          description: `Found ${result.length} portfolio(s) with ${totalHoldings} total holdings`,
        });
      }
    } catch (err) {
      console.error('Error processing file:', err);
      toast({
        title: "Processing error",
        description: err instanceof Error ? err.message : "Could not process the file",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  }, [toast, extractTextFromPDF, parsePortfolio]);

  const handleTextPaste = useCallback(async () => {
    if (!pasteText.trim()) return;

    setIsProcessing(true);
    setParsedPortfolios([]);

    try {
      const result = await parsePortfolio(pasteText);
      if (result && result.length > 0) {
        setParsedPortfolios(result);
        const totalHoldings = result.reduce((sum, p) => sum + (p.holdings?.length || 0), 0);
        toast({
          title: "Portfolio parsed successfully",
          description: `Found ${result.length} portfolio(s) with ${totalHoldings} total holdings`,
        });
      }
    } catch (err) {
      console.error('Error parsing text:', err);
      toast({
        title: "Parsing failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  }, [pasteText, toast, parsePortfolio]);

  const handleSavePortfolio = useCallback(async () => {
    if (parsedPortfolios.length === 0) return;

    setIsSaving(true);
    setPortfolioChanges(null);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication required",
          description: "Please sign in to save portfolio",
          variant: "destructive",
        });
        return;
      }

      let totalSaved = 0;
      let totalHoldings = 0;

      // Fetch user's saved classifications
      const { data: classifications } = await supabase
        .from('holding_classifications')
        .select('symbol, classification')
        .eq('user_id', user.id);

      const classificationMap = new Map<string, string>();
      classifications?.forEach(c => classificationMap.set(c.symbol, c.classification));

      // Save each portfolio
      for (const parsedData of parsedPortfolios) {
        // Check for existing portfolio with same account number
        const accountNumber = parsedData.accountInfo?.accountNumber || 'Unknown';
        const { data: existingPortfolios } = await supabase
          .from('portfolios')
          .select('*, holdings(*)')
          .eq('account_number', accountNumber)
          .order('as_of_date', { ascending: false })
          .limit(1);

        const previousPortfolio = existingPortfolios?.[0];

        // Carry over values that should persist across uploads
        const carryOverPrivateEquity = previousPortfolio?.private_equity_value || 0;
        const carryOverAccruedFees = previousPortfolio?.accrued_fees || 0;
        const carryOverOriginalAccruedFees = previousPortfolio?.original_accrued_fees || 0;

        // Create snapshot of previous portfolio if exists
        if (previousPortfolio) {
          await supabase.from('portfolio_snapshots').insert({
            user_id: user.id,
            portfolio_id: previousPortfolio.id,
            snapshot_date: previousPortfolio.as_of_date || new Date().toISOString().split('T')[0],
            total_market_value: previousPortfolio.total_market_value,
            total_cost_basis: previousPortfolio.total_cost_basis,
            total_unrealized_gain: previousPortfolio.total_unrealized_gain,
            cash_balance: previousPortfolio.cash_balance,
          });
        }

        // Create portfolio record
        // Use parsed accrued fees if provided, otherwise carry over from previous portfolio
        const accruedFeesValue = parsedData.summary?.accruedFees || carryOverAccruedFees;
        const originalAccruedFeesValue = parsedData.summary?.accruedFees || carryOverOriginalAccruedFees;
        
        // Handle ledger balance: if negative, it's margin (loan), if positive it's cash
        let cashBalance = parsedData.summary?.cashBalance || 0;
        let marginBalance = parsedData.summary?.marginBalance || 0;
        
        // If ledgerBalance is provided, use it to determine cash/margin
        if (parsedData.summary?.ledgerBalance !== undefined && parsedData.summary.ledgerBalance !== null) {
          const ledgerBalance = parsedData.summary.ledgerBalance;
          if (ledgerBalance < 0) {
            // Negative ledger balance means margin loan
            marginBalance = Math.abs(ledgerBalance);
            cashBalance = 0;
          } else {
            // Positive ledger balance means cash
            cashBalance = ledgerBalance;
            marginBalance = 0;
          }
        }
        
        const { data: portfolio, error: portfolioError } = await supabase
          .from('portfolios')
          .insert({
            user_id: user.id,
            account_number: accountNumber,
            account_name: parsedData.accountInfo?.accountName,
            broker_name: parsedData.accountInfo?.brokerName,
            account_type: parsedData.accountInfo?.accountType || 'brokerage',
            currency: parsedData.accountInfo?.currency || 'BDT',
            as_of_date: parsedData.accountInfo?.asOfDate || null,
            total_cost_basis: parsedData.summary?.totalCostBasis || 0,
            total_market_value: parsedData.summary?.totalMarketValue || 0,
            total_unrealized_gain: parsedData.summary?.totalUnrealizedGain || 0,
            total_realized_gain: parsedData.summary?.totalRealizedGain || 0,
            cash_balance: cashBalance,
            margin_balance: marginBalance,
            total_dividends_received: parsedData.summary?.totalDividendsReceived || 0,
            accrued_fees: accruedFeesValue,
            original_accrued_fees: originalAccruedFeesValue,
            accrued_dividends: parsedData.summary?.accruedDividends || 0,
            private_equity_value: carryOverPrivateEquity,
          })
          .select()
          .single();

        if (portfolioError) throw portfolioError;
        totalSaved++;

        // Insert holdings
        if (parsedData.holdings && parsedData.holdings.length > 0) {
          const holdingsData = parsedData.holdings.map(h => ({
            user_id: user.id,
            portfolio_id: portfolio.id,
            symbol: h.symbol,
            company_name: h.companyName,
            quantity: h.quantity || 0,
            average_cost: h.averageCost || 0,
            cost_basis: h.costBasis || 0,
            current_price: h.currentPrice || 0,
            market_value: h.marketValue || 0,
            unrealized_gain: h.unrealizedGain || 0,
            unrealized_gain_percent: h.unrealizedGainPercent || 0,
            day_change: h.dayChange || 0,
            day_change_percent: h.dayChangePercent || 0,
            sector: h.sector || null,
            asset_class: h.assetClass || 'equity',
            acquisition_date: h.acquisitionDate || null,
            classification: classificationMap.get(h.symbol) || null,
          }));

          const { error: holdingsError } = await supabase
            .from('holdings')
            .insert(holdingsData);

          if (holdingsError) throw holdingsError;
          totalHoldings += holdingsData.length;
        }

        // Insert dividends
        if (parsedData.dividends && parsedData.dividends.length > 0) {
          const dividendsData = parsedData.dividends.map(d => ({
            user_id: user.id,
            portfolio_id: portfolio.id,
            symbol: d.symbol,
            amount: d.amount || 0,
            dividend_date: d.dividendDate || new Date().toISOString().split('T')[0],
            tax_withheld: d.taxWithheld || 0,
            dividend_type: d.dividendType || 'cash',
            is_qualified: d.isQualified || false,
          }));

          const { error: dividendsError } = await supabase
            .from('dividends')
            .insert(dividendsData);

          if (dividendsError) throw dividendsError;
        }
      }

      toast({
        title: "Portfolios saved",
        description: `Saved ${totalSaved} portfolio(s) with ${totalHoldings} holdings`,
      });

      setParsedPortfolios([]);
      setPasteText('');
      onSaveSuccess?.();

      // Auto-refresh prices to populate YCP and day_change
      try {
        console.log("Auto-refreshing prices after portfolio save...");
        await supabase.functions.invoke('fetch-mds-prices');
      } catch (refreshError) {
        console.log("Price refresh skipped:", refreshError);
      }
    } catch (err) {
      console.error('Error saving portfolio:', err);
      toast({
        title: "Save failed",
        description: err instanceof Error ? err.message : "Could not save portfolio",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }, [parsedPortfolios, toast, onSaveSuccess]);

  return (
    <div className="space-y-6">
      {/* Portfolio Changes Summary */}
      {portfolioChanges && (
        <PortfolioChangesSummary 
          {...portfolioChanges}
          onDismiss={() => setPortfolioChanges(null)}
        />
      )}

      {/* Upload Card */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import Portfolio Statement
          </CardTitle>
          <CardDescription>
            Upload a PDF portfolio statement or paste the text content for AI parsing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* File Upload */}
          <div className="border-2 border-dashed border-border/50 rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileSelect}
              className="hidden"
              id="portfolio-upload"
              disabled={isProcessing}
            />
            <label htmlFor="portfolio-upload" className="cursor-pointer">
              {isProcessing ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-10 w-10 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Processing {fileName}...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <FileText className="h-10 w-10 text-muted-foreground" />
                  <p className="text-sm font-medium">Click to upload PDF</p>
                  <p className="text-xs text-muted-foreground">Portfolio statements from your brokerage</p>
                </div>
              )}
            </label>
          </div>

          {/* Or divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border/50" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Or paste text</span>
            </div>
          </div>

          {/* Text Paste Area */}
          <div className="space-y-2">
            <textarea
              className="w-full h-32 p-3 text-sm bg-muted/30 border border-border/50 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="Paste your portfolio statement text here..."
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              disabled={isProcessing}
            />
            <Button 
              onClick={handleTextPaste}
              disabled={isProcessing || !pasteText.trim()}
              className="w-full"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Parsing...
                </>
              ) : (
                'Parse Portfolio'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Parsed Results - Multiple Portfolios */}
      {parsedPortfolios.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">
              Parsed {parsedPortfolios.length} Portfolio{parsedPortfolios.length > 1 ? 's' : ''}
            </h3>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setParsedPortfolios([])} disabled={isSaving}>
                Clear All
              </Button>
              <Button onClick={handleSavePortfolio} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  `Save All ${parsedPortfolios.length} Portfolio${parsedPortfolios.length > 1 ? 's' : ''}`
                )}
              </Button>
            </div>
          </div>

          {parsedPortfolios.map((parsedData, portfolioIdx) => (
            <Card key={portfolioIdx} className="bg-card/50 border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-emerald-500" />
                  {parsedData.accountInfo?.brokerName || 'Portfolio'} - {parsedData.accountInfo?.accountNumber}
                </CardTitle>
                <CardDescription>
                  {parsedData.accountInfo?.accountName}
                  {parsedData.accountInfo?.asOfDate && (
                    <span className="ml-2">as of {parsedData.accountInfo.asOfDate}</span>
                  )}
                  {parsedData.confidence && (
                    <span className="ml-2 text-xs">
                      (Confidence: {Math.round(parsedData.confidence * 100)}%)
                    </span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Account Info */}
                {parsedData.accountInfo && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/20 rounded-lg">
                    {parsedData.accountInfo.accountName && (
                      <div>
                        <p className="text-xs text-muted-foreground">Account Holder</p>
                        <p className="text-sm font-medium">{parsedData.accountInfo.accountName}</p>
                      </div>
                    )}
                    {parsedData.accountInfo.accountType && (
                      <div>
                        <p className="text-xs text-muted-foreground">Account Type</p>
                        <p className="text-sm font-medium capitalize">{parsedData.accountInfo.accountType}</p>
                      </div>
                    )}
                    {parsedData.accountInfo.currency && (
                      <div>
                        <p className="text-xs text-muted-foreground">Currency</p>
                        <p className="text-sm font-medium">{parsedData.accountInfo.currency}</p>
                      </div>
                    )}
                    {parsedData.accountInfo.asOfDate && (
                      <div>
                        <p className="text-xs text-muted-foreground">Statement Date</p>
                        <p className="text-sm font-medium">{parsedData.accountInfo.asOfDate}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <p className="text-xs text-muted-foreground">Total Cost Basis</p>
                    <p className="text-lg font-semibold">{formatCurrency(parsedData.summary?.totalCostBasis || 0)}</p>
                  </div>
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <p className="text-xs text-muted-foreground">Market Value</p>
                    <p className="text-lg font-semibold">{formatCurrency(parsedData.summary?.totalMarketValue || 0)}</p>
                  </div>
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <p className="text-xs text-muted-foreground">Unrealized Gain/Loss</p>
                    <p className={`text-lg font-semibold ${(parsedData.summary?.totalUnrealizedGain || 0) >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                      {formatCurrency(parsedData.summary?.totalUnrealizedGain || 0)}
                    </p>
                  </div>
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <p className="text-xs text-muted-foreground">Cash Balance</p>
                    <p className="text-lg font-semibold">{formatCurrency(parsedData.summary?.cashBalance || 0)}</p>
                  </div>
                  {parsedData.summary?.totalRealizedGain !== undefined && (
                    <div className="p-3 bg-muted/30 rounded-lg">
                      <p className="text-xs text-muted-foreground">Realized Gain/Loss</p>
                      <p className={`text-lg font-semibold ${(parsedData.summary.totalRealizedGain) >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                        {formatCurrency(parsedData.summary.totalRealizedGain)}
                      </p>
                    </div>
                  )}
                  {parsedData.summary?.totalDividendsReceived !== undefined && (
                    <div className="p-3 bg-muted/30 rounded-lg">
                      <p className="text-xs text-muted-foreground">Total Dividends</p>
                      <p className="text-lg font-semibold text-emerald-500">
                        {formatCurrency(parsedData.summary.totalDividendsReceived)}
                      </p>
                    </div>
                  )}
                </div>

                {/* Holdings Table */}
                {parsedData.holdings && parsedData.holdings.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-3">Holdings ({parsedData.holdings.length})</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border/50">
                            <th className="text-left py-2 px-2 text-muted-foreground font-medium">Symbol</th>
                            <th className="text-left py-2 px-2 text-muted-foreground font-medium">Company</th>
                            <th className="text-left py-2 px-2 text-muted-foreground font-medium">Sector</th>
                            <th className="text-right py-2 px-2 text-muted-foreground font-medium">Qty</th>
                            <th className="text-right py-2 px-2 text-muted-foreground font-medium">Avg Cost</th>
                            <th className="text-right py-2 px-2 text-muted-foreground font-medium">Cost Basis</th>
                            <th className="text-right py-2 px-2 text-muted-foreground font-medium">Price</th>
                            <th className="text-right py-2 px-2 text-muted-foreground font-medium">Market Value</th>
                            <th className="text-right py-2 px-2 text-muted-foreground font-medium">Gain/Loss</th>
                            <th className="text-right py-2 px-2 text-muted-foreground font-medium">%</th>
                          </tr>
                        </thead>
                        <tbody>
                          {parsedData.holdings.map((holding, idx) => (
                            <tr key={idx} className="border-b border-border/30 hover:bg-muted/20">
                              <td className="py-2 px-2 font-medium">{holding.symbol}</td>
                              <td className="py-2 px-2 text-muted-foreground max-w-32 truncate">{holding.companyName || '-'}</td>
                              <td className="py-2 px-2 text-muted-foreground">{holding.sector || '-'}</td>
                              <td className="py-2 px-2 text-right">{holding.quantity?.toLocaleString()}</td>
                              <td className="py-2 px-2 text-right">{formatCurrency(holding.averageCost || 0)}</td>
                              <td className="py-2 px-2 text-right">{formatCurrency(holding.costBasis || 0)}</td>
                              <td className="py-2 px-2 text-right">{formatCurrency(holding.currentPrice || 0)}</td>
                              <td className="py-2 px-2 text-right">{formatCurrency(holding.marketValue || 0)}</td>
                              <td className={`py-2 px-2 text-right ${(holding.unrealizedGain || 0) >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                {formatCurrency(holding.unrealizedGain || 0)}
                              </td>
                              <td className={`py-2 px-2 text-right ${(holding.unrealizedGainPercent || 0) >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                {(holding.unrealizedGainPercent || 0).toFixed(2)}%
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Dividends */}
                {parsedData.dividends && parsedData.dividends.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-3">Dividend Receivables ({parsedData.dividends.length})</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border/50">
                            <th className="text-left py-2 px-2 text-muted-foreground font-medium">Symbol</th>
                            <th className="text-left py-2 px-2 text-muted-foreground font-medium">Date</th>
                            <th className="text-left py-2 px-2 text-muted-foreground font-medium">Type</th>
                            <th className="text-right py-2 px-2 text-muted-foreground font-medium">Gross Amount</th>
                            <th className="text-right py-2 px-2 text-muted-foreground font-medium">Tax</th>
                            <th className="text-right py-2 px-2 text-muted-foreground font-medium">Net Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {parsedData.dividends.map((div, idx) => (
                            <tr key={idx} className="border-b border-border/30 hover:bg-muted/20">
                              <td className="py-2 px-2 font-medium">{div.symbol}</td>
                              <td className="py-2 px-2 text-muted-foreground">{div.dividendDate || '-'}</td>
                              <td className="py-2 px-2 text-muted-foreground capitalize">{div.dividendType || 'cash'}</td>
                              <td className="py-2 px-2 text-right">{formatCurrency(div.amount || 0)}</td>
                              <td className="py-2 px-2 text-right text-red-500">{formatCurrency(div.taxWithheld || 0)}</td>
                              <td className="py-2 px-2 text-right text-emerald-500">{formatCurrency(div.netAmount || div.amount || 0)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};