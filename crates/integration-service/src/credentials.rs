use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Nonce,
};
use base64::{engine::general_purpose, Engine};
use rand::Rng;
use std::sync::Arc;

/// Credential manager for encrypting and decrypting sensitive data
pub struct CredentialManager {
    cipher: Arc<Aes256Gcm>,
}

impl CredentialManager {
    /// Create a new credential manager with a 256-bit key
    pub fn new(key: &[u8; 32]) -> Self {
        let cipher = Aes256Gcm::new(key.into());
        Self {
            cipher: Arc::new(cipher),
        }
    }

    /// Encrypt credentials using AES-256-GCM
    pub fn encrypt(&self, plaintext: &str) -> Result<String, CredentialError> {
        // Generate random nonce
        let mut rng = rand::thread_rng();
        let nonce_bytes: [u8; 12] = rng.gen();
        let nonce = Nonce::from_slice(&nonce_bytes);

        // Encrypt
        let ciphertext = self
            .cipher
            .encrypt(nonce, plaintext.as_bytes())
            .map_err(|_| CredentialError::EncryptionFailed)?;

        // Combine nonce + ciphertext and encode as base64
        let mut result = nonce_bytes.to_vec();
        result.extend_from_slice(&ciphertext);
        Ok(general_purpose::STANDARD.encode(result))
    }

    /// Decrypt credentials
    pub fn decrypt(&self, encrypted: &str) -> Result<String, CredentialError> {
        // Decode from base64
        let data = general_purpose::STANDARD
            .decode(encrypted)
            .map_err(|_| CredentialError::InvalidFormat)?;

        if data.len() < 12 {
            return Err(CredentialError::InvalidFormat);
        }

        // Split nonce and ciphertext
        let (nonce_bytes, ciphertext) = data.split_at(12);
        let nonce = Nonce::from_slice(nonce_bytes);

        // Decrypt
        let plaintext = self
            .cipher
            .decrypt(nonce, ciphertext)
            .map_err(|_| CredentialError::DecryptionFailed)?;

        String::from_utf8(plaintext).map_err(|_| CredentialError::InvalidFormat)
    }

    /// Validate credentials by attempting decryption
    pub fn validate(&self, encrypted: &str) -> bool {
        self.decrypt(encrypted).is_ok()
    }
}

#[derive(Debug, thiserror::Error)]
pub enum CredentialError {
    #[error("Encryption failed")]
    EncryptionFailed,

    #[error("Decryption failed")]
    DecryptionFailed,

    #[error("Invalid credential format")]
    InvalidFormat,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_encrypt_decrypt() {
        let key = [0u8; 32];
        let manager = CredentialManager::new(&key);

        let plaintext = "my-secret-api-key";
        let encrypted = manager.encrypt(plaintext).unwrap();
        let decrypted = manager.decrypt(&encrypted).unwrap();

        assert_eq!(plaintext, decrypted);
    }

    #[test]
    fn test_validate() {
        let key = [0u8; 32];
        let manager = CredentialManager::new(&key);

        let encrypted = manager.encrypt("test").unwrap();
        assert!(manager.validate(&encrypted));
        assert!(!manager.validate("invalid"));
    }
}

