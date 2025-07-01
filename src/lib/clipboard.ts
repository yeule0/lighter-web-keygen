import { toast } from '@/hooks/use-toast'

export function copyToClipboard(text: string, label: string) {
  navigator.clipboard.writeText(text)
  toast({
    title: "Copied!",
    description: `${label} copied to clipboard`,
  })
}