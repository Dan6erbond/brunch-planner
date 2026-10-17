export const menuKeys = {
  all: ['menus'] as const,
  list: () => [...menuKeys.all, 'list'] as const,
  detail: (id: string) => [...menuKeys.all, 'detail', id] as const,
}

export const brunchKeys = {
  all: ['brunches'] as const,
  list: () => [...brunchKeys.all, 'list'] as const,
  detail: (id: string) => [...brunchKeys.all, 'detail', id] as const,
}

export const inviteKeys = {
  all: ['invites'] as const,
  detail: (brunchId: string) =>
    [...inviteKeys.all, 'detail', brunchId] as const,
  response: (responseId: string) =>
    [...inviteKeys.all, 'response', responseId] as const,
}

export const authKeys = {
  all: ['auth'] as const,
  session: () => [...authKeys.all, 'session'] as const,
}

export const profileKeys = {
  all: ['profiles'] as const,
  me: () => [...profileKeys.all, 'me'] as const,
}
