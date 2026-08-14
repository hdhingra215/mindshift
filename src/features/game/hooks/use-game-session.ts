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
import { awardAttemptXp, awardReflectionXp } from '../api/progression-service'
import { fetchInsightWallet, placeWager } from '../api/wager-service'
import { WAGER_REQUIRED_ERROR } from '../api/game-service'
import { canAnswer, canWager, shouldRestartAnswerClock, wagerSettled } from '../lib/wager'
import { requestTwinPrediction } from '@/features/profile'
import type { TwinPrediction } from '@/features/profile'
import type { AchievementUnlock } from '@/features/achievements'
import type {
  AttemptRecord,
  GamePhase,
  GameScenario,
  GameSession,
  InsightWallet,
  ReflectionInput,
  WagerPhase,
  XpAward,
} from '../types'

/** Which act earned an award — the reward strip labels the two differently. */
type AwardKind = 'attempt' | 'reflection'

type State = {
  phase: GamePhase
  session: GameSession | null
  scenario: GameScenario | null
  selectedChoiceId: string | null
  attempt: AttemptRecord | null
  /**
   * The most recent award payload from the server, whichever act produced it.
   * Always carries the freshest totals, so level and session XP read from here.
   */
  award: XpAward | null
  /** XP the current attempt earned; null while the award is still in flight. */
  attemptXp: number | null
  /** Bonus the current reflection earned, once one has been written. */
  reflectionXp: number | null
  /** Running session XP. Survives scenario changes; only the server sets it. */
  sessionXp: number
  /**
   * The Twin's guess about the current scenario, when it had one. Null on most
   * scenarios by design — the server decides when the Twin speaks.
   */
  twinPrediction: TwinPrediction | null
  /**
   * The wager step for the current scenario. `unavailable` until the reserve is
   * read, and it stays `unavailable` if that read fails — the scenario must
   * remain playable when the economy is not.
   */
  wager: WagerPhase
  /** The stake the player has highlighted but not yet committed. */
  selectedStake: number | null
  /**
   * Unlocks still waiting to be revealed, oldest first. One at a time, so two
   * celebratory moments never fire together (InteractionPrinciples §2).
   */
  pendingAchievements: AchievementUnlock[]
  /**
   * Everything unlocked this sitting, kept for the summary. The corner reveal is
   * brief and skippable precisely because this list exists.
   */
  sessionAchievements: AchievementUnlock[]
  playedIds: string[]
  completedCount: number
  error: string | null
}

