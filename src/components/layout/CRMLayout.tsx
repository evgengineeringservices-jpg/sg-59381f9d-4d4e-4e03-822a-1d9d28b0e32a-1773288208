import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import {
  LayoutDashboard,
  TrendingUp,
  FolderOpen,
  Users,
  Calculator,
  Calendar,
  CheckSquare,
  FileText,
  Truck,
  CreditCard,
  Landmark,
  FileImage,
  Image,
  Settings,
  UserCog,
  TrendingDown,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Search,
  Building2,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";

interface NavItem {
  icon: any;
  label: string;
  href: string;
  roles?: string[];
}

const overviewNavItems: NavItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/crm" },
  { icon: TrendingUp, label: "Analytics", href: "/crm/analytics" },
  { icon: FolderOpen, label: "Projects", href: "/crm/projects" },
  { icon: Users, label: "Leads", href: "/crm/leads", roles: ["super_admin", "owner", "contractor_admin", "lead"] },
];

const operationsNavItems: NavItem[] = [
  { icon: Calculator, label: "BOQ / Estimation", href: "/crm/boq" },
  { icon: Calendar, label: "Planning / Gantt", href: "/crm/planning" },
  { icon: CheckSquare, label: "Tasks", href: "/crm/tasks" },
  { icon: FileText, label: "Progress Reports", href: "/crm/reports" },
  { icon: Truck, label: "Weekly Logistics", href: "/crm/logistics" },
  { icon: CreditCard, label: "Billing", href: "/crm/billing" },
  { icon: Landmark, label: "Accounting", href: "/crm/accounting", roles: ["super_admin", "owner", "contractor_admin"] },
  { icon: BarChart3, label: "Cost Analysis", href: "/crm/cost-analysis" },
  { icon: FileImage, label: "Documents", href: "/crm/documents" },
  { icon: Image, label: "Drawings", href: "/crm/drawings" },
];

const adminNavItems: NavItem[] = [
  { icon: UserCog, label: "Users & Roles", href: "/crm/admin/users", roles: ["super_admin", "owner"] },
  { icon: Settings, label: "Settings", href: "/crm/admin/settings", roles: ["super_admin", "owner", "contractor_admin"] },
  { icon: TrendingDown, label: "Market Prices", href: "/crm/admin/market-prices", roles: ["super_admin", "owner", "contractor_admin"] },
  { icon: Calculator, label: "DUPA Library", href: "/crm/admin/dupa-library", roles: ["super_admin", "owner", "contractor_admin"] },
];

export function CRMLayout({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/crm/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    async function loadProfile() {
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      if (data) setProfile(data);
    }
    loadProfile();
  }, [user]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/crm/login");
  }

  function hasAccess(item: NavItem) {
    if (!item.roles) return true;
    if (!profile?.role) return false;
    return item.roles.includes(profile.role);
  }

  const filterNavItems = (items: NavItem[]) => {
    return items.filter(item => {
      const matchesSearch = item.label.toLowerCase().includes(searchQuery.toLowerCase());
      const hasPermission = hasAccess(item);
      return matchesSearch && hasPermission;
    });
  };

  const filteredOverview = filterNavItems(overviewNavItems);
  const filteredOperations = filterNavItems(operationsNavItems);
  const filteredAdmin = filterNavItems(adminNavItems);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const NavLink = ({ item }: { item: NavItem }) => {
    const isActive = router.pathname === item.href;
    const Icon = item.icon;

    return (
      <Link
        href={item.href}
        className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
          isActive
            ? "bg-amber-500/20 text-amber-500"
            : "text-gray-300 hover:bg-white/10 hover:text-white"
        }`}
        onClick={() => setMobileMenuOpen(false)}
      >
        <Icon className="h-5 w-5 flex-shrink-0" />
        {!sidebarCollapsed && <span className="font-medium">{item.label}</span>}
      </Link>
    );
  };

  const NavSection = ({ title, items }: { title: string; items: NavItem[] }) => {
    if (items.length === 0) return null;

    return (
      <div className="space-y-1">
        {!sidebarCollapsed && (
          <h3 className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            {title}
          </h3>
        )}
        {items.map((item) => (
          <NavLink key={item.href} item={item} />
        ))}
      </div>
    );
  };

  const sidebarContent = (
    <>
      <div className="flex items-center justify-between px-4 py-6 border-b border-gray-700">
        {!sidebarCollapsed && (
          <Link href="/" className="flex items-center gap-2">
            <Building2 className="h-8 w-8 text-amber-500" />
            <span className="text-xl font-bold tracking-wide text-white" style={{ fontFamily: "Bebas Neue" }}>
              BUILDCORE
            </span>
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="text-gray-400 hover:text-white hidden lg:flex"
        >
          {sidebarCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
        </Button>
      </div>

      {!sidebarCollapsed && (
        <div className="px-4 py-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search navigation..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-gray-800 border-gray-700 text-white placeholder:text-gray-400 focus:border-amber-500"
            />
          </div>
        </div>
      )}

      <nav className="flex-1 px-4 py-4 space-y-6 overflow-y-auto">
        <NavSection title="Overview" items={filteredOverview} />
        <NavSection title="Operations" items={filteredOperations} />
        <NavSection title="Admin" items={filteredAdmin} />
      </nav>

      <div className="p-4 border-t border-gray-700 space-y-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-white/10 transition-colors">
              <Avatar className="h-8 w-8">
                <AvatarImage src={profile?.avatar_url} />
                <AvatarFallback className="bg-amber-500 text-white">
                  {profile?.display_name?.charAt(0) || user.email?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {!sidebarCollapsed && (
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-white">{profile?.display_name || "User"}</p>
                  <p className="text-xs text-gray-400 capitalize">{profile?.role || "Member"}</p>
                </div>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {!sidebarCollapsed && (
          <Link
            href="/"
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            ← Back to Website
          </Link>
        )}
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <aside
        className={`hidden lg:flex lg:flex-col bg-[hsl(225,35%,15%)] text-white transition-all duration-300 ${
          sidebarCollapsed ? "w-20" : "w-64"
        }`}
      >
        {sidebarContent}
      </aside>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setMobileMenuOpen(false)} />
          <aside className="fixed inset-y-0 left-0 w-64 bg-[hsl(225,35%,15%)] text-white flex flex-col z-50">
            <div className="flex items-center justify-between px-4 py-6 border-b border-gray-700">
              <Link href="/" className="flex items-center gap-2">
                <Building2 className="h-8 w-8 text-amber-500" />
                <span className="text-xl font-bold tracking-wide" style={{ fontFamily: "Bebas Neue" }}>
                  BUILDCORE
                </span>
              </Link>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileMenuOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            {sidebarContent}
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden"
            >
              <Menu className="h-6 w-6" />
            </Button>
            <div className="flex-1" />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}