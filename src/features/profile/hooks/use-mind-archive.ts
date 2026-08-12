import { useCallback, useEffect, useRef, useState } from 'react'

import { useAuth } from '@/features/auth'

import { fetchArchiveRecord } from '../api/archive-service'
import type { ArchiveLoad } from '../types'

/**
 * Loads the archive once per mount.
 *
 * Deliberately the same shape as `useObservatory`: one read, three states, no
 * polling and no realtime subscription. The archive only changes as a result of
 * play, and play happens on another route — so arriving is always the refresh,
 * and a live socket would be spend without a payoff.
 *
 * Retry is exposed rather than automatic. A failed read here loses nothing, and
 * a button that plainly works beats a spinner that silently retries.
 */
export function useMindArchive(): ArchiveLoad & { retry: () => void } {
  const { user } = useAuth()
  const [load, setLoad] = useState<ArchiveLoad>({ status: 'loading' })

  // Guards a resolved read from landing after unmount or after a newer one.
  const requestRef = useRef(0)

  const run = useCallback(async () => {
    const playerId = user?.id
    if (!playerId) return

    const request = requestRef.current + 1
    requestRef.current = request
    setLoad({ status: 'loading' })

    const result = await fetchArchiveRecord(playerId)
    if (requestRef.current !== request) return

    setLoad(
      result.data
        ? { status: 'ready', record: result.data }
        : { status: 'failed', message: result.error },
    )
  }, [user?.id])

  useEffect(() => {
    void run()
    return () => {
      requestRef.current += 1
    }
  }, [run])

  const retry = useCallback(() => {
    void run()
  }, [run])

  return { ...load, retry }
}
