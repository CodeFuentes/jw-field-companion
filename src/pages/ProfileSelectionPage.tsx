import { Plus, Trash2, UserRound } from 'lucide-react'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import type { ProfileRecord } from '../types/profile'

interface ProfileSelectionPageProps {
  profiles: ProfileRecord[]
  selectedProfileId: string | null
  error: string | null
  onCreateProfile: (name: string) => Promise<void>
  onSelectProfile: (profileId: string) => Promise<void>
  onDeleteProfile: (profileId: string) => Promise<void>
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((value) => value[0]?.toUpperCase() ?? '')
    .join('')
}

export function ProfileSelectionPage({
  profiles,
  selectedProfileId,
  error,
  onCreateProfile,
  onSelectProfile,
  onDeleteProfile,
}: ProfileSelectionPageProps) {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [busyProfileId, setBusyProfileId] = useState<string | null>(null)
  const [pendingDeleteProfile, setPendingDeleteProfile] = useState<ProfileRecord | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)

    try {
      await onCreateProfile(name)
      setName('')
      setShowCreateForm(false)
    } finally {
      setSubmitting(false)
    }
  }

  async function confirmDelete() {
    if (!pendingDeleteProfile) {
      return
    }

    setBusyProfileId(pendingDeleteProfile.id)

    try {
      await onDeleteProfile(pendingDeleteProfile.id)
      setPendingDeleteProfile(null)
    } finally {
      setBusyProfileId(null)
    }
  }

  async function handleSelect(profileId: string) {
    setBusyProfileId(profileId)

    try {
      await onSelectProfile(profileId)
    } finally {
      setBusyProfileId(null)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--background-primary)] px-6 py-10">
      <div className="mx-auto flex min-h-[calc(100vh-80px)] max-w-[900px] items-center justify-center">
        <section className="w-full max-w-[360px] text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-[12px] bg-[var(--purple-500)] text-[13px] font-medium text-white">
            JW
          </div>
          <p className="mt-5 text-[20px] font-medium text-[var(--text-primary)]">
            JW Field Companion
          </p>
          <p className="mt-3 text-[13px] text-[var(--text-secondary)]">
            {t('profiles.subtitle')}
          </p>

          {error ? (
            <div className="mt-4 rounded-[12px] border border-[rgba(226,75,74,0.22)] bg-[rgba(226,75,74,0.08)] px-4 py-3 text-left text-[13px] text-[var(--danger)]">
              {error}
            </div>
          ) : null}

          <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {profiles.length > 0 ? (
              profiles.map((profile) => {
                const isSelected = profile.id === selectedProfileId
                const deleteDisabled = profiles.length <= 1

                return (
                  <article
                    key={profile.id}
                    className={`relative rounded-[12px] border bg-[var(--background-elevated)] p-4 transition hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)] ${
                      isSelected
                        ? 'border-[var(--purple-200)] bg-[var(--purple-50)]'
                        : 'border-[var(--border-subtle)]'
                    }`}
                  >
                    <button
                      aria-label={t('profiles.delete.openLabel', { name: profile.name })}
                      className="absolute right-2 top-2 rounded-[8px] p-1 text-[var(--text-tertiary)] transition hover:bg-[var(--background-tertiary)] hover:text-[var(--danger)] disabled:cursor-not-allowed disabled:opacity-35"
                      disabled={deleteDisabled || busyProfileId === profile.id}
                      onClick={() => setPendingDeleteProfile(profile)}
                      type="button"
                    >
                      <Trash2 size={14} />
                    </button>

                    <button
                      className="flex w-full flex-col items-center gap-3"
                      disabled={busyProfileId === profile.id}
                      onClick={() => void handleSelect(profile.id)}
                      type="button"
                    >
                      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[var(--purple-200)] bg-[var(--purple-50)] text-[14px] font-medium text-[var(--purple-900)]">
                        {getInitials(profile.name) || <UserRound size={16} />}
                      </div>
                      <div>
                        <p className="text-[13px] font-medium text-[var(--text-primary)]">
                          {profile.name}
                        </p>
                        <p className="mt-1 text-[12px] text-[var(--text-tertiary)]">
                          {busyProfileId === profile.id
                            ? t('profiles.list.opening')
                            : isSelected
                              ? t('profiles.list.preselected')
                              : t('profiles.list.available')}
                        </p>
                      </div>
                    </button>
                  </article>
                )
              })
            ) : (
              <div className="col-span-full rounded-[12px] border border-dashed border-[var(--border-subtle)] px-5 py-8 text-[13px] text-[var(--text-secondary)]">
                {t('profiles.list.empty')}
              </div>
            )}
          </div>

          {showCreateForm ? (
            <form
              className="mt-5 rounded-[12px] border border-[var(--border-subtle)] bg-[var(--background-elevated)] p-4 text-left"
              onSubmit={handleSubmit}
            >
              <label className="text-[13px] text-[var(--text-secondary)]" htmlFor="profile-name">
                {t('profiles.create.nameLabel')}
              </label>
              <input
                id="profile-name"
                className="mt-2 w-full rounded-[8px] border border-[var(--border-subtle)] bg-[var(--background-tertiary)] px-3 py-2 text-[14px] text-[var(--text-primary)] outline-none transition focus:border-[var(--purple-200)]"
                maxLength={50}
                onChange={(event) => setName(event.target.value)}
                placeholder={t('profiles.create.namePlaceholder')}
                required
                value={name}
              />

              <div className="mt-4 flex items-center justify-end gap-2">
                <button
                  className="rounded-[8px] border border-[var(--border-subtle)] px-3 py-2 text-[13px] text-[var(--text-secondary)] transition hover:bg-[var(--background-tertiary)]"
                  onClick={() => {
                    setShowCreateForm(false)
                    setName('')
                  }}
                  type="button"
                >
                  {t('profiles.create.cancel')}
                </button>
                <button
                  className="inline-flex items-center gap-2 rounded-[8px] bg-[var(--purple-500)] px-3 py-2 text-[13px] text-white transition hover:bg-[var(--purple-400)] active:bg-[var(--purple-700)] disabled:cursor-not-allowed disabled:bg-[var(--background-tertiary)] disabled:text-[var(--text-tertiary)]"
                  disabled={submitting}
                  type="submit"
                >
                  <Plus size={14} />
                  <span>{submitting ? t('profiles.create.creating') : t('profiles.create.action')}</span>
                </button>
              </div>
            </form>
          ) : (
            <button
              className="mt-5 inline-flex items-center gap-2 rounded-[8px] border border-[var(--border-strong)] px-3 py-2 text-[13px] text-[var(--text-secondary)] transition hover:bg-[var(--background-tertiary)]"
              onClick={() => setShowCreateForm(true)}
              type="button"
            >
              <Plus size={14} />
              <span>{t('profiles.create.eyebrow')}</span>
            </button>
          )}
        </section>
      </div>

      {pendingDeleteProfile ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(26,26,26,0.28)] px-4">
          <div className="w-full max-w-[420px] rounded-[16px] border border-[var(--border-subtle)] bg-[var(--background-elevated)] p-6 shadow-[var(--shadow-elevated)]">
            <h2 className="text-[16px] font-medium text-[var(--text-primary)]">
              {t('profiles.delete.title', { name: pendingDeleteProfile.name })}
            </h2>
            <p className="mt-3 text-[14px] leading-6 text-[var(--text-secondary)]">
              {t('profiles.delete.description')}
            </p>

            <div className="mt-6 flex justify-end gap-2">
              <button
                className="rounded-[8px] border border-[var(--border-subtle)] px-3 py-2 text-[13px] text-[var(--text-secondary)] transition hover:bg-[var(--background-tertiary)]"
                onClick={() => setPendingDeleteProfile(null)}
                type="button"
              >
                {t('profiles.delete.cancel')}
              </button>
              <button
                className="rounded-[8px] bg-[var(--danger)] px-3 py-2 text-[13px] text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:bg-[var(--background-tertiary)] disabled:text-[var(--text-tertiary)]"
                disabled={busyProfileId === pendingDeleteProfile.id}
                onClick={() => void confirmDelete()}
                type="button"
              >
                {busyProfileId === pendingDeleteProfile.id
                  ? t('profiles.delete.deleting')
                  : t('profiles.delete.confirm')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
