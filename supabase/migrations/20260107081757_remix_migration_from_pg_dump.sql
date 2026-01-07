CREATE EXTENSION IF NOT EXISTS "pg_cron";
CREATE EXTENSION IF NOT EXISTS "pg_graphql";
CREATE EXTENSION IF NOT EXISTS "pg_net";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "plpgsql";
CREATE EXTENSION IF NOT EXISTS "supabase_vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
BEGIN;

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name');
  RETURN NEW;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


SET default_table_access_method = heap;

--
-- Name: accounts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.accounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    type text NOT NULL,
    institution text NOT NULL,
    balance numeric(15,2) DEFAULT 0 NOT NULL,
    currency text DEFAULT 'BDT'::text NOT NULL,
    icon text DEFAULT '🏦'::text,
    is_active boolean DEFAULT true,
    last_synced_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT accounts_type_check CHECK ((type = ANY (ARRAY['bank'::text, 'mobile_wallet'::text, 'credit_card'::text, 'investment'::text, 'loan'::text, 'savings'::text, 'real_estate'::text, 'business'::text])))
);


--
-- Name: alerts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.alerts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    type text NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    is_read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT alerts_type_check CHECK ((type = ANY (ARRAY['warning'::text, 'info'::text, 'success'::text, 'error'::text])))
);


--
-- Name: bills; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bills (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    amount numeric(15,2) NOT NULL,
    category text NOT NULL,
    due_date integer,
    frequency text DEFAULT 'monthly'::text,
    account_id uuid,
    is_active boolean DEFAULT true,
    auto_pay boolean DEFAULT false,
    next_due_date date,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT bills_due_date_check CHECK (((due_date >= 1) AND (due_date <= 31))),
    CONSTRAINT bills_frequency_check CHECK ((frequency = ANY (ARRAY['weekly'::text, 'monthly'::text, 'quarterly'::text, 'yearly'::text])))
);


--
-- Name: budgets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.budgets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    category text NOT NULL,
    allocated numeric(15,2) NOT NULL,
    spent numeric(15,2) DEFAULT 0 NOT NULL,
    period text DEFAULT 'monthly'::text,
    color text DEFAULT 'hsl(var(--chart-1))'::text,
    rollover boolean DEFAULT false,
    start_date date,
    end_date date,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT budgets_period_check CHECK ((period = ANY (ARRAY['weekly'::text, 'monthly'::text, 'yearly'::text])))
);


--
-- Name: categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    type text NOT NULL,
    icon text DEFAULT '📁'::text,
    color text DEFAULT 'hsl(var(--chart-1))'::text,
    parent_id uuid,
    is_system boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT categories_type_check CHECK ((type = ANY (ARRAY['income'::text, 'expense'::text])))
);


