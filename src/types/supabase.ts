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
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      activities: {
        Row: {
          content: string | null
          created_at: string | null
          customer_id: string | null
          id: string
          lead_id: string | null
          project_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          customer_id?: string | null
          id?: string
          lead_id?: string | null
          project_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          content?: string | null
          created_at?: string | null
          customer_id?: string | null
          id?: string
          lead_id?: string | null
          project_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          created_at: string
          id: string
          ip_address: string | null
          new_values: Json | null
          old_values: Json | null
          resource_id: string | null
          resource_type: string
          tenant_id: string | null
          user_agent: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          resource_id?: string | null
          resource_type: string
          tenant_id?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          resource_id?: string | null
          resource_type?: string
          tenant_id?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      business_settings: {
        Row: {
          id: string
          key: string
          tenant_id: string | null
          updated_at: string | null
          user_id: string
          value: string
        }
        Insert: {
          id?: string
          key: string
          tenant_id?: string | null
          updated_at?: string | null
          user_id: string
          value?: string
        }
        Update: {
          id?: string
          key?: string
          tenant_id?: string | null
          updated_at?: string | null
          user_id?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      crew_assignments: {
        Row: {
          created_at: string | null
          crew_member_name: string
          end_date: string
          id: string
          notes: string | null
          project_id: string | null
          start_date: string
          tenant_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          crew_member_name: string
          end_date: string
          id?: string
          notes?: string | null
          project_id?: string | null
          start_date: string
          tenant_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          crew_member_name?: string
          end_date?: string
          id?: string
          notes?: string | null
          project_id?: string | null
          start_date?: string
          tenant_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crew_assignments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crew_assignments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          city: string | null
          company_name: string | null
          created_at: string | null
          deleted_at: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          referred_by: string | null
          state: string | null
          tags: string[] | null
          tenant_id: string | null
          type: string
          updated_at: string | null
          user_id: string
          zip: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          company_name?: string | null
          created_at?: string | null
          deleted_at?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          referred_by?: string | null
          state?: string | null
          tags?: string[] | null
          tenant_id?: string | null
          type: string
          updated_at?: string | null
          user_id: string
          zip?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          company_name?: string | null
          created_at?: string | null
          deleted_at?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          referred_by?: string | null
          state?: string | null
          tags?: string[] | null
          tenant_id?: string | null
          type?: string
          updated_at?: string | null
          user_id?: string
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_notes: {
        Row: {
          created_at: string | null
          date: string
          id: string
          notes: string | null
          tenant_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          date?: string
          id?: string
          notes?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          date?: string
          id?: string
          notes?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_notes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_todos: {
        Row: {
          completed: boolean | null
          created_at: string | null
          date: string
          id: string
          priority: string | null
          tenant_id: string | null
          text: string
          user_id: string
        }
        Insert: {
          completed?: boolean | null
          created_at?: string | null
          date?: string
          id?: string
          priority?: string | null
          tenant_id?: string | null
          text: string
          user_id: string
        }
        Update: {
          completed?: boolean | null
          created_at?: string | null
          date?: string
          id?: string
          priority?: string | null
          tenant_id?: string | null
          text?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_todos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          all_day: boolean | null
          created_at: string | null
          end_at: string | null
          id: string
          lead_id: string | null
          notes: string | null
          project_id: string | null
          start_at: string
          tenant_id: string | null
          title: string
          type: string | null
          user_id: string
        }
        Insert: {
          all_day?: boolean | null
          created_at?: string | null
          end_at?: string | null
          id?: string
          lead_id?: string | null
          notes?: string | null
          project_id?: string | null
          start_at: string
          tenant_id?: string | null
          title: string
          type?: string | null
          user_id: string
        }
        Update: {
          all_day?: boolean | null
          created_at?: string | null
          end_at?: string | null
          id?: string
          lead_id?: string | null
          notes?: string | null
          project_id?: string | null
          start_at?: string
          tenant_id?: string | null
          title?: string
          type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string | null
          date: string
          deleted_at: string | null
          description: string | null
          id: string
          recurring: boolean | null
          tenant_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          category: string
          created_at?: string | null
          date: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          recurring?: boolean | null
          tenant_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string | null
          date?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          recurring?: boolean | null
          tenant_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      invites: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          role: string
          tenant_id: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          role?: string
          tenant_id: string
          token?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          role?: string
          tenant_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "invites_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_line_items: {
        Row: {
          created_at: string | null
          description: string
          id: string
          invoice_id: string
          quantity: number | null
          sort_order: number | null
          total: number | null
          unit_price: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string
          id?: string
          invoice_id: string
          quantity?: number | null
          sort_order?: number | null
          total?: number | null
          unit_price?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string
          id?: string
          invoice_id?: string
          quantity?: number | null
          sort_order?: number | null
          total?: number | null
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_line_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount: number
          created_at: string | null
          customer_id: string | null
          deleted_at: string | null
          description: string | null
          due_date: string | null
          id: string
          invoice_number: string | null
          issue_date: string | null
          notes: string | null
          paid_at: string | null
          paid_date: string | null
          payment_method: string | null
          payment_notes: string | null
          payment_terms: string | null
          project_id: string | null
          status: string
          tenant_id: string | null
          total: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string | null
          customer_id?: string | null
          deleted_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          invoice_number?: string | null
          issue_date?: string | null
          notes?: string | null
          paid_at?: string | null
          paid_date?: string | null
          payment_method?: string | null
          payment_notes?: string | null
          payment_terms?: string | null
          project_id?: string | null
          status?: string
          tenant_id?: string | null
          total?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          customer_id?: string | null
          deleted_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          invoice_number?: string | null
          issue_date?: string | null
          notes?: string | null
          paid_at?: string | null
          paid_date?: string | null
          payment_method?: string | null
          payment_notes?: string | null
          payment_terms?: string | null
          project_id?: string | null
          status?: string
          tenant_id?: string | null
          total?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          converted_at: string | null
          converted_to_customer_id: string | null
          converted_to_project_id: string | null
          created_at: string | null
          customer_id: string | null
          deleted_at: string | null
          drive_folder_id: string | null
          estimated_value: number | null
          follow_up_date: string | null
          id: string
          lead_type: string | null
          lost_reason: string | null
          notes: string | null
          source: string
          stage: string | null
          tenant_id: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          converted_at?: string | null
          converted_to_customer_id?: string | null
          converted_to_project_id?: string | null
          created_at?: string | null
          customer_id?: string | null
          deleted_at?: string | null
          drive_folder_id?: string | null
          estimated_value?: number | null
          follow_up_date?: string | null
          id?: string
          lead_type?: string | null
          lost_reason?: string | null
          notes?: string | null
          source: string
          stage?: string | null
          tenant_id?: string | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          converted_at?: string | null
          converted_to_customer_id?: string | null
          converted_to_project_id?: string | null
          created_at?: string | null
          customer_id?: string | null
          deleted_at?: string | null
          drive_folder_id?: string | null
          estimated_value?: number | null
          follow_up_date?: string | null
          id?: string
          lead_type?: string | null
          lost_reason?: string | null
          notes?: string | null
          source?: string
          stage?: string | null
          tenant_id?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_converted_to_customer_id_fkey"
            columns: ["converted_to_customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_converted_to_project_id_fkey"
            columns: ["converted_to_project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      master_admins: {
        Row: {
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          action_url: string | null
          body: string | null
          created_at: string | null
          icon: string | null
          id: string
          read_at: string | null
          resource_id: string | null
          resource_type: string | null
          tenant_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          action_url?: string | null
          body?: string | null
          created_at?: string | null
          icon?: string | null
          id?: string
          read_at?: string | null
          resource_id?: string | null
          resource_type?: string | null
          tenant_id?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          action_url?: string | null
          body?: string | null
          created_at?: string | null
          icon?: string | null
          id?: string
          read_at?: string | null
          resource_id?: string | null
          resource_type?: string | null
          tenant_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      project_expenses: {
        Row: {
          amount: number
          category: string
          created_at: string | null
          date: string
          description: string | null
          id: string
          project_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          category: string
          created_at?: string | null
          date: string
          description?: string | null
          id?: string
          project_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string | null
          date?: string
          description?: string | null
          id?: string
          project_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_expenses_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_line_items: {
        Row: {
          created_at: string | null
          description: string
          id: string
          project_id: string | null
          quantity: number | null
          total: number | null
          unit: string | null
          unit_price: number | null
        }
        Insert: {
          created_at?: string | null
          description: string
          id?: string
          project_id?: string | null
          quantity?: number | null
          total?: number | null
          unit?: string | null
          unit_price?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string
          id?: string
          project_id?: string | null
          quantity?: number | null
          total?: number | null
          unit?: string | null
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "project_line_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_photos: {
        Row: {
          caption: string | null
          id: string
          label: string | null
          project_id: string | null
          uploaded_at: string | null
          url: string
          user_id: string
        }
        Insert: {
          caption?: string | null
          id?: string
          label?: string | null
          project_id?: string | null
          uploaded_at?: string | null
          url: string
          user_id: string
        }
        Update: {
          caption?: string | null
          id?: string
          label?: string | null
          project_id?: string | null
          uploaded_at?: string | null
          url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_photos_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_tasks: {
        Row: {
          completed: boolean | null
          created_at: string | null
          description: string
          due_date: string | null
          id: string
          project_id: string | null
          user_id: string
        }
        Insert: {
          completed?: boolean | null
          created_at?: string | null
          description: string
          due_date?: string | null
          id?: string
          project_id?: string | null
          user_id: string
        }
        Update: {
          completed?: boolean | null
          created_at?: string | null
          description?: string
          due_date?: string | null
          id?: string
          project_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          address: string | null
          amount_paid: number | null
          client_communication: string | null
          contract_value: number | null
          created_at: string | null
          crew_notes: string | null
          customer_id: string | null
          deleted_at: string | null
          description: string | null
          drive_folder_id: string | null
          end_date: string | null
          estimated_completion: string | null
          id: string
          lead_cost: number | null
          lead_id: string | null
          notes: string | null
          num_coats: number | null
          paint_brand: string | null
          paint_colors: string | null
          parking_notes: string | null
          payment_status: string | null
          primer_used: boolean | null
          proposal_id: string | null
          site_conditions: string | null
          special_finishes: string | null
          start_date: string | null
          status: string | null
          tenant_id: string | null
          title: string
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          address?: string | null
          amount_paid?: number | null
          client_communication?: string | null
          contract_value?: number | null
          created_at?: string | null
          crew_notes?: string | null
          customer_id?: string | null
          deleted_at?: string | null
          description?: string | null
          drive_folder_id?: string | null
          end_date?: string | null
          estimated_completion?: string | null
          id?: string
          lead_cost?: number | null
          lead_id?: string | null
          notes?: string | null
          num_coats?: number | null
          paint_brand?: string | null
          paint_colors?: string | null
          parking_notes?: string | null
          payment_status?: string | null
          primer_used?: boolean | null
          proposal_id?: string | null
          site_conditions?: string | null
          special_finishes?: string | null
          start_date?: string | null
          status?: string | null
          tenant_id?: string | null
          title: string
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          address?: string | null
          amount_paid?: number | null
          client_communication?: string | null
          contract_value?: number | null
          created_at?: string | null
          crew_notes?: string | null
          customer_id?: string | null
          deleted_at?: string | null
          description?: string | null
          drive_folder_id?: string | null
          end_date?: string | null
          estimated_completion?: string | null
          id?: string
          lead_cost?: number | null
          lead_id?: string | null
          notes?: string | null
          num_coats?: number | null
          paint_brand?: string | null
          paint_colors?: string | null
          parking_notes?: string | null
          payment_status?: string | null
          primer_used?: boolean | null
          proposal_id?: string | null
          site_conditions?: string | null
          special_finishes?: string | null
          start_date?: string | null
          status?: string | null
          tenant_id?: string | null
          title?: string
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_line_items: {
        Row: {
          created_at: string | null
          description: string
          id: string
          proposal_id: string
          quantity: number | null
          sort_order: number | null
          total: number | null
          unit_price: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string
          id?: string
          proposal_id: string
          quantity?: number | null
          sort_order?: number | null
          total?: number | null
          unit_price?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string
          id?: string
          proposal_id?: string
          quantity?: number | null
          sort_order?: number | null
          total?: number | null
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "proposal_line_items_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      proposals: {
        Row: {
          approved_at: string | null
          client_address: string | null
          client_contact: string | null
          client_ip: string | null
          client_name: string | null
          client_signature: string | null
          created_at: string | null
          customer_id: string | null
          deleted_at: string | null
          deposit_pct: number | null
          final_pct: number | null
          id: string
          issue_date: string | null
          lead_id: string | null
          progress_pct: number | null
          project_name: string | null
          project_scope: string | null
          sent_at: string | null
          share_token: string | null
          show_insurance_page: boolean | null
          signed_at: string | null
          status: string
          template: string
          template_data: Json | null
          tenant_id: string | null
          total_investment: number | null
          updated_at: string | null
          user_id: string
          valid_until: string | null
          viewed_at: string | null
          viewed_count: number | null
        }
        Insert: {
          approved_at?: string | null
          client_address?: string | null
          client_contact?: string | null
          client_ip?: string | null
          client_name?: string | null
          client_signature?: string | null
          created_at?: string | null
          customer_id?: string | null
          deleted_at?: string | null
          deposit_pct?: number | null
          final_pct?: number | null
          id?: string
          issue_date?: string | null
          lead_id?: string | null
          progress_pct?: number | null
          project_name?: string | null
          project_scope?: string | null
          sent_at?: string | null
          share_token?: string | null
          show_insurance_page?: boolean | null
          signed_at?: string | null
          status?: string
          template?: string
          template_data?: Json | null
          tenant_id?: string | null
          total_investment?: number | null
          updated_at?: string | null
          user_id: string
          valid_until?: string | null
          viewed_at?: string | null
          viewed_count?: number | null
        }
        Update: {
          approved_at?: string | null
          client_address?: string | null
          client_contact?: string | null
          client_ip?: string | null
          client_name?: string | null
          client_signature?: string | null
          created_at?: string | null
          customer_id?: string | null
          deleted_at?: string | null
          deposit_pct?: number | null
          final_pct?: number | null
          id?: string
          issue_date?: string | null
          lead_id?: string | null
          progress_pct?: number | null
          project_name?: string | null
          project_scope?: string | null
          sent_at?: string | null
          share_token?: string | null
          show_insurance_page?: boolean | null
          signed_at?: string | null
          status?: string
          template?: string
          template_data?: Json | null
          tenant_id?: string | null
          total_investment?: number | null
          updated_at?: string | null
          user_id?: string
          valid_until?: string | null
          viewed_at?: string | null
          viewed_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "proposals_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_integrations: {
        Row: {
          config: Json
          connected_at: string | null
          created_at: string
          enabled: boolean
          id: string
          service: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          config?: Json
          connected_at?: string | null
          created_at?: string
          enabled?: boolean
          id?: string
          service: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          config?: Json
          connected_at?: string | null
          created_at?: string
          enabled?: boolean
          id?: string
          service?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_integrations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_login_log: {
        Row: {
          id: string
          ip_address: string | null
          logged_in_at: string
          tenant_id: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          id?: string
          ip_address?: string | null
          logged_in_at?: string
          tenant_id: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          id?: string
          ip_address?: string | null
          logged_in_at?: string
          tenant_id?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_login_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_users: {
        Row: {
          created_at: string
          id: string
          role: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: string
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_users_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          business_address: string | null
          business_email: string | null
          business_logo_path: string | null
          business_logo_url: string | null
          business_name: string
          business_phone: string | null
          business_website: string | null
          created_at: string
          id: string
          industry: string | null
          owner_id: string | null
          plan: string
          settings: Json
          status: string
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          business_address?: string | null
          business_email?: string | null
          business_logo_path?: string | null
          business_logo_url?: string | null
          business_name: string
          business_phone?: string | null
          business_website?: string | null
          created_at?: string
          id?: string
          industry?: string | null
          owner_id?: string | null
          plan?: string
          settings?: Json
          status?: string
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          business_address?: string | null
          business_email?: string | null
          business_logo_path?: string | null
          business_logo_url?: string | null
          business_name?: string
          business_phone?: string | null
          business_website?: string | null
          created_at?: string
          id?: string
          industry?: string | null
          owner_id?: string | null
          plan?: string
          settings?: Json
          status?: string
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      work_order_items: {
        Row: {
          created_at: string | null
          description: string
          id: string
          quantity: number | null
          total: number | null
          unit: string | null
          unit_price: number | null
          work_order_id: string | null
        }
        Insert: {
          created_at?: string | null
          description: string
          id?: string
          quantity?: number | null
          total?: number | null
          unit?: string | null
          unit_price?: number | null
          work_order_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string
          id?: string
          quantity?: number | null
          total?: number | null
          unit?: string | null
          unit_price?: number | null
          work_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "work_order_items_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      work_orders: {
        Row: {
          actual_cost: number | null
          budget: number
          created_at: string | null
          description: string | null
          end_date: string | null
          id: string
          notes: string | null
          project_id: string | null
          scope_of_work: string | null
          start_date: string | null
          status: string | null
          subcontractor_email: string | null
          subcontractor_name: string | null
          subcontractor_phone: string | null
          tenant_id: string | null
          title: string
          trade: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          actual_cost?: number | null
          budget?: number
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          notes?: string | null
          project_id?: string | null
          scope_of_work?: string | null
          start_date?: string | null
          status?: string | null
          subcontractor_email?: string | null
          subcontractor_name?: string | null
          subcontractor_phone?: string | null
          tenant_id?: string | null
          title: string
          trade?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          actual_cost?: number | null
          budget?: number
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          notes?: string | null
          project_id?: string | null
          scope_of_work?: string | null
          start_date?: string | null
          status?: string | null
          subcontractor_email?: string | null
          subcontractor_name?: string | null
          subcontractor_phone?: string | null
          tenant_id?: string | null
          title?: string
          trade?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_my_tenant_id: { Args: never; Returns: string }
      is_authenticated_owner: {
        Args: { row_user_id: string }
        Returns: boolean
      }
      is_master_admin: { Args: never; Returns: boolean }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
