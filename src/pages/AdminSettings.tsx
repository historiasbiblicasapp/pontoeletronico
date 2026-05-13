import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { supabase } from "@/integrations/supabase/client"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import { Building2, MapPin, Shield, Smartphone, Save, Plus, Trash2 } from "lucide-react"
import type { Filial, Dispositivo } from "@/integrations/supabase/ponto-digital"
import { PLANOS_SAAS } from "@/integrations/supabase/ponto-digital"

const AdminSettings = () => {
  const { company, user, refreshUser } = useAuth()
  const [filiais, setFiliais] = useState<Filial[]>([])
  const [dispositivos, setDispositivos] = useState<Dispositivo[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [companyForm, setCompanyForm] = useState({
    nome_fantasia: "",
    razao_social: "",
    cnpj: "",
    email: "",
    telefone: "",
  })

  const [novaFilial, setNovaFilial] = useState({
    nome: "", endereco: "", latitude: "", longitude: "", raio_geofence: 100,
  })

  const [novoDispositivo, setNovoDispositivo] = useState({
    nome: "", tipo: "tablet", localizacao: "",
  })

  useEffect(() => {
    if (company) {
      setCompanyForm({
        nome_fantasia: company.nome_fantasia || "",
        razao_social: company.razao_social || "",
        cnpj: company.cnpj || "",
        email: company.email || "",
        telefone: company.telefone || "",
      })
      carregarDados()
    }
  }, [company])

  const carregarDados = async () => {
    if (!company?.id) return
    try {
      const [filialRes, dispRes] = await Promise.all([
        supabase.from("filiais").select("*").eq("empresa_id", company.id),
        supabase.from("dispositivos").select("*").eq("empresa_id", company.id),
      ])
      if (filialRes.data) setFiliais(filialRes.data)
      if (dispRes.data) setDispositivos(dispRes.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const saveCompany = async () => {
    if (!company?.id) return
    setSaving(true)
    try {
      const { error } = await supabase
        .from("tenants")
        .update(companyForm)
        .eq("id", company.id)

      if (error) throw error
      toast.success("Dados da empresa atualizados!")
      await refreshUser()
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar")
    } finally {
      setSaving(false)
    }
  }

  const addFilial = async () => {
    if (!company?.id || !novaFilial.nome) return
    try {
      const { error } = await supabase.from("filiais").insert({
        empresa_id: company.id,
        nome: novaFilial.nome,
        endereco: novaFilial.endereco || null,
        latitude: novaFilial.latitude || null,
        longitude: novaFilial.longitude || null,
        raio_geofence: novaFilial.raio_geofence,
      })
      if (error) throw error
      toast.success("Filial adicionada!")
      setNovaFilial({ nome: "", endereco: "", latitude: "", longitude: "", raio_geofence: 100 })
      carregarDados()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const removeFilial = async (id: string) => {
    try {
      const { error } = await supabase.from("filiais").delete().eq("id", id)
      if (error) throw error
      toast.success("Filial removida")
      carregarDados()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const addDispositivo = async () => {
    if (!company?.id || !novoDispositivo.nome) return
    try {
      const { error } = await supabase.from("dispositivos").insert({
        empresa_id: company.id,
        nome: novoDispositivo.nome,
        tipo: novoDispositivo.tipo,
        localizacao: novoDispositivo.localizacao || null,
      })
      if (error) throw error
      toast.success("Dispositivo cadastrado!")
      setNovoDispositivo({ nome: "", tipo: "tablet", localizacao: "" })
      carregarDados()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const removeDispositivo = async (id: string) => {
    try {
      const { error } = await supabase.from("dispositivos").delete().eq("id", id)
      if (error) throw error
      toast.success("Dispositivo removido")
      carregarDados()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Configurações</h1>
        <p className="text-muted-foreground">Gerencie sua empresa</p>
      </div>

      <Tabs defaultValue="empresa">
        <TabsList>
          <TabsTrigger value="empresa">
            <Building2 className="w-4 h-4 mr-2" />
            Empresa
          </TabsTrigger>
          <TabsTrigger value="filiais">
            <MapPin className="w-4 h-4 mr-2" />
            Filiais
          </TabsTrigger>
          <TabsTrigger value="dispositivos">
            <Smartphone className="w-4 h-4 mr-2" />
            Dispositivos
          </TabsTrigger>
          <TabsTrigger value="plano">
            <Shield className="w-4 h-4 mr-2" />
            Plano
          </TabsTrigger>
        </TabsList>

        <TabsContent value="empresa" className="mt-6">
          <Card className="p-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome Fantasia</Label>
                <Input
                  value={companyForm.nome_fantasia}
                  onChange={(e) => setCompanyForm({ ...companyForm, nome_fantasia: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Razão Social</Label>
                <Input
                  value={companyForm.razao_social}
                  onChange={(e) => setCompanyForm({ ...companyForm, razao_social: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>CNPJ</Label>
                <Input
                  value={companyForm.cnpj}
                  onChange={(e) => setCompanyForm({ ...companyForm, cnpj: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={companyForm.email}
                  onChange={(e) => setCompanyForm({ ...companyForm, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input
                  value={companyForm.telefone}
                  onChange={(e) => setCompanyForm({ ...companyForm, telefone: e.target.value })}
                />
              </div>
            </div>
            <Button className="mt-6" onClick={saveCompany} disabled={saving}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </Card>
        </TabsContent>

        <TabsContent value="filiais" className="mt-6">
          <Card className="p-6">
            <div className="grid md:grid-cols-5 gap-3 mb-4">
              <Input
                placeholder="Nome da filial"
                value={novaFilial.nome}
                onChange={(e) => setNovaFilial({ ...novaFilial, nome: e.target.value })}
              />
              <Input
                placeholder="Endereço"
                value={novaFilial.endereco}
                onChange={(e) => setNovaFilial({ ...novaFilial, endereco: e.target.value })}
                className="md:col-span-2"
              />
              <Input
                placeholder="Raio (m)"
                type="number"
                value={novaFilial.raio_geofence}
                onChange={(e) => setNovaFilial({ ...novaFilial, raio_geofence: Number(e.target.value) })}
              />
              <Button onClick={addFilial}>
                <Plus className="w-4 h-4 mr-2" />Adicionar
              </Button>
            </div>
            {filiais.map((f) => (
              <div key={f.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg mb-2">
                <div>
                  <p className="font-medium">{f.nome}</p>
                  <p className="text-sm text-muted-foreground">{f.endereco || "Sem endereço"}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => removeFilial(f.id)}>
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
              </div>
            ))}
          </Card>
        </TabsContent>

        <TabsContent value="dispositivos" className="mt-6">
          <Card className="p-6">
            <div className="grid md:grid-cols-4 gap-3 mb-4">
              <Input
                placeholder="Nome do dispositivo"
                value={novoDispositivo.nome}
                onChange={(e) => setNovoDispositivo({ ...novoDispositivo, nome: e.target.value })}
              />
              <Select
                value={novoDispositivo.tipo}
                onValueChange={(v) => setNovoDispositivo({ ...novoDispositivo, tipo: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tablet">Tablet</SelectItem>
                  <SelectItem value="totem">Totem</SelectItem>
                  <SelectItem value="computador">Computador</SelectItem>
                </SelectContent>
              </Select>
              <Input
                placeholder="Localização"
                value={novoDispositivo.localizacao}
                onChange={(e) => setNovoDispositivo({ ...novoDispositivo, localizacao: e.target.value })}
              />
              <Button onClick={addDispositivo}>
                <Plus className="w-4 h-4 mr-2" />Adicionar
              </Button>
            </div>
            {dispositivos.map((d) => (
              <div key={d.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg mb-2">
                <div className="flex items-center gap-3">
                  <Smartphone className="w-5 h-5 text-primary" />
                  <div>
                    <p className="font-medium">{d.nome}</p>
                    <p className="text-sm text-muted-foreground">
                      {d.tipo} {d.localizacao ? `- ${d.localizacao}` : ""}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => removeDispositivo(d.id)}>
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
              </div>
            ))}
          </Card>
        </TabsContent>

        <TabsContent value="plano" className="mt-6">
          <Card className="p-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {PLANOS_SAAS.map((plano) => (
                <Card
                  key={plano.id}
                  className={`p-6 text-center cursor-pointer transition-all hover:shadow-lg ${
                    company?.plano === plano.id ? "ring-2 ring-primary bg-primary/5" : ""
                  }`}
                >
                  <h3 className="font-bold text-lg">{plano.nome}</h3>
                  <p className="text-3xl font-bold mt-2">
                    R${plano.preco}
                    <span className="text-sm font-normal text-muted-foreground">/mês</span>
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    até {plano.limite_funcionarios === 999999 ? "∞" : plano.limite_funcionarios} funcionários
                  </p>
                  {company?.plano === plano.id && (
                    <p className="text-sm font-semibold text-primary mt-2">Plano atual</p>
                  )}
                </Card>
              ))}
            </div>
            <p className="text-sm text-muted-foreground mt-6 text-center">
              Para alterar seu plano, entre em contato com o suporte.
            </p>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default AdminSettings
