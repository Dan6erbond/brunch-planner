import { useId } from 'react'
import { Field, FieldError, FieldLabel } from '#/components/ui/field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { useFieldContext } from '#/lib/forms/form-context'
import { cn } from '#/lib/utils'

type SelectFieldProps = {
  label: string
  hideLabel?: boolean
  placeholder: string
  options: ReadonlyArray<{ value: string; label: string }>
  clearLabel?: string
}

export function SelectField({
  label,
  hideLabel,
  placeholder,
  options,
  clearLabel,
}: SelectFieldProps) {
  const field = useFieldContext<string>()
  const id = useId()
  const invalid = field.state.meta.isTouched && !field.state.meta.isValid
  const current = field.state.value
  const items =
    current && !options.some((option) => option.value === current)
      ? [...options, { value: current, label: current }]
      : options
  return (
    <Field data-invalid={invalid}>
      <FieldLabel htmlFor={id} className={cn(hideLabel && 'sr-only')}>
        {label}
      </FieldLabel>
      <Select
        name={field.name}
        items={items}
        value={current || null}
        onValueChange={(value) => {
          field.handleChange(value ?? '')
        }}
      >
        <SelectTrigger
          id={id}
          className="w-full"
          aria-invalid={invalid}
          onBlur={field.handleBlur}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent alignItemWithTrigger={false}>
          {clearLabel && current && (
            <SelectItem value={null}>{clearLabel}</SelectItem>
          )}
          {items.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {invalid && <FieldError errors={field.state.meta.errors} />}
    </Field>
  )
}
