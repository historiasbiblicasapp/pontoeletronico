import { useState, useEffect } from "react"
import { supabase } from "@/integrations/supabase/client"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, Building2, TrendingUp, DollarSign, Activity } from "lucide-react"
import type { Tenant } from "@/integrations/supabase/multi-tenant"
import { PLANOS_SAAS } from "@/integrations/supabase/ponto-digital"

const MasterDashboard = () => {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [totalFuncionarios, setTotalFuncionarios] = useState(0)
  const [totalRegistros, setTotalRegistros] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    carregarDados()
  }, [])

  const carregarDados = async () => {
    try {
      const { data: tenantsData } = await supabase
        .from("tenants")
        .select("*")
        .order("created_at", { ascending: false })

      if (tenantsData) setTenants(tenantsData)

      const { count: funcCount } = await supabase
        .from("funcionarios")
        .select("*", { count: "exact", head: true })

      if (funcCount !== null) setTotalFuncionarios(funcCount)

      const { count: regCount } = await supabase
        .from("registros_ponto")
        .select("*", { count: "exact", head: true })

      if (regCount !== null) setTotalRegistros(regCount)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const receitaPotencial = tenants.reduce((sum, t) => {
    const plano = PLANOS_SAAS.find(p => p.id === t.plano)
    return sum + (plano?.preco || 0)
  }, 0)

  const stats = [
    {
      title: "Empresas Ativas",
      value: tenants.filter(t => t.active).length,
      total: tenants.length,
      icon: Building2,
      cor: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      title: "Total Funcionários",
      value: totalFuncionarios,
      icon: Users,
      cor: "text-green-600",
      bg: "bg-green-50",
    },
    {
      title: "Registros de Ponto",
      value: totalRegistros,
      icon: Activity,
      cor: "text-purple-600",
      bg: "bg-purple-50",
    },
    {
      title: "Receita Potencial",
      value: `R$ ${receitaPotencial.toFixed(2)}`,
      icon: DollarSign,
      cor: "text-yellow-600",
      bg: "bg-yellow-50",
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Painel Master</h1>
        <p className="text-muted-foreground">Visão geral do sistema Ponto Digital BM</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                <p className="text-3xl font-bold mt-1">{stat.value}</p>
                {stat.total !== undefined && (
                  <p className="text-xs text-muted-foreground mt-1">de {stat.total} total</p>
                )}
              </div>
              <div className={`p-3 rounded-lg ${stat.bg}`}>
                <stat.icon className={`w-6 h-6 ${stat.cor}`} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Empresas</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-3 text-sm font-medium text-muted-foreground">Empresa</th>
                <th className="pb-3 text-sm font-medium text-muted-foreground">CNPJ</th>
                <th className="pb-3 text-sm font-medium text-muted-foreground">Plano</th>
                <th className="pb-3 text-sm font-medium text-muted-foreground">Limite</th>
                <th className="pb-3 text-sm font-medium text-muted-foreground">Status</th>
                <th className="pb-3 text-sm font-medium text-muted-foreground">Desde</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((t) => (
                <tr key={t.id} className="border-b last:border-0 hover:bg-muted/50">
                  <td className="py-3">
                    <p className="font-medium">{t.nome_fantasia || t.name}</p>
                    <p className="text-sm text-muted-foreground">{t.razao_social || "-"}</p>
                  </td>
                  <td className="py-3 text-sm">{t.cnpj || "-"}</td>
                  <td className="py-3">
                    <Badge variant="outline">
                      {PLANOS_SAAS.find(p => p.id === t.plano)?.nome || t.plano || "Básico"}
                    </Badge>
                  </td>
                  <td className="py-3 text-sm">{t.limite_funcionarios} func.</td>
                  <td className="py-3">
                    <Badge
                      variant="outline"
                      className={t.active ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}
                    >
                      {t.active ? "Ativo" : "Inativo"}
                    </Badge>
                  </td>
                  <td className="py-3 text-sm text-muted-foreground">
                    {new Date(t.created_at).toLocaleDateString('pt-BR')}
                  </td>
                </tr>
              ))}
              {tenants.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-muted-foreground">
                    Nenhuma empresa cadastrada
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

export default MasterDashboard
