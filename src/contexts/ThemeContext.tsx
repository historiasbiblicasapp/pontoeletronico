import { createContext, useContext, useEffect, useState, ReactNode } from "react"
import { useAuth } from "./AuthContext"

interface ThemeContextType {
  primaryColor: string
  secondaryColor: string
  appName: string
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const { customization, user } = useAuth()
  const [theme, setTheme] = useState<ThemeContextType>({
    primaryColor: "#16a34a",
    secondaryColor: "#22c55e",
    appName: "LF Vendas"
  })

  useEffect(() => {
    if (user?.tenant_slug === "master") {
      setTheme({ primaryColor: "#1e40af", secondaryColor: "#3b82f6", appName: "LF Vendas Admin" })
      return
    }

    if (customization) {
      const primaryColor = customization.primary_color || "#16a34a"
      const secondaryColor = customization.secondary_color || "#22c55e"
      const appName = customization.app_name || "LF Vendas"

      setTheme({ primaryColor, secondaryColor, appName })

      const root = document.documentElement
      const r = parseInt(primaryColor.slice(1, 3), 16)
      const g = parseInt(primaryColor.slice(3, 5), 16)
      const b = parseInt(primaryColor.slice(5, 7), 16)
      root.style.setProperty("--primary", `${r} ${g} ${b}`)
      root.style.setProperty("--sidebar-background", `${r} ${g} ${b}`)
    }
  }, [customization, user])

  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) throw new Error("useTheme must be used within ThemeProvider")
  return context
}