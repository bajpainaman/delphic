import { ethers } from 'ethers';
import { publicEncrypt, constants, createPublicKey, randomBytes, createCipheriv, createDecipheriv } from 'crypto';

export class ApiKeyEncryption {
    constructor(private oracleTeePublicKey: string) {
        // Normalize the public key on construction
        try {
            createPublicKey({
                key: this.oracleTeePublicKey,
                format: 'pem',
                type: 'spki'
            });
        } catch (error) {
            console.error("Invalid public key format:", error);
            throw error;
        }
    }

    async encryptApiKey(
        apiKey: string,
        apiEndpoint: string,
        parameters: string
    ): Promise<{
        encryptedData: string;
        requestMetadata: string;
    }> {
        console.log("ApiKeyEncryption - Raw inputs:", {
            apiKeyLength: apiKey.length,
            endpointLength: apiEndpoint.length,
            parametersLength: parameters.length
        });
        try {
            // Generate a random AES key and IV
            const aesKey = randomBytes(32);
            const iv = randomBytes(16);

            // Package the sensitive data
            const sensitiveData = JSON.stringify({
                apiKey,
                apiEndpoint,
                parameters,
                timestamp: Date.now()
            });

            // Encrypt the data with AES-GCM
            const cipher = createCipheriv('aes-256-gcm', aesKey, iv);
            let encryptedData = cipher.update(sensitiveData, 'utf8', 'base64');
            encryptedData += cipher.final('base64');
            const authTag = cipher.getAuthTag();

            // Combine AES key components
            const keyComponents = Buffer.concat([
                aesKey,
                iv,
                authTag
            ]);

            // Encrypt the AES key components with RSA-OAEP
            const encryptedKeyComponents = publicEncrypt(
                {
                    key: this.oracleTeePublicKey,
                    padding: constants.RSA_PKCS1_OAEP_PADDING,
                    oaepHash: 'sha256'
                },
                keyComponents
            );

            // Format the final encrypted package
            const combinedData = Buffer.concat([
                Buffer.from([encryptedKeyComponents.length]), // Length prefix
                encryptedKeyComponents,
                Buffer.from(encryptedData, 'base64')
            ]);

            // Debug logging
            console.log("Encryption details:", {
                keyComponentsLength: keyComponents.length,
                encryptedKeyLength: encryptedKeyComponents.length,
                encryptedDataLength: encryptedData.length,
                totalLength: combinedData.length
            });

            const finalEncryptedData = combinedData.toString('base64');
            console.log("Encryption details:", {
                originalDataLength: sensitiveData.length,
                encryptedKeyLength: encryptedKeyComponents.length,
                finalLength: finalEncryptedData.length,
                base64Format: finalEncryptedData.slice(0, 50) + '...'
            });

            const requestMetadata = ethers.keccak256(
                ethers.toUtf8Bytes(apiEndpoint + parameters)
            );
            console.log("ApiKeyEncryption - Outputs:", {
                encryptedDataLength: finalEncryptedData.length,
                metadataLength: requestMetadata.length,
                encryptedSample: finalEncryptedData.slice(0, 50),
                metadataSample: requestMetadata.slice(0, 50)
            });

            return {
                encryptedData: finalEncryptedData,
                requestMetadata: requestMetadata
            };
        } catch (error: any) {
            console.error("Encryption error:", error);
            throw new Error(`Encryption failed: ${error.message}`);
        }
    }
}