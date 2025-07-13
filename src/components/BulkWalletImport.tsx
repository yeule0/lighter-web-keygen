import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { 
  Upload, 
  FileJson, 
  AlertCircle, 
  Shield,
  Eye,
  EyeOff,
  CheckCircle2,
  Wallet,
  Key,
  Loader2
} from 'lucide-react'
import { isAddress } from 'viem'

interface WalletData {
  address: string
  private_key: string
}

interface ImportedWallet {
  address: string
  privateKey: string
  addressLowercase: string
  selected: boolean
  showPrivateKey: boolean
}

interface BulkWalletImportProps {
  onImport: (wallets: ImportedWallet[]) => void
  onCancel: () => void
}

export function BulkWalletImport({ onImport, onCancel }: BulkWalletImportProps) {
  const [importedWallets, setImportedWallets] = useState<ImportedWallet[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [showSecurityWarning, setShowSecurityWarning] = useState(true)
  const [isValidating, setIsValidating] = useState(false)

  const handleFileUpload = useCallback(async (file: File) => {
    setError(null)
    setIsValidating(true)

    try {
      const text = await file.text()
      let data: WalletData[]
      
      try {
        data = JSON.parse(text)
      } catch {
        throw new Error('Invalid JSON format')
      }

      // Validate structure
      if (!Array.isArray(data)) {
        throw new Error('JSON must be an array of wallet objects')
      }

      if (data.length === 0) {
        throw new Error('JSON file is empty')
      }

      if (data.length > 1000) {
        throw new Error('Too many wallets. Maximum 1000 wallets allowed')
      }

      // Validate and process each wallet
      const processedWallets: ImportedWallet[] = []
      const seenAddresses = new Set<string>()

      for (let i = 0; i < data.length; i++) {
        const wallet = data[i]
        
        if (!wallet.address || !wallet.private_key) {
          throw new Error(`Wallet at index ${i} is missing address or private_key`)
        }

        if (!isAddress(wallet.address)) {
          throw new Error(`Invalid address at index ${i}: ${wallet.address}`)
        }

        if (!wallet.private_key.match(/^0x[a-fA-F0-9]{64}$/)) {
          throw new Error(`Invalid private key format at index ${i}`)
        }

        const addressLower = wallet.address.toLowerCase()
        if (seenAddresses.has(addressLower)) {
          throw new Error(`Duplicate address found: ${wallet.address}`)
        }
        seenAddresses.add(addressLower)

        processedWallets.push({
          address: wallet.address,
          privateKey: wallet.private_key,
          addressLowercase: addressLower,
          selected: true,
          showPrivateKey: false
        })
      }

      setImportedWallets(processedWallets)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process file')
    } finally {
      setIsValidating(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const file = e.dataTransfer.files[0]
    if (file && file.type === 'application/json') {
      handleFileUpload(file)
    } else {
      setError('Please upload a JSON file')
    }
  }, [handleFileUpload])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileUpload(file)
    }
  }, [handleFileUpload])

  const toggleWalletSelection = (index: number) => {
    setImportedWallets(prev => prev.map((w, i) => 
      i === index ? { ...w, selected: !w.selected } : w
    ))
  }

  const toggleAllSelection = () => {
    const allSelected = importedWallets.every(w => w.selected)
    setImportedWallets(prev => prev.map(w => ({ ...w, selected: !allSelected })))
  }

  const togglePrivateKeyVisibility = (index: number) => {
    setImportedWallets(prev => prev.map((w, i) => 
      i === index ? { ...w, showPrivateKey: !w.showPrivateKey } : w
    ))
  }

  const selectedCount = importedWallets.filter(w => w.selected).length

  const handleProceed = () => {
    const selectedWallets = importedWallets.filter(w => w.selected)
    if (selectedWallets.length === 0) {
      setError('Please select at least one wallet')
      return
    }
    onImport(selectedWallets)
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Upload className="h-5 w-5 text-primary" />
          </div>
          Bulk Wallet Import
        </h2>
        <p className="text-sm text-muted-foreground">
          Import multiple wallets from a JSON file for batch key generation
        </p>
      </div>

      <div className="space-y-4">
        {showSecurityWarning && (
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Shield className="h-4 w-4 text-amber-500" />
              </div>
              <div className="flex-1 space-y-3">
                <h3 className="font-medium text-sm">Security Warning</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="block w-1 h-1 rounded-full bg-current mt-1.5 shrink-0"></span>
                    <span>Only import wallets you trust and own</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="block w-1 h-1 rounded-full bg-current mt-1.5 shrink-0"></span>
                    <span>Private keys will be used to sign transactions automatically</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="block w-1 h-1 rounded-full bg-current mt-1.5 shrink-0"></span>
                    <span>Keys are only stored in memory during this session</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="block w-1 h-1 rounded-full bg-current mt-1.5 shrink-0"></span>
                    <span>Use this feature in a secure environment</span>
                  </li>
                </ul>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowSecurityWarning(false)}
                  className="w-full sm:w-auto"
                >
                  I understand the risks
                </Button>
              </div>
            </div>
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {importedWallets.length === 0 ? (
          <div
            className={`relative rounded-xl border-2 border-dashed p-12 text-center transition-all ${
              isDragging 
                ? 'border-primary bg-primary/5 scale-[1.02]' 
                : 'border-muted-foreground/20 hover:border-muted-foreground/40 bg-muted/30'
            }`}
            onDragOver={(e) => {
              e.preventDefault()
              setIsDragging(true)
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
          >
            <div className="mx-auto w-fit p-3 rounded-xl bg-muted/50 mb-4">
              <FileJson className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-base font-medium mb-2">
              Drop your JSON file here or click to browse
            </h3>
            <p className="text-sm text-muted-foreground mb-6 font-mono">
              Expected format: [{"{"} "address": "0x...", "private_key": "0x..." {"}"}]
            </p>
            <input
              type="file"
              accept="application/json"
              onChange={handleFileSelect}
              className="hidden"
              id="file-upload"
              disabled={isValidating}
            />
            <label htmlFor="file-upload">
              <Button 
                variant="outline" 
                size="default"
                className="cursor-pointer"
                disabled={isValidating}
                asChild
              >
                <span>
                  {isValidating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Validating...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Select JSON File
                    </>
                  )}
                </span>
              </Button>
            </label>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">
                  {importedWallets.length} wallets imported
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleAllSelection}
                >
                  {selectedCount === importedWallets.length ? 'Deselect All' : 'Select All'}
                </Button>
                <Badge variant="secondary">
                  {selectedCount} selected
                </Badge>
              </div>
            </div>

            <div className="rounded-xl border bg-muted/20 p-1">
              <div className="max-h-[400px] overflow-y-auto p-3 space-y-2">
                {importedWallets.map((wallet, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-background/60 transition-colors group"
                  >
                    <Checkbox
                      checked={wallet.selected}
                      onCheckedChange={() => toggleWalletSelection(index)}
                      className="mt-1"
                    />
                    <div className="flex-1 space-y-2 min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="p-1 rounded bg-muted">
                          <Wallet className="h-3 w-3 text-muted-foreground" />
                        </div>
                        <span className="font-mono text-sm">
                          {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="p-1 rounded bg-muted">
                          <Key className="h-3 w-3 text-muted-foreground" />
                        </div>
                        <span className="font-mono text-xs text-muted-foreground truncate flex-1">
                          {wallet.showPrivateKey 
                            ? wallet.privateKey 
                            : '••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••'}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => togglePrivateKeyVisibility(index)}
                        >
                          {wallet.showPrivateKey ? (
                            <EyeOff className="h-3.5 w-3.5" />
                          ) : (
                            <Eye className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={onCancel}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleProceed}
                disabled={selectedCount === 0}
                className="flex-1"
              >
                Proceed with {selectedCount} wallet{selectedCount !== 1 ? 's' : ''}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}