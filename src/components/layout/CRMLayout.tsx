import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Building2,
  LayoutDashboard,
  BarChart3,
  FolderKanban,
  Users,
  Calculator,
  GanttChart,
  CheckSquare,
  ClipboardCheck,
  Truck,
  DollarSign,
  FileText,
  FileImage,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Menu,
  X,
  TrendingUp,
  Landmark,
  Receipt,
  Wallet,
  FolderOpen,
  Image,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { NotificationBell } from "./NotificationBell";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: string[];
}

const navigationGroups = [
  {
    label: "Overview",
    items: [
      { label: "Dashboard", href: "/crm", icon: LayoutDashboard },
      { label: "Analytics", href: "/crm/analytics", icon: BarChart3 },
      { label: "Projects", href: "/crm/projects", icon: FolderKanban },
      { label: "Leads", href: "/crm/leads", icon: Users, roles: ["super_admin", "owner", "contractor_admin", "lead"] },
    ],
  },
  {
    label: "Operations",
    items: [
      { label: "BOQ / Estimation", href: "/crm/boq", icon: Calculator },
      { label: "Planning / Gantt", href: "/crm/planning", icon: GanttChart },
      { label: "Tasks", href: "/crm/tasks", icon: CheckSquare },
      { label: "Progress Reports", href: "/crm/reports", icon: ClipboardCheck },
      { label: "Weekly Logistics", href: "/crm/logistics", icon: Truck },
      { label: "Billing", href: "/crm/billing", icon: DollarSign },
      { label: "Accounting", href: "/crm/accounting", icon: Landmark, roles: ["super_admin", "owner", "contractor_admin"] },
      { label: "Documents", href: "/crm/documents", icon: FileText },
      { label: "Drawings", href: "/crm/drawings", icon: FileImage },
    ],
  },
  {
    label: "Admin",
    items: [
      { label: "Users & Roles", href: "/crm/admin/users", icon: Users, roles: ["super_admin", "owner", "contractor_admin"] },
      { label: "Settings", href: "/crm/admin/settings", icon: Settings, roles: ["super_admin", "owner", "contractor_admin"] },
    ],
  },
];

const overviewNavItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/crm" },
  { icon: BarChart3, label: "Analytics", href: "/crm/analytics" },
  { icon: FolderKanban, label: "Projects", href: "/crm/projects" },
  { icon: Users, label: "Leads", href: "/crm/leads" },
];

const operationsNavItems = [
  { icon: Calculator, label: "BOQ / Estimation", href: "/crm/boq" },
  { icon: GanttChart, label: "Planning", href: "/crm/planning" },
  { icon: CheckSquare, label: "Tasks", href: "/crm/tasks" },
  { icon: FileText, label: "Progress Reports", href: "/crm/reports" },
  { icon: Truck, label: "Logistics", href: "/crm/logistics" },
  { icon: Receipt, label: "Billing", href: "/crm/billing" },
  { icon: Wallet, label: "Accounting", href: "/crm/accounting" },
  { icon: FolderOpen, label: "Documents", href: "/crm/documents" },
  { icon: Image, label: "Drawings", href: "/crm/drawings" },
];

const adminNavItems = [
  { icon: Users, label: "Users", href: "/crm/admin/users", roles: ["super_admin", "owner"] },
  { icon: Settings, label: "Settings", href: "/crm/admin/settings", roles: ["super_admin", "owner", "contractor_admin"] },
  { icon: TrendingUp, label: "Market Prices", href: "/crm/admin/market-prices", roles: ["super_admin", "owner", "contractor_admin"] },
];

