export interface EnclaveInterface {
    processEncryptedRequest(encryptedData: string): Promise<{
        result: string;
        attestation: string;
    }>;
    
    verifyAttestation(attestation: string): boolean;
    rotateKeys(): Promise<void>;
    getPublicKey(): string;
}

export interface AttestationData {
    timestamp: number;
    requestId: string;
    result: string;
    enclaveId: string;
}

export interface EncryptedRequest {
    apiKey: string;
    endpoint: string;
    parameters: string;
    timestamp: number;
}
