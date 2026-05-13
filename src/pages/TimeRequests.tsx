import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { supabase } from "@/integrations/supabase/client"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Plus, FileText, CheckCircle2, XCircle, Clock, AlertCircle } from "lucide-react"
import type { Ajuste } from "@/integrations/supabase/ponto-digital"
import { TIPOS_AJUSTE } from "@/integrations/supabase/ponto-digital"

const TimeRequests = () => {
  const { user, company } = useAuth()
  const [ajustes, setAjustes] = useState<Ajuste[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState({
    tipo: "",
    data_referencia: new Date().toISOString().split('T')[0],
    justificativa: "",
  })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (user?.funcionario?.id) {
      carregarAjustes()
    }
  }, [user])

  const carregarAjustes = async () => {
    if (!user?.funcionario?.id) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from("ajustes")
        .select("*")
        .eq("funcionario_id", user.funcionario.id)
        .order("created_at", { ascending: false })

      if (error) throw error
      setAjustes(data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!user?.funcionario?.id || !company?.id) return
    if (!form.tipo || !form.justificativa) {
      toast.error("Preencha todos os campos")
      return
    }

    setSubmitting(true)
    try {
      const { error } = await supabase.from("ajustes").insert({
        funcionario_id: user.funcionario.id,
        empresa_id: company.id,
        tipo: form.tipo,
        data_referencia: form.data_referencia,
        justificativa: form.justificativa,
        status: "pendente",
      })

      if (error) throw error

      toast.success("Solicitação enviada com sucesso!")
      setDialogOpen(false)
      setForm({ tipo: "", data_referencia: new Date().toISOString().split('T')[0], justificativa: "" })
      carregarAjustes()
    } catch (err: any) {
      toast.error(err.message || "Erro ao enviar solicitação")
    } finally {
      setSubmitting(false)
    }
  }

  const statusBadge = (status: string) => {
    switch (status) {
      case 'aprovado':
        return <Badge className="bg-green-100 text-green-700 border-green-200"><CheckCircle2 className="w-3 h-3 mr-1" />Aprovado</Badge>
      case 'recusado':
        return <Badge className="bg-red-100 text-red-700 border-red-200"><XCircle className="w-3 h-3 mr-1" />Recusado</Badge>
      default:
        return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200"><Clock className="w-3 h-3 mr-1" />Pendente</Badge>
    }
  }

  const tipoLabel = (tipo: string) => {
    const t = TIPOS_AJUSTE.find(a => a.value === tipo)
    return t?.label || tipo
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Solicitações</h1>
          <p className="text-muted-foreground">Ajustes de ponto e justificativas</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nova Solicitação
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Nova Solicitação</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select
                  value={form.tipo}
                  onValueChange={(v) => setForm({ ...form, tipo: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS_AJUSTE.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Data de Referência</Label>
                <Input
                  type="date"
                  value={form.data_referencia}
                  onChange={(e) => setForm({ ...form, data_referencia: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Justificativa</Label>
                <Textarea
                  placeholder="Descreva o motivo da solicitação..."
                  value={form.justificativa}
                  onChange={(e) => setForm({ ...form, justificativa: e.target.value })}
                  rows={4}
                />
              </div>
              <Button
                className="w-full"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? "Enviando..." : "Enviar Solicitação"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando...</div>
      ) : ajustes.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">
          <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg">Nenhuma solicitação encontrada</p>
          <p className="text-sm mt-2">Clique em "Nova Solicitação" para criar</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {ajustes.map((a) => (
            <Card key={a.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{tipoLabel(a.tipo)}</span>
                    {statusBadge(a.status)}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Data: {new Date(a.data_referencia + 'T12:00:00').toLocaleDateString('pt-BR')}
                  </p>
                  <p className="text-sm mt-2">{a.justificativa}</p>
                  {a.observacao_rh && (
                    <div className="mt-2 p-2 bg-muted rounded text-sm">
                      <span className="font-medium">RH: </span>
                      {a.observacao_rh}
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {new Date(a.created_at).toLocaleDateString('pt-BR')}
                </p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

export default TimeRequests
