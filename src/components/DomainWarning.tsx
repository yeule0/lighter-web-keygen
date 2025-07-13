import { useState, useEffect } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

const OFFICIAL_DOMAINS = [
  'lighterkey.netlify.app',
  'localhost:5173',
  'localhost:4173',
  'localhost:8080'  
]

export function DomainWarning() {
  const [show, setShow] = useState(false)
  const [currentDomain, setCurrentDomain] = useState('')

  useEffect(() => {
    const domain = window.location.hostname + (window.location.port ? `:${window.location.port}` : '')
    setCurrentDomain(domain)
    
    if (!OFFICIAL_DOMAINS.includes(domain)) {
      setShow(true)
    }
  }, [])

  if (!show) return null

  return (
    <Alert className="fixed top-4 left-4 right-4 z-[100] max-w-2xl mx-auto border-2 border-foreground dark:border-white bg-background dark:bg-black">
      <AlertTriangle className="h-5 w-5" />
      <AlertDescription className="text-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-semibold mb-1">
              Unofficial Domain Warning
            </p>
            <p className="text-muted-foreground">
              You're accessing this app from <code className="text-xs border border-foreground/30 dark:border-white/30 px-1 py-0.5 rounded font-mono">{currentDomain}</code>.
              The official domain is <code className="text-xs border border-foreground/30 dark:border-white/30 px-1 py-0.5 rounded font-mono">lighterkey.netlify.app</code>.
              This could be a phishing attempt.
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0"
            onClick={() => setShow(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  )
}