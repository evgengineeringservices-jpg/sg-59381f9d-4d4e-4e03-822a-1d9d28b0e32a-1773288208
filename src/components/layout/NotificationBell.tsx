import { useState, useEffect } from "react";
import { Bell, X, Check, AlertCircle, TrendingUp, FileText, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  severity: "info" | "warning" | "error" | "success";
  link?: string;
  isRead: boolean;
  createdAt: string;
  metadata?: Record<string, any>;
}

const notificationIcons = {
  price_change: TrendingUp,
  task_assigned: FileText,
  billing_ready: CheckCircle,
  milestone_complete: Check,
  document_uploaded: FileText,
  drawing_analyzed: FileText,
  budget_alert: AlertCircle,
  timeline_delay: AlertCircle,
  approval_needed: AlertCircle,
  system_alert: Bell,
};

const severityColors = {
  info: "bg-blue-500",
  warning: "bg-amber-500",
  error: "bg-red-500",
  success: "bg-green-500",
};

export function NotificationBell() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (user) {
      loadNotifications();
      subscribeToNotifications();
    }
  }, [user]);

  const loadNotifications = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      console.error("Failed to load notifications:", error);
      return;
    }

    const mapped = data.map((n: any) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      message: n.message,
      severity: n.severity,
      link: n.link,
      isRead: n.is_read,
      createdAt: n.created_at,
      metadata: n.metadata,
    }));

    setNotifications(mapped);
    setUnreadCount(mapped.filter((n) => !n.isRead).length);
  };

  const subscribeToNotifications = () => {
    if (!user) return;

    const channel = supabase
      .channel("notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          loadNotifications();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  };

  const markAsRead = async (notificationId: string) => {
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("id", notificationId);

    if (!error) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .eq("is_read", false);

    if (!error) {
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("id", notificationId);

    if (!error) {
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      loadNotifications();
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold text-lg">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="text-xs"
            >
              Mark all read
            </Button>
          )}
        </div>

        <ScrollArea className="h-[400px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Bell className="h-12 w-12 mb-2 opacity-20" />
              <p className="text-sm">No notifications</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => {
                const Icon =
                  notificationIcons[notification.type as keyof typeof notificationIcons] ||
                  Bell;
                const content = (
                  <div
                    key={notification.id}
                    className={`p-4 hover:bg-muted/50 transition-colors cursor-pointer ${
                      !notification.isRead ? "bg-muted/30" : ""
                    }`}
                    onClick={() => {
                      markAsRead(notification.id);
                      if (notification.link) {
                        setIsOpen(false);
                      }
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`p-2 rounded-full ${
                          severityColors[notification.severity]
                        } bg-opacity-10`}
                      >
                        <Icon
                          className={`h-4 w-4 ${
                            severityColors[notification.severity].replace(
                              "bg-",
                              "text-"
                            )
                          }`}
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-medium text-sm">
                            {notification.title}
                          </p>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 shrink-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotification(notification.id);
                            }}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>

                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {notification.message}
                        </p>

                        <p className="text-xs text-muted-foreground mt-2">
                          {formatDistanceToNow(new Date(notification.createdAt), {
                            addSuffix: true,
                          })}
                        </p>
                      </div>

                      {!notification.isRead && (
                        <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-2" />
                      )}
                    </div>
                  </div>
                );

                return notification.link ? (
                  <Link key={notification.id} href={notification.link}>
                    {content}
                  </Link>
                ) : (
                  content
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}