import { Outlet } from "react-router-dom"
import EmployeeSidebar from "./EmployeeSidebar"

const EmployeeLayout = () => {
  return (
    <div className="flex min-h-screen bg-gradient-to-br from-background to-muted/30">
      <EmployeeSidebar />
      <main className="flex-1 p-4 md:p-8 overflow-auto max-w-5xl mx-auto w-full">
        <Outlet />
      </main>
    </div>
  )
}

export default EmployeeLayout
