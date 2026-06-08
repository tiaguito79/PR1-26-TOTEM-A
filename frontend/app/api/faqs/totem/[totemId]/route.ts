import connectDB from "@/lib/mongodb"
import { corsJson, corsPreflightResponse } from "@/lib/cors"
import { getTotemFaqForDisplay } from "@/lib/totem-display.server"

export const runtime = "nodejs"

type RouteContext = { params: Promise<{ totemId: string }> }

export async function OPTIONS() {
  return corsPreflightResponse()
}

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    await connectDB()
    const { totemId } = await params
    const faq = await getTotemFaqForDisplay(totemId)
    return corsJson(faq)
  } catch (error) {
    console.error("Error obteniendo FAQ:", error)
    const msg = error instanceof Error ? error.message : "Error obteniendo FAQ"
    return corsJson({ message: msg }, { status: 500 })
  }
}
