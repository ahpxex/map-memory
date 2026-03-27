import { openDB } from 'idb'
import type { ExportSnapshot, PersistedAppData } from '../types/app'

const DB_NAME = 'map-memory'
const STORE_NAME = 'app'
const DATA_KEY = 'persisted-data'

const dbPromise = openDB(DB_NAME, 1, {
  upgrade(database) {
    if (!database.objectStoreNames.contains(STORE_NAME)) {
      database.createObjectStore(STORE_NAME)
    }
  },
})

export async function loadPersistedData() {
  const database = await dbPromise

  return (await database.get(STORE_NAME, DATA_KEY)) as PersistedAppData | undefined
}

export async function savePersistedData(data: PersistedAppData) {
  const database = await dbPromise
  await database.put(STORE_NAME, data, DATA_KEY)
}

export function buildExportSnapshot(data: PersistedAppData): ExportSnapshot {
  return {
    version: 2,
    exportedAt: new Date().toISOString(),
    data,
  }
}

export function downloadSnapshot(filename: string, snapshot: ExportSnapshot) {
  const blob = new Blob([JSON.stringify(snapshot, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = filename
  link.click()

  URL.revokeObjectURL(url)
}
