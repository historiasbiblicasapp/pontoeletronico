import { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Pencil, Users } from "lucide-react"
import { toast } from "sonner"
import type { Tenant, TenantInsert } from "@/integrations/supabase/multi-tenant"

const AdminTenants = () => {
  useEffect(() => {
    alert("AdminTenants rendered!")
  }, [])

  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Tenant | null>(null)
  const [form, setForm] = useState({
    name: "",
    slug: "",
    max_sessions: 2,
    primary_color: "#16a34a",
    active: true
  })

  const { data: tenants = [], isLoading } = useQuery({
    queryKey: ["admin-tenants"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tenants").select("*").order("created_at", { ascending: false })
      if (error) throw error
      return data
    }
  })

  const createMutation = useMutation({
    mutationFn: async (tenant: TenantInsert) => {
      const { data, error } = await supabase.from("tenants").insert(tenant).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-tenants"] })
      setShowForm(false)
      setForm({ name: "", slug: "", max_sessions: 2, primary_color: "#16a34a", active: true })
      toast.success("Cliente criado!")
    },
    onError: () => toast.error("Erro ao criar")
  })

  const generateSlug = (name: string) => name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createMutation.mutate(form as TenantInsert)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Clientes / Lojas</h1>
          <p className="text-slate-600">Gerencie os clientes</p>
        </div>
        <button onClick={() => setShowForm(true)} className="bg-slate-800 text-white px-4 py-2 rounded">
          Novo Cliente
        </button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Novo Cliente</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value, slug: generateSlug(e.target.value) })} required />
              </div>
              <div className="space-y-2">
                <Label>Slug</Label>
                <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Max sessões</Label>
                <Input type="number" value={form.max_sessions} onChange={(e) => setForm({ ...form, max_sessions: parseInt(e.target.value) })} required />
              </div>
              <Button type="submit" disabled={createMutation.isPending}>Criar</Button>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="ml-2">Cancelar</Button>
            </form>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <p>Carregando...</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {tenants.map((tenant) => (
            <Card key={tenant.id}>
              <CardHeader>
                <CardTitle>{tenant.name}</CardTitle>
                <p className="text-slate-500">/{tenant.slug}</p>
              </CardHeader>
              <CardContent>
                <p>Max: {tenant.max_sessions}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

export default AdminTenants