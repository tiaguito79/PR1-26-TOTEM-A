import mongoose from "mongoose"
import { GridFSBucket, ObjectId } from "mongodb"

type BucketName = "uploads" | "pdfs"

function getBucket(bucketName: BucketName = "uploads"): GridFSBucket {
  const db = mongoose.connection.db
  if (!db) {
    throw new Error("No hay conexión activa con MongoDB")
  }
  return new GridFSBucket(db, { bucketName })
}

export function buildGridFsFileUrl(fileId: ObjectId | string): string {
  return `/api/contents/file/${fileId.toString()}`
}

export async function subirArchivoAGridFS(file: File, nombre: string) {
  const bucket = getBucket("uploads")
  const buffer = Buffer.from(await file.arrayBuffer())

  return new Promise<ObjectId>((resolve, reject) => {
    const uploadStream = bucket.openUploadStream(file.name, {
      metadata: { nombre, contentType: file.type },
    })

    uploadStream.end(buffer)
    uploadStream.on("finish", () => resolve(uploadStream.id))
    uploadStream.on("error", reject)
  })
}

export async function subirPdfAGridFS(
  buffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<ObjectId> {
  const bucket = getBucket("pdfs")

  return new Promise<ObjectId>((resolve, reject) => {
    const uploadStream = bucket.openUploadStream(fileName, {
      contentType: mimeType || "application/pdf",
      metadata: { tipo: "faq_pdf" },
    })

    uploadStream.end(buffer)
    uploadStream.on("finish", () => resolve(uploadStream.id))
    uploadStream.on("error", reject)
  })
}

export async function leerArchivoGridFS(
  fileId: ObjectId | string,
  bucketName: BucketName = "uploads"
): Promise<Buffer> {
  const bucket = getBucket(bucketName)
  const id = typeof fileId === "string" ? new ObjectId(fileId) : fileId
  const chunks: Buffer[] = []

  const stream = bucket.openDownloadStream(id)
  for await (const chunk of stream) {
    chunks.push(chunk as Buffer)
  }

  const buffer = Buffer.concat(chunks)
  if (buffer.length < 50) {
    throw new Error("El archivo en GridFS está vacío o es inválido")
  }

  return buffer
}

export async function leerPdfGridFS(fileId: ObjectId | string): Promise<Buffer> {
  try {
    return await leerArchivoGridFS(fileId, "pdfs")
  } catch {
    return leerArchivoGridFS(fileId, "uploads")
  }
}

export async function eliminarArchivoGridFS(
  fileId: ObjectId | string,
  bucketName: BucketName = "uploads"
) {
  try {
    const bucket = getBucket(bucketName)
    const id = typeof fileId === "string" ? new ObjectId(fileId) : fileId
    await bucket.delete(id)
  } catch {
    // El archivo puede no existir en GridFS
  }
}

export async function eliminarPdfGridFS(fileId: ObjectId | string) {
  await eliminarArchivoGridFS(fileId, "pdfs")
  await eliminarArchivoGridFS(fileId, "uploads")
}
