import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Eye, EyeOff, Shield, AlertTriangle } from 'lucide-react';

interface MaskedPinInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  disabled?: boolean;
  error?: string;
  showToggle?: boolean;
  label?: string;
  className?: string;
  autoFocus?: boolean;
}

export const MaskedPinInput: React.FC<MaskedPinInputProps> = ({
  length = 6,
  value,
  onChange,
  onComplete,
  disabled = false,
  error,
  showToggle = true,
  label = 'Enter PIN',
  className,
  autoFocus = true,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (autoFocus && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [autoFocus]);

  useEffect(() => {
    // When value changes externally, update focus
    if (value.length < length && inputRefs.current[value.length]) {
      inputRefs.current[value.length]?.focus();
    }
  }, [value, length]);

  const handleInputChange = (index: number, inputValue: string) => {
    if (disabled) return;

    // Only allow digits
    const digit = inputValue.replace(/\D/g, '').slice(-1);
    
    if (digit) {
      const newValue = value.slice(0, index) + digit + value.slice(index + 1);
      const trimmedValue = newValue.slice(0, length);
      onChange(trimmedValue);

      // Move to next input
      if (index < length - 1) {
        inputRefs.current[index + 1]?.focus();
        setFocusedIndex(index + 1);
      }

      // Check if complete
      if (trimmedValue.length === length && onComplete) {
        onComplete(trimmedValue);
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    if (e.key === 'Backspace') {
      e.preventDefault();
      
      if (value[index]) {
        // Clear current digit
        const newValue = value.slice(0, index) + value.slice(index + 1);
        onChange(newValue);
      } else if (index > 0) {
        // Move to previous and clear
        const newValue = value.slice(0, index - 1) + value.slice(index);
        onChange(newValue);
        inputRefs.current[index - 1]?.focus();
        setFocusedIndex(index - 1);
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
      setFocusedIndex(index - 1);
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
      setFocusedIndex(index + 1);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    if (disabled) return;
    
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    
    if (pastedData) {
      onChange(pastedData);
      
      const nextIndex = Math.min(pastedData.length, length - 1);
      inputRefs.current[nextIndex]?.focus();
      setFocusedIndex(nextIndex);

      if (pastedData.length === length && onComplete) {
        onComplete(pastedData);
      }
    }
  };

  const handleFocus = (index: number) => {
    setFocusedIndex(index);
    // Select the input content
    inputRefs.current[index]?.select();
  };

  const getMaskedValue = (index: number): string => {
    if (!value[index]) return '';
    return isVisible ? value[index] : '•';
  };

  return (
    <div className={cn('space-y-3', className)}>
      {/* Label */}
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-200 flex items-center gap-2">
          <Shield className="w-4 h-4 text-cyan-400" />
          {label}
        </label>
        {showToggle && (
          <button
            type="button"
            onClick={() => setIsVisible(!isVisible)}
            className="text-gray-400 hover:text-gray-200 transition-colors p-1 rounded"
            tabIndex={-1}
          >
            {isVisible ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
        )}
      </div>

      {/* PIN Input Grid */}
      <div className="flex gap-2 justify-center">
        {Array.from({ length }).map((_, index) => (
          <div
            key={index}
            className={cn(
              'relative w-12 h-14 rounded-lg transition-all duration-200',
              'bg-gray-800/50 border-2',
              focusedIndex === index && !disabled
                ? 'border-cyan-500 shadow-lg shadow-cyan-500/20'
                : 'border-gray-600',
              error && 'border-red-500',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            <input
              ref={(el) => (inputRefs.current[index] = el)}
              type={isVisible ? 'text' : 'password'}
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={1}
              value={value[index] || ''}
              onChange={(e) => handleInputChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={handlePaste}
              onFocus={() => handleFocus(index)}
              disabled={disabled}
              className={cn(
                'absolute inset-0 w-full h-full text-center text-2xl font-mono',
                'bg-transparent border-none outline-none',
                'text-white placeholder-gray-500',
                'focus:ring-0',
                disabled && 'cursor-not-allowed'
              )}
              autoComplete="off"
              aria-label={`PIN digit ${index + 1}`}
            />
            
            {/* Animated dot indicator */}
            {value[index] && !isVisible && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-3 h-3 bg-cyan-400 rounded-full animate-pulse" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 text-red-400 text-sm">
          <AlertTriangle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Progress Indicator */}
      <div className="flex justify-center gap-1">
        {Array.from({ length }).map((_, index) => (
          <div
            key={index}
            className={cn(
              'w-2 h-2 rounded-full transition-all duration-200',
              index < value.length
                ? 'bg-cyan-400'
                : 'bg-gray-600'
            )}
          />
        ))}
      </div>

      {/* Security Notice */}
      <p className="text-xs text-gray-500 text-center">
        Your PIN is encrypted and never stored in plain text
      </p>
    </div>
  );
};

export default MaskedPinInput;
