import {
  Bed,
  Calendar,
  Globe,
  Heart,
  Home,
  MapPin,
  Settings,
  Star,
  User
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

interface AppLayoutProps {
  children: React.ReactNode;
}

const navigationItems = [
  {
    title: "Discover",
    items: [
      {
        title: "Stays",
        url: "/stays",
        icon: Bed,
        description: "Find accommodations"
      },
      {
        title: "Experiences",
        url: "/experiences", 
        icon: Star,
        description: "Book activities"
      },
      {
        title: "Destinations",
        url: "/destinations",
        icon: MapPin,
        description: "Explore places"
      }
    ]
  },
  {
    title: "My Trips",
    items: [
      {
        title: "Bookings",
        url: "/bookings",
        icon: Calendar,
        description: "Manage reservations"
      },
      {
        title: "Wishlist",
        url: "/wishlist",
        icon: Heart,
        description: "Saved places"
      }
    ]
  },
  {
    title: "Account",
    items: [
      {
        title: "Profile",
        url: "/profile",
        icon: User,
        description: "Personal information"
      },
      {
        title: "Settings",
        url: "/settings",
        icon: Settings,
        description: "App preferences"
      }
    ]
  }
];

export function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const handleNavigation = (url: string) => {
    navigate(url);
  };

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <Sidebar variant="inset" collapsible="icon">
          <SidebarHeader>
            <div className="flex items-center gap-2 px-2">
              <img
                src="/icons/logo-transparent-indigo.png"
                alt="Rimigo logo"
                className="h-8 w-8 object-contain"
              />
              <span className="text-primary-default font-semibold text-lg">
                Rimigo
              </span>
            </div>
          </SidebarHeader>
          
          <SidebarContent>
            {navigationItems.map((group) => (
              <SidebarGroup key={group.title}>
                <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {group.items.map((item) => (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                          onClick={() => handleNavigation(item.url)}
                          isActive={location.pathname.startsWith(item.url)}
                          tooltip={item.description}
                        >
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            ))}
          </SidebarContent>
          
          <SidebarFooter>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => navigate("/")}
                  tooltip="Go to homepage"
                >
                  <Home className="h-4 w-4" />
                  <span>Home</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => navigate("/language")}
                  tooltip="Language settings"
                >
                  <Globe className="h-4 w-4" />
                  <span>Language</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>
        
        <main className="flex-1 overflow-auto">
          <header className="flex h-16 items-center gap-4 border-b bg-background px-4">
            <SidebarTrigger />
            <div className="flex-1">
              <h1 className="text-lg font-semibold">
                {location.pathname === "/stays" && "Find Your Perfect Stay"}
                {location.pathname === "/experiences" && "Discover Experiences"}
                {location.pathname === "/destinations" && "Explore Destinations"}
                {location.pathname === "/bookings" && "Your Bookings"}
                {location.pathname === "/wishlist" && "Your Wishlist"}
                {location.pathname === "/profile" && "Your Profile"}
                {location.pathname === "/settings" && "Settings"}
              </h1>
            </div>
          </header>
          
          <div className="flex-1 overflow-auto">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
