import { NextResponse } from "next/server"
import mongoose from "mongoose"
import connectDB from "@/lib/mongodb"
import { assertCanAccessSede, AuthError, requireAuth } from "@/lib/auth.server"
import { normalizeTotemPrefix } from "@/lib/totem-name-presets-defaults"
import TotemNamePresetModel from "@/models/TotemNamePreset"

export const runtime = "nodejs"

type RouteContext = { params: Promise<{ id: string }> }

export async function PUT(request: Request, { params }: RouteContext) {
  try {
    const auth = await requireAuth(request)
    await connectDB()
    const { id } = await params

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 })
    }

    const existing = await TotemNamePresetModel.findById(id)
    if (!existing) {
      return NextResponse.json({ error: "Plantilla no encontrada" }, { status: 404 })
    }
    assertCanAccessSede(auth, existing.sedeId)

    const body = await request.json()
    const update: Record<string, string> = {}

    if (typeof body.label === "string" && body.label.trim()) {
      update.label = body.label.trim()
    }
    if (typeof body.prefix === "string" && body.prefix.trim()) {
      update.prefix = normalizeTotemPrefix(body.prefix)
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: "No hay cambios para guardar." }, { status: 400 })
    }

    const updated = await TotemNamePresetModel.findByIdAndUpdate(id, update, {
      returnDocument: "after",
      runValidators: true,
    })

    if (!updated) {
      return NextResponse.json({ error: "Plantilla no encontrada" }, { status: 404 })
    }

    return NextResponse.json({
      id: updated._id.toString(),
      label: updated.label,
      prefix: updated.prefix,
      sedeId: updated.sedeId,
    })
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
    console.error("Error PUT totem-name-presets:", error)
    return NextResponse.json({ error: "Error al actualizar plantilla" }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const auth = await requireAuth(_request)
    await connectDB()
    const { id } = await params

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 })
    }

    const existing = await TotemNamePresetModel.findById(id)
    if (!existing) {
      return NextResponse.json({ error: "Plantilla no encontrada" }, { status: 404 })
    }
    assertCanAccessSede(auth, existing.sedeId)

    const deleted = await TotemNamePresetModel.findByIdAndDelete(id)
    if (!deleted) {
      return NextResponse.json({ error: "Plantilla no encontrada" }, { status: 404 })
    }

    return NextResponse.json({ message: "Plantilla eliminada" })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error("Error DELETE totem-name-presets:", error)
    return NextResponse.json({ error: "Error al eliminar plantilla" }, { status: 500 })
  }
}
