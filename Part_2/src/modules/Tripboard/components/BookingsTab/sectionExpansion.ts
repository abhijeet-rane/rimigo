import { createContext, useContext } from 'react'

/** Lets CategorySection report its open/closed state up to BookingsTab so the
 *  ExpertBanner can match the content background (grey when any section is
 *  expanded, white when all collapsed). */
export const ReportSectionOpenContext = createContext<((key: string, open: boolean) => void) | null>(null)

export const useReportSectionOpen = () => useContext(ReportSectionOpenContext)
