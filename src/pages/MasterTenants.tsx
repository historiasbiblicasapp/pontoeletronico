import { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { toast } from "sonner"
import { Plus, Pencil, Users, Building2, Search } from "lucide-react"
import type { Tenant } from "@/integrations/supabase/multi-tenant"
import { PLANOS_SAAS } from "@/integrations/supabase/ponto-digital"

const MasterTenants = () => {
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [form, setForm] = useState({
    name: "",
    slug: "",
    razao_social: "",
    nome_fantasia: "",
    cnpj: "",
    email: "",
    telefone: "",
    plano: "basico",
    limite_funcionarios: 10,
    active: true,
    primary_color: "#16a34a",
  })

  const { data: tenants = [], isLoading } = useQuery({
    queryKey: ["master-tenants"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("*")
        .order("created_at", { ascending: false })
      if (error) throw error
      return data as Tenant[]
    },
  })

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.from("tenants").insert({
        name: form.name,
        slug: form.slug,
        razao_social: form.razao_social || null,
        nome_fantasia: form.nome_fantasia || null,
        cnpj: form.cnpj || null,
        email: form.email || null,
        telefone: form.telefone || null,
        plano: form.plano,
        limite_funcionarios: form.limite_funcionarios,
        active: form.active,
        primary_color: form.primary_color,
      }).select().single()

      if (error) throw error

      const adminEmail = `${form.slug}@admin.pontodigital.com`
      const adminPassword = "admin123"

      const { error: authError } = await supabase.auth.signUp({
        email: adminEmail,
        password: adminPassword,
        options: { data: { tenant_id: data.id, role: "admin" } },
      })

      if (authError) throw authError

      const { error: linkError } = await supabase.from("tenant_users").insert({
        tenant_id: data.id,
        email: adminEmail,
        role: "admin",
      })

      if (linkError) throw linkError

      toast.success(`Empresa criada! Admin: ${adminEmail} / ${adminPassword}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["master-tenants"] })
      setDialogOpen(false)
    },
    onError: (err: any) => toast.error(err.message || "Erro ao criar"),
  })

  const generateSlug = (name: string) =>
    name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")

  const filtered = tenants.filter(t =>
    !search ||
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.cnpj?.includes(search) ||
    t.razao_social?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Empresas</h1>
          <p className="text-muted-foreground">{tenants.length} empresas cadastradas</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nova Empresa
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nova Empresa</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <Label>Nome *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({
                    ...form,
                    name: e.target.value,
                    slug: generateSlug(e.target.value),
                    nome_fantasia: e.target.value,
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label>Slug *</Label>
                <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>CNPJ</Label>
                <Input value={form.cnpj} onChange={(e) => setForm({ ...form, cnpj: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Razão Social</Label>
                <Input value={form.razao_social} onChange={(e) => setForm({ ...form, razao_social: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Plano</Label>
                <Select value={form.plano} onValueChange={(v) => {
                  const plano = PLANOS_SAAS.find(p => p.id === v)
                  setForm({ ...form, plano: v, limite_funcionarios: plano?.limite_funcionarios || 10 })
                }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PLANOS_SAAS.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.nome} - R${p.preco}/mês ({p.limite_funcionarios === 999999 ? "∞" : p.limite_funcionarios} func.)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Limite Funcionários</Label>
                <Input
                  type="number"
                  value={form.limite_funcionarios}
                  onChange={(e) => setForm({ ...form, limite_funcionarios: Number(e.target.value) })}
                />
              </div>
            </div>
            <Button
              className="w-full mt-4"
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? "Criando..." : "Criar Empresa"}
            </Button>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar empresas..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando...</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((t) => (
            <Card key={t.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-lg"
                      style={{ backgroundColor: t.primary_color || "#16a34a" }}
                    >
                      {(t.nome_fantasia || t.name).charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <CardTitle className="text-base">{t.nome_fantasia || t.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">{t.razao_social || t.slug}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className={t.active ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}>
                    {t.active ? "Ativo" : "Inativo"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  {t.cnpj && <p>CNPJ: {t.cnpj}</p>}
                  <p>Plano: {PLANOS_SAAS.find(p => p.id === t.plano)?.nome || t.plano || "Básico"}</p>
                  <p>Limite: {t.limite_funcionarios} funcionários</p>
                  <p className="text-muted-foreground text-xs">
                    Criado em {new Date(t.created_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              Nenhuma empresa encontrada
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default MasterTenants
