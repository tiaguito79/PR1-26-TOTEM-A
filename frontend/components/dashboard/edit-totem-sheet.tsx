"use client"

import { useState, useEffect, ChangeEvent } from "react"
import {
  Pencil,
  Calendar,
  Image as ImageIconFile,
  Video as VideoIconFile,
  Check,
  ImageIcon,
  AlertCircle,
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
import { SheetUploadOverlay } from "./sheet-upload-overlay"
import { uploadTotemFaqPdf } from "@/lib/faq-pdf-upload"
import { downloadTotemKnowledgeTemplate } from "@/lib/totem-knowledge-template"
import { getTodayDateString, validateTotemContentDates } from "@/lib/totem-dates"
import { getSedeIdFromCampus, SEDES } from "@/lib/sedes"
import { getSessionAdmin, isSuperAdminSession } from "@/lib/session-admin"

interface Totem {
  id: string
  nombre: string
  tiempoTranscurrido: string
  sede: string
  plantilla: string
  estado: "Activo" | "Inactivo" | "En Mantenimiento"
  contenido: number
  notificacion: string | null
}

interface EditTotemSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  totem: Totem | null
  onSave: (updatedTotem?: any) => void | Promise<void>
}

const templates = [
  { id: "clasica", name: "Plantilla Clásica", color: "bg-emerald-600", req: { images: 3, videos: 1 } },
  { id: "eventos", name: "Plantilla Eventos", color: "bg-purple-600", req: { images: 5, videos: 2 } },
  { id: "promocional", name: "Plantilla Promocional", color: "bg-amber-600", req: { images: 2, videos: 1 } },
  { id: "minimal", name: "Plantilla Minimal", color: "bg-teal-600", req: { images: 4, videos: 0 } },
  { id: "corporativa", name: "Plantilla Corporativa", color: "bg-blue-600", req: { images: 3, videos: 2 } },
  { id: "directorio", name: "Plantilla Directorio", color: "bg-pink-600", req: { images: 0, videos: 1 } },
]

type Estado = "Activo" | "Inactivo" | "En Mantenimiento"

function getTemplateIdFromName(plantilla: string): string {
  const mapping: Record<string, string> = {
    "Plantilla Clásica": "clasica",
    "Plantilla Eventos": "eventos",
    "Plantilla Promocional": "promocional",
    "Plantilla Minimal": "minimal",
    "Plantilla Corporativa": "corporativa",
    "Plantilla Directorio": "directorio",
  }
  return mapping[plantilla] || plantilla
}

function getTemplateNameFromId(id: string): string {
  const template = templates.find((t) => t.id === id)
  return template ? template.name : "Plantilla Clásica"
}

