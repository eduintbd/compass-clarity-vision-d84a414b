-- Create price_history table for storing daily stock prices
CREATE TABLE public.price_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol TEXT NOT NULL,
  trade_date DATE NOT NULL,
  open_price NUMERIC DEFAULT 0,
  high_price NUMERIC DEFAULT 0,
  low_price NUMERIC DEFAULT 0,
  close_price NUMERIC NOT NULL,
  ycp NUMERIC DEFAULT 0,
  change NUMERIC DEFAULT 0,
  change_percent NUMERIC DEFAULT 0,
  volume BIGINT DEFAULT 0,
  trade_value NUMERIC DEFAULT 0,
  trades INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(symbol, trade_date)
);

-- Create index for faster lookups
CREATE INDEX idx_price_history_symbol_date ON public.price_history(symbol, trade_date DESC);

-- Enable RLS
ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read price history
CREATE POLICY "Users can read price history"
  ON public.price_history FOR SELECT
  TO authenticated
  USING (true);