export function CRMLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, profile, loading, signOut } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user && router.pathname !== "/crm/login") {
      router.push("/crm/login");
    }
  }, [user, loading, router]);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [router.pathname]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user || !profile) {
    return null;
  }

  const canAccessItem = (item: NavItem) => {
    if (!item.roles) return true;
    return item.roles.includes(profile.role);
  };

  const handleSignOut = async () => {
    await signOut();
    router.push("/crm/login");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header - Updated for better touch targets */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-primary text-primary-foreground border-b border-primary-foreground/20">
        <div className="flex items-center justify-between px-4 h-16">
          <div className="flex items-center gap-2">
            <Building2 className="w-6 h-6 text-accent" />
            <span className="font-heading text-xl tracking-wide">BUILDCORE</span>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)} 
              className="p-2 hover:bg-primary-foreground/10 rounded-lg transition-colors touch-manipulation"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu - Updated for better mobile UX */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-primary text-primary-foreground pt-16">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-6 pb-24">
              {navigationGroups.map((group) => (
                <div key={group.label}>
                  <h3 className="text-xs font-semibold text-primary-foreground/60 mb-3 px-2 uppercase tracking-wider">{group.label}</h3>
                  <nav className="space-y-1">
                    {group.items.filter(canAccessItem).map((item) => {
                      const Icon = item.icon;
                      const isActive = router.pathname === item.href;
                      return (
                        <Link key={item.href} href={item.href} onClick={() => setMobileMenuOpen(false)}>
                          <div className={cn(
                            "flex items-center gap-4 px-4 py-3 rounded-lg transition-colors touch-manipulation",
                            isActive ? "bg-accent text-accent-foreground" : "hover:bg-primary-foreground/10 active:bg-primary-foreground/20"
                          )}>
                            <Icon className="w-5 h-5 shrink-0" />
                            <span className="text-base font-medium">{item.label}</span>
                          </div>
                        </Link>
                      );
                    })}
                  </nav>
                </div>
              ))}
              
              {/* Mobile User Profile Section */}
              <div className="pt-4 border-t border-primary-foreground/20 space-y-2">
                <div className="flex items-center gap-3 px-4 py-3">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={profile.avatarUrl || undefined} />
                    <AvatarFallback className="bg-accent text-accent-foreground">
                      {profile.displayName?.charAt(0) || profile.email.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="text-sm font-medium">{profile.displayName || "User"}</div>
                    <div className="text-xs text-primary-foreground/60">{profile.role.replace(/_/g, " ")}</div>
                  </div>
                </div>
                
                <Link href="/" onClick={() => setMobileMenuOpen(false)}>
                  <div className="flex items-center gap-4 px-4 py-3 rounded-lg hover:bg-primary-foreground/10 transition-colors touch-manipulation">
                    <Building2 className="w-5 h-5" />
                    <span className="text-base font-medium">Back to Website</span>
                  </div>
                </Link>
                
                <button 
                  onClick={() => { setMobileMenuOpen(false); handleSignOut(); }}
                  className="w-full flex items-center gap-4 px-4 py-3 rounded-lg hover:bg-primary-foreground/10 transition-colors touch-manipulation text-left"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="text-base font-medium">Sign Out</span>
                </button>
              </div>
            </div>
          </ScrollArea>
        </div>
      )}

      <aside className={cn(
        "hidden lg:flex flex-col fixed left-0 top-0 bottom-0 bg-primary text-primary-foreground border-r border-primary-foreground/20 transition-all duration-300",
        sidebarCollapsed ? "w-20" : "w-64"
      )}>
        <div className="p-4 border-b border-primary-foreground/20">
          <div className="flex items-center justify-between">
            {!sidebarCollapsed && (
              <div className="flex items-center gap-2">
                <Building2 className="w-8 h-8 text-accent" />
                <span className="font-heading text-xl tracking-wide">BUILDCORE</span>
              </div>
            )}
            {sidebarCollapsed && (
              <Building2 className="w-8 h-8 text-accent mx-auto" />
            )}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className={cn("p-1.5 hover:bg-primary-foreground/10 rounded-lg transition-colors", sidebarCollapsed && "mx-auto mt-2")}
            >
              {sidebarCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-6">
            {navigationGroups.map((group) => (
              <div key={group.label}>
                {!sidebarCollapsed && (
                  <h3 className="text-xs font-semibold text-primary-foreground/60 mb-2 px-2">{group.label}</h3>
                )}
                <nav className="space-y-1">
                  {group.items.filter(canAccessItem).map((item) => {
                    const Icon = item.icon;
                    const isActive = router.pathname === item.href;
                    return (
                      <Link key={item.href} href={item.href}>
                        <div className={cn(
                          "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                          isActive ? "bg-accent text-accent-foreground" : "hover:bg-primary-foreground/10",
                          sidebarCollapsed && "justify-center"
                        )}>
                          <Icon className="w-5 h-5" />
                          {!sidebarCollapsed && <span className="text-sm font-medium">{item.label}</span>}
                        </div>
                      </Link>
                    );
                  })}
                </nav>
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="p-4 border-t border-primary-foreground/20">
          {!sidebarCollapsed ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="w-full justify-start gap-3 hover:bg-primary-foreground/10">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={profile.avatarUrl || undefined} />
                    <AvatarFallback className="bg-accent text-accent-foreground">
                      {profile.displayName?.charAt(0) || profile.email.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-left">
                    <div className="text-sm font-medium">{profile.displayName || "User"}</div>
                    <div className="text-xs text-primary-foreground/60">{profile.role.replace(/_/g, " ")}</div>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/">Back to Website</Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 w-4 h-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="w-full p-0 hover:bg-primary-foreground/10">
                  <Avatar className="w-10 h-10 mx-auto">
                    <AvatarImage src={profile.avatarUrl || undefined} />
                    <AvatarFallback className="bg-accent text-accent-foreground">
                      {profile.displayName?.charAt(0) || profile.email.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/">Back to Website</Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 w-4 h-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </aside>

      <main className={cn(
        "lg:min-h-screen transition-all duration-300",
        "pt-16 lg:pt-0",
        sidebarCollapsed ? "lg:ml-20" : "lg:ml-64"
      )}>
        <div className="p-4 sm:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}