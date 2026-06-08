"use client"

import { useState, useMemo } from "react"
import {
  Monitor,
  MapPin,
  FileText,
  Eye,
  Pencil,
  Trash2,
  Plus,
  List,
  Loader2,
  Search,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { NewTotemSheet } from "./new-totem-sheet"
import { EditTotemSheet } from "./edit-totem-sheet"
import { CredentialsDialog } from "./credentials-dialog"
import { getSessionAdmin, isSuperAdminSession } from "@/lib/session-admin"
import { getSedeName } from "@/lib/sedes"

export interface Totem {
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

function getStatusBadge(estado: Totem["estado"]) {
  switch (estado) {
    case "Activo":
      return (
        <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5" />
          Activo
        </Badge>
      )

    case "Inactivo":
      return (
        <Badge className="bg-slate-500/20 text-slate-400 border-slate-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-500 mr-1.5" />
          Inactivo
        </Badge>
      )

    case "En Mantenimiento":
      return (
        <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5" />
          En Mantenimiento
        </Badge>
      )

    default:
      return null
  }
}

export function TotemsTable({
  totems,
  setTotems,
  fetchTotems,
  isLoading,
}: {
  totems: Totem[]
  setTotems: React.Dispatch<React.SetStateAction<Totem[]>>
  fetchTotems: () => Promise<void>
  isLoading: boolean
}) {
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editSheetOpen, setEditSheetOpen] = useState(false)
  const [credentialsDialogOpen, setCredentialsDialogOpen] = useState(false)

  const [selectedTotem, setSelectedTotem] = useState<Totem | null>(null)
  const [totemToEdit, setTotemToEdit] = useState<Totem | null>(null)
  const [credentials, setCredentials] = useState({
    username: "",
    password: "",
  })

  const sessionAdmin = getSessionAdmin()
  const isSuperAdmin = isSuperAdminSession(sessionAdmin)
  const adminSedeName = sessionAdmin?.sedeName || (sessionAdmin?.sedeId ? getSedeName(sessionAdmin.sedeId) : "")

  const [searchQuery, setSearchQuery] = useState("")
  const [filterEstado, setFilterEstado] = useState("todos")
  const [filterSede, setFilterSede] = useState("todas")

  const sedes = useMemo(() => {
    const unique = new Set(totems.map((t) => t.sede))
    return Array.from(unique).sort()
  }, [totems])

  const filteredTotems = useMemo(() => {
    return totems.filter((t) => {
      const matchesSearch =
        searchQuery === "" ||
        t.nombre.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesEstado =
        filterEstado === "todos" || t.estado === filterEstado
      const matchesSede = filterSede === "todas" || t.sede === filterSede
      return matchesSearch && matchesEstado && matchesSede
    })
  }, [totems, searchQuery, filterEstado, filterSede])

  const handleViewCredentials = (totem: Totem) => {
    setSelectedTotem(totem)
    setCredentials({
      username: totem.credenciales?.usuario || "No asignado",
      password: totem.credenciales?.contraseña || "No asignada",
    })
    setCredentialsDialogOpen(true)
  }

  const handleEditClick = (totem: Totem) => {
    setTotemToEdit(totem)
    setEditSheetOpen(true)
  }

  const [deleting, setDeleting] = useState<string | null>(null)

  const handleDelete = async (id: string, nombre: string) => {
    if (deleting) return
    if (!window.confirm(`¿Estás seguro de eliminar el tótem "${nombre}"?`)) return

    setDeleting(id)

    try {
      const token = localStorage.getItem("token")

      const response = await fetch(`/api/totems/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        toast.success("Tótem eliminado exitosamente.")
        await fetchTotems()
      } else {
        toast.error("Error al eliminar el tótem.")
      }
    } catch (error) {
      console.error("Error en la petición DELETE:", error)
    } finally {
      setDeleting(null)
    }
  }

  const activeFilters =
    (searchQuery ? 1 : 0) +
    (filterEstado !== "todos" ? 1 : 0) +
    (filterSede !== "todas" ? 1 : 0)

  return (
    <div className="px-6 pb-6">
      <NewTotemSheet open={sheetOpen} onOpenChange={setSheetOpen} onSave={fetchTotems} />

      <EditTotemSheet
        open={editSheetOpen}
        onOpenChange={setEditSheetOpen}
        totem={totemToEdit}
        onSave={fetchTotems}
      />

      <CredentialsDialog
        open={credentialsDialogOpen}
        onOpenChange={setCredentialsDialogOpen}
        totemName={selectedTotem?.nombre || ""}
        username={credentials.username}
        password={credentials.password}
      />

      <Card className="bg-card border-border">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <List className="w-5 h-5 text-muted-foreground" />
            <h3 className="font-semibold text-foreground">Lista de Tótems</h3>
            <Badge variant="secondary" className="bg-muted text-muted-foreground">
              {filteredTotems.length}
              {activeFilters > 0 ? ` de ${totems.length}` : ""} registros
            </Badge>
          </div>

          <Button
            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={() => setSheetOpen(true)}
          >
            <Plus className="w-4 h-4" />
            Nuevo Tótem
          </Button>
        </div>

        {/* Filters bar */}
        <div className="flex flex-wrap items-center gap-3 p-4 border-b border-border bg-muted/30">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 bg-background"
            />
          </div>

          <Select value={filterEstado} onValueChange={setFilterEstado}>
            <SelectTrigger className="w-[180px] h-9 bg-background">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los estados</SelectItem>
              <SelectItem value="Activo">Activo</SelectItem>
              <SelectItem value="Inactivo">Inactivo</SelectItem>
              <SelectItem value="En Mantenimiento">En Mantenimiento</SelectItem>
            </SelectContent>
          </Select>

          {isSuperAdmin ? (
            <Select value={filterSede} onValueChange={setFilterSede}>
              <SelectTrigger className="w-[180px] h-9 bg-background">
                <SelectValue placeholder="Sede" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas las sedes</SelectItem>
                {sedes.map((sede) => (
                  <SelectItem key={sede} value={sede}>
                    {sede}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            adminSedeName && (
              <Badge variant="secondary" className="h-9 px-3 bg-muted text-muted-foreground">
                Sede: {adminSedeName}
              </Badge>
            )
          )}

          {activeFilters > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-9 text-xs text-muted-foreground"
              onClick={() => {
                setSearchQuery("")
                setFilterEstado("todos")
                setFilterSede("todas")
              }}
            >
              Limpiar filtros
            </Button>
          )}
        </div>

        <div className="overflow-x-auto min-h-[200px]">
          {isLoading ? (
            <div className="p-4 space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="w-9 h-9 rounded-lg" />
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="w-32 h-4" />
                    <Skeleton className="w-16 h-3" />
                  </div>
                  <Skeleton className="w-20 h-4" />
                  <Skeleton className="w-24 h-6 rounded-full" />
                  <Skeleton className="w-20 h-6 rounded-full" />
                  <Skeleton className="w-10 h-4" />
                  <Skeleton className="w-16 h-8 rounded-md" />
                  <Skeleton className="w-16 h-8 rounded-md" />
                </div>
              ))}
            </div>
          ) : filteredTotems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground text-sm gap-1">
              {activeFilters > 0
                ? "No se encontraron tótems con los filtros aplicados."
                : "No hay tótems registrados."}
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">
                    Nombre
                  </th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">
                    Sede
                  </th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">
                    Plantilla
                  </th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">
                    Estado
                  </th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">
                    Contenido
                  </th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">
                    Credenciales
                  </th>
                  <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">
                    Acciones
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredTotems.map((totem) => (
                  <tr
                    key={totem.id}
                    className="border-b border-border hover:bg-muted/50 transition-colors"
                  >
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
                          <Monitor className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                          <p className="font-medium text-sm text-foreground">{totem.nombre}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {totem.tiempoTranscurrido}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="w-3.5 h-3.5" />
                        <span className="text-sm">{totem.sede}</span>
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      <Badge
                        variant="outline"
                        className="bg-blue-500/5 text-blue-400 border-blue-500/20 text-[10px]"
                      >
                        {totem.plantilla}
                      </Badge>
                    </td>

                    <td className="px-4 py-4">{getStatusBadge(totem.estado)}</td>

                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <FileText className="w-3.5 h-3.5" />
                        <span className="text-sm">{totem.contenido}</span>
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 gap-1.5 text-xs hover:bg-emerald-500/10 hover:text-emerald-400"
                        onClick={() => handleViewCredentials(totem)}
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Ver
                      </Button>
                    </td>

                    <td className="px-4 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-blue-400 hover:bg-blue-500/10"
                          onClick={() => handleEditClick(totem)}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-400 hover:bg-red-500/10"
                          onClick={() => handleDelete(totem.id, totem.nombre)}
                          disabled={deleting === totem.id}
                        >
                          {deleting === totem.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </div>
  )
}
