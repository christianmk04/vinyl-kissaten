// Interaction registry: maps THREE object uuid → handler callback.
// InteractionRaycaster fires the handler when the player presses E / clicks / taps.

type InteractionHandler = () => void

const registry = new Map<string, InteractionHandler>()
const labels = new Map<string, string>()

export const interactions = {
  register(uuid: string, label: string, handler: InteractionHandler) {
    registry.set(uuid, handler)
    labels.set(uuid, label)
  },
  unregister(uuid: string) {
    registry.delete(uuid)
    labels.delete(uuid)
  },
  fire(uuid: string) {
    registry.get(uuid)?.()
  },
  getLabel(uuid: string): string {
    return labels.get(uuid) ?? ''
  },
  has(uuid: string): boolean {
    return registry.has(uuid)
  },
}
