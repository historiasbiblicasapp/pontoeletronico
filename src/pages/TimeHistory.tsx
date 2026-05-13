import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { supabase } from "@/integrations/supabase/client"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Clock, Download, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"
import { formatarTempoRegistro, formatarDataRegistro, calcularHorasTrabalhadas } from "@/integrations/supabase/ponto-digital"
import type { RegistroPonto } from "@/integrations/supabase/ponto-digital"
import { obterRegistrosPorMes } from "@/lib/ponto-utils"

const TimeHistory = () => {
  const { user } = useAuth()
  const [registros, setRegistros] = useState<Record<string, RegistroPonto[]>>({})
  const [loading, setLoading] = useState(true)
  const [mes, setMes] = useState(new Date().getMonth() + 1)
  const [ano, setAno] = useState(new Date().getFullYear())

  useEffect(() => {
    if (user?.funcionario?.id) {
      carregarRegistros()
    }
  }, [user, mes, ano])

  const carregarRegistros = async () => {
    if (!user?.funcionario?.id) return
    setLoading(true)
    try {
      const data = await obterRegistrosPorMes(user.funcionario.id, mes, ano)
      const agrupados: Record<string, RegistroPonto[]> = {}
      for (const r of data) {
        const chave = r.data
        if (!agrupados[chave]) agrupados[chave] = []
        agrupados[chave].push(r)
      }
      setRegistros(agrupados)
    } catch (err: any) {
      toast.error("Erro ao carregar histórico")
    } finally {
      setLoading(false)
    }
  }

  const handleExportPDF = async () => {
    toast.success("Relatório PDF será gerado")
  }

  const mesAnterior = () => {
    if (mes === 1) { setMes(12); setAno(ano - 1) }
    else setMes(mes - 1)
  }

  const proximoMes = () => {
    if (mes === 12) { setMes(1); setAno(ano + 1) }
    else setMes(mes + 1)
  }

  const nomeMes = new Date(ano, mes - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

  const dias = Object.keys(registros).sort().reverse()

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={mesAnterior}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h2 className="text-xl font-bold capitalize">{nomeMes}</h2>
          <Button variant="outline" size="icon" onClick={proximoMes}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        <Button variant="outline" size="sm" onClick={handleExportPDF}>
          <Download className="w-4 h-4 mr-2" />
          Exportar
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando...</div>
      ) : dias.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">
          <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg">Nenhum registro neste mês</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {dias.map((dia) => {
            const registrosDia = registros[dia]
            const horas = calcularHorasTrabalhadas(registrosDia)
            return (
              <Card key={dia} className="p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-semibold text-lg">
                      {new Date(dia + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Total</p>
                    <p className="text-lg font-bold font-mono">{horas}h</p>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {registrosDia.map((r) => {
                    const tipoLabel =
                      r.tipo === 'entrada' ? 'Entrada' :
                      r.tipo === 'saida_almoco' ? 'Almoço S' :
                      r.tipo === 'retorno_almoco' ? 'Almoço R' :
                      r.tipo === 'saida' ? 'Saída' :
                      r.tipo === 'extra_inicio' ? 'Extra I' : 'Extra F'
                    return (
                      <div key={r.id} className="bg-muted rounded-lg p-2 text-center">
                        <p className="text-xs text-muted-foreground">{tipoLabel}</p>
                        <p className="text-sm font-mono font-bold">{formatarTempoRegistro(r.data_hora)}</p>
                      </div>
                    )
                  })}
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default TimeHistory
