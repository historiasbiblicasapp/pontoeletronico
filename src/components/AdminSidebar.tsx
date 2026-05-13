import { NavLink, useNavigate } from "react-router-dom"
import { useAuth } from "@/contexts/AuthContext"
import {
  LayoutDashboard, Users, CalendarClock, FileText, Settings, LogOut,
  BarChart3, Building2, Clock
} from "lucide-react"
import { cn } from "@/lib/utils"

const AdminSidebar = () => {
  const navigate = useNavigate()
  const { signOut, isMaster, company } = useAuth()

  const handleSignOut = async () => {
    await signOut()
    navigate("/")
  }

  const adminNavItems = [
    { to: "/admin", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/admin/funcionarios", icon: Users, label: "Funcionários" },
    { to: "/admin/escalas", icon: CalendarClock, label: "Escalas" },
    { to: "/admin/relatorios", icon: BarChart3, label: "Relatórios" },
    { to: "/admin/configuracoes", icon: Settings, label: "Configurações" },
  ]

  const masterNavItems = [
    { to: "/master", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/master/empresas", icon: Building2, label: "Empresas" },
  ]

  const navItems = isMaster ? masterNavItems : adminNavItems

  return (
    <aside className="w-64 min-h-screen bg-slate-900 flex flex-col">
      <div className="p-5 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center">
            <Clock className="w-6 h-6 text-white" />
          </div>
          <div>
            <span className="text-white font-bold text-base">Ponto Digital</span>
            {company && (
              <span className="text-slate-400 text-xs block">{company.nome_fantasia || company.name}</span>
            )}
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-slate-700 text-white"
                  : "text-slate-300 hover:bg-slate-700/50 hover:text-white"
              )
            }
          >
            <item.icon className="w-5 h-5" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t border-slate-700">
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition-colors w-full"
        >
          <LogOut className="w-5 h-5" />
          Sair
        </button>
      </div>
    </aside>
  )
}

export default AdminSidebar
