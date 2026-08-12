import { useCallback, useEffect, useRef, useState } from 'react'

import { useAuth } from '@/features/auth'

import { fetchObservatoryScene } from '../api/observatory-service'
import type { ObservatoryLoad } from '../types'

/**
 * Loads the observatory scene once per mount.
 *
 * Deliberately plain: one read, three states, no polling and no realtime
 * subscription. Progression only changes as a result of play, and play happens
 * on another route — so the scene is fresh every time the player arrives, and a
 * live socket would be spend without a payoff.
 *
 * The retry is exposed rather than automatic, because a failed read here is not
 * urgent: nothing is lost, and a player staring at a silent spinner is worse
 * than one holding a button that plainly works.
 */
export function useObservatory(): ObservatoryLoad & { retry: () => void } {
  const { user } = useAuth()
  const [load, setLoad] = useState<ObservatoryLoad>({ status: 'loading' })

  // Guards a resolved read from landing after unmount or after a newer one.
  const requestRef = useRef(0)

  const run = useCallback(async () => {
    const playerId = user?.id
    if (!playerId) return

    const request = requestRef.current + 1
    requestRef.current = request
    setLoad({ status: 'loading' })

    const result = await fetchObservatoryScene(playerId)
    if (requestRef.current !== request) return

    setLoad(
      result.data
        ? { status: 'ready', scene: result.data }
        : { status: 'failed', message: result.error },
    )
  }, [user?.id])

  useEffect(() => {
    void run()
    return () => {
      // Invalidate anything in flight so a late response cannot set state.
      requestRef.current += 1
    }
  }, [run])

  const retry = useCallback(() => {
    void run()
  }, [run])

  return { ...load, retry }
}
