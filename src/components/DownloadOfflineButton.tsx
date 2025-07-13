import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Download, 
  Shield, 
  AlertCircle,
  Loader2,
  Monitor,
  WifiOff,
  Lock,
  HardDrive
} from 'lucide-react'

export function DownloadOfflineButton() {
  const [isDesktop, setIsDesktop] = useState(false)
  const [showDialog, setShowDialog] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState<string | null>(null)

  useEffect(() => {
    const checkDevice = () => {
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      const isSmallScreen = window.innerWidth < 768
      setIsDesktop(!isMobile && !isSmallScreen)
    }

    checkDevice()
    window.addEventListener('resize', checkDevice)
    return () => window.removeEventListener('resize', checkDevice)
  }, [])

  const handleDownload = async () => {
    setIsDownloading(true)
    setDownloadError(null)

    try {
      const response = await fetch('/lighter-keygen-offline.zip')
      
      if (!response.ok) {
        throw new Error('Offline bundle not available. Please run "npm run build:offline" to generate it.')
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'lighter-keygen-offline.zip'
      a.click()
      URL.revokeObjectURL(url)
      
      setTimeout(() => {
        setShowDialog(false)
        setIsDownloading(false)
      }, 2000)
    } catch (error) {
      setDownloadError(error instanceof Error ? error.message : 'Download failed')
      setIsDownloading(false)
    }
  }

  if (!isDesktop) return null

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowDialog(true)}
        className="gap-2"
      >
        <Download className="h-4 w-4" />
        <span className="hidden sm:inline">Download Offline</span>
        <span className="sm:hidden">Offline</span>
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <div className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Download className="h-5 w-5 text-primary" />
                </div>
                Download Offline Version
              </h2>
              <p className="text-sm text-muted-foreground">
                Run Lighter Key Generator locally on your computer for maximum security
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border bg-muted/20 p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-green-500/10">
                    <WifiOff className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-sm">Local App</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      App runs locally (API calls still need internet)
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border bg-muted/20 p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <Lock className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-sm">Enhanced Security</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Keys never leave your computer
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border bg-muted/20 p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-purple-500/10">
                    <HardDrive className="h-4 w-4 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-sm">Local Storage</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      All data stays on your device
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border bg-muted/20 p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-amber-500/10">
                    <Monitor className="h-4 w-4 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-sm">Easy to Use</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Simple setup, no technical skills needed
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
              <div className="flex items-start gap-3">
                <Shield className="h-4 w-4 text-amber-500 mt-0.5" />
                <div className="space-y-2 flex-1">
                  <h3 className="font-medium text-sm">Security Recommendations</h3>
                  <ul className="space-y-1 text-xs text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="block w-1 h-1 rounded-full bg-current mt-1.5 shrink-0"></span>
                      <span>Download only on a secure, trusted computer</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="block w-1 h-1 rounded-full bg-current mt-1.5 shrink-0"></span>
                      <span>Verify the download completes successfully</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="block w-1 h-1 rounded-full bg-current mt-1.5 shrink-0"></span>
                      <span>Run offline for sensitive operations</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {downloadError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{downloadError}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <AlertCircle className="h-4 w-4" />
                <span>Download size: ~5MB • Requires Node.js to run locally</span>
              </div>
              
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowDialog(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleDownload}
                  disabled={isDownloading}
                  className="flex-1"
                >
                  {isDownloading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Downloading...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Download ZIP (5MB)
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}