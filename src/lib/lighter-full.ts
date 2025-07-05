declare global {
  interface Window {
    Go: any;
    lighterWASM: {
      generateApiKey: () => { privateKey: string; publicKey: string; error?: string };
      setCurrentKey: (privateKey: string) => { success: boolean; publicKey?: string; error?: string };
      signChangePubKey: (params: any) => { transaction: any; messageToSign: string; error?: string };
      getDefaultKey: (seed: string) => { privateKey: string; publicKey: string; error?: string };
      createAuthToken: (params: { deadline: number; accountIndex: number; apiKeyIndex: number }) => { authToken: string; error?: string };
    };
  }
}

export class LighterFullCrypto {
  private static instance: LighterFullCrypto | null = null
  private static wasmLoaded = false
  
  static async initialize(): Promise<LighterFullCrypto> {
    if (!LighterFullCrypto.instance) {
      LighterFullCrypto.instance = new LighterFullCrypto()
      
      if (!LighterFullCrypto.wasmLoaded) {
        if (!window.Go) {
          const script = document.createElement('script');
          script.src = '/wasm_exec.js';
          document.head.appendChild(script);
          
          await new Promise((resolve, reject) => {
            script.onload = resolve;
            script.onerror = reject;
          });
        }
        
        const go = new window.Go();
        const result = await WebAssembly.instantiateStreaming(
          fetch('/lighter_full.wasm'),
          go.importObject
        );
        
        go.run(result.instance);
        LighterFullCrypto.wasmLoaded = true;
        
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    return LighterFullCrypto.instance
  }

  async generateApiKey(): Promise<{ privateKey: string; publicKey: string }> {
    const result = window.lighterWASM.generateApiKey();
    if (result.error) {
      throw new Error(result.error);
    }
    
    return {
      privateKey: '0x' + result.privateKey,
      publicKey: '0x' + result.publicKey
    };
  }

  async setCurrentKey(privateKey: string): Promise<string> {
    const result = window.lighterWASM.setCurrentKey(privateKey.replace('0x', ''));
    if (result.error) {
      throw new Error(result.error);
    }
    
    return '0x' + result.publicKey;
  }

  async signChangePubKey(params: {
    newPubkey: string;
    newPrivkey: string;
    accountIndex: number;
    apiKeyIndex: number;
    nonce: number;
    expiredAt: number;
    chainId: number;
  }): Promise<{ transaction: any; messageToSign: string }> {
    const result = window.lighterWASM.signChangePubKey({
      newPubkey: params.newPubkey.replace('0x', ''),
      newPrivkey: params.newPrivkey.replace('0x', ''),
      accountIndex: params.accountIndex,
      apiKeyIndex: params.apiKeyIndex,
      nonce: params.nonce,
      expiredAt: params.expiredAt,
      chainId: params.chainId
    });
    
    if (result.error) {
      throw new Error(result.error);
    }
    
    return {
      transaction: result.transaction,
      messageToSign: result.messageToSign
    };
  }

  async getDefaultKey(): Promise<{ privateKey: string; publicKey: string }> {
    // Generate a cryptographically secure random seed (256 bits / 32 bytes)
    const randomBytes = new Uint8Array(32);
    crypto.getRandomValues(randomBytes);
    
    // Convert to hex string for use as seed
    const seed = Array.from(randomBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    const result = window.lighterWASM.getDefaultKey(seed);
    if (result.error) {
      throw new Error(result.error);
    }
    
    return {
      privateKey: '0x' + result.privateKey,
      publicKey: '0x' + result.publicKey
    };
  }

  async createAuthToken(params: { 
    deadline: number; 
    accountIndex: number; 
    apiKeyIndex: number;
  }): Promise<string> {
    const result = window.lighterWASM.createAuthToken(params);
    if (result.error) {
      throw new Error(result.error);
    }
    
    return result.authToken;
  }
}