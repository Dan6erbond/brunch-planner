import { useId } from 'react'
import { Checkbox } from '#/components/ui/checkbox'
import { Field, FieldLegend } from '#/components/ui/field'
import { Label } from '#/components/ui/label'
import { useFieldContext } from '#/lib/forms/form-context'

type CheckboxGroupFieldProps = {
  label: string
  options: { value: string; label: string }[]
}

export function CheckboxGroupField({
  label,
  options,
}: CheckboxGroupFieldProps) {
  const field = useFieldContext<string[]>()
  const baseId = useId()
  return (
    <Field>
      <FieldLegend variant="label" className="mb-0">
        {label}
      </FieldLegend>
      <div className="grid gap-3">
        {options.map((option) => {
          const id = `${baseId}-${option.value}`
          const checked = field.state.value.includes(option.value)
          return (
            <Label
              key={option.value}
              htmlFor={id}
              className="min-h-12 rounded-lg border px-3 py-2 has-data-checked:border-primary"
            >
              <Checkbox
                id={id}
                checked={checked}
                onCheckedChange={(next) => {
                  field.handleChange(
                    next
                      ? [...field.state.value, option.value]
                      : field.state.value.filter(
                          (value) => value !== option.value,
                        ),
                  )
                }}
              />
              {option.label}
            </Label>
          )
        })}
      </div>
    </Field>
  )
}
