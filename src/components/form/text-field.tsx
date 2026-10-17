import type { ComponentProps } from 'react'
import { Field, FieldError, FieldLabel } from '#/components/ui/field'
import { Input } from '#/components/ui/input'
import { useFieldContext } from '#/lib/forms/form-context'

type TextFieldProps = Omit<
  ComponentProps<typeof Input>,
  'id' | 'name' | 'value' | 'onChange' | 'onBlur'
> & { label: string }

export function TextField({ label, ...inputProps }: TextFieldProps) {
  const field = useFieldContext<string>()
  const invalid = field.state.meta.isTouched && !field.state.meta.isValid
  return (
    <Field data-invalid={invalid}>
      <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
      <Input
        id={field.name}
        name={field.name}
        aria-invalid={invalid}
        value={field.state.value}
        onBlur={field.handleBlur}
        onChange={(event) => {
          field.handleChange(event.target.value)
        }}
        {...inputProps}
      />
      {invalid && <FieldError errors={field.state.meta.errors} />}
    </Field>
  )
}
