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
  const buffer = Buffer.from(await response.arrayBuffer())
  if (buffer.length < 50) {
    throw new Error("El archivo descargado está vacío o es inválido")
  }
  return buffer
}

function publicIdCandidates(publicId: string): string[] {
  const trimmed = publicId.trim()
  if (!trimmed) return []

  const candidates = new Set<string>([trimmed])
  if (trimmed.endsWith(".pdf")) {
    candidates.add(trimmed.slice(0, -4))
  } else {
    candidates.add(`${trimmed}.pdf`)
  }
  return Array.from(candidates)
}

async function downloadViaSignedUrl(publicId: string, deliveryType = "upload") {
  getCloudinaryConfig()
  const signedUrl = cloudinary.url(publicId, {
    resource_type: "raw",
    type: deliveryType,
    secure: true,
    sign_url: true,
  })
  return fetchRemoteBuffer(signedUrl)
}

async function downloadViaPrivateUrl(publicId: string) {
  getCloudinaryConfig()
  const downloadUrl = cloudinary.utils.private_download_url(publicId, "", {
    resource_type: "raw",
  })
  return fetchRemoteBuffer(downloadUrl)
}

export async function fetchCloudinaryPdfBuffer(pdf: {
  url: string
  publicId: string
}): Promise<Buffer> {
  const errors: string[] = []
  getCloudinaryConfig()

  for (const candidate of publicIdCandidates(pdf.publicId || "")) {
    try {
      const resource = await cloudinary.api.resource(candidate, {
        resource_type: "raw",
      })
      const resolvedId = resource.public_id || candidate
      const deliveryType = resource.type || "upload"

      try {
        return await downloadViaSignedUrl(resolvedId, deliveryType)
      } catch (signedError) {
        errors.push(
          `signed:${resolvedId}: ${
            signedError instanceof Error ? signedError.message : String(signedError)
          }`
        )
      }

      try {
        return await downloadViaPrivateUrl(resolvedId)
      } catch (privateError) {
        errors.push(
          `private:${resolvedId}: ${
            privateError instanceof Error ? privateError.message : String(privateError)
          }`
        )
      }

      if (resource.secure_url) {
        try {
          return await fetchRemoteBuffer(resource.secure_url)
        } catch (urlError) {
          errors.push(
            `secure_url:${resolvedId}: ${
              urlError instanceof Error ? urlError.message : String(urlError)
            }`
          )
        }
      }
    } catch (error) {
      errors.push(
        `resource:${candidate}: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  for (const candidate of publicIdCandidates(pdf.publicId || "")) {
    try {
      return await downloadViaSignedUrl(candidate)
    } catch (error) {
      errors.push(
        `signed-fallback:${candidate}: ${
          error instanceof Error ? error.message : String(error)
        }`
      )
    }
  }

  if (pdf.url) {
    try {
      return await fetchRemoteBuffer(pdf.url)
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error))
    }
  }

  throw new Error(errors.join(" | ") || "No se pudo descargar el PDF de Cloudinary")
}
