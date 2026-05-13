import { useAuth } from "@/contexts/AuthContext"
import { NavLink, useNavigate } from "react-router-dom"
import { Clock, History, Banknote, FileText, LogOut, User, LayoutDashboard, CalendarClock } from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { to: "/app", icon: Clock, label: "Registrar Ponto" },
  { to: "/app/historico", icon: History, label: "Histórico" },
  { to: "/app/banco-horas", icon: Banknote, label: "Banco de Horas" },
  { to: "/app/solicitacoes", icon: FileText, label: "Solicitações" },
]

const EmployeeSidebar = () => {
  const navigate = useNavigate()
  const { signOut, user } = useAuth()

  const handleSignOut = async () => {
    await signOut()
    navigate("/")
  }

  return (
    <aside className="w-64 min-h-screen bg-card border-r border-border flex flex-col">
      <div className="p-5 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <Clock className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <span className="font-bold text-base block">Ponto Digital</span>
            <span className="text-xs text-muted-foreground">{user?.funcionario?.matricula}</span>
          </div>
        </div>
        {user?.funcionario && (
          <div className="mt-3 p-2 bg-muted rounded-lg">
            <p className="text-sm font-medium truncate">{user.funcionario.nome}</p>
            <p className="text-xs text-muted-foreground">{user.funcionario.cargo || user.funcionario.setor || ""}</p>
          </div>
        )}
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all",
                isActive
                  ? "bg-primary/10 text-primary shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )
            }
          >
            <item.icon className="w-5 h-5" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t border-border space-y-1">
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all w-full"
        >
          <LogOut className="w-5 h-5" />
          Sair
        </button>
      </div>
    </aside>
  )
}

export default EmployeeSidebar
