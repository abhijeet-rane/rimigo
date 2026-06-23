import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { budgetApi, TripBudget } from '../api/budgetApi'

/**
 * Apply any pending tour overrides on top of a budget snapshot so a just-picked
 * tour survives the 1-second polling refetch that fires while
 * `calculation_status === 'in_progress'`. Without this, the server's polled
 * response (returned before the backend recalc has applied the override to
 * `days[].items[].selected_tour_id`) would overwrite the optimistic choice and
 * the UI would "revert" the user's pick.
 */
const applyPendingTourOverrides = (data: TripBudget, pending: Map<string, string | null>): TripBudget => {
    if (pending.size === 0) return data
    return {
        ...data,
        days: data.days.map((day) => ({
            ...day,
            items: day.items.map((item) => (pending.has(item.slot_id) ? { ...item, selected_tour_id: pending.get(item.slot_id) ?? null } : item))
        }))
    }
}

const applyOneTourOverride = (data: TripBudget, slotId: string, tourId: string | null): TripBudget => ({
    ...data,
    days: data.days.map((day) => ({
        ...day,
        items: day.items.map((item) => (item.slot_id === slotId ? { ...item, selected_tour_id: tourId } : item))
    })),
    selected_activity_tours: {
        ...(data.selected_activity_tours || {}),
        [slotId]: { tour_id: tourId ?? '' }
    }
})

/**
 * Apply pending exclude/include overrides on top of a budget snapshot so an
 * excluded activity stays excluded through the 1-second polling refetch while
 * `calculation_status === 'in_progress'`. Mirrors applyPendingTourOverrides —
 * the polled GET can return before the PATCH has persisted, and without this
 * merge the excluded row would flash back in until the PATCH response lands.
 */
const applyPendingExclusions = (data: TripBudget, pending: Map<string, 'exclude' | 'include'>): TripBudget => {
    if (pending.size === 0) return data
    const next = new Set(data.excluded_activities)
    for (const [slotId, action] of pending) {
        if (action === 'exclude') next.add(slotId)
        else next.delete(slotId)
    }
    return { ...data, excluded_activities: Array.from(next) }
}

/**
 * Apply pending stay-provider selections on top of a budget snapshot so a
 * just-picked provider (Agoda → Booking.com) survives the polling refetch.
 * Same race as pendingTours: our optimistic setQueryData sets `selected_provider`
 * synchronously, but a polled GET that returns before the PATCH persists
 * overwrites the cache with the old provider. This merge re-applies the
 * pending pick on every render of `select` until the clear-effect removes it.
 */
const applyPendingStayProviders = (data: TripBudget, pending: Map<string, string | null>): TripBudget => {
    if (pending.size === 0) return data
    return {
        ...data,
        stays: data.stays.map((stay) => (pending.has(stay.city_id) ? { ...stay, selected_provider: pending.get(stay.city_id) ?? null } : stay))
    }
}

