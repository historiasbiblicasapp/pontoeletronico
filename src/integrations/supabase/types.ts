export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      tenants: {
        Row: {
          id: string
          name: string
          slug: string
          razao_social: string | null
          nome_fantasia: string | null
          cnpj: string | null
          email: string | null
          telefone: string | null
          plano: string | null
          limite_funcionarios: number
          logo_url: string | null
          active: boolean
          primary_color: string | null
          max_sessions: number
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          razao_social?: string | null
          nome_fantasia?: string | null
          cnpj?: string | null
          email?: string | null
          telefone?: string | null
          plano?: string | null
          limite_funcionarios?: number
          logo_url?: string | null
          active?: boolean
          primary_color?: string | null
          max_sessions?: number
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          razao_social?: string | null
          nome_fantasia?: string | null
          cnpj?: string | null
          email?: string | null
          telefone?: string | null
          plano?: string | null
          limite_funcionarios?: number
          logo_url?: string | null
          active?: boolean
          primary_color?: string | null
          max_sessions?: number
          created_at?: string
        }
        Relationships: []
      }
      tenant_users: {
        Row: {
          id: string
          tenant_id: string
          email: string
          role: "admin" | "user" | "master"
          active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          email: string
          role?: "admin" | "user" | "master"
          active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          email?: string
          role?: "admin" | "user" | "master"
          active?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_users_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          }
        ]
      }
      filiais: {
        Row: {
          id: string
          empresa_id: string
          nome: string
          endereco: string | null
          cidade: string | null
          estado: string | null
          latitude: string | null
          longitude: string | null
          raio_geofence: number
          ativo: boolean
          created_at: string
        }
        Insert: {
          id?: string
          empresa_id: string
          nome: string
          endereco?: string | null
          cidade?: string | null
          estado?: string | null
          latitude?: string | null
          longitude?: string | null
          raio_geofence?: number
          ativo?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          empresa_id?: string
          nome?: string
          endereco?: string | null
          cidade?: string | null
          estado?: string | null
          latitude?: string | null
          longitude?: string | null
          raio_geofence?: number
          ativo?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "filiais_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          }
        ]
      }
      funcionarios: {
        Row: {
          id: string
          empresa_id: string
          filial_id: string | null
          auth_user_id: string | null
          matricula: string
          nome: string
          cpf: string | null
          rg: string | null
          email: string | null
          telefone: string | null
          cargo: string | null
          setor: string | null
          tipo_jornada: string
          carga_horaria_semanal: number
          horas_diaria: number
          tolerancia_minutos: number
          pin: string | null
          foto_url: string | null
          ativo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          empresa_id: string
          filial_id?: string | null
          auth_user_id?: string | null
          matricula: string
          nome: string
          cpf?: string | null
          rg?: string | null
          email?: string | null
          telefone?: string | null
          cargo?: string | null
          setor?: string | null
          tipo_jornada?: string
          carga_horaria_semanal?: number
          horas_diaria?: number
          tolerancia_minutos?: number
          pin?: string | null
          foto_url?: string | null
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          empresa_id?: string
          filial_id?: string | null
          auth_user_id?: string | null
          matricula?: string
          nome?: string
          cpf?: string | null
          rg?: string | null
          email?: string | null
          telefone?: string | null
          cargo?: string | null
          setor?: string | null
          tipo_jornada?: string
          carga_horaria_semanal?: number
          horas_diaria?: number
          tolerancia_minutos?: number
          pin?: string | null
          foto_url?: string | null
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "funcionarios_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funcionarios_filial_id_fkey"
            columns: ["filial_id"]
            isOneToOne: false
            referencedRelation: "filiais"
            referencedColumns: ["id"]
          }
        ]
      }
      dispositivos: {
        Row: {
          id: string
          empresa_id: string
          filial_id: string | null
          tipo: string
          nome: string
          mac_address: string | null
          ip: string | null
          localizacao: string | null
          ativo: boolean
          ultimo_heartbeat: string | null
          created_at: string
        }
        Insert: {
          id?: string
          empresa_id: string
          filial_id?: string | null
          tipo?: string
          nome: string
          mac_address?: string | null
          ip?: string | null
          localizacao?: string | null
          ativo?: boolean
          ultimo_heartbeat?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          empresa_id?: string
          filial_id?: string | null
          tipo?: string
          nome?: string
          mac_address?: string | null
          ip?: string | null
          localizacao?: string | null
          ativo?: boolean
          ultimo_heartbeat?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dispositivos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          }
        ]
      }
      registros_ponto: {
        Row: {
          id: string
          funcionario_id: string
          empresa_id: string
          dispositivo_id: string | null
          tipo: "entrada" | "saida_almoco" | "retorno_almoco" | "saida" | "extra_inicio" | "extra_fim"
          data_hora: string
          data: string
          latitude: string | null
          longitude: string | null
          endereco: string | null
          selfie_url: string | null
          reconhecimento_facial: boolean
          ip: string | null
          dispositivo_info: string | null
          hash_integridade: string
          sincronizado: boolean
          created_at: string
        }
        Insert: {
          id?: string
          funcionario_id: string
          empresa_id: string
          dispositivo_id?: string | null
          tipo: "entrada" | "saida_almoco" | "retorno_almoco" | "saida" | "extra_inicio" | "extra_fim"
          data_hora?: string
          latitude?: string | null
          longitude?: string | null
          endereco?: string | null
          selfie_url?: string | null
          reconhecimento_facial?: boolean
          ip?: string | null
          dispositivo_info?: string | null
          hash_integridade?: string
          sincronizado?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          funcionario_id?: string
          empresa_id?: string
          dispositivo_id?: string | null
          tipo?: "entrada" | "saida_almoco" | "retorno_almoco" | "saida" | "extra_inicio" | "extra_fim"
          data_hora?: string
          latitude?: string | null
          longitude?: string | null
          endereco?: string | null
          selfie_url?: string | null
          reconhecimento_facial?: boolean
          ip?: string | null
          dispositivo_info?: string | null
          hash_integridade?: string
          sincronizado?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "registros_ponto_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registros_ponto_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          }
        ]
      }
      escalas: {
        Row: {
          id: string
          empresa_id: string
          nome: string
          tipo: string
          hora_entrada: string
          hora_saida_almoco: string | null
          hora_retorno_almoco: string | null
          hora_saida: string
          tolerancia_minutos: number
          carga_horaria_diaria: number
          dias_semana: number[] | null
          ativo: boolean
          created_at: string
        }
        Insert: {
          id?: string
          empresa_id: string
          nome: string
          tipo: string
          hora_entrada: string
          hora_saida_almoco?: string | null
          hora_retorno_almoco?: string | null
          hora_saida: string
          tolerancia_minutos?: number
          carga_horaria_diaria?: number
          dias_semana?: number[] | null
          ativo?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          empresa_id?: string
          nome?: string
          tipo?: string
          hora_entrada?: string
          hora_saida_almoco?: string | null
          hora_retorno_almoco?: string | null
          hora_saida?: string
          tolerancia_minutos?: number
          carga_horaria_diaria?: number
          dias_semana?: number[] | null
          ativo?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "escalas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          }
        ]
      }
      funcionario_escala: {
        Row: {
          id: string
          funcionario_id: string
          escala_id: string
          data_inicio: string
          data_fim: string | null
          ativo: boolean
          created_at: string
        }
        Insert: {
          id?: string
          funcionario_id: string
          escala_id: string
          data_inicio: string
          data_fim?: string | null
          ativo?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          funcionario_id?: string
          escala_id?: string
          data_inicio?: string
          data_fim?: string | null
          ativo?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "funcionario_escala_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funcionario_escala_escala_id_fkey"
            columns: ["escala_id"]
            isOneToOne: false
            referencedRelation: "escalas"
            referencedColumns: ["id"]
          }
        ]
      }
      banco_horas: {
        Row: {
          id: string
          funcionario_id: string
          empresa_id: string
          data: string
          horas_trabalhadas: number
          horas_previstas: number
          saldo: number
          horas_extras: number
          horas_debito: number
          created_at: string
        }
        Insert: {
          id?: string
          funcionario_id: string
          empresa_id: string
          data: string
          horas_trabalhadas?: number
          horas_previstas?: number
          saldo?: number
          horas_extras?: number
          horas_debito?: number
          created_at?: string
        }
        Update: {
          id?: string
          funcionario_id?: string
          empresa_id?: string
          data?: string
          horas_trabalhadas?: number
          horas_previstas?: number
          saldo?: number
          horas_extras?: number
          horas_debito?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "banco_horas_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "banco_horas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          }
        ]
      }
      ajustes: {
        Row: {
          id: string
          funcionario_id: string
          empresa_id: string
          tipo: string
          registro_ponto_id: string | null
          data_referencia: string
          justificativa: string
          anexo_url: string | null
          status: string
          aprovado_por: string | null
          observacao_rh: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          funcionario_id: string
          empresa_id: string
          tipo: string
          registro_ponto_id?: string | null
          data_referencia: string
          justificativa: string
          anexo_url?: string | null
          status?: string
          aprovado_por?: string | null
          observacao_rh?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          funcionario_id?: string
          empresa_id?: string
          tipo?: string
          registro_ponto_id?: string | null
          data_referencia?: string
          justificativa?: string
          anexo_url?: string | null
          status?: string
          aprovado_por?: string | null
          observacao_rh?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ajustes_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ajustes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          }
        ]
      }
      auditoria: {
        Row: {
          id: string
          empresa_id: string | null
          funcionario_id: string | null
          auth_user_id: string | null
          acao: string
          tabela_afetada: string | null
          registro_id: string | null
          dados_anteriores: Json | null
          dados_novos: Json | null
          ip: string | null
          dispositivo: string | null
          created_at: string
        }
        Insert: {
          id?: string
          empresa_id?: string | null
          funcionario_id?: string | null
          auth_user_id?: string | null
          acao: string
          tabela_afetada?: string | null
          registro_id?: string | null
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          ip?: string | null
          dispositivo?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          empresa_id?: string | null
          funcionario_id?: string | null
          auth_user_id?: string | null
          acao?: string
          tabela_afetada?: string | null
          registro_id?: string | null
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          ip?: string | null
          dispositivo?: string | null
          created_at?: string
        }
        Relationships: []
      }
      notificacoes: {
        Row: {
          id: string
          empresa_id: string | null
          funcionario_id: string | null
          tipo: string
          titulo: string
          mensagem: string | null
          lida: boolean
          created_at: string
        }
        Insert: {
          id?: string
          empresa_id?: string | null
          funcionario_id?: string | null
          tipo: string
          titulo: string
          mensagem?: string | null
          lida?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          empresa_id?: string | null
          funcionario_id?: string | null
          tipo?: string
          titulo?: string
          mensagem?: string | null
          lida?: boolean
          created_at?: string
        }
        Relationships: []
      }
      ferias: {
        Row: {
          id: string
          funcionario_id: string
          empresa_id: string
          data_inicio: string
          data_fim: string
          dias: number
          tipo: string
          status: string
          aprovado_por: string | null
          observacao: string | null
          created_at: string
        }
        Insert: {
          id?: string
          funcionario_id: string
          empresa_id: string
          data_inicio: string
          data_fim: string
          dias: number
          tipo?: string
          status?: string
          aprovado_por?: string | null
          observacao?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          funcionario_id?: string
          empresa_id?: string
          data_inicio?: string
          data_fim?: string
          dias?: number
          tipo?: string
          status?: string
          aprovado_por?: string | null
          observacao?: string | null
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      vw_funcionarios_online: {
        Row: {
          id: string | null
          nome: string | null
          matricula: string | null
          setor: string | null
          cargo: string | null
          filial_nome: string | null
          ultimo_registro: string | null
          ultimo_registro_em: string | null
          status: string | null
        }
      }
      vw_resumo_diario: {
        Row: {
          empresa_id: string | null
          funcionario_id: string | null
          nome: string | null
          matricula: string | null
          data: string | null
          primeira_marcacao: string | null
          ultima_marcacao: string | null
          total_marcacoes: number | null
          qtd_entradas: number | null
          qtd_saidas: number | null
        }
      }
    }
    Functions: {
      calcular_banco_horas: {
        Args: { p_funcionario_id: string; p_data: string }
        Returns: {
          total_trabalhado: number
          total_previsto: number
          saldo_dia: number
        }[]
      }
    }
    Enums: {
      order_status: "pendente" | "em_andamento" | "concluido" | "cancelado"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Tables<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"]
export type TablesInsert<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Insert"]
export type TablesUpdate<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Update"]
