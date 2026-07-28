import type { LayoutProps } from './types'

declare module 'hono' {
  interface ContextRenderer {
    (content: string | Promise<string>, props?: LayoutProps): Response | Promise<Response>
  }
}
