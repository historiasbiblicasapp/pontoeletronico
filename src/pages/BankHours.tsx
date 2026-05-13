import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { supabase } from "@/integrations/supabase/client"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { ChevronLeft, ChevronRight, Clock, TrendingUp, TrendingDown, AlertCircle, CheckCircle2 } from "lucide-react"
import type { BancoHoras } from "@/integrations/supabase/ponto-digital"

const BankHours = () => {
  const { user } = useAuth()
  const [registros, setRegistros] = useState<BancoHoras[]>([])
  const [loading, setLoading] = useState(true)
  const [mes, setMes] = useState(new Date().getMonth() + 1)
  const [ano, setAno] = useState(new Date().getFullYear())

  useEffect(() => {
    if (user?.funcionario?.id) {
      carregarBancoHoras()
    }
  }, [user, mes, ano])

  const carregarBancoHoras = async () => {
    if (!user?.funcionario?.id) return
    setLoading(true)
    try {
      const inicio = new Date(ano, mes - 1, 1).toISOString().split('T')[0]
      const fim = new Date(ano, mes, 0).toISOString().split('T')[0]

      const { data, error } = await supabase
        .from("registros_ponto")
        .select("*")
        .eq("funcionario_id", user.funcionario.id)
        .gte("data", inicio)
        .lte("data", fim)
        .order("data_hora", { ascending: true })

      if (error) throw error

      const horasPorDia: Record<string, any[]> = {}
      for (const r of data || []) {
        if (!horasPorDia[r.data]) horasPorDia[r.data] = []
        horasPorDia[r.data].push(r)
      }

      setRegistros(Object.entries(horasPorDia).map(([data, regs]) => {
        const sorted = regs.sort((a: any, b: any) =>
          new Date(a.data_hora).getTime() - new Date(b.data_hora).getTime()
        )
        let totalMin = 0
        for (let i = 0; i < sorted.length - 1; i++) {
          const diff = new Date(sorted[i + 1].data_hora).getTime() - new Date(sorted[i].data_hora).getTime()
          if (diff > 0 && diff < 72000000) totalMin += diff / 60000
        }
        const horas = totalMin / 60
        const saldo = horas - 8
        return {
          data,
          horas_trabalhadas: Math.round(horas * 100) / 100,
          horas_previstas: 8,
          saldo: Math.round(saldo * 100) / 100,
          horas_extras: Math.max(0, Math.round(saldo * 100) / 100),
          horas_debito: Math.max(0, Math.round(-saldo * 100) / 100),
        } as BancoHoras
      }))
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const totalExtras = registros.reduce((s, r) => s + r.horas_extras, 0)
  const totalDebito = registros.reduce((s, r) => s + r.horas_debito, 0)
  const saldoTotal = registros.reduce((s, r) => s + r.saldo, 0)
  const diasTrabalhados = registros.length

  const nomeMes = new Date(ano, mes - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

  const mesAnterior = () => {
    if (mes === 1) { setMes(12); setAno(ano - 1) }
    else setMes(mes - 1)
  }

  const proximoMes = () => {
    if (mes === 12) { setMes(1); setAno(ano + 1) }
    else setMes(mes + 1)
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={mesAnterior} className="p-2 hover:bg-muted rounded-lg">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-bold capitalize">{nomeMes}</h2>
          <button onClick={proximoMes} className="p-2 hover:bg-muted rounded-lg">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 text-center">
          <p className="text-sm text-muted-foreground">Dias Trabalhados</p>
          <p className="text-3xl font-bold mt-1">{diasTrabalhados}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-sm text-muted-foreground">Horas Extras</p>
          <p className="text-3xl font-bold mt-1 text-green-600">{totalExtras.toFixed(1)}h</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-sm text-muted-foreground">Horas Débito</p>
          <p className="text-3xl font-bold mt-1 text-red-600">{totalDebito.toFixed(1)}h</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-sm text-muted-foreground">Saldo Total</p>
          <p className={`text-3xl font-bold mt-1 ${saldoTotal >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {saldoTotal >= 0 ? '+' : ''}{saldoTotal.toFixed(1)}h
          </p>
        </Card>
      </div>

      <Card className="p-6">
        <h3 className="font-semibold mb-4">Detalhamento Diário</h3>
        {loading ? (
          <p className="text-muted-foreground">Carregando...</p>
        ) : registros.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>Nenhum registro neste período</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-auto">
            {registros.map((r) => (
              <div key={r.data} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  {r.saldo >= 0
                    ? <TrendingUp className="w-5 h-5 text-green-500" />
                    : <TrendingDown className="w-5 h-5 text-red-500" />
                  }
                  <div>
                    <p className="font-medium">
                      {new Date(r.data + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {r.horas_trabalhadas.toFixed(1)}h / {r.horas_previstas.toFixed(1)}h previstas
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-bold text-lg ${r.saldo >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {r.saldo >= 0 ? '+' : ''}{r.saldo.toFixed(1)}h
                  </p>
                  <Progress
                    value={Math.min(100, (r.horas_trabalhadas / r.horas_previstas) * 100)}
                    className="w-24 h-1.5 mt-1"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

export default BankHours
