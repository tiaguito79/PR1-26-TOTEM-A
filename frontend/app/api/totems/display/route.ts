import connectDB from "@/lib/mongodb"
import { corsJson, corsPreflightResponse } from "@/lib/cors"
import { AuthError, getTotemQueryFilter, requireAuth } from "@/lib/auth.server"
import { getTemplateDisplayName, normalizePlantillaId } from "@/lib/totem-templates"
import Totem from "@/models/Totem"

export const runtime = "nodejs"

export async function OPTIONS() {
  return corsPreflightResponse()
}

/** Lista de tótems activos (solo administradores autenticados). */
export async function GET(request: Request) {
  try {
    await connectDB()
    const admin = await requireAuth(request)
    const filter = getTotemQueryFilter(admin)

    const totems = await Totem.find({ ...filter, estado: "Activo" })
      .select("totem_id nombre plantilla campus_id estado")
      .sort({ nombre: 1 })
      .lean()

    return corsJson({
      totems: totems.map((totem) => {
        const plantillaId = normalizePlantillaId(totem.plantilla)
        return {
          id: totem._id.toString(),
          totem_id: totem.totem_id,
          nombre: totem.nombre,
          plantilla: totem.plantilla,
          plantillaId,
          plantillaNombre: getTemplateDisplayName(plantillaId),
          estado: totem.estado,
        }
      }),
    })
  } catch (error) {
    if (error instanceof AuthError) {
      return corsJson({ error: error.message }, { status: error.status })
    }
    console.error("Error GET totems display list:", error)
    const msg = error instanceof Error ? error.message : "Error listando tótems"
    return corsJson({ error: msg }, { status: 500 })
  }
}