--
-- Name: dividends; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dividends (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    portfolio_id uuid NOT NULL,
    holding_id uuid,
    user_id uuid NOT NULL,
    symbol text NOT NULL,
    dividend_date date NOT NULL,
    amount numeric NOT NULL,
    dividend_type text DEFAULT 'cash'::text,
    tax_withheld numeric DEFAULT 0,
    is_qualified boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: email_forwarding; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_forwarding (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    forwarding_key text DEFAULT encode(extensions.gen_random_bytes(12), 'hex'::text) NOT NULL,
    is_active boolean DEFAULT true,
    emails_processed integer DEFAULT 0,
    last_email_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: goals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.goals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    target_amount numeric(15,2) NOT NULL,
    current_amount numeric(15,2) DEFAULT 0 NOT NULL,
    deadline date,
    icon text DEFAULT '🎯'::text,
    linked_account_id uuid,
    priority integer DEFAULT 1,
    is_completed boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: holding_classifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.holding_classifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    symbol text NOT NULL,
    classification text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: holdings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.holdings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    portfolio_id uuid NOT NULL,
    user_id uuid NOT NULL,
    symbol text NOT NULL,
    company_name text,
    quantity numeric DEFAULT 0 NOT NULL,
    average_cost numeric DEFAULT 0 NOT NULL,
    current_price numeric DEFAULT 0 NOT NULL,
    market_value numeric DEFAULT 0 NOT NULL,
    cost_basis numeric DEFAULT 0 NOT NULL,
    unrealized_gain numeric DEFAULT 0 NOT NULL,
    unrealized_gain_percent numeric DEFAULT 0,
    realized_gain numeric DEFAULT 0 NOT NULL,
    day_change numeric DEFAULT 0,
    day_change_percent numeric DEFAULT 0,
    sector text,
    asset_class text DEFAULT 'equity'::text,
    acquisition_date date,
    last_updated_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    classification text,
    ycp numeric DEFAULT 0,
    day_high numeric DEFAULT 0,
    day_low numeric DEFAULT 0,
    day_open numeric DEFAULT 0,
    volume numeric DEFAULT 0,
    trade_value numeric DEFAULT 0,
    trades integer DEFAULT 0
);


--
-- Name: parsed_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.parsed_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    raw_email_content text,
    parsed_amount numeric,
    parsed_description text,
    parsed_date date,
    parsed_merchant text,
    parsed_type text,
    parsed_category text,
    confidence_score numeric,
    status text DEFAULT 'pending'::text,
    linked_transaction_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT parsed_transactions_parsed_type_check CHECK ((parsed_type = ANY (ARRAY['income'::text, 'expense'::text, 'transfer'::text]))),
    CONSTRAINT parsed_transactions_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])))
);


--
-- Name: portfolio_cash_flows; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.portfolio_cash_flows (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    portfolio_id uuid NOT NULL,
    user_id uuid NOT NULL,
    flow_date date NOT NULL,
    flow_type text NOT NULL,
    amount numeric NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT portfolio_cash_flows_flow_type_check CHECK ((flow_type = ANY (ARRAY['deposit'::text, 'withdrawal'::text, 'dividend'::text, 'interest'::text, 'fee'::text, 'tax'::text])))
);


--
-- Name: portfolio_snapshots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.portfolio_snapshots (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    portfolio_id uuid NOT NULL,
    user_id uuid NOT NULL,
    snapshot_date date NOT NULL,
    total_market_value numeric NOT NULL,
    total_cost_basis numeric NOT NULL,
    total_unrealized_gain numeric NOT NULL,
    cash_balance numeric DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    total_realized_gain numeric DEFAULT 0,
    total_dividends numeric DEFAULT 0,
    total_deposits numeric DEFAULT 0,
    total_withdrawals numeric DEFAULT 0
);


