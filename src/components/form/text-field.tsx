import { useId, type ComponentProps } from 'react'
import { Field, FieldError, FieldLabel } from '#/components/ui/field'
import { Input } from '#/components/ui/input'
import { useFieldContext } from '#/lib/forms/form-context'
import { cn } from '#/lib/utils'

type TextFieldProps = Omit<
  ComponentProps<typeof Input>,
  'id' | 'name' | 'value' | 'onChange'
> & { label: string; hideLabel?: boolean }

export function TextField({
  label,
  hideLabel,
  onBlur,
  ...inputProps
}: TextFieldProps) {
  const field = useFieldContext<string>()
  const id = useId()
  const invalid = field.state.meta.isTouched && !field.state.meta.isValid
  return (
    <Field data-invalid={invalid}>
      <FieldLabel htmlFor={id} className={cn(hideLabel && 'sr-only')}>
        {label}
      </FieldLabel>
      <Input
        id={id}
        name={field.name}
        aria-invalid={invalid}
        value={field.state.value}
        onBlur={(event) => {
          field.handleBlur()
          onBlur?.(event)
        }}
        onChange={(event) => {
          field.handleChange(event.target.value)
        }}
        {...inputProps}
      />
      {invalid && <FieldError errors={field.state.meta.errors} />}
    </Field>
  )
}
