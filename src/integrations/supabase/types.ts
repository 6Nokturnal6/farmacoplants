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
  public: {
    Tables: {
      admin_audit_log: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          created_at: string
          id: string
          new_data: Json | null
          old_data: Json | null
          row_id: string | null
          table_name: string
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          row_id?: string | null
          table_name: string
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          row_id?: string | null
          table_name?: string
        }
        Relationships: []
      }
      citations: {
        Row: {
          authors: string | null
          created_at: string
          created_by: string | null
          doi: string | null
          id: string
          journal: string | null
          title: string
          updated_at: string
          url: string | null
          year: number | null
        }
        Insert: {
          authors?: string | null
          created_at?: string
          created_by?: string | null
          doi?: string | null
          id?: string
          journal?: string | null
          title: string
          updated_at?: string
          url?: string | null
          year?: number | null
        }
        Update: {
          authors?: string | null
          created_at?: string
          created_by?: string | null
          doi?: string | null
          id?: string
          journal?: string | null
          title?: string
          updated_at?: string
          url?: string | null
          year?: number | null
        }
        Relationships: []
      }
      compound_activities: {
        Row: {
          activity_id: string
          assay: string | null
          compound_id: string
          created_at: string
          id: string
          notes: string | null
          potency: string | null
        }
        Insert: {
          activity_id: string
          assay?: string | null
          compound_id: string
          created_at?: string
          id?: string
          notes?: string | null
          potency?: string | null
        }
        Update: {
          activity_id?: string
          assay?: string | null
          compound_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          potency?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "compound_activities_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "pharmacological_activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compound_activities_compound_id_fkey"
            columns: ["compound_id"]
            isOneToOne: false
            referencedRelation: "compounds"
            referencedColumns: ["id"]
          },
        ]
      }
      compounds: {
        Row: {
          compound_class: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          inchi: string | null
          inchi_key: string | null
          iupac_name: string | null
          molecular_formula: string | null
          molecular_weight: number | null
          name: string
          smiles: string | null
          updated_at: string
        }
        Insert: {
          compound_class?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          inchi?: string | null
          inchi_key?: string | null
          iupac_name?: string | null
          molecular_formula?: string | null
          molecular_weight?: number | null
          name: string
          smiles?: string | null
          updated_at?: string
        }
        Update: {
          compound_class?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          inchi?: string | null
          inchi_key?: string | null
          iupac_name?: string | null
          molecular_formula?: string | null
          molecular_weight?: number | null
          name?: string
          smiles?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      entity_citations: {
        Row: {
          citation_id: string
          created_at: string
          entity_id: string
          entity_kind: Database["public"]["Enums"]["entity_kind"]
          id: string
        }
        Insert: {
          citation_id: string
          created_at?: string
          entity_id: string
          entity_kind: Database["public"]["Enums"]["entity_kind"]
          id?: string
        }
        Update: {
          citation_id?: string
          created_at?: string
          entity_id?: string
          entity_kind?: Database["public"]["Enums"]["entity_kind"]
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "entity_citations_citation_id_fkey"
            columns: ["citation_id"]
            isOneToOne: false
            referencedRelation: "citations"
            referencedColumns: ["id"]
          },
        ]
      }
      pharmacological_activities: {
        Row: {
          category: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          mechanism: string | null
          name: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          mechanism?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          mechanism?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      plant_activities: {
        Row: {
          activity_id: string
          created_at: string
          id: string
          notes: string | null
          plant_id: string
          plant_part: string | null
          traditional_use: boolean | null
        }
        Insert: {
          activity_id: string
          created_at?: string
          id?: string
          notes?: string | null
          plant_id: string
          plant_part?: string | null
          traditional_use?: boolean | null
        }
        Update: {
          activity_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          plant_id?: string
          plant_part?: string | null
          traditional_use?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "plant_activities_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "pharmacological_activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plant_activities_plant_id_fkey"
            columns: ["plant_id"]
            isOneToOne: false
            referencedRelation: "plants"
            referencedColumns: ["id"]
          },
        ]
      }
      plant_compounds: {
        Row: {
          compound_id: string
          concentration: string | null
          created_at: string
          id: string
          notes: string | null
          plant_id: string
          plant_part: string | null
        }
        Insert: {
          compound_id: string
          concentration?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          plant_id: string
          plant_part?: string | null
        }
        Update: {
          compound_id?: string
          concentration?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          plant_id?: string
          plant_part?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "plant_compounds_compound_id_fkey"
            columns: ["compound_id"]
            isOneToOne: false
            referencedRelation: "compounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plant_compounds_plant_id_fkey"
            columns: ["plant_id"]
            isOneToOne: false
            referencedRelation: "plants"
            referencedColumns: ["id"]
          },
        ]
      }
      plants: {
        Row: {
          common_names: string[] | null
          created_at: string
          created_by: string | null
          description: string | null
          family: string | null
          genus: string | null
          geographic_origin: string | null
          habitat: string | null
          id: string
          image_url: string | null
          local_names: string[] | null
          plant_parts: string[] | null
          scientific_name: string
          updated_at: string
        }
        Insert: {
          common_names?: string[] | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          family?: string | null
          genus?: string | null
          geographic_origin?: string | null
          habitat?: string | null
          id?: string
          image_url?: string | null
          local_names?: string[] | null
          plant_parts?: string[] | null
          scientific_name: string
          updated_at?: string
        }
        Update: {
          common_names?: string[] | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          family?: string | null
          genus?: string | null
          geographic_origin?: string | null
          habitat?: string | null
          id?: string
          image_url?: string | null
          local_names?: string[] | null
          plant_parts?: string[] | null
          scientific_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string | null
          id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "curator" | "user"
      entity_kind: "plant" | "compound" | "activity"
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
    Enums: {
      app_role: ["admin", "curator", "user"],
      entity_kind: ["plant", "compound", "activity"],
    },
  },
} as const
