import { useCallback, useEffect, useReducer, useRef } from 'react'
import { toast } from 'sonner'
import { useAuth } from '@/features/auth'
import {
  fetchNextScenario,
  finishSession,
  getOrCreateSession,
  saveReflection as saveReflectionApi,
  submitAttempt,
} from '../api/game-service'
import type {
  AttemptRecord,
  GamePhase,
  GameScenario,
  GameSession,
  ReflectionInput,
} from '../types'

type State = {
  phase: GamePhase
  session: GameSession | null
  scenario: GameScenario | null
  selectedChoiceId: string | null
  attempt: AttemptRecord | null
  playedIds: string[]
  completedCount: number
  error: string | null
}

type Action =
  | { type: 'INIT' }
  | { type: 'SCENARIO'; session: GameSession; scenario: GameScenario }
  | { type: 'EMPTY'; session: GameSession }
  | { type: 'SELECT'; choiceId: string }
  | { type: 'SUBMIT_START' }
  | { type: 'REVEALED'; attempt: AttemptRecord }
  | { type: 'SUBMIT_REVERT' }
  | { type: 'LOADING_NEXT' }
  | { type: 'FINISHING' }
  | { type: 'SUMMARY' }
  | { type: 'ERROR'; error: string }

const initialState: State = {
  phase: 'initializing',
  session: null,
  scenario: null,
  selectedChoiceId: null,
  attempt: null,
  playedIds: [],
  completedCount: 0,
  error: null,
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'INIT':
      return { ...initialState, phase: 'initializing' }
    case 'SCENARIO':
      return {
        ...state,
        phase: 'deciding',
        session: action.session,
        scenario: action.scenario,
        selectedChoiceId: null,
        attempt: null,
        error: null,
      }
    case 'EMPTY':
      return { ...state, phase: 'empty', session: action.session }
    case 'SELECT':
      return state.phase === 'deciding'
        ? { ...state, selectedChoiceId: action.choiceId }
        : state
    case 'SUBMIT_START':
      return { ...state, phase: 'submitting' }
    case 'REVEALED':
      return {
        ...state,
        phase: 'revealed',
        attempt: action.attempt,
        completedCount: state.completedCount + 1,
        playedIds: state.scenario
          ? [...state.playedIds, state.scenario.id]
          : state.playedIds,
      }
    case 'SUBMIT_REVERT':
      return { ...state, phase: 'deciding' }
    case 'LOADING_NEXT':
      return { ...state, phase: 'loadingNext' }
    case 'FINISHING':
      return { ...state, phase: 'finishing' }
    case 'SUMMARY':
      return { ...state, phase: 'summary' }
    case 'ERROR':
      return { ...state, phase: 'error', error: action.error }
    default:
      return state
  }
}

/**
 * Orchestrates a single play session: session lifecycle, scenario progression,
 * immutable attempt + reflection writes, and the phase state machine. All UI
 * reads from the returned `state`; all side effects live here (business logic
 * separated from presentation, per the feature-first architecture).
 */
export function useGameSession() {
  const { user } = useAuth()
  const [state, dispatch] = useReducer(reducer, initialState)

  // Mirror state + timing in refs so async actions read fresh values without
  // re-creating callbacks on every state change.
  const stateRef = useRef(state)
  stateRef.current = state
  const shownAtRef = useRef(0)

  const loadNext = useCallback(
    async (session: GameSession, playedIds: string[]) => {
      const res = await fetchNextScenario(playedIds)
      if (res.error) {
        dispatch({ type: 'ERROR', error: res.error })
        return
      }
      if (!res.data) {
        dispatch({ type: 'EMPTY', session })
        return
      }
      shownAtRef.current = Date.now()
      dispatch({ type: 'SCENARIO', session, scenario: res.data })
    },
    [],
  )

  const init = useCallback(async () => {
    dispatch({ type: 'INIT' })
    const playerId = user?.id
    if (!playerId) {
      dispatch({ type: 'ERROR', error: 'You need to be signed in to play.' })
      return
    }
    const session = await getOrCreateSession(playerId)
    if (session.error || !session.data) {
      dispatch({
        type: 'ERROR',
        error: session.error ?? 'We couldn’t start a session just now.',
      })
      return
    }
    await loadNext(session.data, [])
  }, [user?.id, loadNext])

  // Run once on mount. The ref guards against StrictMode's double-invoke
  // creating a duplicate session; explicit retry/playAgain call init() directly.
  const startedRef = useRef(false)
  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true
    void init()
  }, [init])

  const select = useCallback((choiceId: string) => {
    dispatch({ type: 'SELECT', choiceId })
  }, [])

  const submit = useCallback(async () => {
    const { session, scenario, selectedChoiceId } = stateRef.current
    const playerId = user?.id
    if (!session || !scenario || !selectedChoiceId || !playerId) return

    const choice = scenario.choices.find((c) => c.id === selectedChoiceId)
    if (!choice) return

    dispatch({ type: 'SUBMIT_START' })
    const res = await submitAttempt({
      sessionId: session.id,
      playerId,
      scenarioId: scenario.id,
      choice,
      responseTimeMs: Date.now() - shownAtRef.current,
    })

    if (res.error || !res.data) {
      dispatch({ type: 'SUBMIT_REVERT' })
      toast.error(res.error ?? 'That didn’t save — give it another go.')
      return
    }
    dispatch({ type: 'REVEALED', attempt: res.data })
  }, [user?.id])

  const saveReflection = useCallback(
    async (input: ReflectionInput): Promise<{ error: string | null }> => {
      const { attempt } = stateRef.current
      const playerId = user?.id
      if (!attempt || !playerId) {
        return { error: 'Your reflection couldn’t be saved just now.' }
      }
      return saveReflectionApi({ attemptId: attempt.id, playerId, input })
    },
    [user?.id],
  )

  const next = useCallback(async () => {
    const { session, playedIds } = stateRef.current
    if (!session) return
    dispatch({ type: 'LOADING_NEXT' })
    await loadNext(session, playedIds)
  }, [loadNext])

  const finish = useCallback(async () => {
    const { session, completedCount } = stateRef.current
    if (!session) {
      dispatch({ type: 'SUMMARY' })
      return
    }
    dispatch({ type: 'FINISHING' })
    const { error } = await finishSession(session.id, completedCount)
    if (error) toast.error(error)
    dispatch({ type: 'SUMMARY' })
  }, [])

  const retry = useCallback(() => {
    void init()
  }, [init])

  return { state, select, submit, saveReflection, next, finish, retry }
}
