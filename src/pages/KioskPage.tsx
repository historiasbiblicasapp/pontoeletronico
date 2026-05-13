import { useState, useRef, useEffect, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "@/integrations/supabase/client"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { toast } from "sonner"
import { Clock, UserCheck, Camera, Fingerprint, Smartphone } from "lucide-react"
import type { Funcionario, TipoRegistro } from "@/integrations/supabase/ponto-digital"
import {
  obterUltimoRegistro,
  getEstadoRegistro,
} from "@/lib/ponto-utils"

type KioskStep = "matricula" | "pin" | "confirmacao" | "registrado"

const KioskPage = () => {
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState<KioskStep>("matricula")
  const [matricula, setMatricula] = useState("")
  const [pin, setPin] = useState("")
  const [funcionario, setFuncionario] = useState<Funcionario | null>(null)
  const [loading, setLoading] = useState(false)
  const [registroTipo, setRegistroTipo] = useState<TipoRegistro>("entrada")
  const [horarioAtual, setHorarioAtual] = useState(new Date())
  const [empresaId, setEmpresaId] = useState<string>("")
  const [dispositivoId, setDispositivoId] = useState<string>("")

  useEffect(() => {
    const interval = setInterval(() => setHorarioAtual(new Date()), 1000)
    carregarConfigKiosk()
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (step === "matricula" && inputRef.current) {
      inputRef.current.focus()
    }
  }, [step])

  const carregarConfigKiosk = async () => {
    const params = new URLSearchParams(window.location.search)
    const tenantSlug = params.get("empresa") || localStorage.getItem("kiosk_empresa_slug")

    if (!tenantSlug) {
      const { data: tenants } = await supabase
        .from("tenants")
        .select("id, slug, nome_fantasia, name")
        .eq("active", true)
        .limit(1)

      if (tenants && tenants.length > 0) {
        setEmpresaId(tenants[0].id)
        localStorage.setItem("kiosk_empresa_slug", tenants[0].slug)
      }
      return
    }

    localStorage.setItem("kiosk_empresa_slug", tenantSlug)
    const { data: tenant } = await supabase
      .from("tenants")
      .select("id")
      .eq("slug", tenantSlug)
      .single()

    if (tenant) setEmpresaId(tenant.id)
  }

  const buscarFuncionario = async (matr: string) => {
    if (!empresaId || matr.length < 2) return

    setLoading(true)
    const { data, error } = await supabase
      .from("funcionarios")
      .select("*")
      .eq("empresa_id", empresaId)
      .eq("matricula", matr)
      .eq("ativo", true)
      .maybeSingle()

    setLoading(false)

    if (error || !data) {
      toast.error("Matrícula não encontrada")
      return
    }

    setFuncionario(data)
    if (data.pin) {
      setStep("pin")
      setTimeout(() => inputRef.current?.focus(), 100)
    } else {
      await processarRegistro(data)
    }
  }

  const verificarPin = async () => {
    if (!funcionario) return
    if (pin !== funcionario.pin) {
      toast.error("PIN inválido")
      setPin("")
      return
    }
    await processarRegistro(funcionario)
  }

  const processarRegistro = async (func: Funcionario) => {
    setLoading(true)
    try {
      const ultimo = await obterUltimoRegistro(func.id)
      const estado = getEstadoRegistro(ultimo?.tipo || null)

      const tipoAtual = estado.ultimoTipo
        ? (estado.ultimoTipo === 'entrada' ? 'saida_almoco' as TipoRegistro
          : estado.ultimoTipo === 'saida_almoco' ? 'retorno_almoco' as TipoRegistro
          : estado.ultimoTipo === 'retorno_almoco' ? 'saida' as TipoRegistro
          : 'entrada' as TipoRegistro)
        : 'entrada' as TipoRegistro

      setRegistroTipo(tipoAtual)

      const ip = await fetch('https://api.ipify.org?format=json').then(r => r.json()).then(d => d.ip).catch(() => null)

      const { error } = await supabase.from("registros_ponto").insert({
        funcionario_id: func.id,
        empresa_id: func.empresa_id,
        tipo: tipoAtual,
        dispositivo_id: dispositivoId || null,
        ip,
        dispositivo_info: `Kiosk/Tablet ${navigator.userAgent}`,
        hash_integridade: "",
      })

      if (error) throw error

      setStep("registrado")
      setTimeout(() => {
        setStep("matricula")
        setMatricula("")
        setPin("")
        setFuncionario(null)
      }, 3000)
    } catch (err: any) {
      toast.error(err.message || "Erro ao registrar ponto")
    } finally {
      setLoading(false)
    }
  }

  const handleMatriculaSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    buscarFuncionario(matricula)
  }

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    verificarPin()
  }

  const handleNumPad = useCallback((digit: string) => {
    if (step === "matricula") {
      setMatricula(prev => prev + digit)
    } else if (step === "pin") {
      setPin(prev => prev + digit)
    }
  }, [step])

  const handleClear = () => {
    if (step === "matricula") setMatricula("")
    else setPin("")
  }

  const handleBackspace = () => {
    if (step === "matricula") setMatricula(prev => prev.slice(0, -1))
    else setPin(prev => prev.slice(0, -1))
  }

  if (step === "registrado") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg p-12 text-center border-2 border-green-200 shadow-xl">
          <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
            <UserCheck className="w-12 h-12 text-green-600" />
          </div>
          <h2 className="text-3xl font-bold text-green-700 mb-2">Ponto Registrado!</h2>
          <p className="text-xl text-green-600 mb-2">{funcionario?.nome}</p>
          <p className="text-4xl font-bold text-green-700 mb-4">
            {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </p>
          <div className="inline-block px-6 py-2 rounded-full bg-green-100 text-green-700 font-semibold text-lg">
            {registroTipo === 'entrada' ? 'ENTRADA' :
             registroTipo === 'saida_almoco' ? 'SAÍDA ALMOÇO' :
             registroTipo === 'retorno_almoco' ? 'RETORNO ALMOÇO' : 'SAÍDA FINAL'}
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4 select-none">
      <Card className="w-full max-w-lg p-8 shadow-2xl border-slate-200">
        <div className="text-center mb-8">
          <Clock className="w-16 h-16 text-primary mx-auto mb-4" />
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Ponto Digital BM
          </h1>
          <p className="text-2xl font-mono font-bold text-primary">
            {horarioAtual.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </p>
          <p className="text-base text-muted-foreground mt-2">
            {horarioAtual.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>

        {step === "matricula" && (
          <form onSubmit={handleMatriculaSubmit} className="space-y-6">
            <div className="text-center">
              <Fingerprint className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <h2 className="text-2xl font-semibold mb-1">Digite sua Matrícula</h2>
              <p className="text-muted-foreground">ou escaneie seu QR Code</p>
            </div>

            <div className="flex justify-center">
              <div className="bg-muted rounded-xl px-8 py-4">
                <span className="text-5xl font-mono font-bold tracking-[0.2em]">
                  {matricula || <span className="text-muted-foreground/40">______</span>}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 max-w-xs mx-auto">
              {['1','2','3','4','5','6','7','8','9'].map(d => (
                <button
                  key={d}
                  type="button"
                  onClick={() => handleNumPad(d)}
                  className="h-16 text-2xl font-bold rounded-xl bg-muted hover:bg-muted/80 active:bg-muted/60 transition-all active:scale-95"
                >
                  {d}
                </button>
              ))}
              <button
                type="button"
                onClick={handleClear}
                className="h-16 text-lg font-medium rounded-xl bg-destructive/10 hover:bg-destructive/20 text-destructive active:scale-95"
              >
                Limpar
              </button>
              <button
                type="button"
                onClick={() => handleNumPad('0')}
                className="h-16 text-2xl font-bold rounded-xl bg-muted hover:bg-muted/80 active:bg-muted/60 active:scale-95"
              >
                0
              </button>
              <button
                type="button"
                onClick={handleBackspace}
                className="h-16 text-lg font-medium rounded-xl bg-muted hover:bg-muted/80 active:bg-muted/60 active:scale-95"
              >
                ⌫
              </button>
            </div>

            <Button
              type="submit"
              className="w-full h-14 text-lg font-semibold"
              disabled={matricula.length < 2 || loading}
            >
              {loading ? "Buscando..." : "Confirmar Matrícula"}
            </Button>

            <button
              type="button"
              onClick={() => navigate("/")}
              className="w-full text-sm text-muted-foreground hover:text-foreground py-2"
            >
              Voltar ao Login
            </button>
          </form>
        )}

        {step === "pin" && (
          <form onSubmit={handlePinSubmit} className="space-y-6">
            <div className="text-center">
              <Camera className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <h2 className="text-2xl font-semibold mb-1">Digite seu PIN</h2>
              <p className="text-muted-foreground">{funcionario?.nome}</p>
            </div>

            <div className="flex justify-center">
              <div className="bg-muted rounded-xl px-8 py-4">
                <span className="text-5xl font-mono tracking-[0.3em]">
                  {pin.split('').map(() => '●').join('') || <span className="text-muted-foreground/40">______</span>}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 max-w-xs mx-auto">
              {['1','2','3','4','5','6','7','8','9'].map(d => (
                <button
                  key={d}
                  type="button"
                  onClick={() => handleNumPad(d)}
                  className="h-16 text-2xl font-bold rounded-xl bg-muted hover:bg-muted/80 active:bg-muted/60 active:scale-95"
                >
                  {d}
                </button>
              ))}
              <button
                type="button"
                onClick={() => { setStep("matricula"); setMatricula(""); setPin("") }}
                className="h-16 text-lg font-medium rounded-xl bg-destructive/10 hover:bg-destructive/20 text-destructive active:scale-95"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={() => handleNumPad('0')}
                className="h-16 text-2xl font-bold rounded-xl bg-muted hover:bg-muted/80 active:bg-muted/60 active:scale-95"
              >
                0
              </button>
              <button
                type="button"
                onClick={handleBackspace}
                className="h-16 text-lg font-medium rounded-xl bg-muted hover:bg-muted/80 active:bg-muted/60 active:scale-95"
              >
                ⌫
              </button>
            </div>

            <Button
              type="submit"
              className="w-full h-14 text-lg font-semibold"
              disabled={pin.length < 4 || loading}
            >
              {loading ? "Registrando..." : "Confirmar PIN"}
            </Button>
          </form>
        )}
      </Card>
    </div>
  )
}

export default KioskPage
