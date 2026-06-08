import { NextResponse } from "next/server"
import mongoose from "mongoose"
import { GridFSBucket } from "mongodb"
import connectDB from "@/lib/mongodb"
import {
  assertCanAccessSede,
  AuthError,
  getTotemQueryFilter,
  requireAuth,
} from "@/lib/auth.server"
import { subirPdfAGridFS } from "@/lib/gridfs"
import { extractTextFromPdfBuffer, parseTotemKnowledgeDocument } from "@/lib/pdf-service"
import {
  createContentsFromCloudinary,
  processFaqPdfFromCloudinary,
  type UploadedArchivoInput,
  type UploadedPdfInput,
} from "@/lib/totem-content.server"
import Totem from "@/models/Totem"
import Content from "@/models/Content"
import DocumentModel from "@/models/Document"
import Faq from "@/models/Faq"
import { validateTotemContentDates } from "@/lib/totem-dates"

export const runtime = "nodejs"
export const maxDuration = 60

async function subirArchivoAGridFS(file: File, nombre: string) {
  const db = mongoose.connection.db

  if (!db) {
    throw new Error("No hay conexión activa con MongoDB")
  }

  const bucket = new GridFSBucket(db, {
    bucketName: "uploads",
  })

  const buffer = Buffer.from(await file.arrayBuffer())

  return new Promise<any>((resolve, reject) => {
    const uploadStream = bucket.openUploadStream(file.name, {
      metadata: {
        nombre,
        contentType: file.type,
      },
    })

    uploadStream.end(buffer)

    uploadStream.on("finish", () => {
      resolve(uploadStream.id)
    })

    uploadStream.on("error", reject)
  })
}

function isJsonRequest(request: Request): boolean {
  const ct = request.headers.get("content-type") || ""
  return ct.includes("application/json")
}

async function createTotemFromCloudinary(body: {
  nombre: string
  totem_id: string
  campus_id: string
  plantilla: string
  estado: string
  usuario: string
  contraseña: string
  mostrarDesde?: string
  mostrarHasta?: string
  info_bloques?: Array<{ titulo: string; contenido: string }>
  archivos?: UploadedArchivoInput[]
  faqPdf?: UploadedPdfInput | null
}) {
  const archivos = Array.isArray(body.archivos) ? body.archivos : []
  const archivosGuardados = await createContentsFromCloudinary(archivos, body.nombre)

  const newTotem = await Totem.create({
    nombre: body.nombre,
    totem_id: body.totem_id,
    campus_id: body.campus_id,
    plantilla: body.plantilla,
    estado: body.estado,
    credenciales: {
      usuario: body.usuario,
      contraseña: body.contraseña,
    },
    contenido: {
      mostrarDesde: body.mostrarDesde ? new Date(body.mostrarDesde) : null,
      mostrarHasta: body.mostrarHasta ? new Date(body.mostrarHasta) : null,
      archivos: archivosGuardados,
    },
    contenido_count: archivosGuardados.length,
    ...(Array.isArray(body.info_bloques) && body.info_bloques.length > 0
      ? { info_bloques: body.info_bloques }
      : {}),
  })

  if (body.faqPdf?.url && body.faqPdf.publicId) {
    try {
      const faqResult = await processFaqPdfFromCloudinary(
        body.faqPdf,
        newTotem._id,
        body.nombre
      )
      if (faqResult.itemsCount === 0) {
        console.warn(
          "[POST totem] PDF de FAQ guardado pero sin preguntas detectadas. Verifica el formato del documento."
        )
      }
    } catch (pdfError) {
      console.error("[POST totem] ERROR procesando PDF Cloudinary:", pdfError)
    }
  }

  return newTotem
}

