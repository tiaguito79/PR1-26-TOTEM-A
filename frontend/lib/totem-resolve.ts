import mongoose from "mongoose"
import Totem from "@/models/Totem"

export async function resolveTotemRef(totemRef: string) {
  const ref = totemRef.trim()
  if (!ref) return null

  if (mongoose.Types.ObjectId.isValid(ref)) {
    const byId = await Totem.findById(ref)
    if (byId) return byId
  }

  return Totem.findOne({ totem_id: ref })
}
