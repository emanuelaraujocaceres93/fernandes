declare module "../lib/format" {
  export const formatCurrency: (value: number) => string
  export const formatDate: (date: string) => string
  export const normalizeText: (text: string) => string
}