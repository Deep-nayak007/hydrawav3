import { useEffect, useMemo, useState } from 'react'
import { AdaptiveProtocolPanel } from './components/AdaptiveProtocolPanel'
import { DeviceBridgePanel } from './components/DeviceBridgePanel'
import { FeatureGuidePanel } from './components/FeatureGuidePanel'
import { OutcomeCapturePanel } from './components/OutcomeCapturePanel'
import { SolaceGardenPanel } from './components/SolaceGardenPanel'
import { useHydraSessions } from './hooks/useHydraSessions'
import { recommendProtocol } from './lib/adaptiveProtocol'
import { buildGardenSnapshot } from './lib/gardenGrowth'
import { recoveryScore } from './lib/scoring'
import { buildPostSessionVoiceNote, playVoiceNote } from './lib/voice'
import type { ProtocolParameters, SessionModality, SessionOutcomes } from './types/domain'

type StatusTone = 'info' | 'success' | 'error'

interface StatusBannerState {
  message: string
  tone: StatusTone
}

function App() {
  const { loading, sessions, addSession, resetDemoData } = useHydraSessions()
  const [draftProtocol, setDraftProtocol] = useState<ProtocolParameters | null>(null)
  const [overrideNote, setOverrideNote] = useState('')
  const [sharePreview, setSharePreview] = useState<string | null>(null)
  const [canvasElement, setCanvasElement] = useState<HTMLCanvasElement | null>(null)
  const [statusBanner, setStatusBanner] = useState<StatusBannerState | null>(null)
  const [isPlayingVoice, setIsPlayingVoice] = useState(false)
  const [isResettingData, setIsResettingData] = useState(false)

  const webGPUAvailable = useMemo(
    () => typeof navigator !== 'undefined' && 'gpu' in navigator,
    [],
  )

  const recommendation = useMemo(
    () => recommendProtocol(sessions, webGPUAvailable),
    [sessions, webGPUAvailable],
  )

  const gardenSnapshot = useMemo(() => buildGardenSnapshot(sessions), [sessions])

  const latestSession = sessions.at(-1)
  const latestRecoveryScore = recoveryScore(latestSession)
  const voiceNote = useMemo(
    () => buildPostSessionVoiceNote(latestSession, recommendation, gardenSnapshot),
    [latestSession, recommendation, gardenSnapshot],
  )
  const activeProtocol = draftProtocol ?? recommendation.protocol
  const recentSessions = sessions.slice(-8)

  const pushStatus = (message: string, tone: StatusTone = 'info') => {
    setStatusBanner({ message, tone })
  }

  useEffect(() => {
    if (!statusBanner) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setStatusBanner((previous) => (previous?.message === statusBanner.message ? null : previous))
    }, 6500)

    return () => window.clearTimeout(timeoutId)
  }, [statusBanner])

  const applyRecommendation = () => {
    const nextProtocol = recommendation.protocol
    const changed = JSON.stringify(activeProtocol) !== JSON.stringify(nextProtocol)
    setDraftProtocol(nextProtocol)
    pushStatus(
      changed
        ? 'AI recommendation copied into the editable session card.'
        : 'Recommendation is already active. You can still fine-tune sliders manually.',
      changed ? 'success' : 'info',
    )
  }

  const completeSession = async (payload: {
    modality: SessionModality
    outcomes: SessionOutcomes
  }) => {
    try {
      await addSession({
        modality: payload.modality,
        outcomes: payload.outcomes,
        protocol: activeProtocol,
        overrideNote: overrideNote.trim() || undefined,
      })

      setOverrideNote('')
      setDraftProtocol(null)
      pushStatus('Session saved. Garden growth and protocol model have been updated.', 'success')
    } catch (error) {
      pushStatus(
        `Could not save session: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'error',
      )
    }
  }

  const playContinuityVoice = async () => {
    if (isPlayingVoice) {
      return
    }

    setIsPlayingVoice(true)
    pushStatus('Playing post-session continuity voice note...', 'info')

    try {
      const playback = await playVoiceNote(voiceNote)

      if (playback.mode === 'elevenlabs') {
        pushStatus('Voice note completed with ElevenLabs.', 'success')
        return
      }

      if (playback.mode === 'speech') {
        pushStatus('Voice note completed with browser speech synthesis fallback.', 'success')
        return
      }

      pushStatus(playback.reason ?? 'Voice note could not be played on this browser.', 'error')
    } catch (error) {
      pushStatus(
        `Voice playback failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'error',
      )
    } finally {
      setIsPlayingVoice(false)
    }
  }

  const captureShareImage = () => {
    if (!canvasElement) {
      pushStatus('Canvas is still loading. Try capture again in a second.', 'info')
      return
    }

    try {
      const dataUrl = canvasElement.toDataURL('image/png')
      setSharePreview(dataUrl)
      pushStatus('Garden image captured. Preview is ready for sharing.', 'success')
    } catch (error) {
      pushStatus(
        `Image capture failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'error',
      )
    }
  }

  const handleResetDemoData = async () => {
    if (isResettingData) {
      return
    }

    setIsResettingData(true)
    try {
      await resetDemoData()
      setDraftProtocol(null)
      setOverrideNote('')
      setSharePreview(null)
      pushStatus('Demo dataset reset. Judge flow is back to seeded sessions.', 'success')
    } catch (error) {
      pushStatus(
        `Could not reset demo data: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'error',
      )
    } finally {
      setIsResettingData(false)
    }
  }

  if (loading) {
    return (
      <main className="app-shell">
        <section className="loading-state">
          <h1>HYDRA-V</h1>
          <p>Preparing local session intelligence...</p>
        </section>
      </main>
    )
  }

  return (
    <main className="app-shell">
      <header className="hero">
        <p className="eyebrow">Recovery Intelligence Layer for Hydrawav3</p>
        <h1>HYDRA-V | Know - Act - Learn</h1>
        <p className="hero-copy">
          Feature 6 and Feature 7 MVP. All data stays on-device in IndexedDB and all
          recommendations are explainable for practitioner review in under two minutes.
        </p>

        <div className="top-stats">
          <article>
            <span>Sessions</span>
            <strong>{sessions.length}</strong>
          </article>
          <article>
            <span>Recovery score</span>
            <strong>{latestRecoveryScore}</strong>
          </article>
          <article>
            <span>Current streak</span>
            <strong>{gardenSnapshot.milestones.streak}</strong>
          </article>
          <article>
            <span>Mode</span>
            <strong>{recommendation.modelMode}</strong>
          </article>
        </div>

        <p className="guardrail">
          Wellness support only. HYDRA-V supports recovery, mobility, and performance and is not a
          diagnostic or treatment system.
        </p>
      </header>

      <section className="workspace-grid">
        <div className="column">
          <FeatureGuidePanel />

          <AdaptiveProtocolPanel
            recommendation={recommendation}
            draftProtocol={activeProtocol}
            onDraftChange={setDraftProtocol}
            onApplyRecommendation={applyRecommendation}
            overrideNote={overrideNote}
            onOverrideNoteChange={setOverrideNote}
          />

          <DeviceBridgePanel protocol={activeProtocol} onStatus={pushStatus} />

          <OutcomeCapturePanel onCompleteSession={completeSession} />

          <section className="panel trend-panel">
            <header className="panel-header">
              <h2>Practitioner trend view</h2>
              <p>Outcome trajectory over recent sessions.</p>
            </header>

            <div className="trend-chart">
              {recentSessions.length > 0 ? (
                recentSessions.map((session) => (
                  <div key={session.id} className="trend-bar-wrap">
                    <div
                      className="trend-bar"
                      style={{
                        height: `${Math.max(16, session.outcomes.hrvDelta * 7)}px`,
                      }}
                    />
                    <span>
                      {new Date(session.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                ))
              ) : (
                <p className="chart-empty">Complete a session to populate trend bars.</p>
              )}
            </div>
          </section>
        </div>

        <div className="column">
          <SolaceGardenPanel
            snapshot={gardenSnapshot}
            voiceNote={voiceNote}
            onPlayVoice={playContinuityVoice}
            onCaptureImage={captureShareImage}
            onCanvasReady={setCanvasElement}
            sharePreview={sharePreview}
            voiceBusy={isPlayingVoice}
            captureDisabled={!canvasElement}
          />

          <section className="panel utility-panel">
            <h2>Demo controls</h2>
            <p>Reset seeded data to replay the full judge flow from session one.</p>
            <button
              type="button"
              className="secondary-btn"
              onClick={() => void handleResetDemoData()}
              disabled={isResettingData}
            >
              {isResettingData ? 'Resetting...' : 'Reset Demo Dataset'}
            </button>
          </section>
        </div>
      </section>

      {statusBanner && (
        <p className={`status-banner tone-${statusBanner.tone}`}>{statusBanner.message}</p>
      )}
    </main>
  )
}

export default App
