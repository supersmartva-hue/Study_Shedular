interface StudyItemForPlanning {
  id:          string;
  title:       string;
  priorityPct: number;
  deadline:    Date | null;
}

interface ScheduleSuggestion {
  studyItemId:   string;
  title:         string;
  dailyHours:    number;
  priorityLabel: string;
  daysLeft:      number | null;
}

export function calculateSchedule(
  items:            StudyItemForPlanning[],
  availableHoursPerDay: number = 6
): ScheduleSuggestion[] {
  const now = Date.now();

  const weighted = items.map(item => {
    const daysLeft = item.deadline
      ? Math.max(1, Math.ceil((item.deadline.getTime() - now) / 86_400_000))
      : null;

    // urgency: higher priority + fewer days = more weight
    const urgency = daysLeft ? item.priorityPct / daysLeft : item.priorityPct / 100;
    return { ...item, daysLeft, urgency };
  });

  const totalUrgency = weighted.reduce((s, i) => s + i.urgency, 0) || 1;

  return weighted.map(item => {
    const fraction   = item.urgency / totalUrgency;
    const dailyHours = Math.max(0.5, Math.round(fraction * availableHoursPerDay * 10) / 10);
    const label      = item.priorityPct >= 75 ? 'High'
                     : item.priorityPct >= 40 ? 'Medium'
                     : 'Low';

    return {
      studyItemId:   item.id,
      title:         item.title,
      dailyHours,
      priorityLabel: label,
      daysLeft:      item.daysLeft,
    };
  }).sort((a, b) => b.dailyHours - a.dailyHours);
}
