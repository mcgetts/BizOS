import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format, addDays, isToday, isTomorrow } from "date-fns";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  ArrowRight,
  Building2,
  Briefcase,
  Star,
  AlertCircle,
} from "lucide-react";

interface Event {
  id: string;
  title: string;
  description?: string;
  date: Date;
  type: 'meeting' | 'deadline' | 'milestone' | 'client' | 'internal' | 'holiday';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  location?: string;
  attendees?: string[];
  category: 'company' | 'project' | 'client' | 'personal';
}

export function UpcomingEventsWidget() {
  // Mock events data - in a real app, this would come from an API
  const generateMockEvents = (): Event[] => {
    const today = new Date();
    return [
      {
        id: '1',
        title: 'Project Review Meeting',
        description: 'Quarterly project performance review',
        date: addDays(today, 1),
        type: 'meeting',
        priority: 'high',
        location: 'Conference Room A',
        attendees: ['John Doe', 'Jane Smith'],
        category: 'company',
      },
      {
        id: '2',
        title: 'Client Presentation',
        description: 'Present new features to TechCorp',
        date: addDays(today, 3),
        type: 'client',
        priority: 'urgent',
        location: 'Client Office',
        attendees: ['Marketing Team'],
        category: 'client',
      },
      {
        id: '3',
        title: 'Sprint Planning',
        description: 'Plan next development sprint',
        date: addDays(today, 5),
        type: 'meeting',
        priority: 'medium',
        location: 'Online',
        attendees: ['Dev Team'],
        category: 'project',
      },
      {
        id: '4',
        title: 'Feature Release',
        description: 'Deploy new dashboard features',
        date: addDays(today, 7),
        type: 'milestone',
        priority: 'high',
        category: 'project',
      },
      {
        id: '5',
        title: 'Team Building Event',
        description: 'Annual team celebration',
        date: addDays(today, 14),
        type: 'internal',
        priority: 'medium',
        location: 'City Center Hotel',
        category: 'company',
      },
    ];
  };

  const events = generateMockEvents()
    .filter(event => event.date >= new Date())
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, 4);

  const getEventIcon = (type: string, category: string) => {
    if (category === 'client') return Building2;
    switch (type) {
      case 'meeting': return Users;
      case 'deadline': return AlertCircle;
      case 'milestone': return Star;
      case 'client': return Building2;
      case 'internal': return Users;
      case 'holiday': return Calendar;
      default: return Calendar;
    }
  };

  const getEventColor = (priority: string, category: string) => {
    if (category === 'client') return {
      bg: 'bg-emerald-50 dark:bg-emerald-950/20',
      border: 'border-l-emerald-500',
      text: 'text-emerald-600',
      icon: 'text-emerald-600',
    };

    switch (priority) {
      case 'urgent': return {
        bg: 'bg-red-50 dark:bg-red-950/20',
        border: 'border-l-red-500',
        text: 'text-red-600',
        icon: 'text-red-600',
      };
      case 'high': return {
        bg: 'bg-orange-50 dark:bg-orange-950/20',
        border: 'border-l-orange-500',
        text: 'text-orange-600',
        icon: 'text-orange-600',
      };
      case 'medium': return {
        bg: 'bg-blue-50 dark:bg-blue-950/20',
        border: 'border-l-blue-500',
        text: 'text-blue-600',
        icon: 'text-blue-600',
      };
      case 'low': return {
        bg: 'bg-gray-50 dark:bg-gray-950/20',
        border: 'border-l-gray-500',
        text: 'text-gray-600',
        icon: 'text-gray-600',
      };
      default: return {
        bg: 'bg-gray-50 dark:bg-gray-950/20',
        border: 'border-l-gray-500',
        text: 'text-gray-600',
        icon: 'text-gray-600',
      };
    }
  };

  const getDateDisplay = (date: Date) => {
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'MMM d');
  };

  const getTimeDisplay = (date: Date) => {
    return format(date, 'h:mm a');
  };

  const handleEventClick = (event: Event) => {
    // Navigate to appropriate page based on event category
    switch (event.category) {
      case 'client':
        window.location.href = '/sales';
        break;
      case 'project':
        window.location.href = '/projects';
        break;
      case 'company':
        window.location.href = '/company';
        break;
      default:
        window.location.href = '/dashboard';
    }
  };

  return (
    <Card className="glassmorphism">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            <Calendar className="w-5 h-5 mr-2" />
            Upcoming Events
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.location.href = "/company"}
          >
            View Calendar
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {events.length > 0 ? (
            events.map((event) => {
              const EventIcon = getEventIcon(event.type, event.category);
              const colors = getEventColor(event.priority, event.category);

              return (
                <div
                  key={event.id}
                  className={`flex items-start space-x-3 p-3 rounded-lg border-l-4 cursor-pointer transition-all duration-200 hover:shadow-md ${colors.bg} ${colors.border}`}
                  onClick={() => handleEventClick(event)}
                >
                  <div className="p-1 bg-white/50 dark:bg-black/20 rounded-full">
                    <EventIcon className={`w-4 h-4 ${colors.icon}`} />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-foreground">
                      {event.title}
                    </div>
                    {event.description && (
                      <div className="text-xs text-muted-foreground mt-1 line-clamp-1">
                        {event.description}
                      </div>
                    )}
                    <div className="flex items-center space-x-3 mt-2">
                      <div className="flex items-center space-x-1">
                        <Clock className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {getDateDisplay(event.date)} at {getTimeDisplay(event.date)}
                        </span>
                      </div>
                      {event.location && (
                        <div className="flex items-center space-x-1">
                          <MapPin className="w-3 h-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground truncate">
                            {event.location}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <Badge
                        variant="outline"
                        className={`text-xs ${colors.text} border-current`}
                      >
                        {event.type}
                      </Badge>
                      {event.attendees && event.attendees.length > 0 && (
                        <div className="flex items-center space-x-1">
                          <Users className="w-3 h-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            {event.attendees.length} attendee{event.attendees.length > 1 ? 's' : ''}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
              <div className="text-sm font-medium text-foreground">No upcoming events</div>
              <div className="text-xs text-muted-foreground">
                Your calendar is clear for the next few days
              </div>
            </div>
          )}
        </div>

        {/* Quick Calendar Actions */}
        {events.length > 0 && (
          <div className="mt-4 pt-4 border-t border-border">
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => window.location.href = "/company"}
              >
                <Calendar className="w-3 h-3 mr-1" />
                Full Calendar
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => window.location.href = "/projects"}
              >
                <Briefcase className="w-3 h-3 mr-1" />
                Project Timeline
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}