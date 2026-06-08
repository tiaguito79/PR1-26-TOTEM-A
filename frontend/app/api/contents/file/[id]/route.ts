import { NextResponse } from "next/server"
import mongoose from "mongoose"
import { GridFSBucket, ObjectId } from "mongodb"
import connectDB from "@/lib/mongodb"
import { corsPreflightResponse } from "@/lib/cors"

export const runtime = "nodejs"

const BUCKETS = ["uploads", "pdfs"] as const

export async function OPTIONS() {
  return corsPreflightResponse()
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB()

    const { id } = await params

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "ID de archivo inválido" }, { status: 400 })
    }

    const db = mongoose.connection.db

    if (!db) {
      return NextResponse.json(
        { error: "No hay conexión con MongoDB" },
        { status: 500 }
      )
    }

    const fileId = new ObjectId(id)

    for (const bucketName of BUCKETS) {
      const files = await db
        .collection(`${bucketName}.files`)
        .find({ _id: fileId })
        .toArray()

      if (!files.length) continue

      const file = files[0]
      const bucket = new GridFSBucket(db, { bucketName })
      const chunks: Buffer[] = []
      const stream = bucket.openDownloadStream(fileId)

      for await (const chunk of stream) {
        chunks.push(chunk as Buffer)
      }

      const buffer = Buffer.concat(chunks)
      const contentType =
        file.contentType || file.metadata?.contentType || "application/octet-stream"

      return new NextResponse(buffer, {
        status: 200,
        headers: {
          "Content-Type": contentType,
          "Content-Disposition": `inline; filename="${file.filename}"`,
          "Cache-Control": "public, max-age=3600",
          "Access-Control-Allow-Origin": "*",
        },
      })
    }

    return NextResponse.json({ error: "Archivo no encontrado" }, { status: 404 })
  } catch (error) {
    console.error("Error obteniendo archivo:", error)

    return NextResponse.json({ error: "Error al obtener archivo" }, { status: 500 })
  }
}
