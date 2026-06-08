import { NextResponse } from "next/server"
import mongoose from "mongoose"
import { GridFSBucket } from "mongodb"
import connectDB from "@/lib/mongodb"
import { assertCanAccessSede, assertCanAccessTotem, AuthError, requireAuth } from "@/lib/auth.server"
import { eliminarArchivoGridFS, subirPdfAGridFS } from "@/lib/gridfs"
import { extractTextFromPdfBuffer, parseTotemKnowledgeDocument } from "@/lib/pdf-service"
import {
  createContentsFromCloudinary,
  deleteTotemContents,
  replaceTotemFaqFromCloudinary,
  type UploadedArchivoInput,
  type UploadedPdfInput,
} from "@/lib/totem-content.server"
import Totem from "@/models/Totem"
import Content from "@/models/Content"
import DocumentModel from "@/models/Document"
import Faq from "@/models/Faq"
import { validateTotemContentDates } from "@/lib/totem-dates"

export const runtime = "nodejs"

type RouteContext = { params: Promise<{ id: string }> }

async function subirArchivoAGridFS(file: File, nombre: string) {
  const db = mongoose.connection.db
  if (!db) throw new Error("No hay conexión activa con MongoDB")

  const bucket = new GridFSBucket(db, { bucketName: "uploads" })
  const buffer = Buffer.from(await file.arrayBuffer())

  return new Promise<any>((resolve, reject) => {
    const uploadStream = bucket.openUploadStream(file.name, {
      metadata: { nombre, contentType: file.type },
    })
    uploadStream.end(buffer)
    uploadStream.on("finish", () => resolve(uploadStream.id))
    uploadStream.on("error", reject)
  })
}

function isFormData(request: Request): boolean {
  const ct = request.headers.get("content-type") || ""
  return ct.includes("multipart/form-data")
}

async function applyCloudinaryContentUpdate(
  totem: any,
  updateData: Record<string, any>,
  archivos: UploadedArchivoInput[],
  mostrarDesde?: string,
  mostrarHasta?: string
) {
  const oldArchivos = totem.contenido?.archivos ?? []
  await deleteTotemContents(oldArchivos)

  const archivosGuardados = await createContentsFromCloudinary(
    archivos,
    updateData.nombre || totem.nombre
  )

  updateData.contenido = {
    mostrarDesde: mostrarDesde ? new Date(mostrarDesde) : null,
    mostrarHasta: mostrarHasta ? new Date(mostrarHasta) : null,
    archivos: archivosGuardados,
  }
  updateData.contenido_count = archivosGuardados.length
}

