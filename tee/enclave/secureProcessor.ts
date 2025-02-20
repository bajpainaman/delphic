import { TeeKeyManager } from './KeyManager';
import axios from 'axios';
import { privateDecrypt, constants, createDecipheriv } from 'crypto';

export class SecureProcessor {
    private keyManager: TeeKeyManager;

    constructor() {
        this.keyManager = TeeKeyManager.initialize();
    }

    async processEncryptedRequest(encryptedData: string): Promise<{
        result: string;
        attestation: string;
    }> {
        try {
            // Decode base64 input
            const buffer = Buffer.from(encryptedData, 'base64');
            
            // Extract components
            const encryptedKeyLength = buffer[0];
            const encryptedKey = buffer.slice(1, encryptedKeyLength + 1);
            const encryptedContent = buffer.slice(encryptedKeyLength + 1);

            // Debug logging
            console.log("Decryption details:", {
                totalLength: buffer.length,
                encryptedKeyLength,
                encryptedContentLength: encryptedContent.length
            });

            // Decrypt the key components using RSA-OAEP
            const decryptedKeyComponents = privateDecrypt(
                {
                    key: this.keyManager.getPrivateKey(),
                    padding: constants.RSA_PKCS1_OAEP_PADDING,
                    oaepHash: 'sha256'
                },
                encryptedKey
            );

            // Extract AES components
            const aesKey = decryptedKeyComponents.slice(0, 32);
            const iv = decryptedKeyComponents.slice(32, 48);
            const authTag = decryptedKeyComponents.slice(48);

            // Decrypt the content using AES-GCM
            const decipher = createDecipheriv('aes-256-gcm', aesKey, iv);
            decipher.setAuthTag(authTag);
            
            let decrypted = decipher.update(encryptedContent.toString('base64'), 'base64', 'utf8');
            decrypted += decipher.final('utf8');

            // Parse and process the decrypted data
            const requestData = JSON.parse(decrypted);

            // Make the API call
            const response = await this.makeSecureApiCall(
                requestData.apiEndpoint,
                requestData.apiKey,
                requestData.parameters
            );

            return {
                result: JSON.stringify(response),
                attestation: Buffer.from(JSON.stringify(response)).toString('base64')
            };
        } catch (error: any) {
            console.error("Decryption details:", {
                privateKeyFormat: this.keyManager.getPrivateKey().slice(0, 50) + "...",
                error: error.message,
                stack: error.stack
            });
            throw new Error(`Secure processing failed: ${error.message}`);
        }
    }

    private async makeSecureApiCall(
        apiEndpoint: string,
        apiKey: string,
        parameters: string
    ): Promise<any> {
        const headers = { 'X-API-Key': apiKey };
        const response = await axios.get(apiEndpoint, { headers });
        return response.data;
    }
}
