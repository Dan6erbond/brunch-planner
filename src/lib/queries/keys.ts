export const menuKeys = {
  all: ['menus'] as const,
  lists: () => [...menuKeys.all, 'list'] as const,
  list: (userId: string) => [...menuKeys.lists(), userId] as const,
  detail: (id: string) => [...menuKeys.all, 'detail', id] as const,
  collaborators: (id: string) =>
    [...menuKeys.detail(id), 'collaborators'] as const,
  role: (id: string) => [...menuKeys.detail(id), 'role'] as const,
}

export const brunchKeys = {
  all: ['brunches'] as const,
  lists: () => [...brunchKeys.all, 'list'] as const,
  list: (userId: string) => [...brunchKeys.lists(), userId] as const,
  detail: (id: string) => [...brunchKeys.all, 'detail', id] as const,
  responses: (id: string) => [...brunchKeys.detail(id), 'responses'] as const,
  dateOptions: (id: string) =>
    [...brunchKeys.detail(id), 'date-options'] as const,
  collaborators: (id: string) =>
    [...brunchKeys.detail(id), 'collaborators'] as const,
  role: (id: string) => [...brunchKeys.detail(id), 'role'] as const,
  shoppingChecks: (id: string) =>
    [...brunchKeys.detail(id), 'shopping-checks'] as const,
}

export const inviteKeys = {
  all: ['invites'] as const,
  detail: (brunchId: string, responseId?: string) =>
    [...inviteKeys.all, 'detail', brunchId, responseId ?? null] as const,
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
