import React, { useState, useEffect } from 'react';
import { decryptSharedEntryPayload, SharedEntryData } from '../utils/entrySharingEngine';
import { Shield, Lock, Unlock, Key, Calendar, Tag, Clock, AlertTriangle, CheckCircle2, X, Printer, Share2 } from 'lucide-react';

interface SharedEntryViewerModalProps {
  encodedData: string | null;
  onClose: () => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

export const SharedEntryViewerModal: React.FC<SharedEntryViewerModalProps> = ({
  encodedData,
  onClose,
  showToast,
}) => {
  const [passphrase, setPassphrase] = useState('');
  const [decryptedEntry, setDecryptedEntry] = useState<SharedEntryData | null>(null);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [hasPassphrase, setHasPassphrase] = useState(false);
  const [isExpired, setIsExpired] = useState(false);
  const [expiresAtDate, setExpiresAtDate] = useState<string | null>(null);

  useEffect(() => {
    if (!encodedData) return;

    try {
      // Preliminary envelope inspection
      const jsonStr = (typeof atob !== 'undefined')
        ? decodeURIComponent(escape(atob(encodedData)))
        : Buffer.from(encodedData, 'base64').toString('utf8');

      const envelope = JSON.parse(jsonStr);

      if (envelope.expiresAt) {
        setExpiresAtDate(new Date(envelope.expiresAt).toLocaleString());
        if (Date.now() > envelope.expiresAt) {
          setIsExpired(true);
          return;
        }
      }

      setHasPassphrase(!!envelope.hasPassphrase);

      // If open link without passphrase, decrypt immediately
      if (!envelope.hasPassphrase) {
        handleDecrypt('');
      }
    } catch (err: any) {
      setErrorMsg('Invalid or corrupted shared reflection link.');
    }
  }, [encodedData]);

  const handleDecrypt = async (customPass: string) => {
    if (!encodedData) return;
    setIsDecrypting(true);
    setErrorMsg(null);

    try {
      const entry = await decryptSharedEntryPayload(encodedData, customPass);
      setDecryptedEntry(entry);
      showToast('🔓 Reflection decrypted successfully!', 'success');
    } catch (err: any) {
      setErrorMsg('Decryption failed. Please check your security passphrase.');
      showToast('Incorrect passphrase or corrupted ciphertext.', 'error');
    } finally {
      setIsDecrypting(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passphrase.trim()) {
      setErrorMsg('Please enter the security passphrase.');
      return;
    }
    handleDecrypt(passphrase.trim());
  };

  if (!encodedData) return null;

  return (
    <div className="modal-backdrop" style={{ zIndex: 1200 }} onClick={onClose}>
      <div
        className="modal-content"
        style={{
          maxWidth: '580px',
          width: '92%',
          padding: '28px',
          borderRadius: '20px',
          boxShadow: 'var(--shadow-elevated)',
          border: '1px solid var(--border)',
          background: 'var(--bg-main)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Section */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: 'rgba(59, 130, 246, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Shield className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>
                {decryptedEntry ? 'Encrypted Reflection' : 'Sovereign Shared Reflection'}
              </h2>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                Authenticated AES-GCM-256 • Nexus Mind Vault
              </p>
            </div>
          </div>
          <button
            type="button"
            className="btn-secondary"
            onClick={onClose}
            style={{ borderRadius: '50%', padding: '6px' }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Expired Link Notice */}
        {isExpired && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '12px',
            padding: '16px',
            textAlign: 'center',
            marginBottom: '16px',
          }}>
            <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-2" />
            <h4 style={{ margin: '0 0 4px', fontSize: '15px', color: 'var(--accent-rose)', fontWeight: 600 }}>Link Expired</h4>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
              This encrypted reflection expired on {expiresAtDate || 'the specified date'} and cannot be accessed.
            </p>
          </div>
        )}

        {/* Passphrase Prompt (When entry not yet decrypted) */}
        {!isExpired && !decryptedEntry && (
          <div>
            <div style={{
              background: 'var(--bg-sidebar)',
              padding: '16px',
              borderRadius: '12px',
              border: '1px solid var(--border)',
              marginBottom: '20px',
            }}>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                {hasPassphrase
                  ? '🔒 This reflection is protected with a custom security passphrase. Enter it below to derive the AES-GCM-256 decryption key.'
                  : '⏳ Deriving cryptographic key and decrypting payload...'}
              </p>
            </div>

            {hasPassphrase && (
              <form onSubmit={handleFormSubmit}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>
                    Security Passphrase
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="password"
                      autoFocus
                      className="input-field"
                      placeholder="Enter passphrase..."
                      value={passphrase}
                      onChange={(e) => setPassphrase(e.target.value)}
                      style={{ width: '100%', padding: '12px 14px 12px 38px', fontSize: '14px', borderRadius: '10px' }}
                    />
                    <Key className="w-4 h-4 text-muted" style={{ position: 'absolute', left: '12px', top: '14px' }} />
                  </div>
                  {errorMsg && (
                    <span style={{ display: 'block', marginTop: '6px', fontSize: '12px', color: 'var(--accent-rose)', fontWeight: 500 }}>
                      {errorMsg}
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                  <button type="button" className="btn btn-secondary" onClick={onClose}>
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={isDecrypting}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Unlock className="w-4 h-4" />
                    <span>{isDecrypting ? 'Decrypting...' : 'Decrypt Reflection'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Decrypted Entry View */}
        {decryptedEntry && (
          <div>
            <div style={{
              background: 'var(--surface-hover)',
              padding: '16px 20px',
              borderRadius: '14px',
              border: '1px solid var(--border)',
              marginBottom: '16px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-pill)',
                  background: 'rgba(59, 130, 246, 0.1)',
                  color: 'var(--accent-blue-light)',
                }}>
                  {decryptedEntry.mood || 'Reflection'}
                </span>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Calendar className="w-3.5 h-3.5" />
                  {decryptedEntry.createdAt ? new Date(decryptedEntry.createdAt).toLocaleDateString() : 'Shared Entry'}
                </span>
              </div>

              <h3 style={{ margin: '0 0 12px', fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
                {decryptedEntry.title || 'Untitled Reflection'}
              </h3>

              <div style={{
                fontSize: '14px',
                color: 'var(--text-primary)',
                lineHeight: 1.6,
                whiteSpace: 'pre-wrap',
                maxHeight: '300px',
                overflowY: 'auto',
                paddingRight: '6px',
              }}>
                {decryptedEntry.content}
              </div>

              {decryptedEntry.tags && decryptedEntry.tags.length > 0 && (
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '14px' }}>
                  {decryptedEntry.tags.map((t) => (
                    <span
                      key={t}
                      style={{
                        fontSize: '11px',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        background: 'var(--bg-main)',
                        border: '1px solid var(--border)',
                        color: 'var(--text-secondary)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3px',
                      }}
                    >
                      <Tag className="w-3 h-3" /> {t}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
              <span style={{ fontSize: '11px', color: 'var(--accent-emerald)', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 500 }}>
                <CheckCircle2 className="w-3.5 h-3.5" /> End-to-End Cryptographically Verified
              </span>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ fontSize: '12px', padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  onClick={() => window.print()}
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print</span>
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ fontSize: '12px', padding: '6px 16px' }}
                  onClick={onClose}
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
