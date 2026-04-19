import { useMemo, useState } from 'react'
import type { SessionModality, SessionOutcomes } from '../types/domain'

interface OutcomeCapturePanelProps {
  onCompleteSession: (payload: { modality: SessionModality; outcomes: SessionOutcomes }) => Promise<void>
}

interface CaptureState {
  modality: SessionModality
  hrvBefore: number
  hrvAfter: number
  symmetryBefore: number
  symmetryAfter: number
  microsaccadeBefore: number
  microsaccadeAfter: number
  painBefore: number
  painAfter: number
  romBefore: number
  romAfter: number
  readinessBefore: number
  readinessAfter: number
}

const initialState = (): CaptureState => ({
  modality: 'hybrid',
  hrvBefore: 60,
  hrvAfter: 67,
  symmetryBefore: 13,
  symmetryAfter: 9,
  microsaccadeBefore: 0.7,
  microsaccadeAfter: 1.2,
  painBefore: 6,
  painAfter: 4,
  romBefore: 58,
  romAfter: 69,
  readinessBefore: 4.5,
  readinessAfter: 6.2,
})

const capturePresets: Record<'balanced' | 'fatigue' | 'asymmetry', CaptureState> = {
  balanced: {
    modality: 'hybrid',
    hrvBefore: 62,
    hrvAfter: 70,
    symmetryBefore: 12,
    symmetryAfter: 7,
    microsaccadeBefore: 0.8,
    microsaccadeAfter: 1.3,
    painBefore: 5.5,
    painAfter: 3.4,
    romBefore: 60,
    romAfter: 72,
    readinessBefore: 4.8,
    readinessAfter: 6.8,
  },
  fatigue: {
    modality: 'thermal',
    hrvBefore: 48,
    hrvAfter: 57,
    symmetryBefore: 16,
    symmetryAfter: 12,
    microsaccadeBefore: 0.6,
    microsaccadeAfter: 0.95,
    painBefore: 7.2,
    painAfter: 5.9,
    romBefore: 52,
    romAfter: 61,
    readinessBefore: 3.6,
    readinessAfter: 5.1,
  },
  asymmetry: {
    modality: 'resonance',
    hrvBefore: 55,
    hrvAfter: 63,
    symmetryBefore: 20,
    symmetryAfter: 8,
    microsaccadeBefore: 0.7,
    microsaccadeAfter: 1.15,
    painBefore: 6.4,
    painAfter: 4.1,
    romBefore: 56,
    romAfter: 70,
    readinessBefore: 4.2,
    readinessAfter: 6.4,
  },
}

const toOutcomes = (state: CaptureState): SessionOutcomes => ({
  hrvDelta: state.hrvAfter - state.hrvBefore,
  symmetryGain: state.symmetryBefore - state.symmetryAfter,
  symmetryDeltaRemaining: Math.max(state.symmetryAfter, 0),
  microsaccadeStabilityGain: state.microsaccadeAfter - state.microsaccadeBefore,
  painReduction: state.painBefore - state.painAfter,
  romGain: state.romAfter - state.romBefore,
  subjectiveReadinessGain: state.readinessAfter - state.readinessBefore,
})

