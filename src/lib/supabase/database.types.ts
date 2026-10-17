
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "addons": {
                  Row: {
                    "id": string,"item_id": string,"name": string,"position": number
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: string,"item_id": string,"name": string,"position"?: number
                  }
                  Update: {
                    "id"?: string,"item_id"?: string,"name"?: string,"position"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "addons_item_id_fkey"
      columns: ["item_id"]
isOneToOne: false
      referencedRelation: "items"
      referencedColumns: ["id"]
    }
                  ]
                },"brunch_collaborators": {
                  Row: {
                    "brunch_id": string,"created_at": string,"role": Database["public"]['Enums']["brunch_collaborator_role"],"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "brunch_id": string,"created_at"?: string,"role": Database["public"]['Enums']["brunch_collaborator_role"],"user_id": string
                  }
                  Update: {
                    "brunch_id"?: string,"created_at"?: string,"role"?: Database["public"]['Enums']["brunch_collaborator_role"],"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "brunch_collaborators_brunch_id_fkey"
      columns: ["brunch_id"]
isOneToOne: false
      referencedRelation: "brunches"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "brunch_collaborators_brunch_id_fkey"
      columns: ["brunch_id"]
isOneToOne: false
      referencedRelation: "brunches_with_status"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "brunch_collaborators_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"brunch_date_options": {
                  Row: {
                    "brunch_id": string,"id": string,"starts_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "brunch_id": string,"id"?: string,"starts_at": string
                  }
                  Update: {
                    "brunch_id"?: string,"id"?: string,"starts_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "brunch_date_options_brunch_id_fkey"
      columns: ["brunch_id"]
isOneToOne: false
      referencedRelation: "brunches"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "brunch_date_options_brunch_id_fkey"
      columns: ["brunch_id"]
isOneToOne: false
      referencedRelation: "brunches_with_status"
      referencedColumns: ["id"]
    }
                  ]
                },"brunches": {
                  Row: {
                    "created_at": string,"description": string | null,"id": string,"invite_only": boolean,"invites_sent_at": string | null,"location": string | null,"menu_id": string,"owner_id": string,"responses_close_at": string | null,"scheduling": Database["public"]['Enums']["brunch_scheduling"],"starts_at": string | null,"title": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"description"?: string | null,"id"?: string,"invite_only"?: boolean,"invites_sent_at"?: string | null,"location"?: string | null,"menu_id": string,"owner_id"?: string,"responses_close_at"?: string | null,"scheduling"?: Database["public"]['Enums']["brunch_scheduling"],"starts_at"?: string | null,"title": string
                  }
                  Update: {
                    "created_at"?: string,"description"?: string | null,"id"?: string,"invite_only"?: boolean,"invites_sent_at"?: string | null,"location"?: string | null,"menu_id"?: string,"owner_id"?: string,"responses_close_at"?: string | null,"scheduling"?: Database["public"]['Enums']["brunch_scheduling"],"starts_at"?: string | null,"title"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "brunches_menu_id_fkey"
      columns: ["menu_id"]
isOneToOne: false
      referencedRelation: "menus"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "brunches_owner_id_fkey"
      columns: ["owner_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"ingredients": {
                  Row: {
                    "addon_id": string | null,"created_at": string,"id": string,"item_id": string | null,"name": string | null,"option_choice_id": string | null,"quantity": number | null,"unit": Database["public"]['Enums']["ingredient_unit"] | null
                  }
                  ComputedFields: never
                  Insert: {
                    "addon_id"?: string | null,"created_at"?: string,"id"?: string,"item_id"?: string | null,"name"?: string | null,"option_choice_id"?: string | null,"quantity"?: number | null,"unit"?: Database["public"]['Enums']["ingredient_unit"] | null
                  }
                  Update: {
                    "addon_id"?: string | null,"created_at"?: string,"id"?: string,"item_id"?: string | null,"name"?: string | null,"option_choice_id"?: string | null,"quantity"?: number | null,"unit"?: Database["public"]['Enums']["ingredient_unit"] | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "ingredients_addon_id_fkey"
      columns: ["addon_id"]
isOneToOne: false
      referencedRelation: "addons"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ingredients_item_id_fkey"
      columns: ["item_id"]
isOneToOne: false
      referencedRelation: "items"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ingredients_option_choice_id_fkey"
      columns: ["option_choice_id"]
isOneToOne: false
      referencedRelation: "option_choices"
      referencedColumns: ["id"]
    }
                  ]
                },"items": {
                  Row: {
                    "created_at": string,"description": string | null,"id": string,"menu_id": string,"name": string,"position": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"description"?: string | null,"id"?: string,"menu_id": string,"name": string,"position"?: number
                  }
                  Update: {
                    "created_at"?: string,"description"?: string | null,"id"?: string,"menu_id"?: string,"name"?: string,"position"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "items_menu_id_fkey"
      columns: ["menu_id"]
isOneToOne: false
      referencedRelation: "menus"
      referencedColumns: ["id"]
    }
                  ]
                },"menu_collaborators": {
                  Row: {
                    "created_at": string,"menu_id": string,"role": Database["public"]['Enums']["menu_collaborator_role"],"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"menu_id": string,"role": Database["public"]['Enums']["menu_collaborator_role"],"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"menu_id"?: string,"role"?: Database["public"]['Enums']["menu_collaborator_role"],"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "menu_collaborators_menu_id_fkey"
      columns: ["menu_id"]
isOneToOne: false
      referencedRelation: "menus"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "menu_collaborators_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"menus": {
                  Row: {
                    "created_at": string,"description": string | null,"id": string,"name": string,"owner_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"description"?: string | null,"id"?: string,"name": string,"owner_id"?: string
                  }
                  Update: {
                    "created_at"?: string,"description"?: string | null,"id"?: string,"name"?: string,"owner_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "menus_owner_id_fkey"
      columns: ["owner_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"option_choices": {
                  Row: {
                    "id": string,"name": string,"option_group_id": string,"position": number
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: string,"name": string,"option_group_id": string,"position"?: number
                  }
                  Update: {
                    "id"?: string,"name"?: string,"option_group_id"?: string,"position"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "option_choices_option_group_id_fkey"
      columns: ["option_group_id"]
isOneToOne: false
      referencedRelation: "option_groups"
      referencedColumns: ["id"]
    }
                  ]
                },"option_groups": {
                  Row: {
                    "id": string,"item_id": string,"name": string,"position": number,"required": boolean
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: string,"item_id": string,"name": string,"position"?: number,"required"?: boolean
                  }
                  Update: {
                    "id"?: string,"item_id"?: string,"name"?: string,"position"?: number,"required"?: boolean
                  }
                  Relationships: [
                    {
      foreignKeyName: "option_groups_item_id_fkey"
      columns: ["item_id"]
isOneToOne: false
      referencedRelation: "items"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "created_at": string,"display_name": string | null,"id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"display_name"?: string | null,"id": string
                  }
                  Update: {
                    "created_at"?: string,"display_name"?: string | null,"id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"response_date_votes": {
                  Row: {
                    "availability": Database["public"]['Enums']["date_availability"],"date_option_id": string,"response_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "availability": Database["public"]['Enums']["date_availability"],"date_option_id": string,"response_id": string
                  }
                  Update: {
                    "availability"?: Database["public"]['Enums']["date_availability"],"date_option_id"?: string,"response_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "response_date_votes_date_option_id_fkey"
      columns: ["date_option_id"]
isOneToOne: false
      referencedRelation: "brunch_date_options"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "response_date_votes_response_id_fkey"
      columns: ["response_id"]
isOneToOne: false
      referencedRelation: "responses"
      referencedColumns: ["id"]
    }
                  ]
                },"response_item_addons": {
                  Row: {
                    "addon_id": string,"response_item_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "addon_id": string,"response_item_id": string
                  }
                  Update: {
                    "addon_id"?: string,"response_item_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "response_item_addons_addon_id_fkey"
      columns: ["addon_id"]
isOneToOne: false
      referencedRelation: "addons"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "response_item_addons_response_item_id_fkey"
      columns: ["response_item_id"]
isOneToOne: false
      referencedRelation: "response_items"
      referencedColumns: ["id"]
    }
                  ]
                },"response_item_choices": {
                  Row: {
                    "option_choice_id": string,"response_item_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "option_choice_id": string,"response_item_id": string
                  }
                  Update: {
                    "option_choice_id"?: string,"response_item_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "response_item_choices_option_choice_id_fkey"
      columns: ["option_choice_id"]
isOneToOne: false
      referencedRelation: "option_choices"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "response_item_choices_response_item_id_fkey"
      columns: ["response_item_id"]
isOneToOne: false
      referencedRelation: "response_items"
      referencedColumns: ["id"]
    }
                  ]
                },"response_items": {
                  Row: {
                    "id": string,"item_id": string,"quantity": number,"response_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: string,"item_id": string,"quantity"?: number,"response_id": string
                  }
                  Update: {
                    "id"?: string,"item_id"?: string,"quantity"?: number,"response_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "response_items_item_id_fkey"
      columns: ["item_id"]
isOneToOne: false
      referencedRelation: "items"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "response_items_response_id_fkey"
      columns: ["response_id"]
isOneToOne: false
      referencedRelation: "responses"
      referencedColumns: ["id"]
    }
                  ]
                },"responses": {
                  Row: {
                    "brunch_id": string,"created_at": string,"guest_name": string,"id": string,"notes": string | null,"responded_at": string | null,"status": Database["public"]['Enums']["response_status"] | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "brunch_id": string,"created_at"?: string,"guest_name": string,"id"?: string,"notes"?: string | null,"responded_at"?: string | null,"status"?: Database["public"]['Enums']["response_status"] | null,"updated_at"?: string
                  }
                  Update: {
                    "brunch_id"?: string,"created_at"?: string,"guest_name"?: string,"id"?: string,"notes"?: string | null,"responded_at"?: string | null,"status"?: Database["public"]['Enums']["response_status"] | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "responses_brunch_id_fkey"
      columns: ["brunch_id"]
isOneToOne: false
      referencedRelation: "brunches"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "responses_brunch_id_fkey"
      columns: ["brunch_id"]
isOneToOne: false
      referencedRelation: "brunches_with_status"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            "brunches_with_status": {
                  Row: {
                    "created_at": string | null,"description": string | null,"id": string | null,"invite_only": boolean | null,"invites_sent_at": string | null,"location": string | null,"menu_id": string | null,"owner_id": string | null,"responses_close_at": string | null,"scheduling": Database["public"]['Enums']["brunch_scheduling"] | null,"starts_at": string | null,"status": string | null,"title": string | null
                  }
                  ComputedFields: never
                  Insert: {
                           "created_at"?: string | null,"description"?: string | null,"id"?: string | null,"invite_only"?: boolean | null,"invites_sent_at"?: string | null,"location"?: string | null,"menu_id"?: string | null,"owner_id"?: string | null,"responses_close_at"?: string | null,"scheduling"?: Database["public"]['Enums']["brunch_scheduling"] | null,"starts_at"?: string | null,"status"?: never,"title"?: string | null
                         }
                        Update: {
                           "created_at"?: string | null,"description"?: string | null,"id"?: string | null,"invite_only"?: boolean | null,"invites_sent_at"?: string | null,"location"?: string | null,"menu_id"?: string | null,"owner_id"?: string | null,"responses_close_at"?: string | null,"scheduling"?: Database["public"]['Enums']["brunch_scheduling"] | null,"starts_at"?: string | null,"status"?: never,"title"?: string | null
                         }
                        Relationships: [
                    {
      foreignKeyName: "brunches_menu_id_fkey"
      columns: ["menu_id"]
isOneToOne: false
      referencedRelation: "menus"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "brunches_owner_id_fkey"
      columns: ["owner_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Functions: {
            "add_brunch_collaborator":
{ Args: { "p_brunch_id": string,"p_email": string,"p_role": Database["public"]['Enums']["brunch_collaborator_role"] }; Returns: undefined
                           },
"add_menu_collaborator":
{ Args: { "p_email": string,"p_menu_id": string,"p_role": Database["public"]['Enums']["menu_collaborator_role"] }; Returns: undefined
                           },
"addon_menu_id":
{ Args: { "p_addon_id": string }; Returns: string
                           },
"can_edit_menu":
{ Args: { "p_menu_id": string }; Returns: boolean
                           },
"can_manage_brunch":
{ Args: { "p_brunch_id": string }; Returns: boolean
                           },
"can_read_brunch":
{ Args: { "p_brunch_id": string }; Returns: boolean
                           },
"can_read_menu":
{ Args: { "p_menu_id": string }; Returns: boolean
                           },
"copy_menu":
{ Args: { "p_menu_id": string }; Returns: string
                           },
"get_brunch_cohost_names":
{ Args: { "p_brunch_id": string }; Returns: (string)[]
                           },
"get_brunch_host_name":
{ Args: { "p_brunch_id": string }; Returns: string
                           },
"get_invite":
{ Args: { "p_brunch_id": string,"p_response_id"?: string }; Returns: Json
                           },
"get_invite_unchecked":
{ Args: { "p_brunch_id": string }; Returns: Json
                           },
"get_response":
{ Args: { "p_response_id": string }; Returns: Json
                           },
"item_menu_id":
{ Args: { "p_item_id": string }; Returns: string
                           },
"list_brunch_collaborators":
{ Args: { "p_brunch_id": string }; Returns: {
              "display_name": string,"email": string,"role": Database["public"]['Enums']["brunch_collaborator_role"],"user_id": string
            }[]
                           },
"list_menu_collaborators":
{ Args: { "p_menu_id": string }; Returns: {
              "display_name": string,"email": string,"role": Database["public"]['Enums']["menu_collaborator_role"],"user_id": string
            }[]
                           },
"my_brunch_role":
{ Args: { "p_brunch_id": string }; Returns: string
                           },
"my_menu_role":
{ Args: { "p_menu_id": string }; Returns: string
                           },
"option_choice_menu_id":
{ Args: { "p_choice_id": string }; Returns: string
                           },
"option_group_menu_id":
{ Args: { "p_group_id": string }; Returns: string
                           },
"owns_brunch":
{ Args: { "p_brunch_id": string }; Returns: boolean
                           },
"owns_menu":
{ Args: { "p_menu_id": string }; Returns: boolean
                           },
"pick_date_winner":
{ Args: { "p_brunch_id": string,"p_date_option_id": string }; Returns: undefined
                           },
"reorder_addons":
{ Args: { "p_addon_ids": (string)[],"p_item_id": string }; Returns: undefined
                           },
"reorder_items":
{ Args: { "p_item_ids": (string)[],"p_menu_id": string }; Returns: undefined
                           },
"reorder_option_choices":
{ Args: { "p_choice_ids": (string)[],"p_group_id": string }; Returns: undefined
                           },
"reorder_option_groups":
{ Args: { "p_group_ids": (string)[],"p_item_id": string }; Returns: undefined
                           },
"response_brunch_id":
{ Args: { "p_response_id": string }; Returns: string
                           },
"response_item_brunch_id":
{ Args: { "p_response_item_id": string }; Returns: string
                           },
"save_response":
{ Args: { "p_brunch_id": string,"p_payload": Json,"p_response_id"?: string }; Returns: string
                           }
          }
          Enums: {
            "brunch_collaborator_role": "viewer"|"co_host","brunch_scheduling": "fixed"|"poll","date_availability": "yes"|"maybe","ingredient_unit": "g"|"kg"|"ml"|"l"|"tsp"|"tbsp"|"cup"|"piece","menu_collaborator_role": "viewer"|"editor","response_status": "attending"|"declined"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "brunch_collaborator_role": ["viewer", "co_host"],"brunch_scheduling": ["fixed", "poll"],"date_availability": ["yes", "maybe"],"ingredient_unit": ["g", "kg", "ml", "l", "tsp", "tbsp", "cup", "piece"],"menu_collaborator_role": ["viewer", "editor"],"response_status": ["attending", "declined"]
          }
        }
} as const
