"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/dashboard/header"
import { AdminsManagementPanel } from "@/components/dashboard/admins-management-panel"
import { getSessionAdmin, isSuperAdminSession } from "@/lib/session-admin"

export default function AdministradoresPage() {
  const router = useRouter()
  const [allowed, setAllowed] = useState(false)

  useEffect(() => {
    const admin = getSessionAdmin()
    if (!isSuperAdminSession(admin)) {
      router.replace("/dashboard")
      return
    }
    setAllowed(true)
  }, [router])

  if (!allowed) {
    return null
  }

  return (
    <main className="min-h-screen bg-background">
      <Header />
      <div className="px-6 py-6 max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Administradores de sede</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Crea cuentas para cada sede. Cada administrador solo verá los tótems de su campus.
          </p>
        </div>
        <AdminsManagementPanel />
      </div>
    </main>
  )
}
