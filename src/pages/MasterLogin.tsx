import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { Shield } from "lucide-react"

const MasterLogin = () => {
  const navigate = useNavigate()
  const { signInAsMaster } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await signInAsMaster(email, password)
      toast.success("Login realizado com sucesso!")
      setTimeout(() => navigate("/dashboard"), 100)
    } catch (err: any) {
      toast.error(err.message || "Erro ao autenticar")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-6">
          <div className="w-24 h-24 mx-auto rounded-2xl bg-slate-800 flex items-center justify-center">
            <Shield className="w-14 h-14 text-white" />
          </div>
          <CardTitle className="text-3xl font-bold text-slate-800">Admin Master</CardTitle>
          <p className="text-muted-foreground text-base">Acesse o painel de administração</p>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-base">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="admin@lfvendas.com"
                className="h-12 text-base"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-base">Senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="h-12 text-base"
              />
            </div>
            <Button type="submit" className="w-full h-12 text-lg bg-slate-800 hover:bg-slate-700" disabled={loading}>
              {loading ? "Aguarde..." : "Entrar"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default MasterLogin