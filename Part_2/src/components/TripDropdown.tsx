import { BEACH_TREE } from "@/constants/icons/svgFromCDN"
import { TRIP_ROLE_CO_TRAVELER, TRIP_ROLE_INVITED, TRIP_ROLE_OWNER } from "@/constants/userConfig"
import { formatCapitalizeFirstLetter, formatTripDropdownData } from "@/utils/tripFormatters"
import { LogOut, Pencil, Plus } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { useQueryClient } from "@tanstack/react-query"
import EditTripNameModal from "@/components/common/EditTripNameModal"
import LeaveTripModal from "@/components/common/LeaveTripModal"
import { leaveTrip } from "@/api/tripInviteAPI/tripInviteAPI"
import { useUserInfo } from "@/hooks/useUserInfo"
import type { TravelerTrip } from "@/pages/Landing/api/travelerTrips"

type TripDropdownProps = {
  tripsList: any[]
  tripFlagsMap: Record<string, any>
  activeTripId?: string | null
  onSelectTrip: (tripId: string) => void
  containerClassName: string
  buttonClassName?: (isActive: boolean) => string
  onCreateTrip?: () => void
}

const TripDropdown = ({
  tripsList,
  tripFlagsMap,
  activeTripId,
  onSelectTrip,
  containerClassName,
  buttonClassName,
  onCreateTrip,
}: TripDropdownProps) => {
    const [editingTrip, setEditingTrip] = useState<TravelerTrip | null>(null)
    const [editAnchorRect, setEditAnchorRect] = useState<DOMRect | null>(null)
    const [tripToLeave, setTripToLeave] = useState<TravelerTrip | null>(null)
    const [isLeavingTrip, setIsLeavingTrip] = useState(false)
    const { user, isRimigoInternal } = useUserInfo()
    const queryClient = useQueryClient()

    const openEditTripName = (e: React.MouseEvent<HTMLButtonElement>, trip: any) => {
        e.stopPropagation()
        setEditAnchorRect(e.currentTarget.getBoundingClientRect())
        setEditingTrip(trip as TravelerTrip)
    }

    const openLeaveTrip = (e: React.MouseEvent<HTMLButtonElement>, trip: any) => {
        e.stopPropagation()
        setTripToLeave(trip as TravelerTrip)
    }

    const handleConfirmLeave = async () => {
        if (!tripToLeave || isLeavingTrip) return
        setIsLeavingTrip(true)
        try {
            await leaveTrip(tripToLeave.trip_id)
            toast.success('You have left the trip')
            setTripToLeave(null)
            if (user?.id) {
                await queryClient.invalidateQueries({ queryKey: ['travelerTrips', user.id] })
            }
        } catch (error: any) {
            toast.error(error?.message || 'Failed to leave trip')
        } finally {
            setIsLeavingTrip(false)
        }
    }

    return (
      <div className={containerClassName}>
        {/* Scrollable trips list. `data-overlay-scroll` marks this as an
            overlay scroll context so global hide-on-scroll listeners
            (useHideOnScrollDown) ignore events bubbling out of it. */}
        <div className="overflow-auto max-h-52 scrollbar-hide" data-overlay-scroll>
          {(() => {
          const sortTripsLatestFirst = (trips: typeof tripsList) =>
            [...trips].sort((a, b) => {
              if (a.trip_id === activeTripId) return -1
              if (b.trip_id === activeTripId) return 1
              const aCreated = a.trip_preference?.created_at ?? ''
              const bCreated = b.trip_preference?.created_at ?? ''
              return bCreated.localeCompare(aCreated)
            })

          const yourTrips = sortTripsLatestFirst(
            tripsList.filter(
              (trip) =>
                trip.role === TRIP_ROLE_OWNER ||
                trip.role === TRIP_ROLE_CO_TRAVELER ||
                !trip.role
            )
          )

          const invitedTrips = sortTripsLatestFirst(
            tripsList.filter((trip) => trip.role === TRIP_ROLE_INVITED)
          )

            return (
              <>
                {/* Your Trips Section */}
                {yourTrips.length > 0 && (
                  <>
                    <div className="px-4 py-2 bg-[#F8F8F8] border-b border-[#EDEDED] rounded-t-md">
                      <span className="text-xs font-semibold text-[#747474] uppercase tracking-wider">
                        My Trips
                      </span>
                    </div>
                    {yourTrips.map((t) => {
                      const flagData = tripFlagsMap[t.trip_id]
                      const isActive = t.trip_id === activeTripId
                      const canRename = t.role === TRIP_ROLE_OWNER || !t.role
                      // Apply the caller's row styling on the WRAPPER so the
                      // active background spans the whole row (name + pencil),
                      // not just the inner button — otherwise the name reads as
                      // a chip with white space next to it.
                      const rowClass = buttonClassName
                        ? buttonClassName(isActive)
                        : 'w-full px-2 py-2 text-left hover:bg-gray-100 flex items-center gap-1 border-b border-[#EDEDED]'

                      return (
                        <div
                          key={t.trip_id}
                          className={`${rowClass} relative`}
                        >
                          <button
                            type="button"
                            className="flex-1 min-w-0 flex items-center gap-3 text-left bg-transparent cursor-pointer"
                            onClick={() => onSelectTrip(t.trip_id)}
                          >
                            <div className="flex items-center justify-center -space-x-1 shrink-0 w-8">
                              {flagData?.flags?.length ? (
                                flagData.flags.map((flagUrl: string, i: number) => (
                                  <img
                                    key={i}
                                    src={flagUrl}
                                    alt="flag"
                                    className="w-5 h-5 rounded-full object-cover border-[2px] border-white"
                                    style={{ zIndex: flagData.flags.length - i }}
                                  />
                                ))
                              ) : (
                                <img
                                  src={BEACH_TREE}
                                  alt="flag"
                                  className="w-5 h-5 rounded-full object-cover"
                                />
                              )}
                            </div>
                            <div className="flex flex-col justify-center gap-0.5 min-w-0">
                              <span className="font-red-hat-display truncate">
                                {formatCapitalizeFirstLetter(t)}
                              </span>
                              <span className="text-[10px] font-manrope text-grey-2 truncate">
                                {formatTripDropdownData(t)}
                              </span>
                            </div>
                          </button>
                          {canRename && (
                            <button
                              type="button"
                              aria-label="Edit trip name"
                              onClick={(e) => openEditTripName(e, t)}
                              className="ml-2 p-1.5 rounded-md text-grey-2 hover:text-primary-default hover:bg-white/60 transition-colors cursor-pointer shrink-0"
                            >
                              <Pencil size={14} />
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </>
                )}

                {/* Invited Trips Section */}
                {invitedTrips.length > 0 && (
                  <>
                    <div className="px-4 py-2 bg-[#F8F8F8] border-b border-[#EDEDED] border-t border-[#EDEDED]">
                      <span className="text-xs font-semibold text-[#747474] uppercase tracking-wider">
                        Invited Trips
                      </span>
                    </div>
                    {invitedTrips.map((t) => {
                      const flagData = tripFlagsMap[t.trip_id]
                      const isActive = t.trip_id === activeTripId
                      const rowClass = buttonClassName
                        ? buttonClassName(isActive)
                        : 'w-full px-2 py-2 text-left hover:bg-gray-100 flex items-center gap-1 border-b border-[#EDEDED]'

                      return (
                        <div key={t.trip_id} className={`${rowClass} relative`}>
                          <button
                            type="button"
                            className="flex-1 min-w-0 flex items-center gap-1 text-left bg-transparent cursor-pointer"
                            onClick={() => onSelectTrip(t.trip_id)}
                          >
                            <div className="flex items-center justify-center -space-x-1 shrink-0 w-14">
                              {flagData?.flags?.length ? (
                                flagData.flags.map((flagUrl: string, i: number) => (
                                  <img
                                    key={i}
                                    src={flagUrl}
                                    alt="flag"
                                    className="w-5 h-5 rounded-full object-cover border-[2px] border-white"
                                    style={{ zIndex: flagData.flags.length - i }}
                                  />
                                ))
                              ) : (
                                <img
                                  src={BEACH_TREE}
                                  alt="flag"
                                  className="w-5 h-5 rounded-full object-cover"
                                />
                              )}
                            </div>
                            <div className="flex flex-col justify-center min-w-0">
                              <span className="font-red-hat-display truncate">
                                {formatCapitalizeFirstLetter(t)}
                              </span>
                              <span className="text-[10px] font-manrope text-grey-2 truncate">
                                {formatTripDropdownData(t)}
                              </span>
                            </div>
                          </button>
                          {isRimigoInternal && (
                            <button
                              type="button"
                              aria-label="Leave trip"
                              onClick={(e) => openLeaveTrip(e, t)}
                              className="ml-2 p-1.5 rounded-md text-red-500 hover:text-red-600 hover:bg-white/60 transition-colors cursor-pointer shrink-0"
                            >
                              <LogOut size={14} />
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </>
                )}

                {yourTrips.length === 0 && invitedTrips.length === 0 && (
                  <div className="px-4 py-3 text-center text-sm text-[#747474]">
                    No trips available
                  </div>
                )}
              </>
            )
          })()}
        </div>

        <EditTripNameModal
          isOpen={!!editingTrip}
          onClose={() => { setEditingTrip(null); setEditAnchorRect(null) }}
          trip={editingTrip ?? undefined}
          anchorRect={editAnchorRect}
        />

        <LeaveTripModal
          isOpen={!!tripToLeave}
          isLeaving={isLeavingTrip}
          tripName={tripToLeave ? formatCapitalizeFirstLetter(tripToLeave) : null}
          onCancel={() => { if (!isLeavingTrip) setTripToLeave(null) }}
          onConfirm={handleConfirmLeave}
        />

        {/* Create New Trip — always visible, never scrolls away */}
        {onCreateTrip && (
          <button
            onClick={onCreateTrip}
            className="w-full px-4 py-4 flex items-center gap-2 hover:bg-[#F8F8F8] transition-colors text-primary-default border-t border-[#EDEDED] bg-white shrink-0 rounded-b-xl"
          >
            <Plus className="w-5 h-5 md:w-4 md:h-4" />
            <span className="text-base md:text-sm font-bold font-red-hat-display">
              CREATE NEW TRIP
            </span>
          </button>
        )}
      </div>
    )
}

export default TripDropdown
