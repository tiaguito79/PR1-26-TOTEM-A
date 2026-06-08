export type CloudinaryResourceType = "image" | "video" | "raw"

export type CloudinaryUploadResult = {
  url: string
  publicId: string
  resourceType: CloudinaryResourceType
  name: string
}

function detectResourceType(file: File): CloudinaryResourceType {
  if (file.type.startsWith("video/")) return "video"
  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
    return "raw"
  }
  return "image"
}

export async function uploadFileToCloudinary(
  file: File,
  resourceType?: CloudinaryResourceType,
  onProgress?: (label: string) => void
): Promise<CloudinaryUploadResult> {
  const type = resourceType || detectResourceType(file)
  onProgress?.(file.name)

  const token = localStorage.getItem("token")
  const signRes = await fetch("/api/uploads/sign", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ resourceType: type }),
  })

  if (!signRes.ok) {
    const err = await signRes.json().catch(() => ({}))
    throw new Error(err.error || "No se pudo firmar la subida a Cloudinary")
  }

  const sign = await signRes.json()
  const formData = new FormData()
  formData.append("file", file)
  formData.append("api_key", sign.apiKey)
  formData.append("timestamp", String(sign.timestamp))
  formData.append("signature", sign.signature)
  formData.append("folder", sign.folder)

  const endpoint =
    type === "video"
      ? "video/upload"
      : type === "raw"
        ? "raw/upload"
        : "image/upload"

  const uploadRes = await fetch(
    `https://api.cloudinary.com/v1_1/${sign.cloudName}/${endpoint}`,
    { method: "POST", body: formData }
  )

  const data = await uploadRes.json().catch(() => ({}))
  if (!uploadRes.ok) {
    throw new Error(data.error?.message || data.error || "Error al subir a Cloudinary")
  }

  return {
    url: data.secure_url,
    publicId: data.public_id,
    resourceType: type,
    name: file.name,
  }
}

export const ARCHIVOS_SLOTS = [
  { key: "imagen1", slot: "Imagen Carrusel 1", tipo: "imagen" as const },
  { key: "imagen2", slot: "Imagen Carrusel 2", tipo: "imagen" as const },
  { key: "imagen3", slot: "Imagen Carrusel 3", tipo: "imagen" as const },
  { key: "imagen4", slot: "Imagen Carrusel 4", tipo: "imagen" as const },
  { key: "imagen5", slot: "Imagen Carrusel 5", tipo: "imagen" as const },
  { key: "video1", slot: "Video Principal 1", tipo: "video" as const },
  { key: "video2", slot: "Video Principal 2", tipo: "video" as const },
]

export type UploadedArchivoPayload = {
  slot: string
  tipo: "imagen" | "video"
  url: string
  publicId: string
}

export type UploadedPdfPayload = {
  url: string
  publicId: string
  name: string
  extractedText?: string
}

export async function uploadTemplateMedia(
  imagenes: Record<number, File | null>,
  videos: Record<number, File | null>,
  imageCount: number,
  videoCount: number,
  onProgress?: (message: string) => void
): Promise<UploadedArchivoPayload[]> {
  const archivos: UploadedArchivoPayload[] = []

  for (let i = 1; i <= imageCount; i++) {
    const file = imagenes[i]
    if (!file) continue
    onProgress?.(`Subiendo imagen ${i}...`)
    const uploaded = await uploadFileToCloudinary(file, "image")
    archivos.push({
      slot: `Imagen Carrusel ${i}`,
      tipo: "imagen",
      url: uploaded.url,
      publicId: uploaded.publicId,
    })
  }

  for (let i = 1; i <= videoCount; i++) {
    const file = videos[i]
    if (!file) continue
    onProgress?.(`Subiendo video ${i}...`)
    const uploaded = await uploadFileToCloudinary(file, "video")
    archivos.push({
      slot: `Video Principal ${i}`,
      tipo: "video",
      url: uploaded.url,
      publicId: uploaded.publicId,
    })
  }

  return archivos
}
