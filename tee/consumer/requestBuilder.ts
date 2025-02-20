import { ApiKeyEncryption } from './apiKeyEncryption';
import { ethers } from 'ethers';

export class RequestBuilder {
    private apiKeyEncryption: ApiKeyEncryption;

    constructor(oracleTeePublicKey: string) {
        console.log("Initializing with TEE public key:", oracleTeePublicKey.slice(0, 50) + "...");
        this.apiKeyEncryption = new ApiKeyEncryption(oracleTeePublicKey);
    }

    async buildEncryptedRequest(
        apiKey: string,
        apiEndpoint: string,
        parameters: string
    ): Promise<{
        encryptedData: string;
        requestMetadata: string;
        requestHash: string;
    }> {
        console.log("RequestBuilder - Pre-encryption inputs:", {
            apiKeyLength: apiKey.length,
            endpointLength: apiEndpoint.length,
            parametersLength: parameters.length
        });

        const { encryptedData, requestMetadata } = 
            await this.apiKeyEncryption.encryptApiKey(
                apiKey,
                apiEndpoint,
                parameters
            );

        console.log("RequestBuilder - Post-encryption:", {
            encryptedHex: encryptedData.slice(0, 50),
            metadataHex: requestMetadata.slice(0, 50)
        });

        return {
            encryptedData: "0x" + Buffer.from(encryptedData, 'base64').toString('hex'),
            requestMetadata,
            requestHash: ethers.keccak256(
                ethers.concat([
                    Buffer.from(encryptedData, 'base64'),
                    ethers.toUtf8Bytes(requestMetadata)
                ])
            )
        };
    }
}