export const OutcomeCapturePanel = ({ onCompleteSession }: OutcomeCapturePanelProps) => {
  const [state, setState] = useState<CaptureState>(initialState)
  const [saving, setSaving] = useState(false)
  const preview = useMemo(() => toOutcomes(state), [state])

  const update = <Key extends keyof CaptureState>(key: Key, value: CaptureState[Key]) =>
    setState((previous) => ({
      ...previous,
      [key]: value,
    }))

  const updateNumeric = <Key extends Exclude<keyof CaptureState, 'modality'>>(
    key: Key,
    raw: string,
  ) => {
    const value = Number(raw)
    if (!Number.isFinite(value)) {
      return
    }
    update(key, value as CaptureState[Key])
  }

  const applyPreset = (preset: keyof typeof capturePresets) => {
    setState(capturePresets[preset])
  }

  const complete = async () => {
    setSaving(true)
    try {
      await onCompleteSession({
        modality: state.modality,
        outcomes: preview,
      })
      setState((previous) => ({
        ...initialState(),
        modality: previous.modality,
      }))
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="panel">
      <header className="panel-header">
        <h2>Outcome + Continuity Capture</h2>
        <p>Before/after in one screen. Save session and train the next recommendation.</p>
      </header>

      <div className="preset-actions">
        <span>Quick preset</span>
        <button type="button" className="chip-btn" onClick={() => applyPreset('balanced')}>
          Balanced recovery
        </button>
        <button type="button" className="chip-btn" onClick={() => applyPreset('fatigue')}>
          Fatigue reset
        </button>
        <button type="button" className="chip-btn" onClick={() => applyPreset('asymmetry')}>
          Asymmetry correction
        </button>
      </div>

      <div className="capture-grid">
        <label>
          Session modality
          <select
            value={state.modality}
            onChange={(event) => update('modality', event.target.value as SessionModality)}
          >
            <option value="photobiomodulation">Photobiomodulation</option>
            <option value="resonance">Resonance</option>
            <option value="thermal">Thermal</option>
            <option value="hybrid">Hybrid</option>
          </select>
        </label>

        <label>
          HRV before
          <input
            type="number"
            value={state.hrvBefore}
            onChange={(event) => updateNumeric('hrvBefore', event.target.value)}
          />
        </label>

        <label>
          HRV after
          <input
            type="number"
            value={state.hrvAfter}
            onChange={(event) => updateNumeric('hrvAfter', event.target.value)}
          />
        </label>

        <label>
          Symmetry delta before (%)
          <input
            type="number"
            step={0.1}
            value={state.symmetryBefore}
            onChange={(event) => updateNumeric('symmetryBefore', event.target.value)}
          />
        </label>

        <label>
          Symmetry delta after (%)
          <input
            type="number"
            step={0.1}
            value={state.symmetryAfter}
            onChange={(event) => updateNumeric('symmetryAfter', event.target.value)}
          />
        </label>

        <label>
          Micro-saccade before (Hz)
          <input
            type="number"
            step={0.1}
            value={state.microsaccadeBefore}
            onChange={(event) => updateNumeric('microsaccadeBefore', event.target.value)}
          />
        </label>

        <label>
          Micro-saccade after (Hz)
          <input
            type="number"
            step={0.1}
            value={state.microsaccadeAfter}
            onChange={(event) => updateNumeric('microsaccadeAfter', event.target.value)}
          />
        </label>

        <label>
          Pain before (0-10)
          <input
            type="number"
            step={0.1}
            value={state.painBefore}
            onChange={(event) => updateNumeric('painBefore', event.target.value)}
          />
        </label>

        <label>
          Pain after (0-10)
          <input
            type="number"
            step={0.1}
            value={state.painAfter}
            onChange={(event) => updateNumeric('painAfter', event.target.value)}
          />
        </label>

        <label>
          ROM before
          <input
            type="number"
            step={1}
            value={state.romBefore}
            onChange={(event) => updateNumeric('romBefore', event.target.value)}
          />
        </label>

        <label>
          ROM after
          <input
            type="number"
            step={1}
            value={state.romAfter}
            onChange={(event) => updateNumeric('romAfter', event.target.value)}
          />
        </label>

        <label>
          Readiness before (0-10)
          <input
            type="number"
            step={0.1}
            value={state.readinessBefore}
            onChange={(event) => updateNumeric('readinessBefore', event.target.value)}
          />
        </label>

        <label>
          Readiness after (0-10)
          <input
            type="number"
            step={0.1}
            value={state.readinessAfter}
            onChange={(event) => updateNumeric('readinessAfter', event.target.value)}
          />
        </label>
      </div>

      <div className="preview-strip">
        <span>HRV delta: {preview.hrvDelta.toFixed(1)}</span>
        <span>Symmetry gain: {preview.symmetryGain.toFixed(1)}%</span>
        <span>Pain reduction: {preview.painReduction.toFixed(1)}</span>
        <span>ROM gain: {preview.romGain.toFixed(1)}</span>
      </div>

      <button type="button" className="primary-btn" onClick={complete} disabled={saving}>
        {saving ? 'Saving...' : 'Complete Session + Update AI'}
      </button>
    </section>
  )
}
