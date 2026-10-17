import { createFormHook } from '@tanstack/react-form'
import { DateTimeField } from '#/components/form/date-time-field'
import { CheckboxGroupField } from '#/components/form/checkbox-group-field'
import { QuantityField } from '#/components/form/quantity-field'
import { RadioGroupField } from '#/components/form/radio-group-field'
import { SelectField } from '#/components/form/select-field'
import { SubmitButton } from '#/components/form/submit-button'
import { SwitchField } from '#/components/form/switch-field'
import { TextareaField } from '#/components/form/textarea-field'
import { TextField } from '#/components/form/text-field'
import { fieldContext, formContext } from './form-context'

export const { useAppForm, withFieldGroup } = createFormHook({
  fieldContext,
  formContext,
  fieldComponents: {
    TextField,
    TextareaField,
    SwitchField,
    SelectField,
    DateTimeField,
    RadioGroupField,
    CheckboxGroupField,
    QuantityField,
  },
  formComponents: { SubmitButton },
})
