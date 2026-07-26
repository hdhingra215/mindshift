import { Button } from '@/components/ui/button'
import { MasteryReveal } from '@/features/mastery'
import { useGameSession } from '../hooks/use-game-session'
import { GAME_FINISHING_MESSAGES, GAME_LOADING_MESSAGES } from '../constants'
import { GameEmpty, GameError, GameLoading } from './game-states'
import { ScenarioPlay } from './scenario-play'
import { OutcomeReveal } from './outcome-reveal'
import { ReflectionPanel } from './reflection-panel'
import { SessionSummary } from './session-summary'
import { XpReward } from './xp-reward'

/**
 * Gameplay orchestrator. Renders the current phase of the session state
 * machine; all data/side effects live in useGameSession, keeping this a thin
 * presentation switch.
 */
export function GameScreen() {
  const { state, select, submit, saveReflection, next, finish, retry } =
    useGameSession()

  switch (state.phase) {
    case 'initializing':
    case 'loadingNext':
      return <GameLoading messages={GAME_LOADING_MESSAGES} />

    case 'finishing':
      return <GameLoading messages={GAME_FINISHING_MESSAGES} />

    case 'error':
      return (
        <GameError
          message={state.error ?? 'Something slipped on our end.'}
          onRetry={retry}
        />
      )

    case 'empty':
      return <GameEmpty completedCount={state.completedCount} onFinish={finish} />

    case 'summary':
      return (
        <SessionSummary
          completedCount={state.completedCount}
          onPlayAgain={retry}
          sessionXp={state.sessionXp}
        />
      )

    case 'deciding':
    case 'submitting':
      if (!state.scenario) return <GameLoading messages={GAME_LOADING_MESSAGES} />
      return (
        <ScenarioPlay
          scenario={state.scenario}
          selectedChoiceId={state.selectedChoiceId}
          submitting={state.phase === 'submitting'}
          completedCount={state.completedCount}
          onSelect={select}
          onSubmit={() => void submit()}
          sessionXp={state.sessionXp}
        />
      )

    case 'revealed':
      if (!state.scenario || !state.attempt) {
        return <GameLoading messages={GAME_LOADING_MESSAGES} />
      }
      return (
        <div className="flex flex-col gap-6">
          <OutcomeReveal scenario={state.scenario} attempt={state.attempt} />
          {/*
           * Rendered only once the server has actually awarded. The reveal
           * never waits on it — the teaching lands first, the reward settles in
           * underneath it a moment later.
           */}
          {state.award ? (
            <>
              {/*
               * Mastery first: it is the metric the player is actually here
               * for, and XP is the scaffolding under it (GameDesign §10).
               */}
              <MasteryReveal awards={state.award.mastery} />
              <XpReward award={state.award} reflectionXp={state.reflectionXp} />
            </>
          ) : null}
          <ReflectionPanel scenario={state.scenario} onSave={saveReflection} />
          <div className="mx-auto flex w-full max-w-2xl flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button variant="ghost" size="lg" onClick={() => void finish()}>
              Finish session
            </Button>
            <Button size="lg" onClick={() => void next()}>
              Next scenario
            </Button>
          </div>
        </div>
      )

    default:
      return null
  }
}
