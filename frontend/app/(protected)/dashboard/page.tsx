"use client"

import { useEffect, useState } from "react"
import { Header } from "@/components/dashboard/header"
import { StatsCards } from "@/components/dashboard/stats-cards"
import { TotemsTable } from "@/components/dashboard/totems-table"
import { getSedeIdFromCampus, getSedeName } from "@/lib/sedes"

interface Totem {
  id: string
  nombre: string
  tiempoTranscurrido: string
  sede: string
  plantilla: string
  estado: "Activo" | "Inactivo" | "En Mantenimiento"
  contenido: number
  notificacion: string | null
  credenciales?: {
    usuario: string
    contraseña: string
  }
}

export default function DashboardPage() {
  const [totems, setTotems] = useState<Totem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchTotems = async () => {
    setIsLoading(true)

    try {
      const token = localStorage.getItem("token")

      const response = await fetch("/api/totems", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json()

      if (!response.ok) {
        console.error(
          "Error al cargar tótems:",
          typeof data === "object" && data && "error" in data
            ? (data as { error: string }).error
            : response.status
        )
        setTotems([])
        return
      }

      if (!Array.isArray(data)) {
        console.error("Respuesta inesperada de /api/totems:", data)
        setTotems([])
        return
      }

      const mappedData = data.map((item: any) => ({
        id: item._id,
        nombre: item.nombre,
        tiempoTranscurrido: "Sincronizado",
        sede: getSedeName(getSedeIdFromCampus(item.campus_id || item.sede || "")),
        plantilla: item.plantilla || "Sin plantilla",
        estado: item.estado,
        contenido: item.contenido_count ?? item.contenido?.archivos?.length ?? 0,
        notificacion: null,
        credenciales: item.credenciales,
      }))

      setTotems(mappedData)
    } catch (error) {
      console.error("Error cargando tótems:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchTotems()
  }, [])

  return (
    <main className="min-h-screen bg-background">
      <Header />

      <StatsCards totems={totems} isLoading={isLoading} />

      <TotemsTable
        totems={totems}
        setTotems={setTotems}
        fetchTotems={fetchTotems}
        isLoading={isLoading}
      />
    </main>
  )
}