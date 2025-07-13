import { privateKeyToAccount } from 'viem/accounts'
import { createWalletClient, http, Account } from 'viem'
import { mainnet } from 'viem/chains'

export class PrivateKeySigner {
  private account: Account
  private client: any

  constructor(privateKey: string) {
    this.account = privateKeyToAccount(privateKey as `0x${string}`)
    
    
    this.client = createWalletClient({
      account: this.account,
      chain: mainnet,
      transport: http()
    })
  }

  get address(): string {
    return this.account.address
  }

  async signMessage(message: string): Promise<string> {
    return await this.client.signMessage({
      account: this.account,
      message: message
    })
  }

  async signTypedData(domain: any, types: any, value: any): Promise<string> {
    return await this.client.signTypedData({
      account: this.account,
      domain,
      primaryType: Object.keys(types).find(key => key !== 'EIP712Domain') || '',
      types,
      message: value
    })
  }

  
  verifyAddress(expectedAddress: string): boolean {
    return this.address.toLowerCase() === expectedAddress.toLowerCase()
  }
}