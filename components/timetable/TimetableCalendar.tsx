"use client"

import React from "react"
import Link from "next/link"

export type CalendarEntry = {
  id: string
  dayOfWeek: number
  startTime: Date
  endTime: Date
  title: string
  subtitle: string
  room: string
  href?: string
}

interface TimetableCalendarProps {
  entries: CalendarEntry[]
  startHour?: number
  endHour?: number
  visibleDays?: number[]
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
const HOUR_HEIGHT = 80 // pixels per hour

function getMinutesFromMidnight(date: Date) {
  return date.getHours() * 60 + date.getMinutes()
}

function formatTime(date: Date) {
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
}

export function TimetableCalendar({
  entries,
  startHour = 9,
  endHour = 17,
  visibleDays = [1, 2, 3, 4, 5, 6], // Mon-Sat
}: TimetableCalendarProps) {
  const totalHours = endHour - startHour
  const gridHeight = totalHours * HOUR_HEIGHT

  // Generate hour labels (e.g., 9 AM, 10 AM)
  const hours = Array.from({ length: totalHours + 1 }, (_, i) => startHour + i)

  return (
    <div className="flex flex-col bg-surface border border-border rounded-lg overflow-hidden shadow-sm">
      {/* Header (Days) */}
      <div className="flex border-b border-border bg-bg/50">
        <div className="w-16 shrink-0 border-r border-border" /> {/* Time column header spacer */}
        {visibleDays.map((dayIdx) => (
          <div key={dayIdx} className="flex-1 text-center py-3 text-sm font-semibold text-ink border-r border-border last:border-r-0">
            {DAYS[dayIdx]}
          </div>
        ))}
      </div>

      {/* Grid Body */}
      <div className="flex overflow-y-auto" style={{ height: "650px" }}>
        
        {/* Time Column */}
        <div className="w-16 shrink-0 border-r border-border bg-bg/20 relative" style={{ height: gridHeight }}>
          {hours.map((hour, i) => (
            <div 
              key={hour} 
              className="absolute w-full text-right pr-2 text-[11px] text-muted font-medium"
              style={{ top: `${i * HOUR_HEIGHT - 8}px` }}
            >
              {hour === 12 ? "12 PM" : hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
            </div>
          ))}
        </div>

        {/* Days Columns */}
        <div className="flex-1 flex relative" style={{ height: gridHeight }}>
          
          {/* Background Grid Lines */}
          <div className="absolute inset-0 pointer-events-none">
            {hours.slice(0, -1).map((_, i) => (
              <div 
                key={i} 
                className="w-full border-b border-border/40"
                style={{ height: HOUR_HEIGHT }}
              />
            ))}
          </div>

          {/* Render Days */}
          {visibleDays.map((dayIdx) => {
            const dayEntries = entries
              .filter((e) => e.dayOfWeek === dayIdx)
              .map((entry) => ({
                ...entry,
                startMins: getMinutesFromMidnight(entry.startTime),
                endMins: getMinutesFromMidnight(entry.endTime),
              }))
              .sort((a, b) => a.startMins - b.startMins || b.endMins - a.endMins)

            // Group into clusters of overlapping events
            const clusters: (typeof dayEntries)[] = []
            let currentCluster: typeof dayEntries = []
            let clusterEnd = 0

            for (const entry of dayEntries) {
              if (currentCluster.length === 0) {
                currentCluster.push(entry)
                clusterEnd = entry.endMins
              } else if (entry.startMins < clusterEnd) {
                currentCluster.push(entry)
                clusterEnd = Math.max(clusterEnd, entry.endMins)
              } else {
                clusters.push(currentCluster)
                currentCluster = [entry]
                clusterEnd = entry.endMins
              }
            }
            if (currentCluster.length > 0) {
              clusters.push(currentCluster)
            }

            // Assign columns within each cluster
            const placedEntries = []
            for (const cluster of clusters) {
              const cols: (typeof dayEntries)[] = []
              for (const entry of cluster) {
                let placed = false
                for (let i = 0; i < cols.length; i++) {
                  if (cols[i][cols[i].length - 1].endMins <= entry.startMins) {
                    cols[i].push(entry)
                    ;(entry as any).col = i
                    placed = true
                    break
                  }
                }
                if (!placed) {
                  ;(entry as any).col = cols.length
                  cols.push([entry])
                }
              }
              for (const entry of cluster) {
                ;(entry as any).totalCols = cols.length
                placedEntries.push(entry)
              }
            }

            return (
              <div key={dayIdx} className="flex-1 border-r border-border/40 last:border-r-0 relative">
                {placedEntries.map((entry: any) => {
                  // Calculate absolute position based on startHour
                  const top = ((entry.startMins - startHour * 60) / 60) * HOUR_HEIGHT
                  const height = ((entry.endMins - entry.startMins) / 60) * HOUR_HEIGHT
                  
                  const width = `${100 / entry.totalCols}%`
                  const left = `${entry.col * (100 / entry.totalCols)}%`

                  // Skip rendering if completely outside the grid limits
                  if (top + height <= 0 || top >= gridHeight) return null

                  const content = (
                    <div 
                      className="w-full h-full p-2 rounded bg-primary/10 border-l-[3px] border-primary hover:bg-primary/20 hover:border-primary-hover transition-colors shadow-sm overflow-hidden flex flex-col gap-0.5"
                    >
                      <div className="text-[12px] font-bold text-primary truncate leading-tight">
                        {entry.title}
                      </div>
                      <div className="text-[11px] text-ink/80 truncate leading-tight">
                        {entry.subtitle}
                      </div>
                      <div className="mt-auto text-[10px] text-muted font-medium flex justify-between items-end">
                        <span className="truncate mr-1">{formatTime(entry.startTime)}</span>
                        <span className="shrink-0 rounded bg-bg px-1 border border-border">{entry.room}</span>
                      </div>
                    </div>
                  )

                  return (
                    <div
                      key={entry.id}
                      className="absolute px-1 py-0.5 z-10 hover:z-20"
                      style={{ top, height, width, left }}
                    >
                      {entry.href ? (
                        <Link href={entry.href} className="block w-full h-full">
                          {content}
                        </Link>
                      ) : (
                        content
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
