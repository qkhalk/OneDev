import type { ITempMailProvider } from './base'
import { HangoutProvider } from './hangout'
import { TwoB4dProvider } from './twob4d'
import { PROVIDERS } from './types'

export { HangoutProvider, TwoB4dProvider, PROVIDERS }
export type { ITempMailProvider }

const providers: Record<string, ITempMailProvider> = {
  hangout: new HangoutProvider(),
  '2b4d': new TwoB4dProvider(),
}

export function getProvider(id: string): ITempMailProvider {
  const provider = providers[id]
  if (!provider) throw new Error(`Unknown provider: ${id}`)
  return provider
}

export function listProviders() {
  return PROVIDERS
}
