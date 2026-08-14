import { Button } from '@/components/ui/button'
import { useSoundscape } from '@/lib/feedback'
import { AchievementToast } from '@/features/achievements'
import { MasteryReveal } from '@/features/mastery'
import { TwinPredictionCard, TwinVerdictCard } from '@/features/profile'
import { useGameSession } from '../hooks/use-game-session'
import { GAME_FINISHING_MESSAGES, GAME_LOADING_MESSAGES } from '../constants'
import { GameEmpty, GameError, GameLoading } from './game-states'
import { ScenarioPlay } from './scenario-play'
import { WagerPanel } from './wager-panel'
import { WagerResult } from './wager-result'
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
  /*
   * The quietest room in the product, and deliberately so: the decision cues
   * have to stand out against it, and someone reading a scenario is thinking.
   * Momentum is not passed here — it belongs to the surfaces that actually read
   * the player's run, and a room that resolved mid-session would be scoring the
   * session rather than describing it.
   */
  useSoundscape('play')

  const {
    state,
    answersEnabled,
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
  } = useGameSession()

  /*
   * The unlock reveal is mounted outside the phase switch, so it survives the
   * move to the next scenario and to the summary. An achievement earned on the
   * last question of a session should not vanish because the screen changed.
   */
  const achievementToast = (
    <AchievementToast onDismiss={dismissAchievement} queue={state.pendingAchievements} />
  )

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
        <>
          <SessionSummary
            achievements={state.sessionAchievements}
            completedCount={state.completedCount}
            onPlayAgain={retry}
            sessionXp={state.sessionXp}
          />
          {achievementToast}
        </>
      )

    case 'deciding':
    case 'submitting':
      if (!state.scenario) return <GameLoading messages={GAME_LOADING_MESSAGES} />
      return (
        <>
          {/*
           * Above the scenario, and only when the Twin had something to say.
           * It never gates the decision — if the guess arrives late it simply
           * does not appear for this scenario.
           */}
          {state.twinPrediction ? (
            <div className="mb-6">
              <TwinPredictionCard prediction={state.twinPrediction} />
            </div>
          ) : null}
          {/*
           * The first decision, above the second. Conviction is committed before
           * the answer exists — so the panel leads, and the choices stay shut
           * until it settles. `answersEnabled` is the only thing that opens them,
           * and the reducer enforces the same rule independently.
           */}
          <div className="mb-6">
            <WagerPanel
              onLock={() => void lockWager()}
              onRetryRead={retryWallet}
              onSelectStake={selectStake}
              phase={state.wager}
              selectedStake={state.selectedStake}
            />
          </div>
          <ScenarioPlay
            answersEnabled={answersEnabled}
            scenario={state.scenario}
            selectedChoiceId={state.selectedChoiceId}
            submitting={state.phase === 'submitting'}
            completedCount={state.completedCount}
            onSelect={select}
            onSubmit={() => void submit()}
            sessionXp={state.sessionXp}
          />
          {achievementToast}
        </>
      )

    case 'revealed':
      if (!state.scenario || !state.attempt) {
        return <GameLoading messages={GAME_LOADING_MESSAGES} />
      }
      return (
        <div className="flex flex-col gap-6">
          <OutcomeReveal scenario={state.scenario} attempt={state.attempt} />
          {/*
           * The verdict sits directly under the teaching and above the reward.
           * It is a consequence of the decision, not a prize for it.
           */}
          {/*
           * The player's own commitment settles before the Twin's guess: their
           * decision first, the model's opinion of it second.
           */}
          {state.award?.wager ? <WagerResult outcome={state.award.wager} /> : null}
          {state.award?.twin ? <TwinVerdictCard verdict={state.award.twin} /> : null}
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
          {achievementToast}
        </div>
      )

    default:
      return null
  }
}
