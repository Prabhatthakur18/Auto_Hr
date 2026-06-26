import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

export type DropdownOption = {
  value: string;
  label: string;
  description?: string;
};

interface DropdownSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: DropdownOption[];
  placeholder: string;
  disabled?: boolean;
  variant?: 'form' | 'filter' | 'filterCompact';
  className?: string;
  leadingIcon?: React.ReactNode;
}

export const DropdownSelect: React.FC<DropdownSelectProps> = ({
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
  variant = 'form',
  className = '',
  leadingIcon,
}) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const selectedOption = useMemo(
    () => options.find(option => option.value === value),
    [options, value]
  );

  useEffect(() => {
    const onDocumentMouseDown = (event: MouseEvent) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const onDocumentKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', onDocumentMouseDown);
    document.addEventListener('keydown', onDocumentKeyDown);

    return () => {
      document.removeEventListener('mousedown', onDocumentMouseDown);
      document.removeEventListener('keydown', onDocumentKeyDown);
    };
  }, []);

  useEffect(() => {
    if (disabled) {
      setOpen(false);
    }
  }, [disabled]);

  const buttonBase =
    variant === 'filter'
      ? 'min-h-[48px] rounded-[26px] border border-orange-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-800 shadow-sm hover:border-brand-orange/40 hover:shadow-md hover:shadow-orange-200/20'
      : variant === 'filterCompact'
      ? 'min-h-[44px] rounded-2xl border border-orange-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 shadow-sm hover:border-brand-orange/40 hover:shadow-md hover:shadow-orange-200/20'
      : 'min-h-[48px] rounded-xl border border-orange-100 bg-white px-3.5 py-2.5 text-sm text-slate-800 shadow-sm hover:border-brand-orange/40';

  const buttonState = disabled
    ? 'cursor-not-allowed bg-slate-50 text-slate-400'
    : 'cursor-pointer';

  const menuBase =
    variant === 'filter'
      ? 'mt-2 rounded-[22px] border border-orange-200 bg-white shadow-2xl shadow-orange-200/20'
      : variant === 'filterCompact'
      ? 'mt-2 rounded-2xl border border-orange-200 bg-white shadow-2xl shadow-orange-200/20'
      : 'mt-2 rounded-2xl border border-orange-100 bg-white shadow-2xl shadow-orange-200/20';

  const itemBase =
    variant === 'filter'
      ? 'px-4 py-3 text-sm'
      : 'px-4 py-3 text-sm';

  return (
    <div ref={rootRef} className={`relative w-full ${className}`}>
      <button
        type="button"
        onClick={() => {
          if (!disabled) setOpen(prev => !prev);
        }}
        disabled={disabled}
        aria-expanded={open}
        className={`flex w-full items-center justify-between gap-3 text-left transition-all ${buttonBase} ${buttonState}`}
      >
        <span className="flex min-w-0 items-center gap-2">
          {leadingIcon && <span className="flex-shrink-0 text-slate-400">{leadingIcon}</span>}
          <span className={`truncate ${selectedOption ? 'font-semibold text-slate-800' : 'text-slate-400 font-semibold'}`}>
            {selectedOption?.label ?? placeholder}
          </span>
        </span>
        <ChevronDown className={`h-4 w-4 flex-shrink-0 transition-transform ${open ? 'rotate-180 text-[#f46617]' : 'text-slate-400'}`} />
      </button>

      {open && !disabled && (
        <div className={`absolute left-0 top-full z-50 w-full overflow-hidden ${menuBase}`}>
          <div className="max-h-72 overflow-auto p-1">
            {options.map(option => {
              const isSelected = option.value === value;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={`flex w-full flex-col items-start rounded-xl text-left transition-colors ${itemBase} ${
                    isSelected
                      ? 'bg-[#f46617] text-white shadow-sm'
                      : 'text-slate-700 hover:bg-orange-50'
                  }`}
                >
                  <span className={isSelected ? 'font-bold' : 'font-medium'}>{option.label}</span>
                  {option.description && (
                    <span className={`mt-0.5 text-[10px] ${isSelected ? 'text-white/80' : 'text-slate-400'}`}>
                      {option.description}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
