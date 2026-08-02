'use client'

import { cn } from '@/lib/utils'
import { Check } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const PRESET_COLORS = [
  { value: '#3b82f6', label: 'Blue' },
  { value: '#6366f1', label: 'Indigo' },
  { value: '#8b5cf6', label: 'Violet' },
  { value: '#d946ef', label: 'Fuchsia' },
  { value: '#ec4899', label: 'Pink' },
  { value: '#f43f5e', label: 'Rose' },
  { value: '#ef4444', label: 'Red' },
  { value: '#f97316', label: 'Orange' },
  { value: '#f59e0b', label: 'Amber' },
  { value: '#84cc16', label: 'Lime' },
  { value: '#22c55e', label: 'Green' },
  { value: '#10b981', label: 'Emerald' },
  { value: '#14b8a6', label: 'Teal' },
  { value: '#06b6d4', label: 'Cyan' },
  { value: '#0ea5e9', label: 'Sky' },
  { value: '#64748b', label: 'Slate' },
]

interface ColorPickerProps {
  value: string
  onChange: (color: string) => void
}

export function ColorPicker({ value, onChange }: ColorPickerProps) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 gap-2" role="radiogroup" aria-label="Pick a preset color">
        {PRESET_COLORS.map((color) => {
        const selected = value === color.value
        return (
          <button
            key={color.value}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={`${color.label} subject color`}
            title={color.label}
            className={cn(
              'h-10 w-10 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              selected && 'ring-2 ring-offset-2 ring-offset-background'
            )}
            style={{ backgroundColor: color.value, '--tw-ring-color': color.value } as React.CSSProperties}
            onClick={() => onChange(color.value)}
          >
            {selected && (
              <Check className="mx-auto h-4 w-4 text-white" />
            )}
          </button>
        )
        })}
      </div>
      <div className="flex items-center gap-3">
        <Label htmlFor="subject-custom-color" className="text-xs text-muted-foreground">Custom colour</Label>
        <Input
          id="subject-custom-color"
          type="color"
          value={/^#[0-9a-f]{6}$/i.test(value) ? value : '#3b82f6'}
          onChange={(event) => onChange(event.target.value.toLowerCase())}
          aria-label="Choose a custom subject colour"
          className="h-9 w-14 cursor-pointer p-1"
        />
        <code className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">{value.toUpperCase()}</code>
      </div>
    </div>
  )
}

export { PRESET_COLORS }
