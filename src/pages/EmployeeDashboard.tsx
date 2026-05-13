import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { supabase } from "@/integrations/supabase/client"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Clock, LogIn, LogOut, Coffee, Utensils, Camera, MapPin, CheckCircle2, AlertCircle } from "lucide-react"
import { useGeolocation } from "@/hooks/useGeolocation"
import { obterUltimoRegistro, obterRegistrosDoDia, registrarPonto } from "@/lib/ponto-utils"
import { formatarTempoRegistro, formatarDataRegistro, calcularHorasTrabalhadas, calcularSaldo } from "@/integrations/supabase/ponto-digital"
import type { TipoRegistro } from "@/integrations/supabase/ponto-digital"

const EmployeeDashboard = () => {
  const { user, company } = useAuth()
  const geo = useGeolocation()
  const [registros, setRegistros] = useState<any[]>([])
  const [ultimoRegistro, setUltimoRegistro] = useState<TipoRegistro | null>(null)
  const [loading, setLoading] = useState(false)
  const [registrando, setRegistrando] = useState(false)
  const [horarioAtual, setHorarioAtual] = useState(new Date())

  useEffect(() => {
    const interval = setInterval(() => setHorarioAtual(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (user?.funcionario?.id) {
      carregarDados()
    }
  }, [user])

  const carregarDados = async () => {
    if (!user?.funcionario?.id) return
    setLoading(true)
    try {
      const hoje = await obterRegistrosDoDia(user.funcionario.id)
      setRegistros(hoje)

      const ultimo = await obterUltimoRegistro(user.funcionario.id)
      setUltimoRegistro(ultimo?.tipo || null)
    } catch (err: any) {
      console.error("Erro ao carregar dados:", err)
    } finally {
      setLoading(false)
    }
  }

  const getProximoRegistro = useCallback((): TipoRegistro => {
    if (!ultimoRegistro) return 'entrada'
    switch (ultimoRegistro) {
      case 'entrada': return 'saida_almoco'
      case 'saida_almoco': return 'retorno_almoco'
      case 'retorno_almoco': return 'saida'
      case 'saida': return 'entrada'
      default: return 'entrada'
    }
  }, [ultimoRegistro])

  const getInfoProximoRegistro = () => {
    const tipo = getProximoRegistro()
    switch (tipo) {
      case 'entrada':
        return { label: 'Registrar Entrada', icon: LogIn, cor: '#22c55e', bg: 'bg-green-50', textCor: 'text-green-700', border: 'border-green-200' }
      case 'saida_almoco':
        return { label: 'Registrar Saída Almoço', icon: Coffee, cor: '#eab308', bg: 'bg-yellow-50', textCor: 'text-yellow-700', border: 'border-yellow-200' }
      case 'retorno_almoco':
        return { label: 'Registrar Retorno Almoço', icon: Utensils, cor: '#eab308', bg: 'bg-yellow-50', textCor: 'text-yellow-700', border: 'border-yellow-200' }
      case 'saida':
        return { label: 'Registrar Saída Final', icon: LogOut, cor: '#ef4444', bg: 'bg-red-50', textCor: 'text-red-700', border: 'border-red-200' }
    }
  }

  const handleRegistrar = async () => {
    if (!user?.funcionario?.id || !company?.id) return

    if (registrando) return
    setRegistrando(true)

    try {
      if (!geo.latitude || !geo.longitude) {
        await geo.atualizar()
      }

      const tipo = getProximoRegistro()

      const novoRegistro = await registrarPonto({
        funcionario_id: user.funcionario.id,
        empresa_id: company.id,
        tipo,
        latitude: geo.latitude?.toString() || null,
        longitude: geo.longitude?.toString() || null,
        endereco: geo.address,
      })

      toast.success(`${getInfoProximoRegistro()?.label} registrado com sucesso!`, {
        description: ` às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
      })

      await carregarDados()
    } catch (err: any) {
      toast.error("Erro ao registrar", {
        description: err.message || "Tente novamente",
      })
    } finally {
      setRegistrando(false)
    }
  }

  const info = getInfoProximoRegistro()
  const horas = registros.length > 0 ? calcularHorasTrabalhadas(registros) : '00:00'
  const saldo = registros.length > 0 ? calcularSaldo(registros, 8) : '00:00'
  const dataHoje = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Olá, {user?.funcionario?.nome || user?.email}</h1>
        <p className="text-muted-foreground capitalize">{dataHoje}</p>
        <p className="text-5xl font-bold font-mono mt-2 text-primary">
          {horarioAtual.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </p>
      </div>

      <Card
        className={`p-8 text-center cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] ${info?.bg} ${info?.border} border-2 shadow-lg`}
        onClick={handleRegistrar}
      >
        <div className="space-y-4">
          <div
            className="w-24 h-24 rounded-full flex items-center justify-center mx-auto animate-pulse"
            style={{ backgroundColor: `${info?.cor}20` }}
          >
            {info?.icon && <info.icon className="w-12 h-12" style={{ color: info.cor }} />}
          </div>
          <div>
            <h2 className="text-2xl font-bold" style={{ color: info?.cor }}>
              {info?.label}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Toque para registrar
            </p>
          </div>
        </div>
      </Card>

      {registrando && (
        <Card className="p-4 text-center bg-primary/5 border-primary/20">
          <p className="text-primary font-semibold animate-pulse">Registrando...</p>
        </Card>
      )}

      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4 text-center">
          <p className="text-sm text-muted-foreground">Registros Hoje</p>
          <p className="text-2xl font-bold mt-1">{registros.length}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-sm text-muted-foreground">Horas Trabalhadas</p>
          <p className="text-2xl font-bold mt-1 font-mono">{horas}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-sm text-muted-foreground">Saldo</p>
          <p className={`text-2xl font-bold mt-1 font-mono ${saldo.startsWith('+') ? 'text-green-600' : saldo.startsWith('-') ? 'text-red-600' : ''}`}>
            {saldo}h
          </p>
        </Card>
      </div>

      <div className="bg-muted/30 rounded-xl">
        {registros.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground">
            <AlertCircle className="w-8 h-8 mx-auto mb-2" />
            <p>Nenhum registro hoje</p>
          </div>
        ) : (
          <div className="divide-y">
            {registros.map((r) => {
              const tipoLabel =
                r.tipo === 'entrada' ? 'Entrada' :
                r.tipo === 'saida_almoco' ? 'Saída Almoço' :
                r.tipo === 'retorno_almoco' ? 'Retorno Almoço' :
                r.tipo === 'saida' ? 'Saída Final' :
                r.tipo === 'extra_inicio' ? 'Extra Início' : 'Extra Fim'
              return (
                <div key={r.id} className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                    <span className="font-medium">{tipoLabel}</span>
                  </div>
                  <span className="text-lg font-mono font-bold">
                    {formatarTempoRegistro(r.data_hora)}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {geo.latitude && geo.longitude && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground justify-center">
          <MapPin className="w-3 h-3" />
          <span>Localização capturada</span>
        </div>
      )}
    </div>
  )
}

export default EmployeeDashboard