--
-- Name: portfolio_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.portfolio_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    portfolio_id uuid NOT NULL,
    holding_id uuid,
    user_id uuid NOT NULL,
    symbol text NOT NULL,
    transaction_type text NOT NULL,
    quantity numeric NOT NULL,
    price numeric NOT NULL,
    total_amount numeric NOT NULL,
    commission numeric DEFAULT 0,
    fees numeric DEFAULT 0,
    transaction_date date NOT NULL,
    settlement_date date,
    realized_gain numeric DEFAULT 0,
    cost_basis_method text DEFAULT 'fifo'::text,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: portfolios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.portfolios (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    account_number text NOT NULL,
    account_name text,
    broker_name text,
    account_type text DEFAULT 'brokerage'::text,
    currency text DEFAULT 'BDT'::text NOT NULL,
    total_market_value numeric DEFAULT 0 NOT NULL,
    total_cost_basis numeric DEFAULT 0 NOT NULL,
    total_unrealized_gain numeric DEFAULT 0 NOT NULL,
    total_realized_gain numeric DEFAULT 0 NOT NULL,
    total_dividends_received numeric DEFAULT 0 NOT NULL,
    cash_balance numeric DEFAULT 0 NOT NULL,
    margin_balance numeric DEFAULT 0,
    as_of_date date,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    equity_at_cost numeric DEFAULT 0 NOT NULL,
    equity_at_market numeric DEFAULT 0 NOT NULL,
    accrued_fees numeric DEFAULT 0 NOT NULL,
    accrued_dividends numeric DEFAULT 0 NOT NULL,
    pending_settlements numeric DEFAULT 0 NOT NULL,
    private_equity_value numeric DEFAULT 0 NOT NULL,
    original_accrued_fees numeric DEFAULT 0
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    full_name text,
    avatar_url text,
    preferred_currency text DEFAULT 'BDT'::text,
    shariah_mode boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: share_transfers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.share_transfers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    from_portfolio_id uuid,
    to_portfolio_id uuid,
    symbol text NOT NULL,
    quantity numeric NOT NULL,
    cost_basis numeric DEFAULT 0 NOT NULL,
    market_value numeric DEFAULT 0 NOT NULL,
    transfer_date date NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: tax_documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tax_documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    portfolio_id uuid,
    user_id uuid NOT NULL,
    document_type text NOT NULL,
    tax_year integer NOT NULL,
    document_name text,
    storage_path text,
    total_dividends numeric DEFAULT 0,
    qualified_dividends numeric DEFAULT 0,
    short_term_gains numeric DEFAULT 0,
    long_term_gains numeric DEFAULT 0,
    total_proceeds numeric DEFAULT 0,
    total_cost_basis numeric DEFAULT 0,
    tax_withheld numeric DEFAULT 0,
    parsed_data jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    account_id uuid NOT NULL,
    date date NOT NULL,
    description text NOT NULL,
    amount numeric(15,2) NOT NULL,
    category text NOT NULL,
    subcategory text,
    type text NOT NULL,
    merchant text,
    tags text[],
    notes text,
    is_reviewed boolean DEFAULT false,
    is_recurring boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT transactions_type_check CHECK ((type = ANY (ARRAY['income'::text, 'expense'::text, 'transfer'::text])))
);


--
-- Name: accounts accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_pkey PRIMARY KEY (id);


--
-- Name: alerts alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alerts
    ADD CONSTRAINT alerts_pkey PRIMARY KEY (id);


--
-- Name: bills bills_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bills
    ADD CONSTRAINT bills_pkey PRIMARY KEY (id);


--
-- Name: budgets budgets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.budgets
    ADD CONSTRAINT budgets_pkey PRIMARY KEY (id);


--
-- Name: budgets budgets_user_id_category_period_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.budgets
    ADD CONSTRAINT budgets_user_id_category_period_key UNIQUE (user_id, category, period);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: categories categories_user_id_name_type_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_user_id_name_type_key UNIQUE (user_id, name, type);


--
-- Name: dividends dividends_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dividends
    ADD CONSTRAINT dividends_pkey PRIMARY KEY (id);


--
-- Name: email_forwarding email_forwarding_forwarding_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_forwarding
    ADD CONSTRAINT email_forwarding_forwarding_key_key UNIQUE (forwarding_key);


--
-- Name: email_forwarding email_forwarding_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_forwarding
    ADD CONSTRAINT email_forwarding_pkey PRIMARY KEY (id);


--
-- Name: email_forwarding email_forwarding_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_forwarding
    ADD CONSTRAINT email_forwarding_user_id_key UNIQUE (user_id);


--
-- Name: goals goals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goals
    ADD CONSTRAINT goals_pkey PRIMARY KEY (id);


--
-- Name: holding_classifications holding_classifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.holding_classifications
    ADD CONSTRAINT holding_classifications_pkey PRIMARY KEY (id);


--
-- Name: holding_classifications holding_classifications_user_id_symbol_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.holding_classifications
    ADD CONSTRAINT holding_classifications_user_id_symbol_key UNIQUE (user_id, symbol);


--
-- Name: holdings holdings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.holdings
    ADD CONSTRAINT holdings_pkey PRIMARY KEY (id);


--
-- Name: parsed_transactions parsed_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.parsed_transactions
    ADD CONSTRAINT parsed_transactions_pkey PRIMARY KEY (id);


--
-- Name: portfolio_cash_flows portfolio_cash_flows_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portfolio_cash_flows
    ADD CONSTRAINT portfolio_cash_flows_pkey PRIMARY KEY (id);


