import { useId } from 'react'
import { Field, FieldLegend } from '#/components/ui/field'
import { Label } from '#/components/ui/label'
import { RadioGroup, RadioGroupItem } from '#/components/ui/radio-group'
import { useFieldContext } from '#/lib/forms/form-context'
import { availabilitySchema, type Availability } from '#/lib/schemas/rsvp'

const options: { value: Availability; label: string }[] = [
  { value: 'yes', label: 'Yes' },
  { value: 'maybe', label: 'Maybe' },
  { value: 'no', label: 'Can’t' },
]

type AvailabilityFieldProps = { label: string; disabled?: boolean }

export function AvailabilityField({ label, disabled }: AvailabilityFieldProps) {
  const field = useFieldContext<Availability>()
  const baseId = useId()
  return (
    <Field>
      <FieldLegend variant="label" className="mb-0">
        {label}
      </FieldLegend>
      <RadioGroup
        name={field.name}
        value={field.state.value}
        disabled={disabled}
        className="grid-cols-3 gap-2"
        onValueChange={(value) => {
          field.handleChange(availabilitySchema.parse(value))
        }}
        onBlur={field.handleBlur}
      >
        {options.map((option) => {
          const id = `${baseId}-${option.value}`
          return (
            <Label
              key={option.value}
              htmlFor={id}
              className="min-h-12 justify-center rounded-lg border px-3 py-2 has-data-checked:border-primary has-data-checked:bg-primary/5"
            >
              <RadioGroupItem id={id} value={option.value} />
              {option.label}
            </Label>
          )
        })}
      </RadioGroup>
    </Field>
  )
}
