import { Database } from './types'

export type Tenant = Database['public']['Tables']['tenants']['Row']
export type TenantInsert = Database['public']['Tables']['tenants']['Insert']
export type TenantUpdate = Database['public']['Tables']['tenants']['Update']

export type TenantUser = Database['public']['Tables']['tenant_users']['Row']
export type TenantUserInsert = Database['public']['Tables']['tenant_users']['Insert']

export interface AppUser {
  id: string
  email: string
  role: 'master' | 'admin' | 'user'
  tenant_id: string | null
  tenant_name: string | null
  tenant_slug: string | null
  funcionario: {
    id: string
    nome: string
    matricula: string
    cargo: string | null
    setor: string | null
    foto_url: string | null
    filial_id: string | null
  } | null
}
