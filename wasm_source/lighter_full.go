//go:build js && wasm

package main

import (
	"encoding/base64"
	"encoding/hex"
	"fmt"
	"strings"
	"syscall/js"

	"github.com/elliottech/lighter-go/signer"
	"github.com/elliottech/lighter-go/types/txtypes"
	curve "github.com/elliottech/poseidon_crypto/curve/ecgfp5"
	schnorr "github.com/elliottech/poseidon_crypto/signature/schnorr"
)

var currentKeyManager signer.KeyManager

func generateApiKey(this js.Value, args []js.Value) interface{} {
	sk := curve.SampleScalar(nil)
	
	pk := schnorr.SchnorrPkFromSk(sk)
	
	skBytes := sk.ToLittleEndianBytes()
	pkBytes := pk.ToLittleEndianBytes()
	
	return map[string]interface{}{
		"privateKey": hex.EncodeToString(skBytes[:]),
		"publicKey":  hex.EncodeToString(pkBytes[:]),
		"error":      nil,
	}
}

func setCurrentKey(this js.Value, args []js.Value) interface{} {
	if len(args) < 1 {
		return map[string]interface{}{
			"error": "Missing private key",
		}
	}
	
	privateKeyHex := args[0].String()
	privateKeyHex = strings.TrimPrefix(privateKeyHex, "0x")
	
	privateKey, err := hex.DecodeString(privateKeyHex)
	if err != nil {
		return map[string]interface{}{
			"error": fmt.Sprintf("Invalid private key: %v", err),
		}
	}
	
	km, err := signer.NewKeyManager(privateKey)
	if err != nil {
		return map[string]interface{}{
			"error": fmt.Sprintf("Failed to create key manager: %v", err),
		}
	}
	
	currentKeyManager = km
	
	pubKeyBytes := km.PubKeyBytes()
	
	return map[string]interface{}{
		"success": true,
		"publicKey": hex.EncodeToString(pubKeyBytes[:]),
		"error":   nil,
	}
}

func signChangePubKey(this js.Value, args []js.Value) interface{} {
	if len(args) < 1 {
		return map[string]interface{}{
			"error": "Missing parameters",
		}
	}
	
	params := args[0]
	
	newPubkeyHex := params.Get("newPubkey").String()
	newPrivkeyHex := params.Get("newPrivkey").String()
	nonce := int64(params.Get("nonce").Float())
	expiredAt := int64(params.Get("expiredAt").Float())
	accountIndex := int64(params.Get("accountIndex").Float())
	apiKeyIndex := uint8(params.Get("apiKeyIndex").Int())
	chainId := uint32(params.Get("chainId").Int())
	
	newPubkeyHex = strings.TrimPrefix(newPubkeyHex, "0x")
	newPrivkeyHex = strings.TrimPrefix(newPrivkeyHex, "0x")
	
	newPubkeyBytes, err := hex.DecodeString(newPubkeyHex)
	if err != nil {
		return map[string]interface{}{
			"error": fmt.Sprintf("Invalid public key: %v", err),
		}
	}
	
	if len(newPubkeyBytes) != 40 {
		return map[string]interface{}{
			"error": fmt.Sprintf("Public key must be 40 bytes, got %d", len(newPubkeyBytes)),
		}
	}
	
	newPrivkeyBytes, err := hex.DecodeString(newPrivkeyHex)
	if err != nil {
		return map[string]interface{}{
			"error": fmt.Sprintf("Invalid private key: %v", err),
		}
	}
	
	newKeyManager, err := signer.NewKeyManager(newPrivkeyBytes)
	if err != nil {
		return map[string]interface{}{
			"error": fmt.Sprintf("Failed to create key manager for new key: %v", err),
		}
	}
	
	l2TxInfo := txtypes.L2ChangePubKeyTxInfo{
		AccountIndex: accountIndex,
		ApiKeyIndex:  apiKeyIndex,
		Nonce:        nonce,
		PubKey:       newPubkeyBytes,
		ExpiredAt:    expiredAt,
	}
	
	hashedMessage, err := l2TxInfo.Hash(chainId)
	if err != nil {
		return map[string]interface{}{
			"error": fmt.Sprintf("Failed to hash transaction: %v", err),
		}
	}
	
	sig, err := newKeyManager.Sign(hashedMessage, nil)
	if err != nil {
		return map[string]interface{}{
			"error": fmt.Sprintf("Failed to sign: %v", err),
		}
	}
	
	l1Message := l2TxInfo.GetL1SignatureBody()
	
	return map[string]interface{}{
		"transaction": map[string]interface{}{
			"Sig":          base64.StdEncoding.EncodeToString(sig),
			"AccountIndex": accountIndex,
			"ApiKeyIndex":  apiKeyIndex,
			"Nonce":        nonce,
			"PubKey":       base64.StdEncoding.EncodeToString(newPubkeyBytes),
			"ExpiredAt":    expiredAt,
			"MessageToSign": l1Message,
		},
		"messageToSign": l1Message,
		"error":         nil,
	}
}

func getDefaultKey(this js.Value, args []js.Value) interface{} {
	var seed string
	if len(args) > 0 && args[0].Type() == js.TypeString {
		seed = args[0].String()
	} else {
		return map[string]interface{}{
			"error": "Missing seed parameter",
		}
	}
	
	sk := curve.SampleScalar(&seed)
	pk := schnorr.SchnorrPkFromSk(sk)
	
	skBytes := sk.ToLittleEndianBytes()
	pkBytes := pk.ToLittleEndianBytes()
	
	return map[string]interface{}{
		"privateKey": hex.EncodeToString(skBytes[:]),
		"publicKey":  hex.EncodeToString(pkBytes[:]),
		"error": nil,
	}
}

func main() {
	c := make(chan struct{}, 0)
	
	js.Global().Set("lighterWASM", map[string]interface{}{
		"generateApiKey":    js.FuncOf(generateApiKey),
		"setCurrentKey":     js.FuncOf(setCurrentKey),
		"signChangePubKey":  js.FuncOf(signChangePubKey),
		"getDefaultKey":     js.FuncOf(getDefaultKey),
	})
	
	<-c
}