import { useId } from 'react'
import { Field, FieldError, FieldLegend } from '#/components/ui/field'
import { Label } from '#/components/ui/label'
import { RadioGroup, RadioGroupItem } from '#/components/ui/radio-group'
import { useFieldContext } from '#/lib/forms/form-context'

type RadioGroupFieldProps = {
  label: string
  options: { value: string; label: string }[]
  required?: boolean
}

export function RadioGroupField({
  label,
  options,
  required,
}: RadioGroupFieldProps) {
  const field = useFieldContext<string>()
  const baseId = useId()
  const invalid = field.state.meta.isTouched && !field.state.meta.isValid
  return (
    <Field data-invalid={invalid}>
      <FieldLegend variant="label" className="mb-0">
        {label}
        {required && <span className="text-muted-foreground"> (required)</span>}
      </FieldLegend>
      <RadioGroup
        name={field.name}
        value={field.state.value}
        onValueChange={(value) => {
          field.handleChange(value)
        }}
        onBlur={field.handleBlur}
      >
        {options.map((option) => {
          const id = `${baseId}-${option.value}`
          return (
            <Label
              key={option.value}
              htmlFor={id}
              className="min-h-12 rounded-lg border px-3 py-2 has-data-checked:border-primary"
            >
              <RadioGroupItem id={id} value={option.value} />
              {option.label}
            </Label>
          )
        })}
      </RadioGroup>
      {invalid && <FieldError errors={field.state.meta.errors} />}
    </Field>
  )
}
