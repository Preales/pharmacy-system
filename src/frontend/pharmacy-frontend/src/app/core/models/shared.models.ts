export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;       // matches backend: Page
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}
