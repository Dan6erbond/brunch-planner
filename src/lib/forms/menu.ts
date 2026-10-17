import { formOptions } from '@tanstack/react-form'
import {
  menuSchema,
  nameSchema,
  optionGroupSchema,
  type MenuInput,
  type NameInput,
  type OptionGroupInput,
} from '#/lib/schemas/menu'

const menuDefaults: MenuInput = { name: '', description: '' }
const nameDefaults: NameInput = { name: '' }
const optionGroupDefaults: OptionGroupInput = { name: '', required: true }

// Items share the menu's name + description shape, so one form serves both.
export const menuFormOptions = formOptions({
  defaultValues: menuDefaults,
  validators: { onChange: menuSchema },
})

export const nameFormOptions = formOptions({
  defaultValues: nameDefaults,
  validators: { onChange: nameSchema },
})

export const optionGroupFormOptions = formOptions({
  defaultValues: optionGroupDefaults,
  validators: { onChange: optionGroupSchema },
})