--
-- Name: portfolio_snapshots portfolio_snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portfolio_snapshots
    ADD CONSTRAINT portfolio_snapshots_pkey PRIMARY KEY (id);


--
-- Name: portfolio_snapshots portfolio_snapshots_portfolio_id_snapshot_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portfolio_snapshots
    ADD CONSTRAINT portfolio_snapshots_portfolio_id_snapshot_date_key UNIQUE (portfolio_id, snapshot_date);


--
-- Name: portfolio_transactions portfolio_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portfolio_transactions
    ADD CONSTRAINT portfolio_transactions_pkey PRIMARY KEY (id);


--
-- Name: portfolios portfolios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portfolios
    ADD CONSTRAINT portfolios_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_user_id_key UNIQUE (user_id);


--
-- Name: share_transfers share_transfers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.share_transfers
    ADD CONSTRAINT share_transfers_pkey PRIMARY KEY (id);


--
-- Name: tax_documents tax_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tax_documents
    ADD CONSTRAINT tax_documents_pkey PRIMARY KEY (id);


--
-- Name: transactions transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_pkey PRIMARY KEY (id);


--
-- Name: idx_accounts_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_accounts_user_id ON public.accounts USING btree (user_id);


--
-- Name: idx_alerts_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_alerts_user_id ON public.alerts USING btree (user_id);


--
-- Name: idx_bills_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bills_user_id ON public.bills USING btree (user_id);


--
-- Name: idx_budgets_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_budgets_user_id ON public.budgets USING btree (user_id);


--
-- Name: idx_categories_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_categories_user_id ON public.categories USING btree (user_id);


--
-- Name: idx_dividends_portfolio_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dividends_portfolio_id ON public.dividends USING btree (portfolio_id);


--
-- Name: idx_dividends_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dividends_user_id ON public.dividends USING btree (user_id);


--
-- Name: idx_goals_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_goals_user_id ON public.goals USING btree (user_id);


--
-- Name: idx_holdings_portfolio_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_holdings_portfolio_id ON public.holdings USING btree (portfolio_id);


--
-- Name: idx_holdings_symbol; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_holdings_symbol ON public.holdings USING btree (symbol);


--
-- Name: idx_holdings_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_holdings_user_id ON public.holdings USING btree (user_id);


--
-- Name: idx_portfolio_cash_flows_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_portfolio_cash_flows_date ON public.portfolio_cash_flows USING btree (flow_date);


--
-- Name: idx_portfolio_cash_flows_portfolio; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_portfolio_cash_flows_portfolio ON public.portfolio_cash_flows USING btree (portfolio_id);


--
-- Name: idx_portfolio_cash_flows_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_portfolio_cash_flows_user ON public.portfolio_cash_flows USING btree (user_id);


--
-- Name: idx_portfolio_snapshots_portfolio_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_portfolio_snapshots_portfolio_id ON public.portfolio_snapshots USING btree (portfolio_id);


--
-- Name: idx_portfolio_transactions_portfolio_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_portfolio_transactions_portfolio_id ON public.portfolio_transactions USING btree (portfolio_id);


--
-- Name: idx_portfolio_transactions_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_portfolio_transactions_user_id ON public.portfolio_transactions USING btree (user_id);


--
-- Name: idx_portfolios_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_portfolios_user_id ON public.portfolios USING btree (user_id);


--
-- Name: idx_share_transfers_from_portfolio; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_share_transfers_from_portfolio ON public.share_transfers USING btree (from_portfolio_id);


--
-- Name: idx_share_transfers_to_portfolio; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_share_transfers_to_portfolio ON public.share_transfers USING btree (to_portfolio_id);


--
-- Name: idx_share_transfers_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_share_transfers_user_id ON public.share_transfers USING btree (user_id);


--
-- Name: idx_tax_documents_tax_year; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tax_documents_tax_year ON public.tax_documents USING btree (tax_year);


--
-- Name: idx_tax_documents_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tax_documents_user_id ON public.tax_documents USING btree (user_id);


--
-- Name: idx_transactions_account_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transactions_account_id ON public.transactions USING btree (account_id);


