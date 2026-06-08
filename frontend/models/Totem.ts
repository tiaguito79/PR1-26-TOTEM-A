import mongoose, { Schema, model, models } from "mongoose"

const TotemSchema = new Schema({
  totem_id: { type: String, required: true, unique: true },
  campus_id: { type: String, required: true },
  nombre: { type: String, required: true },
  estado: {
    type: String,
    required: true,
    enum: ["Activo", "Inactivo", "En Mantenimiento"],
    default: "Activo"
  },
  plantilla: { type: String, required: true },
  plantilla_config: { type: Schema.Types.Mixed, default: null },
  info_bloques: [{
    titulo: { type: String, required: true },
    contenido: { type: String, required: true },
  }],
  credenciales: {
    usuario: { type: String, required: true },
    contraseña: { type: String, required: true }
  },
  camara: { type: Boolean, default: true },
  microfono: { type: Boolean, default: true },

  contenido: {
    mostrarDesde: { type: Date },
    mostrarHasta: { type: Date },
    archivos: [
      {
        slot: String,
        tipo: String,
        contentId: { type: Schema.Types.ObjectId, ref: "Content" }
      }
    ]
  },

  contenido_count: {
    type: Number,
    default: 0
  },

  faqPdf: {
    url: { type: String },
    publicId: { type: String },
    name: { type: String },
    extractedText: { type: String },
  },

  fecha_registro: { type: Date, default: Date.now }
}, {
  timestamps: true
})

const Totem = models.Totem || model("Totem", TotemSchema, "totems")

export default Totem