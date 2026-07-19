import { Button } from '@/components/ui/button'

interface ConfirmationDialogProps {
  open: boolean
  title: string
  description: string
  confirmLabel: string
  cancelLabel: string
  onConfirm: () => void
  onCancel: () => void
  isBusy?: boolean
  className?: string
}

export function ConfirmationDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  isBusy = false,
  className,
}: ConfirmationDialogProps) {
  if (!open) {
    return null
  }

  return (
    <div
      className={
        className !== undefined
          ? `fixed inset-0 ${className} flex items-center justify-center bg-cyan-950/78 p-3 backdrop-blur-sm`
          : 'fixed inset-0 z-40 flex items-center justify-center bg-cyan-950/78 p-3 backdrop-blur-sm'
      }
      role="alertdialog"
      aria-modal="true"
      aria-label={title}
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-lg border bg-background p-4 shadow-xl"
        onClick={(event) => {
          event.stopPropagation()
        }}
      >
        <p className="text-sm font-black">{title}</p>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isBusy}>
            {cancelLabel}
          </Button>
          <Button
            type="button"
            className="border-destructive/45 bg-destructive/10 text-destructive hover:bg-destructive/20"
            variant="outline"
            onClick={onConfirm}
            disabled={isBusy}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