export function EditTotemSheet({
  open,
  onOpenChange,
  totem,
  onSave,
}: EditTotemSheetProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploadMessage, setUploadMessage] = useState("Guardando cambios...")
  const [nombre, setNombre] = useState("")
  const [selectedSede, setSelectedSede] = useState("")
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [originalTemplate, setOriginalTemplate] = useState<string | null>(null)
  const [selectedEstado, setSelectedEstado] = useState<Estado>("Activo")

  const [fechaInicioContenido, setFechaInicioContenido] = useState("")
  const [fechaFinContenido, setFechaFinContenido] = useState("")

  const [imagenes, setImagenes] = useState<Record<number, File | null>>({})
  const [videos, setVideos] = useState<Record<number, File | null>>({})
  const [imagePreviews, setImagePreviews] = useState<Array<string | null>>([])
  const [videoPreviews, setVideoPreviews] = useState<Array<string | null>>([])
  const [faqPdf, setFaqPdf] = useState<File | null>(null)
  const [infoBloques, setInfoBloques] = useState([
    { titulo: "Horarios de atención", contenido: "" },
    { titulo: "Avisos", contenido: "" },
  ])
  const [errors, setErrors] = useState<string[]>([])

  const templateChanged = selectedTemplate !== originalTemplate
  const selectedTemplateObj = templates.find((t) => t.id === selectedTemplate)
  const todayDate = getTodayDateString()
  const minEndDate = fechaInicioContenido || todayDate
  const sessionAdmin = getSessionAdmin()
  const isSuperAdmin = isSuperAdminSession(sessionAdmin)
  const lockedSedeId = !isSuperAdmin ? sessionAdmin?.sedeId || "" : ""

  const handleStartDateChange = (value: string) => {
    setFechaInicioContenido(value)
    if (fechaFinContenido && value && fechaFinContenido < value) {
      setFechaFinContenido("")
    }
  }

  useEffect(() => {
    if (totem && open) {
      setNombre(totem.nombre)
      setSelectedSede(getSedeIdFromCampus(totem.sede))
      const tplId = getTemplateIdFromName(totem.plantilla)
      setSelectedTemplate(tplId)
      setOriginalTemplate(tplId)
      setSelectedEstado(totem.estado)
      setFechaInicioContenido("")
      setFechaFinContenido("")
      setImagenes({})
      setVideos({})
      setFaqPdf(null)
      setErrors([])

      const token = localStorage.getItem("token")
      fetch(`/api/totems`, { headers: { Authorization: `Bearer ${token}` } })
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) {
            const full = data.find((t: any) => t._id === totem.id)
            if (full?.info_bloques && full.info_bloques.length > 0) {
              setInfoBloques(full.info_bloques.map((b: any) => ({
                titulo: b.titulo || "",
                contenido: b.contenido || "",
              })))
            } else {
              setInfoBloques([
                { titulo: "Horarios de atención", contenido: "" },
                { titulo: "Avisos", contenido: "" },
              ])
            }
          }
        })
        .catch(() => {})
    }
  }, [totem, open])

  useEffect(() => {
    const count = selectedTemplateObj?.req.images || 0
    const urls: Array<string | null> = []
    for (let i = 1; i <= count; i++) {
      const file = imagenes[i]
      urls.push(file ? URL.createObjectURL(file) : null)
    }
    setImagePreviews(urls)
    return () => {
      urls.forEach((url) => url && URL.revokeObjectURL(url))
    }
  }, [imagenes, selectedTemplateObj?.req.images])

  useEffect(() => {
    const count = selectedTemplateObj?.req.videos || 0
    const urls: Array<string | null> = []
    for (let i = 1; i <= count; i++) {
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

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplate(templateId)
    if (templateId !== originalTemplate) {
      setImagenes({})
      setVideos({})
    }
  }

  const validate = (): string[] => {
    const errs: string[] = []

    if (!nombre.trim()) errs.push("El nombre del tótem es obligatorio.")
    if (!selectedSede) errs.push("Debes seleccionar una sede.")
    if (!selectedTemplate) errs.push("Debes seleccionar una plantilla.")

    if (templateChanged && selectedTemplateObj) {
      const filledImages = Object.values(imagenes).filter(Boolean).length
      const filledVideos = Object.values(videos).filter(Boolean).length

      if (filledImages < selectedTemplateObj.req.images) {
        errs.push(
          `La plantilla ${selectedTemplateObj.name} requiere ${selectedTemplateObj.req.images} imagen(es). Subiste ${filledImages}.`
        )
      }
      if (filledVideos < selectedTemplateObj.req.videos) {
        errs.push(
          `La plantilla ${selectedTemplateObj.name} requiere ${selectedTemplateObj.req.videos} video(s). Subiste ${filledVideos}.`
        )
      }

      const dateError = validateTotemContentDates(
        fechaInicioContenido,
        fechaFinContenido,
        todayDate
      )
      if (dateError) {
        errs.push(dateError)
      }
    }

    return errs
  }

  const handleSave = async () => {
    const validationErrors = validate()
    if (validationErrors.length > 0) {
      setErrors(validationErrors)
      return
    }

    setErrors([])

    if (!totem || !selectedTemplate) return

    setIsSubmitting(true)
    setUploadMessage("Guardando cambios...")

    try {
      const token = localStorage.getItem("token")
      const bloquesValidos = infoBloques.filter((b) => b.titulo.trim() && b.contenido.trim())
      let updateResult: {
        faqLinked?: boolean
        faqItemsCount?: number
        faqWarning?: string | null
      } | null = null
      const uploadedFaqPdf = Boolean(faqPdf)

      if (templateChanged && selectedTemplateObj) {
        setUploadMessage("Subiendo archivos multimedia...")

        const archivos = await uploadTemplateMedia(
          imagenes,
          videos,
          selectedTemplateObj.req.images,
          selectedTemplateObj.req.videos
        )

        let faqPdfPayload = null
        if (faqPdf) {
          setUploadMessage("Guardando documento de conocimiento...")
          faqPdfPayload = await uploadTotemFaqPdf(faqPdf, token || "")
        }

        setUploadMessage("Actualizando tótem...")

        const response = await fetch(`/api/totems/${totem.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            nombre: nombre.trim(),
            campus_id: selectedSede,
            plantilla: getTemplateNameFromId(selectedTemplate),
            estado: selectedEstado,
            mostrarDesde: fechaInicioContenido,
            mostrarHasta: fechaFinContenido,
            replaceContent: true,
            archivos,
            faqPdf: faqPdfPayload,
            info_bloques: bloquesValidos.length > 0 ? bloquesValidos : undefined,
          }),
        })

        if (!response.ok) {
          const err = await response.json().catch(() => ({}))
          toast.error(err.error || "Error al actualizar el tótem con nueva plantilla.")
          return
        }
        updateResult = await response.json().catch(() => null)
      } else if (faqPdf) {
        setUploadMessage("Guardando documento de conocimiento...")
        const faqPdfPayload = await uploadTotemFaqPdf(faqPdf, token || "")
        setUploadMessage("Actualizando tótem...")

        const response = await fetch(`/api/totems/${totem.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            nombre: nombre.trim(),
            campus_id: selectedSede,
            plantilla: getTemplateNameFromId(selectedTemplate),
            estado: selectedEstado,
            faqPdf: faqPdfPayload,
            info_bloques: bloquesValidos.length > 0 ? bloquesValidos : undefined,
          }),
        })

        if (!response.ok) {
          const err = await response.json().catch(() => ({}))
          toast.error(err.error || "Error al actualizar el tótem.")
          return
        }
        updateResult = await response.json().catch(() => null)
      } else {
        setUploadMessage("Actualizando tótem...")
        const response = await fetch(`/api/totems/${totem.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            nombre: nombre.trim(),
            campus_id: selectedSede,
            plantilla: getTemplateNameFromId(selectedTemplate),
            estado: selectedEstado,
            info_bloques: bloquesValidos.length > 0 ? bloquesValidos : undefined,
          }),
        })

        if (!response.ok) {
          toast.error("Error al actualizar el tótem.")
          return
        }
      }

      if (uploadedFaqPdf && updateResult?.faqWarning) {
        toast.warning(updateResult.faqWarning)
        toast.success(
          `Tótem actualizado. PDF vinculado con ${updateResult.faqItemsCount ?? 0} preguntas detectadas.`
        )
      } else if (uploadedFaqPdf && updateResult?.faqLinked) {
        toast.success(
          `Tótem actualizado. PDF vinculado con ${updateResult.faqItemsCount ?? 0} preguntas detectadas.`
        )
      } else {
        toast.success("Tótem actualizado exitosamente.")
      }
      await onSave?.()
      onOpenChange(false)
    } catch (error) {
      console.error("Error al editar:", error)
      toast.error(
        error instanceof Error ? error.message : "Error de conexión al actualizar el tótem."
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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md md:max-w-lg bg-card border-border p-0 flex flex-col h-full overflow-hidden"
      >
        <div className="relative flex flex-col h-full min-h-0 overflow-hidden">
        <SheetUploadOverlay visible={isSubmitting} message={uploadMessage} />
        <SheetHeader className="p-6 pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <Pencil className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <SheetTitle className="text-foreground">Editar Tótem</SheetTitle>
              <p className="text-sm text-muted-foreground">
                Modifica los datos del tótem seleccionado
              </p>
            </div>
          </div>
          <SheetDescription className="sr-only">
            Formulario para editar un tótem
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6">
          <div className="py-6 space-y-6">
            {errors.length > 0 && (
              <div className="p-4 rounded-lg border border-red-500/30 bg-red-500/10 space-y-1">
                {errors.map((err, i) => (
                  <p key={i} className="text-sm text-red-400 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    {err}
                  </p>
                ))}
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Nombre del Tótem *
              </Label>
              <Input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej: Tótem Lobby Central"
                className="bg-muted/50 border-border"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Sede *
              </Label>
              <Select
                value={selectedSede}
                onValueChange={setSelectedSede}
                disabled={!isSuperAdmin && !!lockedSedeId}
              >
                <SelectTrigger className="w-full bg-muted/50 border-border">
                  <SelectValue placeholder="Selecciona una sede..." />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {SEDES.map((sede) => (
                    <SelectItem key={sede.id} value={sede.id}>
                      {sede.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                    onClick={() => handleTemplateChange(template.id)}
                    className={cn(
                      "flex flex-col items-center gap-2 p-2 rounded-lg border transition-all",
                      selectedTemplate === template.id
                        ? "border-cyan-500 bg-cyan-500/10"
                        : "border-border hover:border-muted-foreground/50"
                    )}
                  >
                    <div
                      className={cn(
                        "w-full aspect-[3/4] rounded-md flex items-center justify-center",
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
                          ? "text-cyan-400"
                          : "text-muted-foreground"
                      )}
                    >
                      {template.name}
                    </span>
                    {selectedTemplate === template.id && (
                      <span className="text-xs text-cyan-400 flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        Seleccionada
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {templateChanged && selectedTemplateObj && (
              <div className="space-y-3 p-4 rounded-lg border border-amber-500/30 bg-amber-500/5">
                <div className="flex items-center gap-2 mb-2">
                  <ImageIcon className="w-4 h-4 text-amber-400" />
                  <Label className="text-xs font-medium text-amber-400 uppercase tracking-wider">
                    Nueva plantilla: subir contenido multimedia *
                  </Label>
                </div>

                <p className="text-xs text-muted-foreground">
                  Cambiaste de plantilla. Debes subir {selectedTemplateObj.req.images} imagen(es)
                  {selectedTemplateObj.req.videos > 0 &&
                    ` y ${selectedTemplateObj.req.videos} video(s)`}{" "}
                  para la nueva plantilla.
                </p>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Mostrar desde *</Label>
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
                    <Label className="text-xs text-muted-foreground">Mostrar hasta *</Label>
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

                <div className="grid grid-cols-2 gap-3">
                  {Array.from({ length: selectedTemplateObj.req.images }).map((_, i) => {
                    const index = i + 1
                    const file = imagenes[index] || null
                    const preview = imagePreviews[index - 1]

                    return (
                      <div
                        key={`img-${index}`}
                        className="relative flex flex-col items-center justify-center gap-2 p-4 h-[140px] rounded-lg border border-dashed border-border hover:border-cyan-500/50 hover:bg-cyan-500/5 transition-all group overflow-hidden"
                      >
                        <Input
                          type="file"
                          accept="image/*"
                          className="absolute inset-0 opacity-0 cursor-pointer z-10"
                          onChange={(e) =>
                            handleImageChange(e as ChangeEvent<HTMLInputElement>, index)
                          }
                        />
                        {preview ? (
                          <img
                            src={preview}
                            alt={`Imagen ${index}`}
                            className="absolute inset-0 h-full w-full object-cover object-center rounded-lg"
                          />
                        ) : (
                          <ImageIconFile className="w-6 h-6 text-muted-foreground group-hover:text-cyan-400 transition-colors" />
                        )}
                        <span className={cn(
                          "text-sm text-center relative z-[1]",
                          preview ? "text-white font-medium drop-shadow-lg bg-black/50 px-2 py-0.5 rounded" : "text-foreground"
                        )}>
                          {renderFileName(file, `Imagen ${index}`)}
                        </span>
                        {!preview && (
                          <span className="text-xs text-muted-foreground">
                            Clic para subir
                          </span>
                        )}
                      </div>
                    )
                  })}

                  {Array.from({ length: selectedTemplateObj.req.videos }).map((_, i) => {
                    const index = i + 1
                    const file = videos[index] || null
                    const preview = videoPreviews[index - 1]

                    return (
                      <div
                        key={`vid-${index}`}
                        className="relative flex flex-col items-center justify-center gap-2 p-4 h-[140px] rounded-lg border border-dashed border-border hover:border-purple-500/50 hover:bg-purple-500/5 transition-all group overflow-hidden"
                      >
                        <Input
                          type="file"
                          accept="video/*"
                          className="absolute inset-0 opacity-0 cursor-pointer z-10"
                          onChange={(e) =>
                            handleVideoChange(e as ChangeEvent<HTMLInputElement>, index)
                          }
                        />
                        {preview ? (
                          <video
                            src={preview}
                            className="absolute inset-0 h-full w-full object-cover object-center rounded-lg"
                            muted
                            playsInline
                          />
                        ) : (
                          <VideoIconFile className="w-6 h-6 text-muted-foreground group-hover:text-purple-400 transition-colors" />
                        )}
                        <span className={cn(
                          "text-sm text-center relative z-[1]",
                          preview ? "text-white font-medium drop-shadow-lg bg-black/50 px-2 py-0.5 rounded" : "text-foreground"
                        )}>
                          {renderFileName(file, `Video ${index}`)}
                        </span>
                        {!preview && (
                          <span className="text-xs text-muted-foreground">
                            Clic para subir
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {!templateChanged && (
              <div className="p-4 rounded-lg border border-border bg-muted/10">
                <p className="text-xs text-muted-foreground">
                  El contenido multimedia actual se mantiene. Si cambias de plantilla se te
                  pedirá subir nuevos archivos.
                </p>
              </div>
            )}

            <div className="space-y-3 p-4 rounded-lg border border-border bg-muted/10">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  PDF de Preguntas Frecuentes (Opcional)
                </Label>
              </div>
              <p className="text-xs text-muted-foreground">
                Sube el PDF con formato Documento de Conocimiento: secciones{" "}
                <span className="text-cyan-400 font-mono">INFORMACIÓN GENERAL</span>,{" "}
                <span className="text-cyan-400 font-mono">PREGUNTAS FRECUENTES</span> y{" "}
                <span className="text-cyan-400 font-mono">REGLAS</span>.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/10"
                onClick={downloadTotemKnowledgeTemplate}
              >
                Descargar plantilla de ejemplo (.txt)
              </Button>
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
                Estado
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
            className="flex-1 gap-2 bg-blue-600 hover:bg-blue-700 text-white"
            onClick={handleSave}
            disabled={isSubmitting}
          >
            <Check className="w-4 h-4" />
            {isSubmitting ? "Guardando..." : "Guardar Cambios"}
          </Button>
        </SheetFooter>
        </div>
      </SheetContent>
    </Sheet>
  )
}
