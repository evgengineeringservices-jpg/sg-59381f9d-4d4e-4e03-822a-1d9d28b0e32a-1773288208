import { useEffect, useRef, useState } from "react";
import { format, differenceInDays, addDays, startOfMonth, endOfMonth, eachDayOfInterval, eachMonthOfInterval, eachWeekOfInterval, startOfWeek } from "date-fns";
import type { PlanningPhase } from "@/types";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface GanttChartProps {
  phases: PlanningPhase[];
  onPhaseClick?: (phase: PlanningPhase) => void;
  onPhaseDateChange?: (phaseId: string, newStartDate: Date, newEndDate: Date) => void;
}

export function GanttChart({ phases, onPhaseClick, onPhaseDateChange }: GanttChartProps) {
  const [viewMode, setViewMode] = useState<"day" | "week" | "month">("week");
  const [viewStart, setViewStart] = useState<Date>(() => {
    if (phases.length === 0) return startOfMonth(new Date());
    const dates = phases.map(p => new Date(p.startDate));
    const earliest = new Date(Math.min(...dates.map(d => d.getTime())));
    return startOfMonth(earliest);
  });
  const [draggingPhase, setDraggingPhase] = useState<{ phase: PlanningPhase; handle: "start" | "end" | "body" } | null>(null);
  const [dragStartX, setDragStartX] = useState(0);
  const chartRef = useRef<HTMLDivElement>(null);

  // Calculate date range for view
  const viewEnd = endOfMonth(addDays(viewStart, viewMode === "month" ? 180 : viewMode === "week" ? 90 : 45));
  
  // Get all dates/periods in view
  const timeUnits = viewMode === "day" 
    ? eachDayOfInterval({ start: viewStart, end: viewEnd })
    : viewMode === "week"
    ? eachWeekOfInterval({ start: viewStart, end: viewEnd }, { weekStartsOn: 1 })
    : eachMonthOfInterval({ start: viewStart, end: viewEnd });

  const months = eachMonthOfInterval({ start: viewStart, end: viewEnd });

  // Calculate position and width for a phase
  const getPhaseLayout = (phase: PlanningPhase) => {
    const start = new Date(phase.startDate);
    const end = new Date(phase.endDate);
    const daysFromStart = differenceInDays(start, viewStart);
    const duration = differenceInDays(end, start) + 1;
    
    const unitWidth = viewMode === "day" ? 40 : viewMode === "week" ? 80 : 120;
    const unitsFromStart = viewMode === "day" 
      ? daysFromStart 
      : viewMode === "week"
      ? Math.floor(daysFromStart / 7)
      : differenceInDays(startOfMonth(start), viewStart) / 30;
    
    const unitDuration = viewMode === "day"
      ? duration
      : viewMode === "week"
      ? duration / 7
      : duration / 30;

    return {
      left: unitsFromStart * unitWidth,
      width: Math.max(unitDuration * unitWidth, 20),
    };
  };

  // Status colors
  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-500";
      case "in_progress": return "bg-blue-500";
      case "delayed": return "bg-red-500";
      default: return "bg-gray-400";
    }
  };

  // Handle drag operations
  const handleMouseDown = (e: React.MouseEvent, phase: PlanningPhase, handle: "start" | "end" | "body") => {
    e.preventDefault();
    setDraggingPhase({ phase, handle });
    setDragStartX(e.clientX);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!draggingPhase || !onPhaseDateChange) return;

    const deltaX = e.clientX - dragStartX;
    const unitWidth = viewMode === "day" ? 40 : viewMode === "week" ? 80 : 120;
    const unitDelta = Math.round(deltaX / unitWidth);
    
    if (unitDelta === 0) return;

    const daysToMove = viewMode === "day" ? unitDelta : viewMode === "week" ? unitDelta * 7 : unitDelta * 30;
    
    const { phase, handle } = draggingPhase;
    const start = new Date(phase.startDate);
    const end = new Date(phase.endDate);

    let newStart = start;
    let newEnd = end;

    if (handle === "start") {
      newStart = addDays(start, daysToMove);
      if (newStart >= end) newStart = addDays(end, -1);
    } else if (handle === "end") {
      newEnd = addDays(end, daysToMove);
      if (newEnd <= start) newEnd = addDays(start, 1);
    } else {
      newStart = addDays(start, daysToMove);
      newEnd = addDays(end, daysToMove);
    }

    onPhaseDateChange(phase.id, newStart, newEnd);
    setDragStartX(e.clientX);
  };

  const handleMouseUp = () => {
    setDraggingPhase(null);
  };

  useEffect(() => {
    if (draggingPhase) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [draggingPhase]);

  // Navigate timeline
  const navigateTimeline = (direction: "prev" | "next") => {
    const offset = viewMode === "month" ? 90 : viewMode === "week" ? 30 : 14;
    setViewStart(prev => addDays(prev, direction === "next" ? offset : -offset));
  };

  if (phases.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 border-2 border-dashed rounded-xl">
        <p className="text-muted-foreground">No phases to display. Generate or create phases first.</p>
      </div>
    );
  }

  const unitWidth = viewMode === "day" ? 40 : viewMode === "week" ? 80 : 120;

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigateTimeline("prev")}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setViewStart(startOfMonth(new Date()))}>
            Today
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigateTimeline("next")}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === "day" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("day")}
          >
            Day
          </Button>
          <Button
            variant={viewMode === "week" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("week")}
          >
            Week
          </Button>
          <Button
            variant={viewMode === "month" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("month")}
          >
            Month
          </Button>
        </div>
      </div>

      {/* Gantt Chart */}
      <div className="border rounded-xl overflow-hidden bg-card">
        <div className="overflow-x-auto" ref={chartRef}>
          <div style={{ minWidth: timeUnits.length * unitWidth + 300 }}>
            {/* Month Headers */}
            <div className="flex border-b bg-muted/50">
              <div className="w-[300px] shrink-0 p-3 font-semibold border-r">
                Phase Name
              </div>
              <div className="flex">
                {months.map((month, idx) => {
                  const monthDays = differenceInDays(endOfMonth(month), startOfMonth(month)) + 1;
                  const monthUnits = viewMode === "day" 
                    ? monthDays 
                    : viewMode === "week"
                    ? Math.ceil(monthDays / 7)
                    : 1;
                  return (
                    <div
                      key={idx}
                      className="border-r px-2 py-2 text-center font-medium text-sm"
                      style={{ width: monthUnits * unitWidth }}
                    >
                      {format(month, "MMM yyyy")}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Time Unit Headers */}
            <div className="flex border-b bg-muted/30">
              <div className="w-[300px] shrink-0 border-r" />
              <div className="flex">
                {timeUnits.map((unit, idx) => (
                  <div
                    key={idx}
                    className="border-r px-1 py-1 text-center text-xs text-muted-foreground"
                    style={{ width: unitWidth }}
                  >
                    {viewMode === "day" && format(unit, "d")}
                    {viewMode === "week" && `W${format(unit, "w")}`}
                    {viewMode === "month" && format(unit, "MMM")}
                  </div>
                ))}
              </div>
            </div>

            {/* Phase Rows */}
            {phases.map((phase) => {
              const layout = getPhaseLayout(phase);
              return (
                <div key={phase.id} className="flex border-b hover:bg-muted/20 group">
                  {/* Phase Info */}
                  <div className="w-[300px] shrink-0 p-3 border-r space-y-1">
                    <div className="font-medium text-sm truncate">{phase.name}</div>
                    <div className="flex items-center gap-2 text-xs">
                      <Badge variant={phase.status === "completed" ? "default" : "secondary"} className="text-[10px]">
                        {phase.status.replace("_", " ")}
                      </Badge>
                      {phase.isMilestone && (
                        <Badge variant="outline" className="text-[10px]">
                          Milestone
                        </Badge>
                      )}
                      <span className="text-muted-foreground">{phase.progress}%</span>
                    </div>
                  </div>

                  {/* Timeline */}
                  <div className="flex-1 relative py-4" style={{ minHeight: 64 }}>
                    {/* Grid lines */}
                    <div className="absolute inset-0 flex">
                      {timeUnits.map((_, idx) => (
                        <div
                          key={idx}
                          className="border-r border-muted/30"
                          style={{ width: unitWidth }}
                        />
                      ))}
                    </div>

                    {/* Phase Bar */}
                    <div
                      className={cn(
                        "absolute h-8 rounded-md top-1/2 -translate-y-1/2 cursor-pointer transition-all",
                        getStatusColor(phase.status),
                        "hover:brightness-110 shadow-sm",
                        draggingPhase?.phase.id === phase.id && "opacity-70"
                      )}
                      style={{
                        left: layout.left,
                        width: layout.width,
                      }}
                      onClick={() => onPhaseClick?.(phase)}
                      onMouseDown={(e) => handleMouseDown(e, phase, "body")}
                    >
                      {/* Progress Fill */}
                      <div
                        className="absolute inset-0 bg-white/20 rounded-md"
                        style={{ width: `${phase.progress}%` }}
                      />

                      {/* Phase Label */}
                      <div className="absolute inset-0 flex items-center px-2 text-white text-xs font-medium truncate">
                        {phase.name}
                      </div>

                      {/* Resize Handles */}
                      {onPhaseDateChange && (
                        <>
                          <div
                            className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/30"
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              handleMouseDown(e, phase, "start");
                            }}
                          />
                          <div
                            className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/30"
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              handleMouseDown(e, phase, "end");
                            }}
                          />
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-gray-400" />
          <span>Not Started</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-blue-500" />
          <span>In Progress</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-green-500" />
          <span>Completed</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-red-500" />
          <span>Delayed</span>
        </div>
      </div>
    </div>
  );
}