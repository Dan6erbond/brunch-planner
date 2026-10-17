import { formOptions } from '@tanstack/react-form'
import { guestSchema, type GuestInput } from '#/lib/schemas/guest'

const guestDefaults: GuestInput = { name: '' }

export const guestFormOptions = formOptions({
  defaultValues: guestDefaults,
  validators: { onChange: guestSchema },
})
