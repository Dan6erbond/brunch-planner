export const authKeys = {
  all: ['auth'] as const,
  session: () => [...authKeys.all, 'session'] as const,
}

export const profileKeys = {
  all: ['profiles'] as const,
  me: () => [...profileKeys.all, 'me'] as const,
}
