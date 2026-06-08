import { NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import { assertCanAccessSede, AuthError, isSuperAdmin, requireAuth } from "@/lib/auth.server"
import { DEFAULT_TOTEM_NAME_PRESETS, normalizeTotemPrefix } from "@/lib/totem-name-presets-defaults"
import TotemNamePresetModel from "@/models/TotemNamePreset"

export const runtime = "nodejs"

async function ensureDefaultPresets() {
  const count = await TotemNamePresetModel.countDocuments()
  if (count > 0) return

  await TotemNamePresetModel.insertMany(
    DEFAULT_TOTEM_NAME_PRESETS.map((preset) => ({
      label: preset.label,
      prefix: normalizeTotemPrefix(preset.prefix),
      sedeId: preset.sedeId,
    }))
  )
}

export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request)
    await connectDB()
    await ensureDefaultPresets()

    const { searchParams } = new URL(request.url)
    const sedeParam = searchParams.get("sede")?.trim()
    const sedeId = isSuperAdmin(auth) ? sedeParam : auth.sedeId

    if (!isSuperAdmin(auth) && !sedeId) {
      return NextResponse.json({ error: "Tu cuenta no tiene sede asignada" }, { status: 403 })
    }

    const filter = sedeId ? { sedeId } : {}
    const presets = await TotemNamePresetModel.find(filter).sort({ label: 1 })

    return NextResponse.json(
      presets.map((preset) => ({
        id: preset._id.toString(),
        label: preset.label,
        prefix: preset.prefix,
        sedeId: preset.sedeId,
      }))
    )
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error("Error GET totem-name-presets:", error)
    return NextResponse.json({ error: "Error al obtener plantillas" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAuth(request)
    await connectDB()

    const body = await request.json()
    const label = typeof body.label === "string" ? body.label.trim() : ""
    const prefix = normalizeTotemPrefix(typeof body.prefix === "string" ? body.prefix : "")
    const sedeId = (
      isSuperAdmin(auth)
        ? typeof body.sedeId === "string"
          ? body.sedeId.trim()
          : ""
        : auth.sedeId || ""
    ) as string

    if (!label || !prefix || !sedeId) {
      return NextResponse.json(
        { error: "Etiqueta, prefijo y sede son obligatorios." },
        { status: 400 }
      )
    }

    if (!["cochabamba", "santa-cruz", "la-paz"].includes(sedeId)) {
      return NextResponse.json({ error: "Sede inválida." }, { status: 400 })
    }

    assertCanAccessSede(auth, sedeId)

    const created = await TotemNamePresetModel.create({ label, prefix, sedeId })

    return NextResponse.json(
      {
        id: created._id.toString(),
        label: created.label,
        prefix: created.prefix,
        sedeId: created.sedeId,
      },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code: number }).code === 11000
    ) {
      return NextResponse.json(
        { error: "Ya existe una plantilla con ese prefijo en esta sede." },
        { status: 409 }
      )
    }
    console.error("Error POST totem-name-presets:", error)
    return NextResponse.json({ error: "Error al crear plantilla" }, { status: 500 })
  }
}
