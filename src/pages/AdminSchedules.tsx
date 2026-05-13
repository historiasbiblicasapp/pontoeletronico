import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { supabase } from "@/integrations/supabase/client"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Plus, Pencil, Clock, Calendar, Users, Trash2 } from "lucide-react"
import type { Escala, Funcionario } from "@/integrations/supabase/ponto-digital"
import { TIPOS_ESCALA } from "@/integrations/supabase/ponto-digital"

const AdminSchedules = () => {
  const { company } = useAuth()
  const [escalas, setEscalas] = useState<Escala[]>([])
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Escala | null>(null)
  const [form, setForm] = useState({
    nome: "",
    tipo: "5x2",
    hora_entrada: "08:00",
    hora_saida_almoco: "12:00",
    hora_retorno_almoco: "13:00",
    hora_saida: "18:00",
    tolerancia_minutos: 10,
    carga_horaria_diaria: 8,
  })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (company?.id) {
      carregarDados()
    }
  }, [company])

  const carregarDados = async () => {
    if (!company?.id) return
    setLoading(true)
    try {
      const [escalasRes, funcRes] = await Promise.all([
        supabase.from("escalas").select("*").eq("empresa_id", company.id).order("nome"),
        supabase.from("funcionarios").select("*").eq("empresa_id", company.id).eq("ativo", true),
      ])

      if (escalasRes.error) throw escalasRes.error
      setEscalas(escalasRes.data || [])
      if (funcRes.data) setFuncionarios(funcRes.data)
    } catch (err: any) {
      toast.error("Erro ao carregar dados")
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!company?.id) return
    if (!form.nome) {
      toast.error("Nome da escala é obrigatório")
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        empresa_id: company.id,
        nome: form.nome,
        tipo: form.tipo,
        hora_entrada: form.hora_entrada,
        hora_saida_almoco: form.hora_saida_almoco || null,
        hora_retorno_almoco: form.hora_retorno_almoco || null,
        hora_saida: form.hora_saida,
        tolerancia_minutos: form.tolerancia_minutos,
        carga_horaria_diaria: form.carga_horaria_diaria,
      }

      if (editing) {
        const { error } = await supabase.from("escalas").update(payload).eq("id", editing.id)
        if (error) throw error
        toast.success("Escala atualizada!")
      } else {
        const { error } = await supabase.from("escalas").insert(payload)
        if (error) throw error
        toast.success("Escala criada!")
      }

      setDialogOpen(false)
      setEditing(null)
      carregarDados()
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar")
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (e: Escala) => {
    setEditing(e)
    setForm({
      nome: e.nome,
      tipo: e.tipo,
      hora_entrada: e.hora_entrada.slice(0, 5),
      hora_saida_almoco: e.hora_saida_almoco?.slice(0, 5) || "12:00",
      hora_retorno_almoco: e.hora_retorno_almoco?.slice(0, 5) || "13:00",
      hora_saida: e.hora_saida.slice(0, 5),
      tolerancia_minutos: e.tolerancia_minutos,
      carga_horaria_diaria: e.carga_horaria_diaria,
    })
    setDialogOpen(true)
  }

  const getFuncionariosNaEscala = (escalaId: string) => {
    return funcionarios.filter(f => {
      return true
    }).length
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Escalas</h1>
          <p className="text-muted-foreground">Gerencie turnos e jornadas</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          if (!open) { setEditing(null) }
          setDialogOpen(open)
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nova Escala
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Editar Escala" : "Nova Escala"}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <Label>Nome da Escala</Label>
                <Input
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  placeholder="Ex: Administrativo"
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Tipo</Label>
                <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS_ESCALA.map((te) => (
                      <SelectItem key={te.value} value={te.value}>{te.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Entrada</Label>
                <Input
                  type="time"
                  value={form.hora_entrada}
                  onChange={(e) => setForm({ ...form, hora_entrada: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Saída Almoço</Label>
                <Input
                  type="time"
                  value={form.hora_saida_almoco}
                  onChange={(e) => setForm({ ...form, hora_saida_almoco: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Retorno Almoço</Label>
                <Input
                  type="time"
                  value={form.hora_retorno_almoco}
                  onChange={(e) => setForm({ ...form, hora_retorno_almoco: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Saída</Label>
                <Input
                  type="time"
                  value={form.hora_saida}
                  onChange={(e) => setForm({ ...form, hora_saida: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Tolerância (min)</Label>
                <Input
                  type="number"
                  value={form.tolerancia_minutos}
                  onChange={(e) => setForm({ ...form, tolerancia_minutos: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Carga Diária (h)</Label>
                <Input
                  type="number"
                  value={form.carga_horaria_diaria}
                  onChange={(e) => setForm({ ...form, carga_horaria_diaria: Number(e.target.value) })}
                />
              </div>
            </div>
            <Button className="w-full mt-4" onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Salvando..." : editing ? "Atualizar" : "Criar"}
            </Button>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando...</div>
      ) : escalas.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">
          <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg">Nenhuma escala cadastrada</p>
          <p className="text-sm mt-2">Crie escalas para definir turnos e jornadas</p>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {escalas.map((e) => (
            <Card key={e.id} className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-lg">{e.nome}</h3>
                  <Badge variant="outline" className="mt-1">
                    {TIPOS_ESCALA.find(te => te.value === e.tipo)?.label || e.tipo}
                  </Badge>
                </div>
                <Button variant="ghost" size="sm" onClick={() => handleEdit(e)}>
                  <Pencil className="w-4 h-4" />
                </Button>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Entrada</span>
                  <span className="font-mono font-bold">{e.hora_entrada.slice(0, 5)}</span>
                </div>
                {e.hora_saida_almoco && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Saída Almoço</span>
                    <span className="font-mono font-bold">{e.hora_saida_almoco.slice(0, 5)}</span>
                  </div>
                )}
                {e.hora_retorno_almoco && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Retorno Almoço</span>
                    <span className="font-mono font-bold">{e.hora_retorno_almoco.slice(0, 5)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Saída</span>
                  <span className="font-mono font-bold">{e.hora_saida.slice(0, 5)}</span>
                </div>
                <div className="border-t pt-2 mt-2 flex justify-between">
                  <span className="text-muted-foreground">Carga Diária</span>
                  <span className="font-bold">{e.carga_horaria_diaria}h</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tolerância</span>
                  <span>{e.tolerancia_minutos}min</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

export default AdminSchedules