--
-- Name: idx_transactions_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transactions_category ON public.transactions USING btree (category);


--
-- Name: idx_transactions_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transactions_date ON public.transactions USING btree (date);


--
-- Name: idx_transactions_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transactions_user_id ON public.transactions USING btree (user_id);


--
-- Name: accounts update_accounts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON public.accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: bills update_bills_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_bills_updated_at BEFORE UPDATE ON public.bills FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: budgets update_budgets_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_budgets_updated_at BEFORE UPDATE ON public.budgets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: email_forwarding update_email_forwarding_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_email_forwarding_updated_at BEFORE UPDATE ON public.email_forwarding FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: goals update_goals_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_goals_updated_at BEFORE UPDATE ON public.goals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: holding_classifications update_holding_classifications_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_holding_classifications_updated_at BEFORE UPDATE ON public.holding_classifications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: holdings update_holdings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_holdings_updated_at BEFORE UPDATE ON public.holdings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: parsed_transactions update_parsed_transactions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_parsed_transactions_updated_at BEFORE UPDATE ON public.parsed_transactions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: portfolios update_portfolios_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_portfolios_updated_at BEFORE UPDATE ON public.portfolios FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: profiles update_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: tax_documents update_tax_documents_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_tax_documents_updated_at BEFORE UPDATE ON public.tax_documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: transactions update_transactions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: accounts accounts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: alerts alerts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alerts
    ADD CONSTRAINT alerts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: bills bills_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bills
    ADD CONSTRAINT bills_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE SET NULL;


--
-- Name: bills bills_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bills
    ADD CONSTRAINT bills_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: budgets budgets_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.budgets
    ADD CONSTRAINT budgets_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: categories categories_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.categories(id) ON DELETE SET NULL;


--
-- Name: categories categories_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: dividends dividends_holding_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dividends
    ADD CONSTRAINT dividends_holding_id_fkey FOREIGN KEY (holding_id) REFERENCES public.holdings(id) ON DELETE SET NULL;


--
-- Name: dividends dividends_portfolio_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dividends
    ADD CONSTRAINT dividends_portfolio_id_fkey FOREIGN KEY (portfolio_id) REFERENCES public.portfolios(id) ON DELETE CASCADE;


--
-- Name: goals goals_linked_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goals
    ADD CONSTRAINT goals_linked_account_id_fkey FOREIGN KEY (linked_account_id) REFERENCES public.accounts(id) ON DELETE SET NULL;


--
-- Name: goals goals_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goals
    ADD CONSTRAINT goals_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: holdings holdings_portfolio_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.holdings
    ADD CONSTRAINT holdings_portfolio_id_fkey FOREIGN KEY (portfolio_id) REFERENCES public.portfolios(id) ON DELETE CASCADE;


--
-- Name: parsed_transactions parsed_transactions_linked_transaction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.parsed_transactions
    ADD CONSTRAINT parsed_transactions_linked_transaction_id_fkey FOREIGN KEY (linked_transaction_id) REFERENCES public.transactions(id);


--
-- Name: portfolio_cash_flows portfolio_cash_flows_portfolio_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portfolio_cash_flows
    ADD CONSTRAINT portfolio_cash_flows_portfolio_id_fkey FOREIGN KEY (portfolio_id) REFERENCES public.portfolios(id) ON DELETE CASCADE;


--
-- Name: portfolio_snapshots portfolio_snapshots_portfolio_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portfolio_snapshots
    ADD CONSTRAINT portfolio_snapshots_portfolio_id_fkey FOREIGN KEY (portfolio_id) REFERENCES public.portfolios(id) ON DELETE CASCADE;


--
-- Name: portfolio_transactions portfolio_transactions_holding_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portfolio_transactions
    ADD CONSTRAINT portfolio_transactions_holding_id_fkey FOREIGN KEY (holding_id) REFERENCES public.holdings(id) ON DELETE SET NULL;


