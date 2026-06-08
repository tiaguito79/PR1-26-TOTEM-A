import { Loader2 } from "lucide-react"

type SheetUploadOverlayProps = {
  visible: boolean
  message?: string
}

export function SheetUploadOverlay({
  visible,
  message = "Subiendo archivos...",
}: SheetUploadOverlayProps) {
  if (!visible) return null

  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-background/90 backdrop-blur-sm">
      <Loader2 className="h-12 w-12 animate-spin text-emerald-500" />
      <div className="text-center px-6">
        <p className="text-sm font-medium text-foreground">{message}</p>
        <p className="mt-1 text-xs text-muted-foreground">Esto puede tardar unos segundos</p>
      </div>
    </div>
  )
}
