import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "@/contexts/AuthContext"
import { supabase } from "@/integrations/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { toast } from "sonner"
import { Clock, ChevronDown, Building2 } from "lucide-react"
import type { Tenant } from "@/integrations/supabase/multi-tenant"

const CompanyLogin = () => {
  const navigate = useNavigate()
  const { signIn } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [companies, setCompanies] = useState<Tenant[]>([])
  const [selectedCompany, setSelectedCompany] = useState<Tenant | null>(null)
  const [showCompanyList, setShowCompanyList] = useState(false)

  useEffect(() => {
    loadCompanies()
  }, [])

  const loadCompanies = async () => {
    const { data, error } = await supabase
      .from("tenants")
      .select("*")
      .eq("active", true)
      .order("name")

    if (!error && data) {
      setCompanies(data)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await signIn(email, password)
      toast.success("Login realizado com sucesso!")
    } catch (err: any) {
      toast.error(err.message || "Erro ao autenticar")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 p-4">
      <Card className="w-full max-w-md shadow-xl border-0">
        <CardHeader className="text-center space-y-4 pt-8">
          <div className="mx-auto w-20 h-20 rounded-2xl bg-primary flex items-center justify-center shadow-lg">
            <Clock className="w-10 h-10 text-white" />
          </div>
          <CardTitle className="text-3xl font-bold">Ponto Digital BM</CardTitle>
          <CardDescription className="text-base">
            Sistema de Ponto Eletrônico Online
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 px-8 pb-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label className="text-base font-medium">Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="seu@email.com"
                className="h-12 text-base"
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-base font-medium">Senha</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                minLength={6}
                className="h-12 text-base"
                autoComplete="current-password"
              />
            </div>
            <Button
              type="submit"
              className="w-full h-12 text-lg font-semibold"
              disabled={loading}
            >
              {loading ? "Entrando..." : "Entrar"}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">ou</span>
            </div>
          </div>

          <Button
            variant="outline"
            className="w-full h-12 text-base gap-3"
            onClick={() => navigate("/kiosk")}
          >
            <Building2 className="w-5 h-5" />
            Modo Tablet (Kiosk)
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Não tem conta? Fale com seu RH
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

export default CompanyLogin