--
-- Name: portfolio_transactions portfolio_transactions_portfolio_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portfolio_transactions
    ADD CONSTRAINT portfolio_transactions_portfolio_id_fkey FOREIGN KEY (portfolio_id) REFERENCES public.portfolios(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: share_transfers share_transfers_from_portfolio_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.share_transfers
    ADD CONSTRAINT share_transfers_from_portfolio_id_fkey FOREIGN KEY (from_portfolio_id) REFERENCES public.portfolios(id) ON DELETE CASCADE;


--
-- Name: share_transfers share_transfers_to_portfolio_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.share_transfers
    ADD CONSTRAINT share_transfers_to_portfolio_id_fkey FOREIGN KEY (to_portfolio_id) REFERENCES public.portfolios(id) ON DELETE CASCADE;


--
-- Name: tax_documents tax_documents_portfolio_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tax_documents
    ADD CONSTRAINT tax_documents_portfolio_id_fkey FOREIGN KEY (portfolio_id) REFERENCES public.portfolios(id) ON DELETE SET NULL;


--
-- Name: transactions transactions_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;


--
-- Name: transactions transactions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: email_forwarding Users can create their own forwarding config; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own forwarding config" ON public.email_forwarding FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: accounts Users can delete their own accounts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own accounts" ON public.accounts FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: alerts Users can delete their own alerts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own alerts" ON public.alerts FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: bills Users can delete their own bills; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own bills" ON public.bills FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: budgets Users can delete their own budgets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own budgets" ON public.budgets FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: portfolio_cash_flows Users can delete their own cash flows; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own cash flows" ON public.portfolio_cash_flows FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: categories Users can delete their own categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own categories" ON public.categories FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: holding_classifications Users can delete their own classifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own classifications" ON public.holding_classifications FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: dividends Users can delete their own dividends; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own dividends" ON public.dividends FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: goals Users can delete their own goals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own goals" ON public.goals FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: holdings Users can delete their own holdings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own holdings" ON public.holdings FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: parsed_transactions Users can delete their own parsed transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own parsed transactions" ON public.parsed_transactions FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: portfolio_snapshots Users can delete their own portfolio snapshots; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own portfolio snapshots" ON public.portfolio_snapshots FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: portfolio_transactions Users can delete their own portfolio transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own portfolio transactions" ON public.portfolio_transactions FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: portfolios Users can delete their own portfolios; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own portfolios" ON public.portfolios FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: share_transfers Users can delete their own share transfers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own share transfers" ON public.share_transfers FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: tax_documents Users can delete their own tax documents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own tax documents" ON public.tax_documents FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: transactions Users can delete their own transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own transactions" ON public.transactions FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: accounts Users can insert their own accounts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own accounts" ON public.accounts FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: alerts Users can insert their own alerts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own alerts" ON public.alerts FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: bills Users can insert their own bills; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own bills" ON public.bills FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: budgets Users can insert their own budgets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own budgets" ON public.budgets FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: portfolio_cash_flows Users can insert their own cash flows; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own cash flows" ON public.portfolio_cash_flows FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: categories Users can insert their own categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own categories" ON public.categories FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: holding_classifications Users can insert their own classifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own classifications" ON public.holding_classifications FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: dividends Users can insert their own dividends; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own dividends" ON public.dividends FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: goals Users can insert their own goals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own goals" ON public.goals FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: holdings Users can insert their own holdings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own holdings" ON public.holdings FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: portfolio_snapshots Users can insert their own portfolio snapshots; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own portfolio snapshots" ON public.portfolio_snapshots FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: portfolio_transactions Users can insert their own portfolio transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own portfolio transactions" ON public.portfolio_transactions FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: portfolios Users can insert their own portfolios; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own portfolios" ON public.portfolios FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: profiles Users can insert their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: share_transfers Users can insert their own share transfers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own share transfers" ON public.share_transfers FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: tax_documents Users can insert their own tax documents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own tax documents" ON public.tax_documents FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: transactions Users can insert their own transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own transactions" ON public.transactions FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: accounts Users can update their own accounts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own accounts" ON public.accounts FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: alerts Users can update their own alerts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own alerts" ON public.alerts FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: bills Users can update their own bills; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own bills" ON public.bills FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: budgets Users can update their own budgets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own budgets" ON public.budgets FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: portfolio_cash_flows Users can update their own cash flows; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own cash flows" ON public.portfolio_cash_flows FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: categories Users can update their own categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own categories" ON public.categories FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: holding_classifications Users can update their own classifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own classifications" ON public.holding_classifications FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: dividends Users can update their own dividends; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own dividends" ON public.dividends FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: email_forwarding Users can update their own forwarding config; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own forwarding config" ON public.email_forwarding FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: goals Users can update their own goals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own goals" ON public.goals FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: holdings Users can update their own holdings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own holdings" ON public.holdings FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: parsed_transactions Users can update their own parsed transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own parsed transactions" ON public.parsed_transactions FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: portfolio_transactions Users can update their own portfolio transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own portfolio transactions" ON public.portfolio_transactions FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: portfolios Users can update their own portfolios; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own portfolios" ON public.portfolios FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: profiles Users can update their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: share_transfers Users can update their own share transfers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own share transfers" ON public.share_transfers FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: tax_documents Users can update their own tax documents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own tax documents" ON public.tax_documents FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: transactions Users can update their own transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own transactions" ON public.transactions FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: accounts Users can view their own accounts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own accounts" ON public.accounts FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: alerts Users can view their own alerts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own alerts" ON public.alerts FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: bills Users can view their own bills; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own bills" ON public.bills FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: budgets Users can view their own budgets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own budgets" ON public.budgets FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: portfolio_cash_flows Users can view their own cash flows; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own cash flows" ON public.portfolio_cash_flows FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: categories Users can view their own categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own categories" ON public.categories FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: holding_classifications Users can view their own classifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own classifications" ON public.holding_classifications FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: dividends Users can view their own dividends; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own dividends" ON public.dividends FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: email_forwarding Users can view their own forwarding config; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own forwarding config" ON public.email_forwarding FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: goals Users can view their own goals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own goals" ON public.goals FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: holdings Users can view their own holdings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own holdings" ON public.holdings FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: parsed_transactions Users can view their own parsed transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own parsed transactions" ON public.parsed_transactions FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: portfolio_snapshots Users can view their own portfolio snapshots; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own portfolio snapshots" ON public.portfolio_snapshots FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: portfolio_transactions Users can view their own portfolio transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own portfolio transactions" ON public.portfolio_transactions FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: portfolios Users can view their own portfolios; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own portfolios" ON public.portfolios FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: profiles Users can view their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: share_transfers Users can view their own share transfers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own share transfers" ON public.share_transfers FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: tax_documents Users can view their own tax documents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own tax documents" ON public.tax_documents FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: transactions Users can view their own transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own transactions" ON public.transactions FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: accounts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

--
-- Name: alerts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

--
-- Name: bills; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;

--
-- Name: budgets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

--
-- Name: categories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

--
-- Name: dividends; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.dividends ENABLE ROW LEVEL SECURITY;

--
-- Name: email_forwarding; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.email_forwarding ENABLE ROW LEVEL SECURITY;

--
-- Name: goals; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

--
-- Name: holding_classifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.holding_classifications ENABLE ROW LEVEL SECURITY;

--
-- Name: holdings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.holdings ENABLE ROW LEVEL SECURITY;

--
-- Name: parsed_transactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.parsed_transactions ENABLE ROW LEVEL SECURITY;

--
-- Name: portfolio_cash_flows; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.portfolio_cash_flows ENABLE ROW LEVEL SECURITY;

--
-- Name: portfolio_snapshots; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.portfolio_snapshots ENABLE ROW LEVEL SECURITY;

--
-- Name: portfolio_transactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.portfolio_transactions ENABLE ROW LEVEL SECURITY;

--
-- Name: portfolios; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.portfolios ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: share_transfers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.share_transfers ENABLE ROW LEVEL SECURITY;

--
-- Name: tax_documents; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tax_documents ENABLE ROW LEVEL SECURITY;

--
-- Name: transactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--




COMMIT;