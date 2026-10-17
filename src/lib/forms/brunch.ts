import { formOptions } from '@tanstack/react-form'
import { brunchSchema, type BrunchInput } from '#/lib/schemas/brunch'

const brunchDefaults: BrunchInput = {
  title: '',
  menuId: '',
  startsAt: '',
  location: '',
  description: '',
  inviteOnly: false,
}

export const brunchFormOptions = formOptions({
  defaultValues: brunchDefaults,
  validators: { onChange: brunchSchema },
})
