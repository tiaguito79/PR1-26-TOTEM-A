import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import connectDB from "@/lib/mongodb"
import Admin from "@/models/Admin"
import { generateAdminId, generateAdminPassword } from "@/lib/admin-credentials"
import { AuthError, requireAuth, requireSuperAdmin } from "@/lib/auth.server"
import { sendAdminCredentialsEmail } from "@/lib/email"
import { getSedeName, isValidSedeId } from "@/lib/sedes"

export const runtime = "nodejs"

export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request)
    requireSuperAdmin(auth)
    await connectDB()

    const admins = await Admin.find({ rol: "admin" })
      .select("-contraseña -resetPasswordToken -resetPasswordExpires")
      .sort({ createdAt: -1 })

    return NextResponse.json(
      admins.map((admin) => ({
        id: admin._id.toString(),
        admin_id: admin.admin_id,
        nombre: admin.nombre,
        correo: admin.correo_electronico,
        sedeId: admin.sedeId,
        sedeName: admin.sedeId ? getSedeName(admin.sedeId) : null,
        createdAt: admin.createdAt,
      }))
    )
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error("Error GET admins:", error)
    return NextResponse.json({ error: "Error al listar administradores" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAuth(request)
    requireSuperAdmin(auth)
    await connectDB()

    const body = await request.json().catch(() => ({}))
    const nombre = String(body.nombre || "").trim()
    const correo = String(body.correo || body.correo_electronico || "").trim().toLowerCase()
    const sedeId = String(body.sedeId || "").trim()
    const adminIdInput = String(body.admin_id || "").trim()

    if (!nombre || !correo || !sedeId) {
      return NextResponse.json(
        { error: "Nombre, correo y sede son obligatorios." },
        { status: 400 }
      )
    }

    if (!isValidSedeId(sedeId)) {
      return NextResponse.json({ error: "Sede inválida." }, { status: 400 })
    }

    const existing = await Admin.findOne({
      $or: [{ correo_electronico: correo }, ...(adminIdInput ? [{ admin_id: adminIdInput }] : [])],
    })
    if (existing) {
      return NextResponse.json(
        { error: "Ya existe un administrador con ese correo o usuario." },
        { status: 409 }
      )
    }

    const plainPassword = generateAdminPassword()
    const hashedPassword = await bcrypt.hash(plainPassword, 10)
    const admin_id = adminIdInput || generateAdminId(sedeId)

    const admin = await Admin.create({
      admin_id,
      nombre,
      correo_electronico: correo,
      contraseña: hashedPassword,
      rol: "admin",
      sedeId,
    })

    try {
      await sendAdminCredentialsEmail({
        to: correo,
        nombre,
        adminId: admin_id,
        password: plainPassword,
        sedeName: getSedeName(sedeId),
      })
    } catch (emailError) {
      await Admin.findByIdAndDelete(admin._id)
      console.error("Error enviando credenciales:", emailError)
      return NextResponse.json(
        {
          error:
            "No se pudo enviar el correo con las credenciales. Verifica EMAIL_USER y EMAIL_PASS en el servidor.",
        },
        { status: 503 }
      )
    }

    return NextResponse.json(
      {
        id: admin._id.toString(),
        admin_id: admin.admin_id,
        nombre: admin.nombre,
        correo: admin.correo_electronico,
        sedeId: admin.sedeId,
        sedeName: getSedeName(sedeId),
        message: "Administrador creado y credenciales enviadas por correo.",
      },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error("Error POST admins:", error)
    return NextResponse.json({ error: "Error al crear administrador" }, { status: 500 })
  }
}
