import { LighterFullCrypto } from './lighter-full'

export type AccountTier = 'standard' | 'premium'

export interface AccountInfo {
  accountIndex: number
  apiKeyIndex: number
  privateKey: string
  network?: 'mainnet' | 'testnet'
}

export interface TierSwitchRequirements {
  canSwitch: boolean
  reason?: string
  requirements: {
    noOpenPositions: boolean
    noOpenOrders: boolean
    timeSinceLastChange: boolean
  }
}

export class AccountService {
  private static DEFAULT_AUTH_EXPIRY = 10 * 60 * 1000 // 10 minutes in milliseconds
  
  // Get current tier from localStorage
  static getCurrentTier(network: 'mainnet' | 'testnet', accountIndex: number): AccountTier {
    const key = `lighter_tier_${network}_${accountIndex}`
    const stored = localStorage.getItem(key)
    
    if (stored) {
      try {
        const data = JSON.parse(stored)
        // Check if data is recent (within 30 days)
        if (data.timestamp && Date.now() - data.timestamp < 30 * 24 * 60 * 60 * 1000) {
          return data.tier as AccountTier
        }
      } catch {
       
      }
    }
    
    // Default to standard tier
    return 'standard'
  }
  
  // Save current tier to localStorage
  static saveTierInfo(network: 'mainnet' | 'testnet', accountIndex: number, tier: AccountTier): void {
    const key = `lighter_tier_${network}_${accountIndex}`
    localStorage.setItem(key, JSON.stringify({
      tier,
      timestamp: Date.now()
    }))
  }
  
  static async switchTier(
    accountInfo: AccountInfo,
    newTier: AccountTier
  ): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      // Initialize crypto
      const crypto = await LighterFullCrypto.initialize()
      
      // Set the current key
      await crypto.setCurrentKey(accountInfo.privateKey)
      
      // Create auth token with 10 minute expiry
      const deadline = Math.floor((Date.now() + this.DEFAULT_AUTH_EXPIRY) / 1000)
      const authToken = await crypto.createAuthToken({
        deadline,
        accountIndex: accountInfo.accountIndex,
        apiKeyIndex: accountInfo.apiKeyIndex
      })
      
      // Determine base URL based on network
      const baseUrl = accountInfo.network === 'mainnet' 
        ? 'https://mainnet.zklighter.elliot.ai'
        : 'https://testnet.zklighter.elliot.ai'
      
      // Make API request to change tier
      const response = await fetch(`${baseUrl}/api/v1/changeAccountTier`, {
        method: 'POST',
        headers: {
          'Authorization': authToken,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          account_index: accountInfo.accountIndex.toString(),
          new_tier: newTier
        })
      })
      
      const data = await response.json()
      
      if (response.status !== 200) {
        // Parse error message for specific requirements
        const errorMessage = data.error || data.message || 'Failed to switch tier'
        
        // Check for specific error conditions
        if (errorMessage.includes('open positions')) {
          return {
            success: false,
            message: 'Cannot switch tier: You have open positions. Please close all positions before switching.',
            data
          }
        }
        
        if (errorMessage.includes('open orders')) {
          return {
            success: false,
            message: 'Cannot switch tier: You have open orders. Please cancel all orders before switching.',
            data
          }
        }
        
        if (errorMessage.includes('3 hours') || errorMessage.includes('time')) {
          return {
            success: false,
            message: 'Cannot switch tier: You must wait at least 3 hours since your last tier change.',
            data
          }
        }
        
        if (errorMessage.includes('already has this tier') || 
            errorMessage.includes('ineligible for changing tiers')) {
          return {
            success: false,
            message: `ineligible for changing tiers: account already has this tier`,
            data
          }
        }
        
        return {
          success: false,
          message: errorMessage,
          data
        }
      }
      
      // Save only the tier change time on success
      AccountService.saveLastTierChangeTime()
      
      return {
        success: true,
        message: `Successfully switched to ${newTier} tier`,
        data
      }
    } catch (error) {
      // Error handled by throwing
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }
  
  static async checkSwitchRequirements(
    accountInfo: AccountInfo
  ): Promise<TierSwitchRequirements> {
    try {
      // Initialize crypto
      const crypto = await LighterFullCrypto.initialize()
      
      // Set the current key
      await crypto.setCurrentKey(accountInfo.privateKey)
      
      // Create auth token
      const deadline = Math.floor((Date.now() + this.DEFAULT_AUTH_EXPIRY) / 1000)
      await crypto.createAuthToken({
        deadline,
        accountIndex: accountInfo.accountIndex,
        apiKeyIndex: accountInfo.apiKeyIndex
      })
      
  
      return {
        canSwitch: true,
        requirements: {
          noOpenPositions: true,
          noOpenOrders: true,
          timeSinceLastChange: true
        }
      }
    } catch (error) {
      return {
        canSwitch: false,
        reason: error instanceof Error ? error.message : 'Failed to check requirements',
        requirements: {
          noOpenPositions: false,
          noOpenOrders: false,
          timeSinceLastChange: false
        }
      }
    }
  }
  
  // Store only the last tier change time 
  static saveLastTierChangeTime(): void {
    localStorage.setItem('lighter_last_tier_change', Date.now().toString())
  }
  
  static getLastTierChangeTime(): number | null {
    const stored = localStorage.getItem('lighter_last_tier_change')
    if (!stored) return null
    
    try {
      return parseInt(stored, 10)
    } catch {
      return null
    }
  }
  
  static canSwitchBasedOnTime(): { canSwitch: boolean; timeRemaining?: number } {
    const lastChange = this.getLastTierChangeTime()
    if (!lastChange) return { canSwitch: true }
    
    const threeHours = 3 * 60 * 60 * 1000 
    const timeSinceLastChange = Date.now() - lastChange
    
    if (timeSinceLastChange >= threeHours) {
      return { canSwitch: true }
    }
    
    return {
      canSwitch: false,
      timeRemaining: threeHours - timeSinceLastChange
    }
  }
}