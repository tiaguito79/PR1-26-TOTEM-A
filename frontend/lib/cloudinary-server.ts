import { v2 as cloudinary } from "cloudinary"

export function getCloudinaryConfig() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim()
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim()
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim()
  const folder = process.env.CLOUDINARY_FOLDER?.trim() || "totem-uploads"

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(
      "Configura CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY y CLOUDINARY_API_SECRET"
    )
  }

  cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret })

  return { cloudName, apiKey, apiSecret, folder }
}

export function createUploadSignature(_resourceType: "image" | "video" | "raw") {
  const { apiSecret, folder } = getCloudinaryConfig()
  const timestamp = Math.round(Date.now() / 1000)
  const params: Record<string, string | number> = {
    timestamp,
    folder,
  }

  // Solo firmar params que el cliente envía en el FormData (folder + timestamp).
  // El tipo de recurso va en la URL (/image|video|raw/upload), no en la firma.
  const signature = cloudinary.utils.api_sign_request(params, apiSecret)

  return { signature, timestamp, folder, params }
}

export async function deleteCloudinaryAsset(
  publicId: string,
  resourceType: "image" | "video" | "raw" = "image"
) {
  if (!publicId) return
  getCloudinaryConfig()
  await cloudinary.uploader.destroy(publicId, {
    resource_type: resourceType,
    invalidate: true,
  })
}

export async function fetchRemoteBuffer(url: string): Promise<Buffer> {
  const response = await fetch(url, {
    headers: { Accept: "application/pdf,*/*" },
  })
  if (!response.ok) {
    throw new Error(`No se pudo descargar el archivo (${response.status})`)
  }
  return Buffer.from(await response.arrayBuffer())
}

export async function fetchCloudinaryPdfBuffer(pdf: {
  url: string
  publicId: string
}): Promise<Buffer> {
  const errors: string[] = []

  if (pdf.url) {
    try {
      return await fetchRemoteBuffer(pdf.url)
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error))
    }
  }

  if (pdf.publicId) {
    try {
      getCloudinaryConfig()
      const resource = await cloudinary.api.resource(pdf.publicId, {
        resource_type: "raw",
        type: "upload",
      })
      if (resource.secure_url) {
        return await fetchRemoteBuffer(resource.secure_url)
      }
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error))
    }

    try {
      getCloudinaryConfig()
      const signedUrl = cloudinary.url(pdf.publicId, {
        resource_type: "raw",
        secure: true,
        type: "upload",
      })
      return await fetchRemoteBuffer(signedUrl)
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error))
    }
  }

  throw new Error(errors.join(" | ") || "No se pudo descargar el PDF de Cloudinary")
}
