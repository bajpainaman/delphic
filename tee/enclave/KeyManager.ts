import { generateKeyPairSync, privateDecrypt, constants, createPrivateKey, createPublicKey } from 'crypto';

export class TeeKeyManager {
    private static instance: TeeKeyManager;
    private constructor(
        private publicKey: string,
        private privateKey: string
    ) {
        // Validate keys on construction
        this.validateKeys();
    }

    private validateKeys() {
        try {
            // Validate public key
            const pubKey = createPublicKey({
                key: this.publicKey,
                format: 'pem',
                type: 'spki'
            });

            // Validate private key
            const privKey = createPrivateKey({
                key: this.privateKey,
                format: 'pem',
                type: 'pkcs8'
            });

            console.log("Key Validation Success:", {
                publicKeyType: pubKey.type,
                publicKeyAsymmetricType: pubKey.asymmetricKeyType,
                publicKeySize: pubKey.asymmetricKeyDetails?.modulusLength,
                privateKeyType: privKey.type,
                privateKeyAsymmetricType: privKey.asymmetricKeyType,
                privateKeySize: privKey.asymmetricKeyDetails?.modulusLength
            });
        } catch (error) {
            console.error("Key Validation Failed:", error);
            throw error;
        }
    }

    static initialize(): TeeKeyManager {
        if (!TeeKeyManager.instance) {
            console.log("Initializing new TeeKeyManager instance");
            
            // Generate TEE key pair with specific parameters
            const { publicKey, privateKey } = generateKeyPairSync('rsa', {
                modulusLength: 2048,
                publicKeyEncoding: {
                    type: 'spki',
                    format: 'pem'
                },
                privateKeyEncoding: {
                    type: 'pkcs8',
                    format: 'pem'
                }
            });

            // Log generated keys
            console.log("Generated Keys:", {
                publicKeyLength: publicKey.length,
                privateKeyLength: privateKey.length,
                publicKeyStart: publicKey.slice(0, 50),
                privateKeyStart: privateKey.slice(0, 50)
            });

            // Normalize the keys
            const normalizedPublicKey = createPublicKey({
                key: publicKey,
                format: 'pem',
                type: 'spki'
            }).export({
                format: 'pem',
                type: 'spki'
            }).toString();

            const normalizedPrivateKey = createPrivateKey({
                key: privateKey,
                format: 'pem',
                type: 'pkcs8'
            }).export({
                format: 'pem',
                type: 'pkcs8'
            }).toString();

            TeeKeyManager.instance = new TeeKeyManager(
                normalizedPublicKey,
                normalizedPrivateKey
            );
        } else {
            console.log("Reusing existing TeeKeyManager instance");
        }
        return TeeKeyManager.instance;
    }

    getPublicKey(): string {
        return this.publicKey;
    }

    getPrivateKey(): string {
        return this.privateKey;
    }

    decryptData(encryptedData: string): string {
        try {
            console.log("Decrypting data:", {
                dataLength: encryptedData.length,
                privateKeyPresent: !!this.privateKey,
                privateKeyFormat: this.privateKey.slice(0, 50) + '...'
            });

            const buffer = Buffer.from(encryptedData, 'base64');
            const privateKeyObject = createPrivateKey({
                key: this.privateKey,
                format: 'pem',
                type: 'pkcs8'
            });

            const decrypted = privateDecrypt(
                {
                    key: privateKeyObject,
                    padding: constants.RSA_PKCS1_OAEP_PADDING,
                    oaepHash: 'sha256'
                },
                buffer
            );
            return decrypted.toString();
        } catch (error: any) {
            console.error('Decryption error details:', {
                keyFormat: this.privateKey.slice(0, 50) + '...',
                dataLength: encryptedData.length,
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }
}