export async function PUT(request: Request, { params }: RouteContext) {
  try {
    const auth = await requireAuth(request)
    await connectDB()
    const { id } = await params

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "ID de tótem inválido" }, { status: 400 })
    }

    const totem = await Totem.findById(id)
    if (!totem) {
      return NextResponse.json({ error: "Tótem no encontrado" }, { status: 404 })
    }

    assertCanAccessTotem(auth, totem.campus_id)

    if (isFormData(request)) {
      const formData = await request.formData()

      const nombre = formData.get("nombre") as string
      const campus_id = formData.get("campus_id") as string
      const plantilla = formData.get("plantilla") as string
      const estado = formData.get("estado") as string
      const mostrarDesde = formData.get("mostrarDesde") as string
      const mostrarHasta = formData.get("mostrarHasta") as string

      const archivosConfig = [
        { key: "imagen1", slot: "Imagen Carrusel 1", tipo: "imagen" },
        { key: "imagen2", slot: "Imagen Carrusel 2", tipo: "imagen" },
        { key: "imagen3", slot: "Imagen Carrusel 3", tipo: "imagen" },
        { key: "imagen4", slot: "Imagen Carrusel 4", tipo: "imagen" },
        { key: "imagen5", slot: "Imagen Carrusel 5", tipo: "imagen" },
        { key: "video1", slot: "Video Principal 1", tipo: "video" },
        { key: "video2", slot: "Video Principal 2", tipo: "video" },
      ]

      const keepContent = formData.get("keepContent") === "true"

      const updateData: Record<string, any> = {}
      if (nombre?.trim()) updateData.nombre = nombre.trim()
      if (campus_id?.trim()) updateData.campus_id = campus_id.trim()
      if (plantilla?.trim()) updateData.plantilla = plantilla.trim()
      if (estado?.trim()) updateData.estado = estado.trim()

      const infoBloqueRaw = formData.get("info_bloques") as string | null
      if (infoBloqueRaw) {
        try {
          updateData.info_bloques = JSON.parse(infoBloqueRaw)
        } catch {}
      }

      if (!keepContent) {
        if (mostrarDesde && mostrarHasta) {
          const dateError = validateTotemContentDates(mostrarDesde, mostrarHasta)
          if (dateError) {
            return NextResponse.json({ error: dateError }, { status: 400 })
          }
        }

        const oldArchivos = totem.contenido?.archivos ?? []
        for (const archivo of oldArchivos) {
          if (!archivo.contentId) continue
          const content = await Content.findById(archivo.contentId)
          if (content?.fileId) {
            await eliminarArchivoGridFS(content.fileId)
          }
          await Content.findByIdAndDelete(archivo.contentId)
        }

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

        updateData.contenido = {
          mostrarDesde: mostrarDesde ? new Date(mostrarDesde) : null,
          mostrarHasta: mostrarHasta ? new Date(mostrarHasta) : null,
          archivos: archivosGuardados,
        }
        updateData.contenido_count = archivosGuardados.length
      }

      const updated = await Totem.findByIdAndUpdate(id, updateData, {
        returnDocument: "after",
        runValidators: true,
      })

      const pdfFile = formData.get("faqPdf") as File | null
      if (pdfFile && pdfFile.size > 0) {
        await Faq.deleteMany({ totemId: id })

        const pdfBuffer = Buffer.from(await pdfFile.arrayBuffer())
        const pdfFileName = `${Date.now()}-${pdfFile.name}`
        const pdfFileId = await subirPdfAGridFS(pdfBuffer, pdfFileName, pdfFile.type)
        const extractedText = await extractTextFromPdfBuffer(pdfBuffer)
        const { items } = parseTotemKnowledgeDocument(extractedText)
        const pdfUrl = `/api/contents/file/${pdfFileId}`

        const document = await DocumentModel.create({
          name: pdfFile.name,
          type: "faq_pdf",
          fileId: pdfFileId,
          fileUrl: pdfUrl,
          mimeType: pdfFile.type,
          extractedText,
        })

        await Faq.create({
          title: `FAQ - ${nombre || totem.nombre}`,
          campusId: null,
          totemId: id,
          documentId: document._id,
          pdfFileId,
          pdfUrl,
          items,
          isActive: true,
        })
      }

      return NextResponse.json(updated)
    }

    const body = await request.json()
    const update: Record<string, any> = {}

    if (typeof body.nombre === "string" && body.nombre.trim()) {
      update.nombre = body.nombre.trim()
    }
    if (typeof body.campus_id === "string" && body.campus_id.trim()) {
      assertCanAccessSede(auth, body.campus_id.trim())
      update.campus_id = body.campus_id.trim()
    }
    if (typeof body.plantilla === "string" && body.plantilla.trim()) {
      update.plantilla = body.plantilla.trim()
    }
    if (typeof body.estado === "string" && body.estado.trim()) {
      update.estado = body.estado.trim()
    }
    if (Array.isArray(body.info_bloques)) {
      update.info_bloques = body.info_bloques
    }

    const replaceContent = body.replaceContent === true
    const archivos = Array.isArray(body.archivos) ? (body.archivos as UploadedArchivoInput[]) : []

    if (replaceContent && archivos.length > 0) {
      if (body.mostrarDesde && body.mostrarHasta) {
        const dateError = validateTotemContentDates(body.mostrarDesde, body.mostrarHasta)
        if (dateError) {
          return NextResponse.json({ error: dateError }, { status: 400 })
        }
      }

      await applyCloudinaryContentUpdate(
        totem,
        update,
        archivos,
        body.mostrarDesde,
        body.mostrarHasta
      )
    }

    if (Object.keys(update).length === 0 && !body.faqPdf) {
      return NextResponse.json(
        { error: "No hay campos válidos para actualizar" },
        { status: 400 }
      )
    }

    const updated = await Totem.findByIdAndUpdate(
      id,
      Object.keys(update).length > 0 ? update : { nombre: totem.nombre },
      {
        returnDocument: "after",
        runValidators: true,
      }
    )

    if (body.faqPdf?.url && body.faqPdf.publicId) {
      update.faqPdf = body.faqPdf
      await Totem.findByIdAndUpdate(id, { faqPdf: body.faqPdf })

      try {
        const faqResult = await replaceTotemFaqFromCloudinary(
          id,
          update.nombre || totem.nombre,
          body.faqPdf as UploadedPdfInput
        )
        return NextResponse.json({
          ...(updated?.toObject?.() ?? updated),
          faqPdf: body.faqPdf,
          faqLinked: true,
          faqItemsCount: faqResult.itemsCount,
          faqExtractedOk: faqResult.extractedOk,
          faqWarning: faqResult.warning ?? null,
        })
      } catch (pdfError) {
        console.error("Error procesando PDF Cloudinary:", pdfError)
        const msg =
          pdfError instanceof Error
            ? pdfError.message
            : "No se pudo procesar el PDF de preguntas frecuentes"
        return NextResponse.json(
          { error: `Error procesando PDF de FAQ: ${msg}` },
          { status: 422 }
        )
      }
    }

    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error("Error PUT totem:", error)
    const message =
      error instanceof Error ? error.message : "Error al actualizar el tótem"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  try {
    const auth = await requireAuth(request)
    await connectDB()
    const { id } = await params

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "ID de tótem inválido" }, { status: 400 })
    }

    const totem = await Totem.findById(id)
    if (!totem) {
      return NextResponse.json({ error: "Tótem no encontrado" }, { status: 404 })
    }

    assertCanAccessTotem(auth, totem.campus_id)

    const archivos = totem.contenido?.archivos ?? []
    await deleteTotemContents(archivos)

    const faqs = await Faq.find({ totemId: id })
    for (const faq of faqs) {
      if (faq.documentId) {
        await DocumentModel.findByIdAndDelete(faq.documentId)
      }
    }
    await Faq.deleteMany({ totemId: id })

    await Totem.findByIdAndDelete(id)

    return NextResponse.json({ message: "Tótem eliminado correctamente" })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error("Error DELETE totem:", error)
    const message =
      error instanceof Error ? error.message : "Error al eliminar el tótem"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
