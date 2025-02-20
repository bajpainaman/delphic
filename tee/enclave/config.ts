export const enclaveConfig = {
    ENCLAVE_FILE: "enclave.signed.so",
    ENCLAVE_HEAP_SIZE: "4G",
    MAX_THREADS: 4,
    STACK_MAX_SIZE: "4M",
    KEY_ROTATION_INTERVAL: 24 * 60 * 60 * 1000, // 24 hours
    ATTESTATION_TYPE: "EPID", // or "DCAP"
    ENCLAVE_MODE: "RELEASE",
    API_TIMEOUT: 5000, // 5 seconds
    MAX_RETRIES: 3
};

export const teeSecurityConfig = {
    MIN_KEY_SIZE: 4096,
    HASH_ALGORITHM: "SHA-256",
    ENCRYPTION_ALGORITHM: "RSA-OAEP",
    SIGNATURE_ALGORITHM: "RSASSA-PSS"
};
