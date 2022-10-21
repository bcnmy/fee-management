export interface IDBService<T> {
  connect(): void
  close(): void
  getClient(): T
}
