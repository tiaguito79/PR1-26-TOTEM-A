import connectDB from "@/lib/mongodb"
import { corsJson, corsPreflightResponse } from "@/lib/cors"
import { getTotemAdsForDisplay } from "@/lib/totem-display.server"

export const runtime = "nodejs"

type RouteContext = { params: Promise<{ totemId: string }> }

export async function OPTIONS() {
  return corsPreflightResponse()
}

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    await connectDB()
    const { totemId } = await params
    const ads = await getTotemAdsForDisplay(totemId)
    return corsJson(ads)
  } catch (error) {
    console.error("Error obteniendo publicidad:", error)
    const msg =
      error instanceof Error ? error.message : "Error obteniendo publicidad"
    return corsJson({ message: msg }, { status: 500 })
  }
}
