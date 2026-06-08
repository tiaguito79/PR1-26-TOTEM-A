"use client"

import { useCallback, useEffect, useState } from "react"
import { Shield, Mail, UserPlus, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { SEDES } from "@/lib/sedes"

type AdminRow = {
  id: string
  admin_id: string
  nombre: string
  correo: string
  sedeId: string
  sedeName: string
  createdAt: string
}

export function AdminsManagementPanel() {
  const [admins, setAdmins] = useState<AdminRow[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [nombre, setNombre] = useState("")
  const [correo, setCorreo] = useState("")
  const [sedeId, setSedeId] = useState("")

  const fetchAdmins = useCallback(async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem("token")
      const res = await fetch("/api/admins", {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || "No se pudieron cargar los administradores")
        setAdmins([])
        return
      }
      setAdmins(Array.isArray(data) ? data : [])
    } catch {
      toast.error("Error de conexión al cargar administradores")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAdmins()
  }, [fetchAdmins])

  const handleCreate = async () => {
    if (!nombre.trim() || !correo.trim() || !sedeId) {
      toast.error("Completa nombre, correo y sede.")
      return
    }

    setSubmitting(true)
    try {
      const token = localStorage.getItem("token")
      const res = await fetch("/api/admins", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          nombre: nombre.trim(),
          correo: correo.trim(),
          sedeId,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || "No se pudo crear el administrador")
        return
      }

      toast.success(data.message || "Administrador creado y credenciales enviadas por correo.")
      setNombre("")
      setCorreo("")
      setSedeId("")
      await fetchAdmins()
    } catch {
      toast.error("Error de conexión al crear administrador")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card className="p-6 bg-card border-border">
        <div className="flex items-center gap-2 mb-4">
          <UserPlus className="w-5 h-5 text-blue-400" />
          <h2 className="text-lg font-semibold text-foreground">Crear administrador de sede</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-6">
          Se generará una contraseña temporal y se enviará al correo del administrador para que
          pueda iniciar sesión en su sede.
        </p>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label>Nombre completo</Label>
            <Input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: María López"
              className="bg-muted/50"
            />
          </div>
          <div className="space-y-2">
            <Label>Correo electrónico</Label>
            <Input
              type="email"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              placeholder="admin@univalle.edu"
              className="bg-muted/50"
            />
          </div>
          <div className="space-y-2">
            <Label>Sede</Label>
            <Select value={sedeId} onValueChange={setSedeId}>
              <SelectTrigger className="bg-muted/50">
                <SelectValue placeholder="Seleccionar sede..." />
              </SelectTrigger>
              <SelectContent>
                {SEDES.map((sede) => (
                  <SelectItem key={sede.id} value={sede.id}>
                    {sede.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button
          className="mt-6 bg-blue-600 hover:bg-blue-700"
          onClick={handleCreate}
          disabled={submitting}
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Creando...
            </>
          ) : (
            <>
              <Mail className="w-4 h-4 mr-2" />
              Crear y enviar credenciales
            </>
          )}
        </Button>
      </Card>

      <Card className="bg-card border-border overflow-hidden">
        <div className="p-4 border-b border-border flex items-center gap-2">
          <Shield className="w-5 h-5 text-muted-foreground" />
          <h3 className="font-semibold text-foreground">Administradores por sede</h3>
        </div>

        {loading ? (
          <div className="p-8 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : admins.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">
            Aún no hay administradores de sede creados.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="text-left p-3 font-medium">Nombre</th>
                  <th className="text-left p-3 font-medium">Usuario</th>
                  <th className="text-left p-3 font-medium">Correo</th>
                  <th className="text-left p-3 font-medium">Sede</th>
                </tr>
              </thead>
              <tbody>
                {admins.map((admin) => (
                  <tr key={admin.id} className="border-b border-border/50">
                    <td className="p-3 text-foreground">{admin.nombre}</td>
                    <td className="p-3 font-mono text-xs">{admin.admin_id}</td>
                    <td className="p-3 text-foreground">{admin.correo}</td>
                    <td className="p-3 text-foreground">{admin.sedeName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
