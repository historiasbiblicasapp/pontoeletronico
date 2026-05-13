import { createContext, useContext, useEffect, useState, ReactNode } from "react"
import { supabase } from "@/integrations/supabase/client"
import type { AppUser, Tenant } from "@/integrations/supabase/multi-tenant"

interface AuthContextType {
  user: AppUser | null
  company: Tenant | null
  loading: boolean
  isMaster: boolean
  isAdmin: boolean
  isEmployee: boolean
  signIn: (email: string, password: string) => Promise<void>
  signInAsMaster: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AppUser | null>(null)
  const [company, setCompany] = useState<Tenant | null>(null)
  const [loading, setLoading] = useState(true)

  const isMaster = user?.role === 'master'
  const isAdmin = user?.role === 'admin' || user?.role === 'master'
  const isEmployee = user?.role === 'user' || user?.role === 'admin'

  const fetchUserData = async (session: any) => {
    if (!session?.user) {
      setUser(null)
      setCompany(null)
      return
    }

    const email = session.user.email || ""

    const { data: tenantUser } = await supabase
      .from("tenant_users")
      .select("*")
      .eq("email", email)
      .maybeSingle()

    if (!tenantUser || !tenantUser.active) {
      setUser(null)
      setCompany(null)
      return
    }

    const { data: tenantData } = await supabase
      .from("tenants")
      .select("*")
      .eq("id", tenantUser.tenant_id)
      .single()

    if (!tenantData) {
      setUser(null)
      setCompany(null)
      return
    }

    let funcionarioData = null
    if (tenantUser.role !== 'master') {
      const { data: func } = await supabase
        .from("funcionarios")
        .select("id, nome, matricula, cargo, setor, foto_url, filial_id")
        .eq("empresa_id", tenantData.id)
        .eq("email", email)
        .eq("ativo", true)
        .maybeSingle()

      funcionarioData = func
    }

    setCompany(tenantData)
    document.title = tenantData.nome_fantasia || tenantData.name

    setUser({
      id: session.user.id,
      email,
      role: tenantUser.role,
      tenant_id: tenantUser.tenant_id,
      tenant_name: tenantData.name,
      tenant_slug: tenantData.slug,
      funcionario: funcionarioData,
    })
  }

  useEffect(() => {
    let mounted = true

    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (mounted && session) {
        await fetchUserData(session)
      }
      if (mounted) setLoading(false)
    }

    init()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!mounted) return
        if (!session) {
          setUser(null)
          setCompany(null)
          setLoading(false)
          return
        }
        await fetchUserData(session)
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  const signInAsMaster = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setCompany(null)
  }

  const refreshUser = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      await fetchUserData(session)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        company,
        loading,
        isMaster,
        isAdmin,
        isEmployee,
        signIn,
        signInAsMaster,
        signOut,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error("useAuth must be used within AuthProvider")
  return context
}