type Action =
  | { type: 'INIT' }
  | { type: 'SCENARIO'; session: GameSession; scenario: GameScenario }
  | { type: 'EMPTY'; session: GameSession }
  | { type: 'TWIN_PREDICTED'; scenarioId: string; prediction: TwinPrediction }
  | { type: 'WALLET'; scenarioId: string; wallet: InsightWallet }
  /** This deployment has no economy — the only case that may open the answers. */
  | { type: 'WALLET_ABSENT'; scenarioId: string }
  /** The reserve read failed after its retries; the player is offered another. */
  | { type: 'WALLET_UNREADABLE'; scenarioId: string }
  /** Back to square one for this scenario: a retry, or a refused submission. */
  | { type: 'WAGER_RESET'; scenarioId: string }
  | { type: 'STAKE_SELECTED'; stake: number | null }
  | { type: 'WAGER_LOCKING' }
  | { type: 'WAGER_LOCKED'; wagerId: string; stake: number }
  | { type: 'WAGER_REJECTED' }
  | { type: 'SELECT'; choiceId: string }
  | { type: 'SUBMIT_START' }
  | { type: 'REVEALED'; attempt: AttemptRecord }
  | { type: 'AWARDED'; award: XpAward; kind: AwardKind }
  | { type: 'ACHIEVEMENT_SEEN' }
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
  award: null,
  attemptXp: null,
  reflectionXp: null,
  sessionXp: 0,
  twinPrediction: null,
  wager: { status: 'pending', unreadable: false },
  selectedStake: null,
  pendingAchievements: [],
  sessionAchievements: [],
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
        // The per-scenario award clears; session XP is cumulative and stays.
        award: null,
        attemptXp: null,
        reflectionXp: null,
        // Cleared with the scenario: a guess about the last one must never be
        // shown over the next.
        twinPrediction: null,
        // Same for the wager. The reserve is re-read per scenario so the panel
        // always shows a balance the server would actually honour — and until it
        // lands the answers stay shut, because an unread reserve might yet turn
        // out to require a stake.
        wager: { status: 'pending', unreadable: false },
        selectedStake: null,
        error: null,
      }
    case 'EMPTY':
      return { ...state, phase: 'empty', session: action.session }
    case 'WALLET':
      // Guarded on the scenario id, like the Twin: an async read that lands
      // after the player moved on must not reopen a wager on the next scenario.
      // Affordability decides the branch, and the server's own list decides
      // affordability — so `offered` here means the server will require a stake.
      return state.scenario?.id === action.scenarioId && state.wager.status === 'pending'
        ? {
            ...state,
            wager: canWager(action.wallet)
              ? { status: 'offered', wallet: action.wallet }
              : { status: 'skipped', wallet: action.wallet },
          }
        : state
    case 'WALLET_ABSENT':
      return state.scenario?.id === action.scenarioId && state.wager.status === 'pending'
        ? { ...state, wager: { status: 'unavailable' } }
        : state
    case 'WALLET_UNREADABLE':
      // Stays `pending`, so the answers stay shut. Guessing "no balance" here
      // would hand the player a submission the server is going to refuse.
      return state.scenario?.id === action.scenarioId && state.wager.status === 'pending'
        ? { ...state, wager: { status: 'pending', unreadable: true } }
        : state
    case 'WAGER_RESET':
      return state.scenario?.id === action.scenarioId
        ? { ...state, wager: { status: 'pending', unreadable: false }, selectedStake: null }
        : state
    case 'STAKE_SELECTED':
      return state.wager.status === 'offered'
        ? { ...state, selectedStake: action.stake }
        : state
    case 'WAGER_LOCKING':
      return state.wager.status === 'offered' && state.selectedStake !== null
        ? {
            ...state,
            wager: { status: 'locking', wallet: state.wager.wallet, stake: state.selectedStake },
          }
        : state
    case 'WAGER_LOCKED':
      // Terminal for this scenario. There is no action that returns a locked
      // wager to `offered` — changing a stake after commitment is the one thing
      // the mechanic cannot allow.
      return state.wager.status === 'locking'
        ? {
            ...state,
            wager: {
              status: 'locked',
              wallet: state.wager.wallet,
              wager: { wagerId: action.wagerId, stake: action.stake },
            },
          }
        : state
    case 'WAGER_REJECTED':
      return state.wager.status === 'locking'
        ? { ...state, wager: { status: 'offered', wallet: state.wager.wallet }, selectedStake: null }
        : state
    case 'TWIN_PREDICTED':
      // Guarded on the scenario id: the prediction is fetched asynchronously and
      // must be dropped if the player has already moved on.
      return state.scenario?.id === action.scenarioId
        ? { ...state, twinPrediction: action.prediction }
        : state
    case 'SELECT':
      /*
       * The ordering, enforced where it cannot be bypassed. A disabled radio
       * group is a courtesy; this is the rule. An answer selected before the
       * wager settles is dropped on the floor — there is no path from an
       * unsettled wager to a chosen answer.
       */
      return canAnswer(state.phase, state.wager)
        ? { ...state, selectedChoiceId: action.choiceId }
        : state
    case 'SUBMIT_START':
      // Same gate on the commitment itself, so a stale callback or a second
      // caller cannot start a submission the wager step has not released.
      return canAnswer(state.phase, state.wager) && state.selectedChoiceId !== null
        ? { ...state, phase: 'submitting' }
        : state
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
    case 'AWARDED':
      return {
        ...state,
        award: action.award,
        sessionXp: action.award.sessionXp,
        attemptXp:
          action.kind === 'attempt' ? action.award.awarded : state.attemptXp,
        reflectionXp:
          action.kind === 'reflection' ? action.award.awarded : state.reflectionXp,
        // Unlocks are appended, never replaced: a reflection award arriving
        // while the attempt's unlock is still on screen must not drop it.
        pendingAchievements: [...state.pendingAchievements, ...action.award.achievements],
        sessionAchievements: [...state.sessionAchievements, ...action.award.achievements],
      }
    case 'ACHIEVEMENT_SEEN':
      return { ...state, pendingAchievements: state.pendingAchievements.slice(1) }
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

  /*
   * The three outcomes are handled separately and exhaustively. `EMPTY` is
   * reachable from exactly one of them — an exhausted library — so a defect can
   * never again be presented to the player as "nothing to play yet".
   */
  /**
   * Read the reserve for a scenario and settle the wager step from the result.
   *
   * Extracted so the retry offered on a failed read runs exactly the same path
   * as the first attempt. The three outcomes are handled exhaustively: only
   * `absent` may open the answers without a stake, because only there is the
   * server's ordering gate absent too.
   */
  const readWallet = useCallback(async (scenarioId: string) => {
    const read = await fetchInsightWallet()

    switch (read.status) {
      case 'ok':
        dispatch({ type: 'WALLET', scenarioId, wallet: read.wallet })
        return
      case 'absent':
        dispatch({ type: 'WALLET_ABSENT', scenarioId })
        return
      case 'failed':
        dispatch({ type: 'WALLET_UNREADABLE', scenarioId })
        return
    }
  }, [])

  const loadNext = useCallback(
    async (session: GameSession, playedIds: string[]) => {
      const load = await fetchNextScenario(playedIds)

      switch (load.status) {
        case 'ok': {
          shownAtRef.current = Date.now()
          dispatch({ type: 'SCENARIO', session, scenario: load.scenario })

          /*
           * The Twin is asked *after* the scenario is on screen and never
           * awaited. It speaks on a minority of scenarios, so blocking the
           * decision on a round trip that usually returns "nothing to say" would
           * be paying for silence. If it arrives late, the reducer drops it.
           */
          const scenarioId = load.scenario.id
          void requestTwinPrediction(scenarioId).then((result) => {
            if (result.status === 'ready') {
              dispatch({ type: 'TWIN_PREDICTED', scenarioId, prediction: result.prediction })
            }
          })

          /*
           * The reserve is read per scenario and still not awaited — the
           * scenario should be readable the instant it renders, and reading is
           * the first thing a player does here anyway.
           *
           * What changed with the ordering: the read now *gates* the answers
           * rather than decorating them. So it retries, and a read that never
           * succeeds leaves the step `pending` with a retry rather than
           * pretending the reserve is empty. Silently skipping would build a
           * submission `submit_attempt` refuses, and the player would have no
           * way to see why.
           */
          void readWallet(scenarioId)
          return
        }
        case 'exhausted':
          dispatch({ type: 'EMPTY', session })
          return
        case 'failed':
          dispatch({ type: 'ERROR', error: load.failure.message })
          return
      }
    },
    [readWallet],
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

  /*
   * The answer clock starts when the answers do.
   *
   * `response_time_ms` is meant to measure deliberation over the *decision*, and
   * it feeds the session rollup and the Archive's median. With the wager in front
   * of the answer, timing from the scenario load would bill every second spent
   * choosing a stake to the answer — inflating the one number that claims to
   * describe how long the player thought about their choice. So the clock is
   * restarted at the transition into the answer step, whichever way the wager
   * settled.
   */
  const answersOpen = wagerSettled(state.wager)
  const answersOpenRef = useRef(false)
  useEffect(() => {
    if (shouldRestartAnswerClock(answersOpenRef.current, answersOpen)) {
      shownAtRef.current = Date.now()
    }
    answersOpenRef.current = answersOpen
  }, [answersOpen])

  const select = useCallback((choiceId: string) => {
    dispatch({ type: 'SELECT', choiceId })
  }, [])

  /** Another go at the reserve, after a read that failed its own retries. */
  const retryWallet = useCallback(() => {
    const { scenario, wager } = stateRef.current
    if (!scenario || wager.status !== 'pending') return
    dispatch({ type: 'WAGER_RESET', scenarioId: scenario.id })
    void readWallet(scenario.id)
  }, [readWallet])

  const selectStake = useCallback((stake: number | null) => {
    dispatch({ type: 'STAKE_SELECTED', stake })
  }, [])

  /**
   * Commit the stake.
   *
   * Locked against the session and scenario *before* the attempt row exists, so
   * the commitment provably precedes the recorded decision. The server
   * revalidates the tier, the ownership and the balance — this call only names
   * an amount.
   */
  const lockWager = useCallback(async () => {
    const { session, scenario, selectedStake, wager } = stateRef.current
    if (!session || !scenario || selectedStake === null || wager.status !== 'offered') return

    dispatch({ type: 'WAGER_LOCKING' })
    const result = await placeWager(session.id, scenario.id, selectedStake)

    if (result.status === 'locked') {
      dispatch({
        type: 'WAGER_LOCKED',
        wagerId: result.wager.wagerId,
        stake: result.wager.stake,
      })
      return
    }

    // The stake is dropped and the panel reopens. The copy no longer says
    // "answer away": with the wager in front of the answer, a refused stake
    // means trying again, not walking past it.
    dispatch({ type: 'WAGER_REJECTED' })
    toast.error('That stake didn’t lock. Your Insight is untouched — give it another go.')
  }, [])

  /** Advance the unlock queue — on timeout, dismissal, or Escape. */
  const dismissAchievement = useCallback(() => {
    dispatch({ type: 'ACHIEVEMENT_SEEN' })
  }, [])

  const submit = useCallback(async () => {
    const { session, scenario, selectedChoiceId, phase, wager } = stateRef.current
    const playerId = user?.id
    if (!session || !scenario || !selectedChoiceId || !playerId) return

    // The same gate the reducer applies, checked before the network call so an
    // unsettled wager never reaches `submit_attempt` at all.
    if (!canAnswer(phase, wager)) return

    const choice = scenario.choices.find((c) => c.id === selectedChoiceId)
    if (!choice) return

    dispatch({ type: 'SUBMIT_START' })
    // The player is no longer passed: `submit_attempt` derives it from the
    // session, so the client cannot name whose decision this is.
    const res = await submitAttempt({
      sessionId: session.id,
      scenarioId: scenario.id,
      choice,
      responseTimeMs: Date.now() - shownAtRef.current,
    })

    if (res.error || !res.data) {
      dispatch({ type: 'SUBMIT_REVERT' })
      toast.error(res.error ?? 'That didn’t save — give it another go.')

      /*
       * The server's gate refused: it read a reserve that can cover a stake while
       * this client thought the step was settled — a reserve that moved in
       * another tab, or a client that skipped on a stale read. Reopen the step
       * and re-read, so the player lands back on the wager instead of retrying an
       * answer that will be refused again.
       */
      if (res.error === WAGER_REQUIRED_ERROR) {
        dispatch({ type: 'WAGER_RESET', scenarioId: scenario.id })
        void readWallet(scenario.id)
      }
      return
    }

    // Reveal the teaching content immediately and let the award land behind it.
    // The insight is the point; XP is scaffolding and must never gate it.
    dispatch({ type: 'REVEALED', attempt: res.data })

    const awarded = await awardAttemptXp(res.data.id)
    if (awarded.data) {
      dispatch({ type: 'AWARDED', award: awarded.data, kind: 'attempt' })
    }
  }, [user?.id, readWallet])

  const saveReflection = useCallback(
    async (input: ReflectionInput): Promise<{ error: string | null }> => {
      const { attempt } = stateRef.current
      const playerId = user?.id
      if (!attempt || !playerId) {
        return { error: 'Your reflection couldn’t be saved just now.' }
      }

      const saved = await saveReflectionApi({
        attemptId: attempt.id,
        playerId,
        input,
      })
      if (saved.error) return saved

      // The bonus is claimed only after the reflection row exists — the server
      // verifies that too, so the two can never disagree.
      const awarded = await awardReflectionXp(attempt.id)
      if (awarded.data) {
        dispatch({ type: 'AWARDED', award: awarded.data, kind: 'reflection' })
      }
      return { error: null }
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
    const { session } = stateRef.current
    if (!session) {
      dispatch({ type: 'SUMMARY' })
      return
    }
    dispatch({ type: 'FINISHING' })
    const { error } = await finishSession(session.id)
    if (error) toast.error(error)
    dispatch({ type: 'SUMMARY' })
  }, [])

  const retry = useCallback(() => {
    void init()
  }, [init])

  return {
    state,
    /** The single gate the interface reads to know if the answers are live. */
    answersEnabled: answersOpen,
    select,
    selectStake,
    lockWager,
    retryWallet,
    submit,
    saveReflection,
    next,
    finish,
    retry,
    dismissAchievement,
  }
}
