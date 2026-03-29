export interface PaginationState {
  page: number
  limit: number
  total: number
  pages: number
}

export const DEFAULT_PAGINATION: PaginationState = {
  page: 1,
  limit: 10,
  total: 0,
  pages: 0,
}
