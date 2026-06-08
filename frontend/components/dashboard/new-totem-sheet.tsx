"use client"

import { useState, useEffect, ChangeEvent } from "react"
import {
  Plus,
  Calendar,
  Image as ImageIconFile,
  Video as VideoIconFile,
  Key,
  User,
  Lock,
  Eye,
  EyeOff,
  Copy,
  Check,
  ImageIcon,
  FileText,
  X,
} from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { TotemPreviewDialog } from "./totem-preview-dialog"
import { TotemNamePresetsPanel } from "./totem-name-presets-panel"
import { uploadFileToCloudinary, uploadTemplateMedia } from "@/lib/cloudinary-client"
import {
  buildSuggestedNames,
  isPresetNameForOtherSede,
  type TotemNamePresetItem,
} from "@/lib/totem-name-presets"
import { getTodayDateString, validateTotemContentDates } from "@/lib/totem-dates"

const templates = [
  { id: "clasica", name: "Plantilla Clásica", color: "bg-emerald-600", req: { images: 3, videos: 1 } },
  { id: "eventos", name: "Plantilla Eventos", color: "bg-purple-600", req: { images: 5, videos: 2 } },
  { id: "promocional", name: "Plantilla Promocional", color: "bg-amber-600", req: { images: 2, videos: 1 } },
  { id: "minimal", name: "Plantilla Minimal", color: "bg-teal-600", req: { images: 4, videos: 0 } },
  { id: "corporativa", name: "Plantilla Corporativa", color: "bg-blue-600", req: { images: 3, videos: 2 } },
  { id: "directorio", name: "Plantilla Directorio", color: "bg-pink-600", req: { images: 0, videos: 1 } },
]

const sedes = [
  { id: "cochabamba", name: "Cochabamba" },
  { id: "santa-cruz", name: "Santa Cruz" },
  { id: "la-paz", name: "La Paz" },
]

type Estado = "Activo" | "Inactivo" | "En Mantenimiento"

interface NewTotemSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave?: (newTotem?: any) => void | Promise<void>
}

