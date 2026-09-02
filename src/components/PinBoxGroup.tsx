import React, { useRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface PinBoxGroupProps {
  digits: string[];
  onChange: (newDigits: string[]) => void;
  isInvalid?: boolean;
  ariaLabelPrefix?: string;
  disabled?: boolean;
  showEyeToggle?: boolean;
}

export const PinBoxGroup: React.FC<PinBoxGroupProps> = ({
  digits,
  onChange,
  isInvalid = false,
  ariaLabelPrefix = "PIN digit",
  disabled = false,
  showEyeToggle = true,
}) => {
  const [showPin, setShowPin] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleInputChange = (index: number, value: string) => {
    const cleaned = value.replace(/[^0-9]/g, '');
    const newDigits = [...digits];
    newDigits[index] = cleaned ? cleaned[cleaned.length - 1] : '';
    onChange(newDigits);

    if (cleaned && index < 5) {
      inputRefs.current[index + 1]?.focus();
      inputRefs.current[index + 1]?.select();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
      inputRefs.current[index - 1]?.select();
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/[^0-9]/g, '');
    if (!pasted) return;

    const newDigits = [...digits];
    for (let i = 0; i < 6; i++) {
      if (pasted[i]) {
        newDigits[i] = pasted[i];
      }
    }
    onChange(newDigits);

    const nextFocus = Math.min(pasted.length, 5);
    inputRefs.current[nextFocus]?.focus();
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', justifyContent: 'center' }}>
      <div className="pin-box-group">
        {Array.from({ length: 6 }).map((_, idx) => (
          <React.Fragment key={idx}>
            {idx === 3 && (
              <div
                className="pin-box-separator"
                style={{
                  width: '8px',
                  height: '2px',
                  backgroundColor: '#dadce0',
                  borderRadius: '1px',
                  margin: '0 2px',
                  alignSelf: 'center',
                  flexShrink: 0
                }}
                aria-hidden="true"
              />
            )}
            <input
              ref={(el) => { inputRefs.current[idx] = el; }}
              type={showPin ? "text" : "password"}
              maxLength={1}
              inputMode="numeric"
              pattern="[0-9]"
              value={digits[idx] || ''}
              onChange={(e) => handleInputChange(idx, e.target.value)}
              onKeyDown={(e) => handleKeyDown(idx, e)}
              onPaste={handlePaste}
              disabled={disabled}
              className={`pin-box-digit ${isInvalid ? 'is-invalid' : ''}`}
              aria-label={`${ariaLabelPrefix} ${idx + 1}`}
              autoComplete="off"
              required
            />
          </React.Fragment>
        ))}
      </div>

      {showEyeToggle && (
        <button
          type="button"
          onClick={() => setShowPin(!showPin)}
          title={showPin ? "Hide PIN" : "Show PIN"}
          aria-label={showPin ? "Hide PIN digits" : "Show PIN digits"}
          style={{
            background: 'none',
            border: 'none',
            borderRadius: '50%',
            width: '36px',
            height: '36px',
            padding: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#5f6368',
            cursor: 'pointer',
            flexShrink: 0,
            transition: 'all 0.15s ease',
            alignSelf: 'center',
            marginLeft: '4px'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = '#f1f3f4';
            e.currentTarget.style.color = '#1a73e8';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = '#5f6368';
          }}
        >
          {showPin ? <EyeOff size={20} /> : <Eye size={20} />}
        </button>
      )}
    </div>
  );
};
