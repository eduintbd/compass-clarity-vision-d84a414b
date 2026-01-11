export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          balance: number
          created_at: string
          currency: string
          icon: string | null
          id: string
          institution: string
          is_active: boolean | null
          last_synced_at: string | null
          name: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          currency?: string
          icon?: string | null
          id?: string
          institution: string
          is_active?: boolean | null
          last_synced_at?: string | null
          name: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          currency?: string
          icon?: string | null
          id?: string
          institution?: string
          is_active?: boolean | null
          last_synced_at?: string | null
          name?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      alerts: {
        Row: {
          created_at: string
          id: string
          is_read: boolean | null
          message: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          message: string
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          message?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      bills: {
        Row: {
          account_id: string | null
          amount: number
          auto_pay: boolean | null
          category: string
          created_at: string
          due_date: number | null
          frequency: string | null
          id: string
          is_active: boolean | null
          name: string
          next_due_date: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          amount: number
          auto_pay?: boolean | null
          category: string
          created_at?: string
          due_date?: number | null
          frequency?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          next_due_date?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          auto_pay?: boolean | null
          category?: string
          created_at?: string
          due_date?: number | null
          frequency?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          next_due_date?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bills_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      budgets: {
        Row: {
          allocated: number
          category: string
          color: string | null
          created_at: string
          end_date: string | null
          id: string
          period: string | null
          rollover: boolean | null
          spent: number
          start_date: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          allocated: number
          category: string
          color?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          period?: string | null
          rollover?: boolean | null
          spent?: number
          start_date?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          allocated?: number
          category?: string
          color?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          period?: string | null
          rollover?: boolean | null
          spent?: number
          start_date?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          color: string | null
          created_at: string
          icon: string | null
          id: string
          is_system: boolean | null
          name: string
          parent_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          is_system?: boolean | null
          name: string
          parent_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          is_system?: boolean | null
          name?: string
          parent_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      dividends: {
        Row: {
          amount: number
          created_at: string
          dividend_date: string
          dividend_type: string | null
          holding_id: string | null
          id: string
          is_qualified: boolean | null
          portfolio_id: string
          symbol: string
          tax_withheld: number | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          dividend_date: string
          dividend_type?: string | null
          holding_id?: string | null
          id?: string
          is_qualified?: boolean | null
          portfolio_id: string
          symbol: string
          tax_withheld?: number | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          dividend_date?: string
          dividend_type?: string | null
          holding_id?: string | null
          id?: string
          is_qualified?: boolean | null
          portfolio_id?: string
          symbol?: string
          tax_withheld?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dividends_holding_id_fkey"
            columns: ["holding_id"]
            isOneToOne: false
            referencedRelation: "holdings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dividends_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "portfolios"
            referencedColumns: ["id"]
          },
        ]
      }
      email_forwarding: {
        Row: {
          created_at: string
          emails_processed: number | null
          forwarding_key: string
          id: string
          is_active: boolean | null
          last_email_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emails_processed?: number | null
          forwarding_key?: string
          id?: string
          is_active?: boolean | null
          last_email_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          emails_processed?: number | null
          forwarding_key?: string
          id?: string
          is_active?: boolean | null
          last_email_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      gmail_connections: {
        Row: {
          access_token: string
          created_at: string | null
          email: string
          emails_fetched: number | null
          id: string
          is_active: boolean | null
          last_sync_at: string | null
          refresh_token: string
          token_expires_at: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_token: string
          created_at?: string | null
          email: string
          emails_fetched?: number | null
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          refresh_token: string
          token_expires_at: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_token?: string
          created_at?: string | null
          email?: string
          emails_fetched?: number | null
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          refresh_token?: string
          token_expires_at?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      goals: {
        Row: {
          created_at: string
          current_amount: number
          deadline: string | null
          icon: string | null
          id: string
          is_completed: boolean | null
          linked_account_id: string | null
          name: string
          priority: number | null
          target_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_amount?: number
          deadline?: string | null
          icon?: string | null
          id?: string
          is_completed?: boolean | null
          linked_account_id?: string | null
          name: string
          priority?: number | null
          target_amount: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_amount?: number
          deadline?: string | null
          icon?: string | null
          id?: string
          is_completed?: boolean | null
          linked_account_id?: string | null
          name?: string
          priority?: number | null
          target_amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goals_linked_account_id_fkey"
            columns: ["linked_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      holding_classifications: {
        Row: {
          classification: string
          created_at: string
          id: string
          symbol: string
          updated_at: string
          user_id: string
        }
        Insert: {
          classification: string
          created_at?: string
          id?: string
          symbol: string
          updated_at?: string
          user_id: string
        }
        Update: {
          classification?: string
          created_at?: string
          id?: string
          symbol?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      holdings: {
        Row: {
          acquisition_date: string | null
          asset_class: string | null
          average_cost: number
          classification: string | null
          company_name: string | null
          cost_basis: number
          created_at: string
          current_price: number
          day_change: number | null
          day_change_percent: number | null
          day_high: number | null
          day_low: number | null
          day_open: number | null
          id: string
          last_updated_at: string | null
          market_value: number
          portfolio_id: string
          quantity: number
          realized_gain: number
          sector: string | null
          symbol: string
          trade_value: number | null
          trades: number | null
          unrealized_gain: number
          unrealized_gain_percent: number | null
          updated_at: string
          user_id: string
          volume: number | null
          ycp: number | null
        }
        Insert: {
          acquisition_date?: string | null
          asset_class?: string | null
          average_cost?: number
          classification?: string | null
          company_name?: string | null
          cost_basis?: number
          created_at?: string
          current_price?: number
          day_change?: number | null
          day_change_percent?: number | null
          day_high?: number | null
          day_low?: number | null
          day_open?: number | null
          id?: string
          last_updated_at?: string | null
          market_value?: number
          portfolio_id: string
          quantity?: number
          realized_gain?: number
          sector?: string | null
          symbol: string
          trade_value?: number | null
          trades?: number | null
          unrealized_gain?: number
          unrealized_gain_percent?: number | null
          updated_at?: string
          user_id: string
          volume?: number | null
          ycp?: number | null
        }
        Update: {
          acquisition_date?: string | null
          asset_class?: string | null
          average_cost?: number
          classification?: string | null
          company_name?: string | null
          cost_basis?: number
          created_at?: string
          current_price?: number
          day_change?: number | null
          day_change_percent?: number | null
          day_high?: number | null
          day_low?: number | null
          day_open?: number | null
          id?: string
          last_updated_at?: string | null
          market_value?: number
          portfolio_id?: string
          quantity?: number
          realized_gain?: number
          sector?: string | null
          symbol?: string
          trade_value?: number | null
          trades?: number | null
          unrealized_gain?: number
          unrealized_gain_percent?: number | null
          updated_at?: string
          user_id?: string
          volume?: number | null
          ycp?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "holdings_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "portfolios"
            referencedColumns: ["id"]
          },
        ]
      }
      parsed_transactions: {
        Row: {
          confidence_score: number | null
          created_at: string
          id: string
          linked_transaction_id: string | null
          parsed_amount: number | null
          parsed_category: string | null
          parsed_date: string | null
          parsed_description: string | null
          parsed_merchant: string | null
          parsed_type: string | null
          raw_email_content: string | null
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string
          id?: string
          linked_transaction_id?: string | null
          parsed_amount?: number | null
          parsed_category?: string | null
          parsed_date?: string | null
          parsed_description?: string | null
          parsed_merchant?: string | null
          parsed_type?: string | null
          raw_email_content?: string | null
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          confidence_score?: number | null
          created_at?: string
          id?: string
          linked_transaction_id?: string | null
          parsed_amount?: number | null
          parsed_category?: string | null
          parsed_date?: string | null
          parsed_description?: string | null
          parsed_merchant?: string | null
          parsed_type?: string | null
          raw_email_content?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "parsed_transactions_linked_transaction_id_fkey"
            columns: ["linked_transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_cash_flows: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          flow_date: string
          flow_type: string
          id: string
          portfolio_id: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          flow_date: string
          flow_type: string
          id?: string
          portfolio_id: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          flow_date?: string
          flow_type?: string
          id?: string
          portfolio_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_cash_flows_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "portfolios"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_snapshots: {
        Row: {
          cash_balance: number | null
          created_at: string
          id: string
          portfolio_id: string
          snapshot_date: string
          total_cost_basis: number
          total_deposits: number | null
          total_dividends: number | null
          total_market_value: number
          total_realized_gain: number | null
          total_unrealized_gain: number
          total_withdrawals: number | null
          user_id: string
        }
        Insert: {
          cash_balance?: number | null
          created_at?: string
          id?: string
          portfolio_id: string
          snapshot_date: string
          total_cost_basis: number
          total_deposits?: number | null
          total_dividends?: number | null
          total_market_value: number
          total_realized_gain?: number | null
          total_unrealized_gain: number
          total_withdrawals?: number | null
          user_id: string
        }
        Update: {
          cash_balance?: number | null
          created_at?: string
          id?: string
          portfolio_id?: string
          snapshot_date?: string
          total_cost_basis?: number
          total_deposits?: number | null
          total_dividends?: number | null
          total_market_value?: number
          total_realized_gain?: number | null
          total_unrealized_gain?: number
          total_withdrawals?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_snapshots_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "portfolios"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_transactions: {
        Row: {
          commission: number | null
          cost_basis_method: string | null
          created_at: string
          fees: number | null
          holding_id: string | null
          id: string
          notes: string | null
          portfolio_id: string
          price: number
          quantity: number
          realized_gain: number | null
          settlement_date: string | null
          symbol: string
          total_amount: number
          transaction_date: string
          transaction_type: string
          user_id: string
        }
        Insert: {
          commission?: number | null
          cost_basis_method?: string | null
          created_at?: string
          fees?: number | null
          holding_id?: string | null
          id?: string
          notes?: string | null
          portfolio_id: string
          price: number
          quantity: number
          realized_gain?: number | null
          settlement_date?: string | null
          symbol: string
          total_amount: number
          transaction_date: string
          transaction_type: string
          user_id: string
        }
        Update: {
          commission?: number | null
          cost_basis_method?: string | null
          created_at?: string
          fees?: number | null
          holding_id?: string | null
          id?: string
          notes?: string | null
          portfolio_id?: string
          price?: number
          quantity?: number
          realized_gain?: number | null
          settlement_date?: string | null
          symbol?: string
          total_amount?: number
          transaction_date?: string
          transaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_transactions_holding_id_fkey"
            columns: ["holding_id"]
            isOneToOne: false
            referencedRelation: "holdings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portfolio_transactions_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "portfolios"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolios: {
        Row: {
          account_name: string | null
          account_number: string
          account_type: string | null
          accrued_dividends: number
          accrued_fees: number
          as_of_date: string | null
          broker_name: string | null
          cash_balance: number
          created_at: string
          currency: string
          equity_at_cost: number
          equity_at_market: number
          id: string
          margin_balance: number | null
          original_accrued_fees: number | null
          pending_settlements: number
          private_equity_value: number
          total_cost_basis: number
          total_dividends_received: number
          total_market_value: number
          total_realized_gain: number
          total_unrealized_gain: number
          updated_at: string
          user_id: string
        }
        Insert: {
          account_name?: string | null
          account_number: string
          account_type?: string | null
          accrued_dividends?: number
          accrued_fees?: number
          as_of_date?: string | null
          broker_name?: string | null
          cash_balance?: number
          created_at?: string
          currency?: string
          equity_at_cost?: number
          equity_at_market?: number
          id?: string
          margin_balance?: number | null
          original_accrued_fees?: number | null
          pending_settlements?: number
          private_equity_value?: number
          total_cost_basis?: number
          total_dividends_received?: number
          total_market_value?: number
          total_realized_gain?: number
          total_unrealized_gain?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          account_name?: string | null
          account_number?: string
          account_type?: string | null
          accrued_dividends?: number
          accrued_fees?: number
          as_of_date?: string | null
          broker_name?: string | null
          cash_balance?: number
          created_at?: string
          currency?: string
          equity_at_cost?: number
          equity_at_market?: number
          id?: string
          margin_balance?: number | null
          original_accrued_fees?: number | null
          pending_settlements?: number
          private_equity_value?: number
          total_cost_basis?: number
          total_dividends_received?: number
          total_market_value?: number
          total_realized_gain?: number
          total_unrealized_gain?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      price_history: {
        Row: {
          change: number | null
          change_percent: number | null
          close_price: number
          created_at: string | null
          high_price: number | null
          id: string
          low_price: number | null
          open_price: number | null
          symbol: string
          trade_date: string
          trade_value: number | null
          trades: number | null
          volume: number | null
          ycp: number | null
        }
        Insert: {
          change?: number | null
          change_percent?: number | null
          close_price: number
          created_at?: string | null
          high_price?: number | null
          id?: string
          low_price?: number | null
          open_price?: number | null
          symbol: string
          trade_date: string
          trade_value?: number | null
          trades?: number | null
          volume?: number | null
          ycp?: number | null
        }
        Update: {
          change?: number | null
          change_percent?: number | null
          close_price?: number
          created_at?: string | null
          high_price?: number | null
          id?: string
          low_price?: number | null
          open_price?: number | null
          symbol?: string
          trade_date?: string
          trade_value?: number | null
          trades?: number | null
          volume?: number | null
          ycp?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          preferred_currency: string | null
          shariah_mode: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          preferred_currency?: string | null
          shariah_mode?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          preferred_currency?: string | null
          shariah_mode?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      share_transfers: {
        Row: {
          cost_basis: number
          created_at: string
          from_portfolio_id: string | null
          id: string
          market_value: number
          notes: string | null
          quantity: number
          symbol: string
          to_portfolio_id: string | null
          transfer_date: string
          user_id: string
        }
        Insert: {
          cost_basis?: number
          created_at?: string
          from_portfolio_id?: string | null
          id?: string
          market_value?: number
          notes?: string | null
          quantity: number
          symbol: string
          to_portfolio_id?: string | null
          transfer_date: string
          user_id: string
        }
        Update: {
          cost_basis?: number
          created_at?: string
          from_portfolio_id?: string | null
          id?: string
          market_value?: number
          notes?: string | null
          quantity?: number
          symbol?: string
          to_portfolio_id?: string | null
          transfer_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "share_transfers_from_portfolio_id_fkey"
            columns: ["from_portfolio_id"]
            isOneToOne: false
            referencedRelation: "portfolios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "share_transfers_to_portfolio_id_fkey"
            columns: ["to_portfolio_id"]
            isOneToOne: false
            referencedRelation: "portfolios"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_documents: {
        Row: {
          created_at: string
          document_name: string | null
          document_type: string
          id: string
          long_term_gains: number | null
          parsed_data: Json | null
          portfolio_id: string | null
          qualified_dividends: number | null
          short_term_gains: number | null
          storage_path: string | null
          tax_withheld: number | null
          tax_year: number
          total_cost_basis: number | null
          total_dividends: number | null
          total_proceeds: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          document_name?: string | null
          document_type: string
          id?: string
          long_term_gains?: number | null
          parsed_data?: Json | null
          portfolio_id?: string | null
          qualified_dividends?: number | null
          short_term_gains?: number | null
          storage_path?: string | null
          tax_withheld?: number | null
          tax_year: number
          total_cost_basis?: number | null
          total_dividends?: number | null
          total_proceeds?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          document_name?: string | null
          document_type?: string
          id?: string
          long_term_gains?: number | null
          parsed_data?: Json | null
          portfolio_id?: string | null
          qualified_dividends?: number | null
          short_term_gains?: number | null
          storage_path?: string | null
          tax_withheld?: number | null
          tax_year?: number
          total_cost_basis?: number | null
          total_dividends?: number | null
          total_proceeds?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tax_documents_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "portfolios"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          account_id: string
          amount: number
          category: string
          created_at: string
          date: string
          description: string
          id: string
          is_recurring: boolean | null
          is_reviewed: boolean | null
          merchant: string | null
          notes: string | null
          subcategory: string | null
          tags: string[] | null
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id: string
          amount: number
          category: string
          created_at?: string
          date: string
          description: string
          id?: string
          is_recurring?: boolean | null
          is_reviewed?: boolean | null
          merchant?: string | null
          notes?: string | null
          subcategory?: string | null
          tags?: string[] | null
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string
          amount?: number
          category?: string
          created_at?: string
          date?: string
          description?: string
          id?: string
          is_recurring?: boolean | null
          is_reviewed?: boolean | null
          merchant?: string | null
          notes?: string | null
          subcategory?: string | null
          tags?: string[] | null
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