export function NewTotemSheet({ open, onOpenChange, onSave }: NewTotemSheetProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [nombre, setNombre] = useState("")
  const [selectedSede, setSelectedSede] = useState("")
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [selectedEstado, setSelectedEstado] = useState<Estado>("Activo")

  const [fechaInicioContenido, setFechaInicioContenido] = useState("")
  const [fechaFinContenido, setFechaFinContenido] = useState("")

  const [showPassword, setShowPassword] = useState(false)
  const [copiedUser, setCopiedUser] = useState(false)
  const [copiedPassword, setCopiedPassword] = useState(false)

  const [credentials, setCredentials] = useState({ username: "", password: "" })

  const [imagenes, setImagenes] = useState<Record<number, File | null>>({})
  const [videos, setVideos] = useState<Record<number, File | null>>({})
  const [faqPdf, setFaqPdf] = useState<File | null>(null)
  const [infoBloques, setInfoBloques] = useState([
    { titulo: "Horarios de atención", contenido: "" },
    { titulo: "Avisos", contenido: "" },
  ])
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [imagePreviews, setImagePreviews] = useState<Array<string | null>>([])
  const [videoPreviews, setVideoPreviews] = useState<Array<string | null>>([])
  const [existingTotemNames, setExistingTotemNames] = useState<string[]>([])
  const [namePresets, setNamePresets] = useState<TotemNamePresetItem[]>([])

  const selectedTemplateObj = templates.find((t) => t.id === selectedTemplate)
  const nameSuggestions = buildSuggestedNames(namePresets, existingTotemNames, selectedSede)
  const todayDate = getTodayDateString()
  const minEndDate = fechaInicioContenido || todayDate

  const handleStartDateChange = (value: string) => {
    setFechaInicioContenido(value)
    if (fechaFinContenido && value && fechaFinContenido < value) {
      setFechaFinContenido("")
    }
  }

  const generarCredenciales = () => {
    const randomId = Math.random().toString(36).substring(2, 6).toUpperCase()
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*"
    let pass = ""

    for (let i = 0; i < 12; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length))
    }

    return {
      username: `TOTEM_${randomId}`,
      password: pass,
    }
  }

  useEffect(() => {
    const urls: Array<string | null> = []
    const count = selectedTemplateObj?.req.images || 0
    for (let i = 1; i <= count; i += 1) {
      const file = imagenes[i]
      urls.push(file ? URL.createObjectURL(file) : null)
    }
    setImagePreviews(urls)

    return () => {
      urls.forEach((url) => url && URL.revokeObjectURL(url))
    }
  }, [imagenes, selectedTemplateObj?.req.images])

  useEffect(() => {
    const urls: Array<string | null> = []
    const count = selectedTemplateObj?.req.videos || 0
    for (let i = 1; i <= count; i += 1) {
      const file = videos[i]
      urls.push(file ? URL.createObjectURL(file) : null)
    }
    setVideoPreviews(urls)

    return () => {
      urls.forEach((url) => url && URL.revokeObjectURL(url))
    }
  }, [videos, selectedTemplateObj?.req.videos])

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>, index: number) => {
    const selectedFile = event.target.files?.[0] || null
    setImagenes((prev) => ({ ...prev, [index]: selectedFile }))
  }

  const handleVideoChange = (event: ChangeEvent<HTMLInputElement>, index: number) => {
    const selectedFile = event.target.files?.[0] || null
    setVideos((prev) => ({ ...prev, [index]: selectedFile }))
  }

  const handleOpenPreview = () => {
    if (!selectedTemplateObj) {
      setPreviewError("Selecciona primero una plantilla para habilitar la vista previa.")
      return
    }

    const requiredImages = selectedTemplateObj.req.images
    const requiredVideos = selectedTemplateObj.req.videos
    const filledImages = Object.values(imagenes).filter(Boolean).length
    const filledVideos = Object.values(videos).filter(Boolean).length

    if (filledImages !== requiredImages) {
      setPreviewError(`La plantilla ${selectedTemplateObj.name} requiere ${requiredImages} imagen(es).`)
      return
    }

    if (filledVideos !== requiredVideos) {
      setPreviewError(`La plantilla ${selectedTemplateObj.name} requiere ${requiredVideos} video(s).`)
      return
    }

    setPreviewError(null)
    setPreviewOpen(true)
  }

  useEffect(() => {
    if (open) {
      setCredentials(generarCredenciales())
      setNombre("")
      setSelectedSede("")
      setSelectedTemplate(null)
      setSelectedEstado("Activo")
      setFechaInicioContenido("")
      setFechaFinContenido("")
      setImagenes({})
      setVideos({})
      setFaqPdf(null)
      setShowPassword(false)
      setCopiedUser(false)
      setCopiedPassword(false)
      setExistingTotemNames([])
      setNamePresets([])

      const token = localStorage.getItem("token")
      const headers = token ? { Authorization: `Bearer ${token}` } : {}

      fetch("/api/totems", { headers })
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) {
            setExistingTotemNames(
              data.map((item: { nombre?: string }) => item.nombre).filter(Boolean) as string[]
            )
          }
        })
        .catch(() => setExistingTotemNames([]))

      fetch("/api/totem-name-presets", { headers })
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) {
            setNamePresets(data)
          }
        })
        .catch(() => setNamePresets([]))
    }
  }, [open])

  useEffect(() => {
    if (!selectedSede) return
    setNombre((prev) =>
      prev && isPresetNameForOtherSede(prev, selectedSede, namePresets) ? "" : prev
    )
  }, [selectedSede, namePresets])

  const handleCopy = (text: string, type: "user" | "password") => {
    navigator.clipboard.writeText(text)

    if (type === "user") {
      setCopiedUser(true)
      setTimeout(() => setCopiedUser(false), 2000)
    } else {
      setCopiedPassword(true)
      setTimeout(() => setCopiedPassword(false), 2000)
    }
  }

  const validarArchivos = () => {
    if (!selectedTemplateObj) return false

    for (let i = 1; i <= selectedTemplateObj.req.images; i++) {
      if (!imagenes[i]) return false
    }

    for (let i = 1; i <= selectedTemplateObj.req.videos; i++) {
      if (!videos[i]) return false
    }

    return true
  }

  const handleSave = async () => {
    if (!nombre || !selectedSede || !selectedTemplate) {
      toast.error("Completa nombre, sede y plantilla.")
      return
    }

    const dateError = validateTotemContentDates(fechaInicioContenido, fechaFinContenido, todayDate)
    if (dateError) {
      toast.error(dateError)
      return
    }

    if (!validarArchivos()) {
      toast.error("Debes subir todos los archivos requeridos por la plantilla seleccionada.")
      return
    }

    setIsSubmitting(true)

    try {
      const token = localStorage.getItem("token")
      if (!selectedTemplateObj) return

      toast.info("Subiendo archivos a Cloudinary...")

      const archivos = await uploadTemplateMedia(
        imagenes,
        videos,
        selectedTemplateObj.req.images,
        selectedTemplateObj.req.videos,
        (message) => toast.info(message)
      )

      let faqPdfPayload = null
      if (faqPdf) {
        toast.info("Subiendo PDF de FAQ...")
        const uploadedPdf = await uploadFileToCloudinary(faqPdf, "raw")
        faqPdfPayload = {
          url: uploadedPdf.url,
          publicId: uploadedPdf.publicId,
          name: faqPdf.name,
        }
      }

      const bloquesValidos = infoBloques.filter((b) => b.titulo.trim() && b.contenido.trim())

      const response = await fetch("/api/totems", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          nombre,
          totem_id: `TOTEM-${Math.floor(1000 + Math.random() * 9000)}`,
          campus_id: selectedSede,
          plantilla: selectedTemplate,
          estado: selectedEstado,
          usuario: credentials.username,
          contraseña: credentials.password,
          mostrarDesde: fechaInicioContenido,
          mostrarHasta: fechaFinContenido,
          archivos,
          faqPdf: faqPdfPayload,
          info_bloques: bloquesValidos.length > 0 ? bloquesValidos : undefined,
        }),
      })

      if (!response.ok) {
        let message = "Error al crear el tótem."
        const text = await response.text().catch(() => "")
        try {
          const errorData = JSON.parse(text) as { error?: string }
          if (errorData?.error) message = String(errorData.error)
        } catch {
          if (response.status === 413 || text.includes("Request Entity Too Large")) {
            message =
              "Los archivos son demasiado grandes para el servidor (máx. 4 MB). Reduce el tamaño de imágenes o video."
          } else if (text && !text.startsWith("<")) {
            message = text.slice(0, 200)
          }
        }
        console.error("Error del servidor:", response.status, message)
        toast.error(message)
        return
      }

      const newTotem = await response.json()
      toast.success("Tótem creado exitosamente.")
      await onSave?.(newTotem)
      onOpenChange(false)
    } catch (error) {
      console.error("Error en la petición:", error)
      toast.error(
        error instanceof Error ? error.message : "Error de conexión al crear el tótem."
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderFileName = (file: File | null, fallback: string) => {
    if (!file) return fallback
    return file.name.length > 22 ? `${file.name.slice(0, 22)}...` : file.name
  }

  return (
    <>
    <TotemPreviewDialog
      open={previewOpen}
      onOpenChange={setPreviewOpen}
      templateId={selectedTemplate}
      templateName={selectedTemplateObj?.name || ""}
      imagePreviews={imagePreviews}
      videoPreviews={videoPreviews}
      totemName={nombre || "Nuevo Tótem"}
      infoBloques={infoBloques.filter((b) => b.titulo.trim() && b.contenido.trim())}
    />
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md md:max-w-lg bg-card border-border p-0 flex flex-col h-full overflow-hidden"
      >
        <SheetHeader className="p-6 pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
              <Plus className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <SheetTitle className="text-foreground">Nuevo Tótem</SheetTitle>
              <p className="text-sm text-muted-foreground">
                Configura un nuevo dispositivo y su contenido
              </p>
            </div>
          </div>
          <SheetDescription className="sr-only">
            Formulario para registrar un nuevo tótem con nombre, sede, plantilla y contenido.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6">
          <div className="py-6 space-y-6">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Sede *
              </Label>
              <Select value={selectedSede} onValueChange={setSelectedSede}>
                <SelectTrigger className="w-full bg-muted/50 border-border">
                  <SelectValue placeholder="Selecciona una sede..." />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {sedes.map((sede) => (
                    <SelectItem key={sede.id} value={sede.id}>
                      {sede.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Nombre del Tótem *
              </Label>
              <Input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej: TOTEM CAMPUS TIQUIPAYA 01"
                className="bg-muted/50 border-border"
              />
              {selectedSede ? (
                <TotemNamePresetsPanel
                  sedeId={selectedSede}
                  sedeName={sedes.find((s) => s.id === selectedSede)?.name || ""}
                  presets={namePresets}
                  suggestions={nameSuggestions}
                  selectedName={nombre}
                  onSelectName={setNombre}
                  onPresetsChange={setNamePresets}
                />
              ) : (
                <p className="text-xs text-muted-foreground pt-1">
                  Seleccioná una sede para ver las plantillas de nombre rápidas.
                </p>
              )}
            </div>

            <div className="space-y-3">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Seleccionar Plantilla *
              </Label>
              <div className="grid grid-cols-3 gap-3">
                {templates.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => {
                      setSelectedTemplate(template.id)
                      setImagenes({})
                      setVideos({})
                    }}
                    className={cn(
                      "flex flex-col items-center gap-2 p-2 rounded-lg border transition-all",
                      selectedTemplate === template.id
                        ? "border-emerald-500 bg-emerald-500/10"
                        : "border-border hover:border-muted-foreground/50"
                    )}
                  >
                    <div
                      className={cn(
                        "w-full aspect-3/4 rounded-md flex items-center justify-center",
                        template.color
                      )}
                    >
                      <div className="w-3/4 h-3/4 rounded border-2 border-white/30 flex flex-col gap-1 p-1">
                        <div className="w-full h-2 bg-white/30 rounded-sm" />
                        <div className="w-2/3 h-2 bg-white/30 rounded-sm" />
                        <div className="flex-1 w-full bg-white/20 rounded-sm mt-1" />
                      </div>
                    </div>
                    <span
                      className={cn(
                        "text-xs text-center leading-tight",
                        selectedTemplate === template.id
                          ? "text-emerald-400"
                          : "text-muted-foreground"
                      )}
                    >
                      {template.name}
                    </span>
                    {selectedTemplate === template.id && (
                      <span className="text-xs text-emerald-400 flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        Seleccionada
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3 p-4 rounded-lg border border-border bg-muted/10">
              <div className="flex items-center gap-2 mb-2">
                <ImageIcon className="w-4 h-4 text-muted-foreground" />
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Contenido de la Plantilla
                </Label>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Mostrar desde</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="date"
                      value={fechaInicioContenido}
                      min={todayDate}
                      onChange={(e) => handleStartDateChange(e.target.value)}
                      className="pl-10 bg-muted/50 border-border"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Mostrar hasta</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="date"
                      value={fechaFinContenido}
                      min={minEndDate}
                      onChange={(e) => setFechaFinContenido(e.target.value)}
                      className="pl-10 bg-muted/50 border-border"
                    />
                  </div>
                </div>
              </div>

              {selectedTemplateObj ? (
                <div className="grid grid-cols-2 gap-3">
                  {Array.from({ length: selectedTemplateObj.req.images }).map((_, i) => {
                    const index = i + 1
                    const file = imagenes[index] || null

                    return (
                      <div
                        key={`img-${index}`}
                        className="relative flex flex-col items-center justify-center gap-2 p-4 h-[140px] rounded-lg border border-dashed border-border hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all group overflow-hidden"
                      >
                        <Input
                          type="file"
                          accept="image/*"
                          className="absolute inset-0 opacity-0 cursor-pointer z-10"
                          onChange={(e) => handleImageChange(e as ChangeEvent<HTMLInputElement>, index)}
                        />
                        {imagePreviews[index - 1] ? (
                          <img
                            src={imagePreviews[index - 1]!}
                            alt={`Imagen cargada ${index}`}
                            className="absolute inset-0 h-full w-full object-cover object-center"
                          />
                        ) : (
                          <ImageIconFile className="w-6 h-6 text-muted-foreground group-hover:text-emerald-400 transition-colors z-[1]" />
                        )}
                        <span className="relative z-[2] text-sm text-foreground text-center drop-shadow-sm">
                          {renderFileName(file, `Imagen Carrusel ${index}`)}
                        </span>
                        <span className="relative z-[2] text-xs text-muted-foreground drop-shadow-sm">
                          {file ? "Archivo seleccionado" : "Clic para subir"}
                        </span>
                      </div>
                    )
                  })}

                  {Array.from({ length: selectedTemplateObj.req.videos }).map((_, i) => {
                    const index = i + 1
                    const file = videos[index] || null

                    return (
                      <div
                        key={`vid-${index}`}
                        className="relative flex flex-col items-center justify-center gap-2 p-4 h-[140px] rounded-lg border border-dashed border-border hover:border-purple-500/50 hover:bg-purple-500/5 transition-all group overflow-hidden"
                      >
                        <Input
                          type="file"
                          accept="video/*"
                          className="absolute inset-0 opacity-0 cursor-pointer z-10"
                          onChange={(e) => handleVideoChange(e as ChangeEvent<HTMLInputElement>, index)}
                        />
                        {videoPreviews[index - 1] ? (
                          <video
                            src={videoPreviews[index - 1]!}
                            className="absolute inset-0 h-full w-full object-cover object-center"
                            muted
                            playsInline
                          />
                        ) : (
                          <VideoIconFile className="w-6 h-6 text-muted-foreground group-hover:text-purple-400 transition-colors z-[1]" />
                        )}
                        <span className="relative z-[2] text-sm text-foreground text-center drop-shadow-sm">
                          {renderFileName(file, `Video Principal ${index}`)}
                        </span>
                        <span className="relative z-[2] text-xs text-muted-foreground drop-shadow-sm">
                          {file ? "Archivo seleccionado" : "Clic para subir"}
                        </span>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center p-6 border border-dashed border-border rounded-lg bg-muted/20">
                  <p className="text-xs text-muted-foreground">
                    Selecciona una plantilla arriba para ver qué archivos necesitas subir.
                  </p>
                </div>
              )}

              <div className="pt-4 border-t border-border">
                <Button
                  className="gap-2 bg-blue-600 hover:bg-blue-700 text-white w-full"
                  onClick={handleOpenPreview}
                  disabled={!selectedTemplateObj}
                >
                  <Eye className="w-4 h-4" />
                  Vista previa del Totem
                </Button>
                {previewError ? (
                  <p className="text-xs text-rose-400 mt-2">{previewError}</p>
                ) : (
                  <p className="text-xs text-muted-foreground mt-2">
                    {selectedTemplateObj
                      ? `Revisa la vista previa de la plantilla ${selectedTemplateObj.name} con los archivos seleccionados.`
                      : "Selecciona primero una plantilla para habilitar la vista previa."}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-3 p-4 rounded-lg border border-border bg-muted/10">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  PDF de Preguntas Frecuentes (Opcional)
                </Label>
              </div>
              <p className="text-xs text-muted-foreground">
                Sube un PDF con formato <span className="text-cyan-400 font-mono">PREGUNTA: ... RESPUESTA: ...</span> para generar automáticamente las FAQs del tótem.
              </p>
              <div className="relative">
                {faqPdf ? (
                  <div className="flex items-center gap-3 p-3 rounded-lg border border-cyan-500/30 bg-cyan-500/5">
                    <FileText className="w-5 h-5 text-cyan-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground truncate">{faqPdf.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(faqPdf.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFaqPdf(null)}
                      className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white hover:bg-red-500/50 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="relative flex flex-col items-center justify-center gap-2 p-4 rounded-lg border border-dashed border-border hover:border-cyan-500/50 hover:bg-cyan-500/5 transition-all cursor-pointer">
                    <Input
                      type="file"
                      accept=".pdf,application/pdf"
                      className="absolute inset-0 opacity-0 cursor-pointer z-10"
                      onChange={(e) => {
                        const file = (e as ChangeEvent<HTMLInputElement>).target.files?.[0] || null
                        setFaqPdf(file)
                      }}
                    />
                    <FileText className="w-6 h-6 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Clic para subir PDF</span>
                  </div>
                )}
              </div>
            </div>

            {/* Info blocks */}
            <div className="space-y-3 p-4 rounded-lg border border-border bg-muted/10">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Información del Tótem
                  </Label>
                </div>
                <button
                  type="button"
                  onClick={() => setInfoBloques((prev) => [...prev, { titulo: "", contenido: "" }])}
                  className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                >
                  + Agregar bloque
                </button>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Personaliza los textos que se mostrarán en el tótem (horarios, avisos, etc.)
              </p>

              <div className="space-y-3">
                {infoBloques.map((bloque, i) => (
                  <div key={i} className="space-y-2 p-3 rounded-lg border border-border bg-muted/20">
                    <div className="flex items-center gap-2">
                      <Input
                        value={bloque.titulo}
                        onChange={(e) => {
                          const next = [...infoBloques]
                          next[i] = { ...next[i], titulo: e.target.value }
                          setInfoBloques(next)
                        }}
                        placeholder="Título del bloque (ej: Horarios)"
                        className="bg-muted/50 border-border text-sm h-8"
                      />
                      {infoBloques.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setInfoBloques((prev) => prev.filter((_, idx) => idx !== i))}
                          className="text-slate-500 hover:text-red-400 transition-colors shrink-0"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <Textarea
                      value={bloque.contenido}
                      onChange={(e) => {
                        const next = [...infoBloques]
                        next[i] = { ...next[i], contenido: e.target.value }
                        setInfoBloques(next)
                      }}
                      placeholder="Contenido (ej: Lun-Vie 08:00-18:00)"
                      className="bg-muted/50 border-border text-sm min-h-[60px] resize-none"
                      rows={2}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Estado Inicial
              </Label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedEstado("Activo")}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-full border text-sm transition-all",
                    selectedEstado === "Activo"
                      ? "border-emerald-500 bg-emerald-500/20 text-emerald-400"
                      : "border-border text-muted-foreground hover:border-muted-foreground/50"
                  )}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Activo
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedEstado("Inactivo")}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-full border text-sm transition-all",
                    selectedEstado === "Inactivo"
                      ? "border-slate-500 bg-slate-500/20 text-slate-400"
                      : "border-border text-muted-foreground hover:border-muted-foreground/50"
                  )}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                  Inactivo
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedEstado("En Mantenimiento")}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-full border text-sm transition-all",
                    selectedEstado === "En Mantenimiento"
                      ? "border-amber-500 bg-amber-500/20 text-amber-400"
                      : "border-border text-muted-foreground hover:border-muted-foreground/50"
                  )}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  Mantenimiento
                </button>
              </div>
            </div>

            <div className="space-y-4 p-4 rounded-lg border border-border bg-muted/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Key className="w-4 h-4 text-muted-foreground" />
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Credenciales del Tótem
                  </Label>
                </div>
                <Badge
                  variant="outline"
                  className="text-xs bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                >
                  Auto-generadas y Únicas
                </Badge>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  Usuario del Tótem
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={credentials.username}
                    readOnly
                    className="pl-10 pr-10 bg-muted/50 border-border font-mono cursor-default"
                  />
                  <button
                    type="button"
                    onClick={() => handleCopy(credentials.username, "user")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {copiedUser ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  Contraseña Segura
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={credentials.password}
                    readOnly
                    className="pl-10 pr-20 bg-muted/50 border-border font-mono cursor-default"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopy(credentials.password, "password")}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {copiedPassword ? (
                        <Check className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                Guarda o copia estas credenciales ahora. Se usarán para el login del tótem cliente.
              </p>
            </div>
          </div>
        </div>

        <SheetFooter className="p-6 pt-4 border-t border-border flex-row gap-3">
          <Button
            variant="outline"
            className="flex-1 border-border"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            className="flex-1 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={handleSave}
            disabled={isSubmitting}
          >
            <Check className="w-4 h-4" />
            {isSubmitting ? "Creando..." : "Crear Tótem"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
    </>
  )
}
