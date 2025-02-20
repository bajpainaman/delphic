import { TeeKeyManager } from '../enclave/KeyManager';
import { SecureProcessor } from '../enclave/secureProcessor';

export class EnclaveManager {
    private static instance: EnclaveManager;
    private keyManager: TeeKeyManager;
    private secureProcessor: SecureProcessor;
    private lastRotation: number;
    private readonly ROTATION_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours

    private constructor() {
        this.keyManager = TeeKeyManager.initialize();
        this.secureProcessor = new SecureProcessor();
        this.lastRotation = Date.now();
    }

    static getInstance(): EnclaveManager {
        if (!EnclaveManager.instance) {
            EnclaveManager.instance = new EnclaveManager();
        }
        return EnclaveManager.instance;
    }

    async processRequest(encryptedData: string): Promise<{
        result: string;
        attestation: string;
    }> {
        await this.checkAndRotateKeys();
        return this.secureProcessor.processEncryptedRequest(encryptedData);
    }

    private async checkAndRotateKeys(): Promise<void> {
        const now = Date.now();
        if (now - this.lastRotation >= this.ROTATION_INTERVAL) {
            await this.rotateKeys();
        }
    }

    private async rotateKeys(): Promise<void> {
        this.keyManager = TeeKeyManager.initialize();
        this.lastRotation = Date.now();
        // TODO: Update oracle registry with new public key
    }

    getPublicKey(): string {
        return this.keyManager.getPublicKey();
    }
}
