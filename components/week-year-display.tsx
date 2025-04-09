import { Clock, Calendar } from "lucide-react"
import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"

interface WeekYearDisplayProps {
  week: number;
  year: number;
}

export function WeekYearDisplay({ week, year }: WeekYearDisplayProps) {
  const [today, setToday] = useState<Date>(new Date());
  
  // Update today's date every day
  useEffect(() => {
    const timer = setInterval(() => {
      setToday(new Date());
    }, 1000 * 60 * 60 * 24); // Update once per day
    
    return () => clearInterval(timer);
  }, []);
  
  // Calculate start and end date of the displayed week
  const getWeekDates = () => {
    // January 1st of the year
    const firstDayOfYear = new Date(year, 0, 1);
    
    // Calculate the first day of the week
    // Add (week - 1) weeks to January 1st, then adjust to previous Monday
    const dayOfWeek = firstDayOfYear.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const daysToAdd = (week - 1) * 7 - (dayOfWeek === 0 ? 6 : dayOfWeek - 1);
    
    const startDate = new Date(year, 0, 1 + daysToAdd);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
    
    return {
      start: startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      end: endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    };
  };
  
  const { start, end } = getWeekDates();
  
  return (
    <Card className="bg-muted/50">
      <CardContent className="p-4 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm font-medium">Week {week}, {year}</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">{start} - {end}</span>
        </div>
      </CardContent>
    </Card>
  )
} 