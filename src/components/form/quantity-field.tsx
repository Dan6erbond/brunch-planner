import { MinusIcon, PlusIcon } from 'lucide-react'
import { Button } from '#/components/ui/button'
import { useFieldContext } from '#/lib/forms/form-context'

type QuantityFieldProps = { label: string; min?: number; max: number }

export function QuantityField({ label, min = 0, max }: QuantityFieldProps) {
  const field = useFieldContext<number>()
  const value = field.state.value
  return (
    <div className="flex shrink-0 items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="icon-lg"
        aria-label={`Fewer ${label}`}
        disabled={value <= min}
        onClick={() => {
          field.handleChange(value - 1)
        }}
      >
        <MinusIcon />
      </Button>
      <output
        aria-label={`${label} quantity`}
        className="w-6 text-center text-lg font-medium tabular-nums"
      >
        {value}
      </output>
      <Button
        type="button"
        variant="outline"
        size="icon-lg"
        aria-label={`More ${label}`}
        disabled={value >= max}
        onClick={() => {
          field.handleChange(value + 1)
        }}
      >
        <PlusIcon />
      </Button>
    </div>
  )
}
