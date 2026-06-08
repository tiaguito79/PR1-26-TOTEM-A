import connectDB from "@/lib/mongodb"
import { corsJson, corsPreflightResponse } from "@/lib/cors"
import { getTemplateDisplayName, normalizePlantillaId } from "@/lib/totem-templates"
import Totem from "@/models/Totem"

export const runtime = "nodejs"

export async function OPTIONS() {
  return corsPreflightResponse()
}

/** Lista pública de tótems activos para que el cliente elija cuál mostrar. */
export async function GET() {
  try {
    await connectDB()

    const totems = await Totem.find({ estado: "Activo" })
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
    console.error("Error GET totems display list:", error)
    const msg = error instanceof Error ? error.message : "Error listando tótems"
    return corsJson({ error: msg }, { status: 500 })
  }
}
