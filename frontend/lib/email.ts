import nodemailer from "nodemailer"

function normalizeEnvValue(value?: string) {
  if (!value) return ""
  return value.trim().replace(/^["']|["']$/g, "")
}

export function getEmailConfig() {
  const user = normalizeEnvValue(process.env.EMAIL_USER)
  const pass = normalizeEnvValue(process.env.EMAIL_PASS)

  if (!user || !pass) {
    return null
  }

  return { user, pass }
}

export function createMailTransporter() {
  const config = getEmailConfig()
  if (!config) {
    throw new Error("EMAIL_NOT_CONFIGURED")
  }

  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  })
}

export async function sendMail(options: {
  to: string
  subject: string
  html: string
}) {
  const config = getEmailConfig()
  if (!config) {
    throw new Error("EMAIL_NOT_CONFIGURED")
  }

  const transporter = createMailTransporter()
  await transporter.sendMail({
    from: `"TOTEM Management" <${config.user}>`,
    to: options.to,
    subject: options.subject,
    html: options.html,
  })
}

export function getFrontendUrl() {
  const raw = normalizeEnvValue(process.env.FRONTEND_URL)
  if (raw) return raw.replace(/\/$/, "")
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }
  return "http://localhost:3000"
}

export async function sendAdminCredentialsEmail(options: {
  to: string
  nombre: string
  adminId: string
  password: string
  sedeName: string
}) {
  const loginUrl = `${getFrontendUrl()}/login`
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #111;">
      <h2 style="color: #2563eb;">Bienvenido al panel TOTEM</h2>
      <p>Hola <strong>${options.nombre}</strong>,</p>
      <p>Se creó tu cuenta de administrador para la sede <strong>${options.sedeName}</strong>.</p>
      <div style="background: #f1f5f9; padding: 16px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0 0 8px;"><strong>Usuario:</strong> ${options.adminId}</p>
        <p style="margin: 0 0 8px;"><strong>Correo:</strong> ${options.to}</p>
        <p style="margin: 0;"><strong>Contraseña temporal:</strong> ${options.password}</p>
      </div>
      <p>Puedes iniciar sesión con tu usuario o correo electrónico:</p>
      <p><a href="${loginUrl}" style="color: #2563eb;">${loginUrl}</a></p>
      <p style="font-size: 13px; color: #64748b;">Por seguridad, cambia tu contraseña después del primer acceso usando "Olvidé mi contraseña".</p>
    </div>
  `

  await sendMail({
    to: options.to,
    subject: `Credenciales de acceso TOTEM — ${options.sedeName}`,
    html,
  })
}
