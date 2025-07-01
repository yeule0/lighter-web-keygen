import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Shield, AlertTriangle } from 'lucide-react'

interface TransactionConfirmDialogProps {
  open: boolean
  onConfirm: () => void
  onCancel: () => void
  details: {
    action: string
    network: string
    accountIndex: number
    newPublicKey: string
    targetKeyIndex: string
  }
}

export function TransactionConfirmDialog({
  open,
  onConfirm,
  onCancel,
  details
}: TransactionConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent className="max-w-md bg-background border-border/50 dark:bg-black dark:border-white/20">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-full border border-foreground/20 dark:border-white/20">
              <Shield className="h-5 w-5 text-foreground dark:text-white" />
            </div>
            <DialogTitle>Confirm Transaction</DialogTitle>
          </div>
          <DialogDescription asChild>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                You are about to sign and submit a transaction. Please verify these details:
              </p>
              
              <div className="rounded-lg bg-muted dark:bg-white/5 p-4 space-y-2 text-sm border border-border dark:border-white/10">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Action:</span>
                  <span className="font-medium">{details.action}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Network:</span>
                  <span className="font-medium capitalize">{details.network}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Account:</span>
                  <span className="font-medium">#{details.accountIndex}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Target Key Index:</span>
                  <span className="font-medium">#{details.targetKeyIndex}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">New Public Key:</span>
                  <div className="mt-1 p-2 bg-background dark:bg-black border border-border dark:border-white/10 rounded text-xs font-mono break-all">
                    {details.newPublicKey}
                  </div>
                </div>
              </div>
              
              <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-700 dark:text-amber-400">
                  <p className="font-semibold mb-1">Security Notice:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Only sign if you initiated this action</li>
                    <li>Verify you're on the correct network</li>
                    <li>This will require two signatures (L2 + wallet)</li>
                  </ul>
                </div>
              </div>
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel} className="border-border dark:border-white/20">Cancel</Button>
          <Button onClick={onConfirm}>
            Confirm & Sign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}