export const useTripBudget = (identifier: string | undefined, isPublic = false, enabled = true) => {
    const queryClient = useQueryClient()
    const queryKey = ['tripBudget', identifier, isPublic ? 'public' : 'private']

    // Bug 4 — pending tour overrides kept out of the raw cache so polling
    // refetches don't clobber them. Cleared once the raw cached data reflects
    // the override (or on error / rollback).
    const [pendingTours, setPendingTours] = useState<Map<string, string | null>>(() => new Map())

    // Symmetric to pendingTours: pending activity exclude/include actions held
    // outside the cache so the 1s polling refetch can't re-surface a just-excluded
    // row while the PATCH is still in flight.
    const [pendingExclusions, setPendingExclusions] = useState<Map<string, 'exclude' | 'include'>>(() => new Map())

    // Symmetric to pendingTours: pending stay-provider picks held outside the
    // cache so a polled GET that races the PATCH can't revert `selected_provider`
    // to the previously-chosen platform.
    const [pendingStayProviders, setPendingStayProviders] = useState<Map<string, string | null>>(() => new Map())

    // Reset the budget query whenever ``enabled`` flips to true so the
    // consumer (BookingsTab) always sees a fresh fetch on (re-)entry — and
    // the BudgetLoader skeleton renders during it, not the previous cached
    // snapshot. ``invalidateQueries`` alone left a stale "in_progress"
    // placeholder visible (zeros on the per-person line, empty stays/flights
    // sections) for the half-second between tab activation and the refetch
    // landing; ``resetQueries`` drops the cache so ``isLoading`` flips back
    // to true and the loader gate fires the same way it does on a page
    // reload — the user-visible behavior the user explicitly compared
    // against. ``refetchOnMount: 'always'`` isn't enough on its own because
    // TripboardPage also subscribes via ``useTripBudget`` — its observer
    // stays alive across tab switches, so React Query treats the second
    // BookingsTab subscriber as joining an existing session rather than a
    // fresh mount.
    useEffect(() => {
        if (enabled && identifier) {
            queryClient.resetQueries({ queryKey })
        }
    }, [enabled, identifier, queryClient])

    const query = useQuery<TripBudget, Error, TripBudget>({
        queryKey,
        queryFn: () => (isPublic ? budgetApi.getPublicBudget(identifier!) : budgetApi.getBudget(identifier!)),
        enabled: !!identifier && enabled,
        staleTime: 30 * 60 * 1000, // 30 minutes
        gcTime: 60 * 60 * 1000, // 1 hour
        refetchInterval: (q) => {
            const data = q.state.data
            if (data?.calculation_status === 'in_progress') return 1000
            return false
        },
        select: (data) =>
            applyPendingStayProviders(applyPendingExclusions(applyPendingTourOverrides(data, pendingTours), pendingExclusions), pendingStayProviders)
    })

    // Soft timeout for the recalc indicator — the UI treats calc_status as
    // effectively idle after 15 seconds even if the server is still reporting
    // 'in_progress'. Protects against stuck backend state where a Celery
    // task never writes back 'idle': prices would have long since rendered,
    // but "Updating prices…" would otherwise persist indefinitely. Polling
    // itself keeps running — if the backend eventually recovers, the real
    // state flows through as normal.
    //
    // First-load guard — if `calculated_at` is null, no calc has ever
    // completed for this budget; we legitimately need to show the indicator
    // until the first calc lands, even if that takes >15 s. Only existing
    // budgets with a prior `calculated_at` trigger the soft-timeout.
    const [recalcTimedOut, setRecalcTimedOut] = useState(false)
    const calcStatus = query.data?.calculation_status
    const calculatedAt = query.data?.calculated_at
    useEffect(() => {
        if (calcStatus !== 'in_progress' || !calculatedAt) {
            setRecalcTimedOut(false)
            return
        }
        setRecalcTimedOut(false)
        const timer = setTimeout(() => setRecalcTimedOut(true), 15000)
        return () => clearTimeout(timer)
    }, [calcStatus, calculatedAt])

    // Drop a pending entry as soon as the raw cached server data matches it.
    //
    // Bug 4 regression fix: the previous version cleared pending as soon as
    // items[].selected_tour_id matched tourId. But our own optimistic
    // setQueryData writes to items[].selected_tour_id synchronously, so the
    // effect saw the match one tick after the user's click and cleared the
    // pending entry before the polled GET had even fired. The next poll
    // returned stale items (server recalc hadn't propagated the override
    // yet), and with pending already empty, `select` had nothing to re-apply
    // — the UI reverted.
    //
    // The fix: require `calculation_status !== 'in_progress'` before
    // clearing. While the server is still computing, any match we see is
    // almost certainly from our own optimistic write, not the server's
    // authoritative state. Once calc_status flips to 'idle' AND items
    // match, the override has truly landed and pending is safe to clear.
    useEffect(() => {
        if (pendingTours.size === 0) return
        const raw = queryClient.getQueryData<TripBudget>(queryKey)
        if (!raw) return
        if (raw.calculation_status === 'in_progress') return
        const resolved: string[] = []
        for (const [slotId, tourId] of pendingTours) {
            for (const day of raw.days) {
                const item = day.items.find((i) => i.slot_id === slotId)
                if (item && item.selected_tour_id === tourId) {
                    resolved.push(slotId)
                    break
                }
            }
        }
        if (resolved.length === 0) return
        setPendingTours((prev) => {
            const next = new Map(prev)
            for (const slotId of resolved) next.delete(slotId)
            return next
        })
    }, [query.data, pendingTours, queryClient, queryKey])

    // Clear a pending exclusion only once the server reflects it AND recalc
    // has finished. Same reasoning as the pendingTours clear guard: while
    // calc_status is in_progress, any match may be our own optimistic write,
    // and clearing early would let a racing polled GET overwrite it.
    useEffect(() => {
        if (pendingExclusions.size === 0) return
        const raw = queryClient.getQueryData<TripBudget>(queryKey)
        if (!raw) return
        if (raw.calculation_status === 'in_progress') return
        const serverExcluded = new Set(raw.excluded_activities)
        const resolved: string[] = []
        for (const [slotId, action] of pendingExclusions) {
            if (action === 'exclude' && serverExcluded.has(slotId)) resolved.push(slotId)
            else if (action === 'include' && !serverExcluded.has(slotId)) resolved.push(slotId)
        }
        if (resolved.length === 0) return
        setPendingExclusions((prev) => {
            const next = new Map(prev)
            for (const slotId of resolved) next.delete(slotId)
            return next
        })
    }, [query.data, pendingExclusions, queryClient, queryKey])

    // Clear a pending stay-provider pick only when recalc is idle AND the raw
    // cached stays[] shows the new provider. Early-clearing before the polled
    // GET lands would let the server's stale selected_provider overwrite the
    // optimistic pick.
    useEffect(() => {
        if (pendingStayProviders.size === 0) return
        const raw = queryClient.getQueryData<TripBudget>(queryKey)
        if (!raw) return
        if (raw.calculation_status === 'in_progress') return
        const resolved: string[] = []
        for (const [cityId, provider] of pendingStayProviders) {
            const stay = raw.stays.find((s) => s.city_id === cityId)
            if (!stay) continue
            if ((stay.selected_provider ?? null) === provider) resolved.push(cityId)
        }
        if (resolved.length === 0) return
        setPendingStayProviders((prev) => {
            const next = new Map(prev)
            for (const cityId of resolved) next.delete(cityId)
            return next
        })
    }, [query.data, pendingStayProviders, queryClient, queryKey])

    const refresh = () => {
        if (!identifier) return
        queryClient.invalidateQueries({ queryKey: ['tripBudget', identifier] })
    }

    const forceRecalculate = async () => {
        if (!identifier) return
        // UI#3 / UI#7 — flip to in_progress immediately so the Recalculate button + section
        // shimmers light up while the network call is in flight, not just after it returns.
        queryClient.setQueryData<TripBudget>(queryKey, (old) => {
            if (!old) return old
            return {
                ...old,
                calculation_status: 'in_progress',
                recalculation_trigger: { type: 'full_recalculate' }
            }
        })
        const data = isPublic ? await budgetApi.getPublicBudget(identifier, true) : await budgetApi.getBudget(identifier, true)
        queryClient.setQueryData(queryKey, data)
        queryClient.invalidateQueries({ queryKey: ['traveler-collection-flight-prices', identifier] })
    }

    const setActivityOverride = async (action: 'exclude' | 'include' | 'swap', slotId: string, newEntityId?: string) => {
        if (!identifier) return

        // Register the pending exclude/include first so any polled refetch
        // that races ahead of the PATCH keeps the override applied via
        // `select`. Swap is a different action (entity replacement) and is
        // handled by the backend patching days[].items[]; no pending marker
        // needed.
        if (action === 'exclude' || action === 'include') {
            setPendingExclusions((prev) => {
                const next = new Map(prev)
                next.set(slotId, action)
                return next
            })
        }

        // UI#3 — optimistically reflect the exclude in the cache so the card disappears
        // immediately AND the section/overview shimmers turn on. The polling refetch
        // (every 1s while in_progress) will reconcile to the server's authoritative state.
        queryClient.setQueryData<TripBudget>(queryKey, (old) => {
            if (!old) return old
            const excluded = new Set(old.excluded_activities)
            if (action === 'exclude') excluded.add(slotId)
            else if (action === 'include') excluded.delete(slotId)
            return {
                ...old,
                calculation_status: 'in_progress',
                recalculation_trigger: { type: 'activity_override', slot_id: slotId, action },
                excluded_activities: Array.from(excluded)
            }
        })

        try {
            const data = await budgetApi.patchActivity(identifier, action, slotId, newEntityId)
            queryClient.setQueryData(queryKey, data)
        } catch (err) {
            if (action === 'exclude' || action === 'include') {
                setPendingExclusions((prev) => {
                    const next = new Map(prev)
                    next.delete(slotId)
                    return next
                })
            }
            throw err
        }
    }

    const setStayProviderOverride = async (cityId: string, provider: string | null) => {
        if (!identifier) return
        const previous = queryClient.getQueryData<TripBudget>(queryKey)

        // Register pending first so any polled refetch re-applies the pick via
        // `select` even if it returns before the PATCH persists.
        setPendingStayProviders((prev) => {
            const next = new Map(prev)
            next.set(cityId, provider)
            return next
        })

        if (previous) {
            queryClient.setQueryData<TripBudget>(queryKey, (old) => {
                if (!old) return old
                return {
                    ...old,
                    calculation_status: 'in_progress' as const,
                    recalculation_trigger: { type: 'stay_provider' as const, city_id: cityId, provider },
                    stays: old.stays.map((s) => (s.city_id === cityId ? { ...s, selected_provider: provider } : s))
                }
            })
        }

        try {
            if (isPublic) {
                await budgetApi.patchPublicStayProvider(identifier, cityId, provider)
            } else {
                await budgetApi.patchStayProvider(identifier, cityId, provider)
            }
        } catch {
            if (previous) queryClient.setQueryData(queryKey, previous)
            setPendingStayProviders((prev) => {
                const next = new Map(prev)
                next.delete(cityId)
                return next
            })
        }
    }

    const setActivityTourOverride = async (slotId: string, tourId: string | null) => {
        if (!identifier) return
        const previous = queryClient.getQueryData<TripBudget>(queryKey)

        // Register the pending override first so any polled refetch picks it
        // up via `select` even if it races ahead of our own setQueryData below.
        setPendingTours((prev) => {
            const next = new Map(prev)
            next.set(slotId, tourId)
            return next
        })

        if (previous) {
            queryClient.setQueryData<TripBudget>(queryKey, (old) => {
                if (!old) return old
                let dayNumber: number | undefined
                for (const day of old.days) {
                    if (day.items.some((item) => item.slot_id === slotId)) {
                        dayNumber = day.day_number
                        break
                    }
                }
                return {
                    ...applyOneTourOverride(old, slotId, tourId),
                    calculation_status: 'in_progress' as const,
                    recalculation_trigger: {
                        type: 'activity_tour' as const,
                        slot_id: slotId,
                        tour_id: tourId,
                        day_number: dayNumber
                    }
                }
            })
        }

        try {
            const data = isPublic
                ? await budgetApi.patchPublicActivityTour(identifier, slotId, tourId)
                : await budgetApi.patchActivityTour(identifier, slotId, tourId)
            // Write server response, but keep our override re-applied in case
            // the backend's recalc hasn't yet pushed selected_tour_id down into
            // days[].items[]. The pending-tour effect will clear the entry
            // once raw data matches.
            queryClient.setQueryData(queryKey, applyOneTourOverride(data, slotId, tourId))
        } catch {
            if (previous) queryClient.setQueryData(queryKey, previous)
            setPendingTours((prev) => {
                const next = new Map(prev)
                next.delete(slotId)
                return next
            })
        }
    }

    const setFlightProviderOverride = async (sectionId: string, provider: string | null) => {
        if (!identifier) return
        const previous = queryClient.getQueryData<TripBudget>(queryKey)

        if (previous) {
            queryClient.setQueryData<TripBudget>(queryKey, (old) => {
                if (!old) return old
                return {
                    ...old,
                    calculation_status: 'in_progress' as const,
                    recalculation_trigger: { type: 'flight_provider' as const, section_id: sectionId, provider },
                    flights: old.flights.map((f) => (f.section_id === sectionId ? { ...f, selected_provider: provider } : f))
                }
            })
        }

        try {
            if (isPublic) {
                await budgetApi.patchPublicFlightProvider(identifier, sectionId, provider)
            } else {
                await budgetApi.patchFlightProvider(identifier, sectionId, provider)
            }
        } catch {
            if (previous) queryClient.setQueryData(queryKey, previous)
        }
    }

    return {
        budget: query.data,
        isLoading: query.isLoading,
        isError: query.isError,
        isStale: query.data?.is_stale ?? false,
        // UI-facing flag — respects the 15s soft timeout so a stuck
        // backend calc_status doesn't leave "Updating prices…" on screen
        // forever. Consumers that need the raw server status (e.g. to
        // decide whether to write to the cache) can still compute it
        // from `budget.calculation_status`.
        isRecalculating: query.data?.calculation_status === 'in_progress' && !recalcTimedOut,
        refresh,
        forceRecalculate,
        setActivityOverride,
        setStayProviderOverride,
        setActivityTourOverride,
        setFlightProviderOverride
    }
}
