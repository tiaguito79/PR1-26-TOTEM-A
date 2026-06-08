const PASSWORD_CHARS =
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*"

export function generateAdminPassword(length = 12): string {
  let password = ""
  for (let i = 0; i < length; i += 1) {
    password += PASSWORD_CHARS.charAt(Math.floor(Math.random() * PASSWORD_CHARS.length))
  }
  return password
}

export function generateAdminId(sedeId: string): string {
  const suffix = sedeId
    .split("-")
    .map((part) => part.slice(0, 3).toUpperCase())
    .join("")
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `ADMIN_${suffix}_${random}`
}
