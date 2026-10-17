import { formOptions } from '@tanstack/react-form'
import {
  loginSchema,
  registerSchema,
  type LoginInput,
  type RegisterInput,
} from '#/lib/schemas/auth'

const loginDefaults: LoginInput = { email: '', password: '' }
const registerDefaults: RegisterInput = {
  displayName: '',
  email: '',
  password: '',
}

export const loginFormOptions = formOptions({
  defaultValues: loginDefaults,
  validators: { onChange: loginSchema },
})

export const registerFormOptions = formOptions({
  defaultValues: registerDefaults,
  validators: { onChange: registerSchema },
})
