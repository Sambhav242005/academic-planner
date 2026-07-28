'use client'

import { useRef, KeyboardEvent, ClipboardEvent } from 'react'

interface OtpInputProps {
  value: string
  onChange: (value: string) => void
  onComplete?: (value: string) => void
  disabled?: boolean
}

export function OtpInput({ value, onChange, onComplete, disabled }: OtpInputProps) {
  const refs = useRef<(HTMLInputElement | null)[]>([])

  function handleInput(index: number, char: string) {
    if (!/^\d$/.test(char)) return
    const next = value.slice(0, index) + char + value.slice(index, 5)
    const trimmed = next.slice(0, 6)
    onChange(trimmed)
    if (index < 5 && trimmed[index]) refs.current[index + 1]?.focus()
    if (trimmed.length === 6) onComplete?.(trimmed)
  }

  function handleKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace') {
      e.preventDefault()
      if (value[index]) {
        onChange(value.slice(0, index) + value.slice(index + 1))
      }
      if (index > 0 && !value[index]) refs.current[index - 1]?.focus()
    } else if (e.key === 'ArrowLeft' && index > 0) {
      refs.current[index - 1]?.focus()
    } else if (e.key === 'ArrowRight' && index < 5) {
      refs.current[index + 1]?.focus()
    }
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!pasted) return
    onChange(pasted)
    if (pasted.length === 6) {
      onComplete?.(pasted)
    } else {
      refs.current[pasted.length]?.focus()
    }
  }

  return (
    <div className="flex gap-2 justify-center">
      {Array.from({ length: 6 }, (_, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el
          }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[i] ?? ''}
          onChange={(e) => handleInput(i, e.target.value.replace(/\D/g, ''))}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={i === 0 ? handlePaste : undefined}
          disabled={disabled}
          autoFocus={i === 0}
          aria-label={`Digit ${i + 1}`}
          className="w-12 h-14 text-center text-2xl font-semibold rounded-xl border border-border bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all disabled:opacity-50"
        />
      ))}
    </div>
  )
}
