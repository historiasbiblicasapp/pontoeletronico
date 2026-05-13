import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { supabase } from "@/integrations/supabase/client"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Users, Clock, AlertTriangle, TrendingUp, UserCheck, UserX, BarChart3, Download, RefreshCw } from "lucide-react"
import type { Funcionario, RegistroPonto } from "@/integrations/supabase/ponto-digital"

interface ResumoDia {
  total: number
  online: number
  offline: number
  atrasados: number
  sem_registro: number
  horas_extras_total: number
}

const AdminDashboard = () => {
  const { company } = useAuth()
  const [resumo, setResumo] = useState<ResumoDia>({
    total: 0, online: 0, offline: 0, atrasados: 0, sem_registro: 0, horas_extras_total: 0
  })
  const [funcionarios, setFuncionarios] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState<Date>(new Date())
  const hoje = new Date().toISOString().split('T')[0]

  useEffect(() => {
    if (company?.id) {
      carregarDashboard()
      const interval = setInterval(carregarDashboard, 30000)
      return () => clearInterval(interval)
    }
  }, [company])

  const carregarDashboard = async () => {
    if (!company?.id) return
    try {
      const { data: funcs } = await supabase
        .from("funcionarios")
        .select("*")
        .eq("empresa_id", company.id)
        .eq("ativo", true)

      if (!funcs) return
      setFuncionarios(funcs)

      const hojeStr = new Date().toISOString().split('T')[0]

      const { data: registros } = await supabase
        .from("registros_ponto")
        .select("*")
        .eq("empresa_id", company.id)
        .eq("data", hojeStr)
        .order("data_hora", { ascending: false })

      const registrosHoje = registros || []

      const ultimosPorFunc: Record<string, RegistroPonto[]> = {}
      for (const r of registrosHoje) {
        if (!ultimosPorFunc[r.funcionario_id]) ultimosPorFunc[r.funcionario_id] = []
        ultimosPorFunc[r.funcionario_id].push(r)
      }

      let online = 0
      let atrasados = 0
      let semRegistro = 0
      let totalExtras = 0

      for (const f of funcs) {
        const regs = ultimosPorFunc[f.id] || []
        if (regs.length === 0) {
          semRegistro++
        } else {
          const ultimo = regs.sort((a, b) =>
            new Date(b.data_hora).getTime() - new Date(a.data_hora).getTime()
          )[0]
          if (ultimo.tipo === 'entrada' || ultimo.tipo === 'retorno_almoco' || ultimo.tipo === 'extra_inicio') {
            online++
            const horaEntrada = new Date(ultimo.data_hora).getHours()
            if (horaEntrada > 8) atrasados++
          } else {
            offline++
          }

          if (regs.length >= 4) {
            const sorted = regs.sort((a, b) =>
              new Date(a.data_hora).getTime() - new Date(b.data_hora).getTime()
            )
            let totalMin = 0
            for (let i = 0; i < sorted.length - 1; i++) {
              const diff = new Date(sorted[i + 1].data_hora).getTime() - new Date(sorted[i].data_hora).getTime()
              if (diff > 0 && diff < 72000000) totalMin += diff / 60000
            }
            totalExtras += Math.max(0, (totalMin / 60) - 8)
          }
        }
      }

      setResumo({
        total: funcs.length,
        online,
        offline,
        atrasados,
        sem_registro: semRegistro,
        horas_extras_total: Math.round(totalExtras * 100) / 100,
      })
      setUltimaAtualizacao(new Date())
    } catch (err) {
      console.error("Erro ao carregar dashboard:", err)
    } finally {
      setLoading(false)
    }
  }

  const funcionariosComStatus = funcionarios.map(f => {
    const hojeStr = new Date().toISOString().split('T')[0]
    const registrosHoje = ([] as any[]).filter((r: any) => r.funcionario_id === f.id)
    const temRegistroHoje = registrosHoje.length > 0
    return { ...f, temRegistroHoje, registrosHoje }
  })

  const stats = [
    {
      title: "Total Funcionários",
      value: resumo.total,
      icon: Users,
      cor: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      title: "Online Agora",
      value: resumo.online,
      icon: UserCheck,
      cor: "text-green-600",
      bg: "bg-green-50",
    },
    {
      title: "Atrasados Hoje",
      value: resumo.atrasados,
      icon: AlertTriangle,
      cor: "text-yellow-600",
      bg: "bg-yellow-50",
    },
    {
      title: "Sem Registro",
      value: resumo.sem_registro,
      icon: UserX,
      cor: "text-red-600",
      bg: "bg-red-50",
    },
    {
      title: "Horas Extras (total)",
      value: `${resumo.horas_extras_total}h`,
      icon: TrendingUp,
      cor: "text-purple-600",
      bg: "bg-purple-50",
    },
    {
      title: "Registros Hoje",
      value: resumo.total - resumo.sem_registro,
      icon: Clock,
      cor: "text-indigo-600",
      bg: "bg-indigo-50",
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard RH</h1>
          <p className="text-muted-foreground">
            {company?.nome_fantasia || company?.name}
            <span className="ml-2 text-xs">
              • Atualizado {ultimaAtualizacao.toLocaleTimeString('pt-BR')}
            </span>
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={carregarDashboard}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Atualizar
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                  {stat.title}
                </p>
                <p className="text-2xl font-bold mt-1">{stat.value}</p>
              </div>
              <div className={`p-2 rounded-lg ${stat.bg}`}>
                <stat.icon className={`w-5 h-5 ${stat.cor}`} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Funcionários</h2>
          <div className="flex gap-2">
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              {resumo.online} online
            </Badge>
            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
              {resumo.atrasados} atrasados
            </Badge>
            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
              {resumo.sem_registro} sem registro
            </Badge>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-3 text-sm font-medium text-muted-foreground">Matrícula</th>
                <th className="pb-3 text-sm font-medium text-muted-foreground">Nome</th>
                <th className="pb-3 text-sm font-medium text-muted-foreground">Setor</th>
                <th className="pb-3 text-sm font-medium text-muted-foreground">Status</th>
                <th className="pb-3 text-sm font-medium text-muted-foreground">Hoje</th>
              </tr>
            </thead>
            <tbody>
              {funcionarios.map((f) => {
                const temRegistro = funcionariosComStatus.find(fc => fc.id === f.id)?.temRegistroHoje
                return (
                  <tr key={f.id} className="border-b last:border-0">
                    <td className="py-3 font-mono text-sm">{f.matricula}</td>
                    <td className="py-3 font-medium">{f.nome}</td>
                    <td className="py-3 text-sm text-muted-foreground">{f.setor || '-'}</td>
                    <td className="py-3">
                      <Badge
                        variant="outline"
                        className={
                          f.ativo
                            ? "bg-green-50 text-green-700 border-green-200"
                            : "bg-red-50 text-red-700 border-red-200"
                        }
                      >
                        {f.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </td>
                    <td className="py-3">
                      {temRegistro ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          Registrado
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                          Pendente
                        </Badge>
                      )}
                    </td>
                  </tr>
                )
              })}
              {funcionarios.length === 0 && !loading && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-muted-foreground">
                    Nenhum funcionário cadastrado
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

export default AdminDashboard
