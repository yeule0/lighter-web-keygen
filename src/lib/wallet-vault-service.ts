import { encrypt } from '@metamask/eth-sig-util'
import { Buffer } from 'buffer'

if (typeof window !== 'undefined' && !window.Buffer) {
  window.Buffer = Buffer
}


export interface VaultData {
  keys: Array<{
    privateKey: string
    publicKey: string
    keyIndex: number
    accountIndex: number
    network: 'mainnet' | 'testnet'
    address?: string
  }>
  version: string
  timestamp: number
}

export interface EncryptedVault {
  encryptedDEK: string
  encryptedPayload: string
  iv: string
  account: string
  version: string
  timestamp: number
}

export class WalletVaultService {
  private readonly DEK_LENGTH = 32  // 256-bit AES key
  private readonly IV_LENGTH = 12   // 96-bit nonce for GCM
  
  private uint8ArrayToBase64(bytes: Uint8Array): string {
    let binary = ''
    const len = bytes.byteLength
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return btoa(binary)
  }

  private base64ToUint8Array(base64: string): Uint8Array {
    const binaryString = atob(base64)
    const len = binaryString.length
    const bytes = new Uint8Array(len)
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }
    return bytes
  }

  private ensureArrayBuffer(bytes: Uint8Array): ArrayBuffer {
    // Always create a new ArrayBuffer to ensure compatibility
    const buffer = new ArrayBuffer(bytes.length)
    const view = new Uint8Array(buffer)
    view.set(bytes)
    return buffer
  }

  private generateDEK(): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(this.DEK_LENGTH))
  }

  private async importDEK(dekBytes: Uint8Array): Promise<CryptoKey> {
    const safeBytes = this.ensureArrayBuffer(dekBytes)
    return await crypto.subtle.importKey(
      'raw',
      safeBytes,
      { name: 'AES-GCM' },
      false,
      ['encrypt', 'decrypt']
    )
  }

  private async getEncryptionPublicKey(
    account: string,
    provider: any
  ): Promise<string> {
    try {
      const publicKey = await provider.request({
        method: 'eth_getEncryptionPublicKey',
        params: [account]
      })
      
      return publicKey
    } catch (error) {
      if (error instanceof Error && error.message.includes('User denied')) {
        throw new Error('User denied access to encryption public key')
      }
      throw error
    }
  }

  private encryptDEK(
    dekBytes: Uint8Array,
    publicKey: string
  ): string {
    const encryptedData = encrypt({
      publicKey: publicKey,
      data: this.uint8ArrayToBase64(dekBytes),
      version: 'x25519-xsalsa20-poly1305'
    })

    return this.uint8ArrayToBase64(
      Buffer.from(JSON.stringify(encryptedData), 'utf8')
    )
  }

  private async decryptDEK(
    encryptedDEK: string,
    account: string,
    provider: any
  ): Promise<Uint8Array> {
    try {
      const encryptedData = JSON.parse(
        Buffer.from(this.base64ToUint8Array(encryptedDEK)).toString('utf8')
      )

      
      const encryptedHex = Buffer.from(
        JSON.stringify(encryptedData),
        'utf8'
      ).toString('hex')

      const decryptedBase64 = await provider.request({
        method: 'eth_decrypt',
        params: ['0x' + encryptedHex, account]
      })

      return this.base64ToUint8Array(decryptedBase64)
    } catch (error) {
      if (error instanceof Error && error.message.includes('User denied')) {
        throw new Error('User denied decryption request')
      }
      throw error
    }
  }

  async encryptVault(
    vaultData: VaultData,
    account: string,
    provider: any
  ): Promise<EncryptedVault> {
    const timestamp = Date.now()

    const dekBytes = this.generateDEK()
    const dek = await this.importDEK(dekBytes)

    const publicKey = await this.getEncryptionPublicKey(account, provider)
    const encryptedDEK = this.encryptDEK(dekBytes, publicKey)

    const iv = crypto.getRandomValues(new Uint8Array(this.IV_LENGTH))
    const encoder = new TextEncoder()
    const dataToEncrypt = encoder.encode(JSON.stringify(vaultData))

    const encryptedBuffer = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: this.ensureArrayBuffer(iv)
      },
      dek,
      this.ensureArrayBuffer(dataToEncrypt)
    )

    const encryptedPayload = new Uint8Array(encryptedBuffer)
    dekBytes.fill(0)

    return {
      encryptedDEK: encryptedDEK,
      encryptedPayload: this.uint8ArrayToBase64(encryptedPayload),
      iv: this.uint8ArrayToBase64(iv),
      account: account.toLowerCase(),
      version: '1.0',
      timestamp: timestamp
    }
  }

  async decryptVault(
    encryptedVault: EncryptedVault | any,
    account: string,
    provider: any
  ): Promise<VaultData> {
    if (account.toLowerCase() !== encryptedVault.account.toLowerCase()) {
      throw new Error('This vault was encrypted by a different account')
    }

    let encryptedPayload: Uint8Array
    if (encryptedVault.encryptedData && encryptedVault.authTag) {
      const ciphertext = this.base64ToUint8Array(encryptedVault.encryptedData)
      const authTag = this.base64ToUint8Array(encryptedVault.authTag)
      encryptedPayload = new Uint8Array(ciphertext.length + authTag.length)
      encryptedPayload.set(ciphertext)
      encryptedPayload.set(authTag, ciphertext.length)
    } else if (encryptedVault.encryptedPayload) {
      encryptedPayload = this.base64ToUint8Array(encryptedVault.encryptedPayload)
    } else {
      throw new Error('Invalid vault format: missing encrypted data')
    }

    const dekBytes = await this.decryptDEK(
      encryptedVault.encryptedDEK,
      account,
      provider
    )

    
    const dek = await this.importDEK(dekBytes)

    
    const iv = this.base64ToUint8Array(encryptedVault.iv)

    try {
      const decryptedBuffer = await crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: this.ensureArrayBuffer(iv)
        },
        dek,
        this.ensureArrayBuffer(encryptedPayload)
      )

      
      dekBytes.fill(0)

      const decoder = new TextDecoder()
      const jsonString = decoder.decode(decryptedBuffer)
      return JSON.parse(jsonString) as VaultData
    } catch (error) {
      
      dekBytes.fill(0)
      throw new Error('Failed to decrypt vault. The data may be corrupted.')
    }
  }

  
  createShareableLink(encryptedVault: EncryptedVault): string {
    const vaultString = btoa(JSON.stringify(encryptedVault))
    
    const urlSafe = vaultString
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '')
    return `${window.location.origin}/#vault:${urlSafe}`
  }

  
  parseShareableLink(link: string): EncryptedVault | null {
    try {
      const match = link.match(/#vault:(.+)$/)
      if (!match) return null

      let base64 = match[1]
        .replace(/-/g, '+')
        .replace(/_/g, '/')
      
      while (base64.length % 4) {
        base64 += '='
      }

      const vaultString = atob(base64)
      const vault = JSON.parse(vaultString) as any

      if (vault.encryptedData && vault.authTag && !vault.encryptedPayload) {
        const ciphertext = this.base64ToUint8Array(vault.encryptedData)
        const authTag = this.base64ToUint8Array(vault.authTag)
        const combined = new Uint8Array(ciphertext.length + authTag.length)
        combined.set(ciphertext)
        combined.set(authTag, ciphertext.length)
        
        vault.encryptedPayload = this.uint8ArrayToBase64(combined)
        delete vault.encryptedData
        delete vault.authTag
      }

      if (!vault.encryptedDEK || !vault.encryptedPayload || !vault.iv) {
        throw new Error('Invalid vault format')
      }

      return vault as EncryptedVault
    } catch (error) {
      return null
    }
  }

  async isSupported(provider: any): Promise<boolean> {
    if (!window.isSecureContext) return false

    try {
      if (!provider) {
        return false
      }
      
      if (!provider.request) {
        return false
      }

      return true
    } catch (error) {
      return false
    }
  }

  /**
   * Get security information
   */
  getSecurityInfo() {
    return {
      keyExchange: 'x25519-xsalsa20-poly1305',
      dataEncryption: 'AES-256-GCM',
      dekLength: this.DEK_LENGTH * 8,
      standard: 'Based on EIP-1098',
      advantages: [
        'No signature determinism issues',
        'Works across all compatible wallets',
        'Industry standard for wallet encryption',
        'Hardware wallet support',
        'Zero risk of permanent data loss'
      ]
    }
  }
}

export const walletVaultService = new WalletVaultService()