export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request)
    await connectDB()

    const totems = await Totem.find(getTotemQueryFilter(auth))
      .populate("contenido.archivos.contentId")
      .sort({ createdAt: -1 })

    return NextResponse.json(totems)
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error("Error GET:", error)
    return NextResponse.json(
      { error: "Error al obtener los tótems" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAuth(request)
    await connectDB()

    if (isJsonRequest(request)) {
      const body = await request.json()

      if (!body.nombre || !body.totem_id || !body.campus_id || !body.plantilla) {
        return NextResponse.json(
          { error: "Faltan campos obligatorios para crear el tótem" },
          { status: 400 }
        )
      }

      assertCanAccessSede(auth, body.campus_id)

      if (body.mostrarDesde && body.mostrarHasta) {
        const dateError = validateTotemContentDates(body.mostrarDesde, body.mostrarHasta)
        if (dateError) {
          return NextResponse.json({ error: dateError }, { status: 400 })
        }
      }

      const newTotem = await createTotemFromCloudinary(body)
      return NextResponse.json(newTotem, { status: 201 })
    }

    const formData = await request.formData()

    const nombre = formData.get("nombre") as string
    const totem_id = formData.get("totem_id") as string
    const campus_id = formData.get("campus_id") as string
    const plantilla = formData.get("plantilla") as string
    const estado = formData.get("estado") as string
    const usuario = formData.get("usuario") as string
    const contraseña = formData.get("contraseña") as string
    const mostrarDesde = formData.get("mostrarDesde") as string
    const mostrarHasta = formData.get("mostrarHasta") as string

    if (campus_id) {
      assertCanAccessSede(auth, campus_id)
    }

    if (mostrarDesde && mostrarHasta) {
      const dateError = validateTotemContentDates(mostrarDesde, mostrarHasta)
      if (dateError) {
        return NextResponse.json({ error: dateError }, { status: 400 })
      }
    }

    const archivosConfig = [
      { key: "imagen1", slot: "Imagen Carrusel 1", tipo: "imagen" },
      { key: "imagen2", slot: "Imagen Carrusel 2", tipo: "imagen" },
      { key: "imagen3", slot: "Imagen Carrusel 3", tipo: "imagen" },
      { key: "imagen4", slot: "Imagen Carrusel 4", tipo: "imagen" },
      { key: "imagen5", slot: "Imagen Carrusel 5", tipo: "imagen" },
      { key: "video1", slot: "Video Principal 1", tipo: "video" },
      { key: "video2", slot: "Video Principal 2", tipo: "video" },
    ]

    const archivosGuardados = []

    for (const item of archivosConfig) {
      const file = formData.get(item.key) as File | null

      if (file && file.size > 0) {
        const fileId = await subirArchivoAGridFS(file, item.slot)

        const content = await Content.create({
          content_id: `CONTENT-${Date.now()}-${Math.floor(Math.random() * 9999)}`,
          tipo: item.tipo,
          nombre: item.slot,
          fileId,
          url_contenido: `/api/contents/file/${fileId}`,
          descripcion: `${item.slot} del tótem ${nombre}`,
        })

        archivosGuardados.push({
          slot: item.slot,
          tipo: item.tipo,
          contentId: content._id,
        })
      }
    }

    let infoBloques = null
    const infoBloqueRaw = formData.get("info_bloques") as string | null
    if (infoBloqueRaw) {
      try {
        infoBloques = JSON.parse(infoBloqueRaw)
      } catch {}
    }

    const newTotem = await Totem.create({
      nombre,
      totem_id,
      campus_id,
      plantilla,
      estado,
      credenciales: {
        usuario,
        contraseña,
      },
      contenido: {
        mostrarDesde: mostrarDesde ? new Date(mostrarDesde) : null,
        mostrarHasta: mostrarHasta ? new Date(mostrarHasta) : null,
        archivos: archivosGuardados,
      },
      contenido_count: archivosGuardados.length,
      ...(infoBloques ? { info_bloques: infoBloques } : {}),
    })

    const pdfFile = formData.get("faqPdf") as File | null

    if (pdfFile && pdfFile.size > 0) {
      try {
        const pdfBuffer = Buffer.from(await pdfFile.arrayBuffer())
        const pdfFileName = `${Date.now()}-${pdfFile.name}`

        const pdfFileId = await subirPdfAGridFS(pdfBuffer, pdfFileName, pdfFile.type)
        const extractedText = await extractTextFromPdfBuffer(pdfBuffer)
        const { items } = parseTotemKnowledgeDocument(extractedText)

        const document = await DocumentModel.create({
          name: pdfFile.name,
          type: "faq_pdf",
          fileId: pdfFileId,
          mimeType: pdfFile.type,
          extractedText,
        })

        await Faq.create({
          title: `FAQ - ${nombre}`,
          campusId: null,
          totemId: newTotem._id,
          documentId: document._id,
          pdfFileId,
          items,
          isActive: true,
        })
      } catch (pdfError) {
        console.error("[POST totem] ERROR procesando PDF:", pdfError)
      }
    }

    return NextResponse.json(newTotem, { status: 201 })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error("Error POST:", error)
    const message =
      error instanceof Error ? error.message : "Error al crear el tótem"
    const isDuplicate =
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code: number }).code === 11000
    return NextResponse.json(
      {
        error: isDuplicate
          ? "Ya existe un tótem con ese ID. Intenta de nuevo."
          : message,
      },
      { status: isDuplicate ? 409 : 500 }
    )
  }
}
