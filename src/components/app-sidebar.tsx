import { Link } from "@tanstack/react-router"
import {
  Bot,
  MessageSquare,
  Settings2,
  Radio,
  LayoutDashboard,
  LifeBuoy,
  Send,
  Sparkles,
} from "lucide-react"

import { NavMain } from "#/components/nav-main"
import { NavSecondary } from "#/components/nav-secondary"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "#/components/ui/sidebar"

const data = {
  navMain: [
    {
      title: "Dashboard",
      url: "/",
      icon: LayoutDashboard,
      isActive: true,
    },
    {
      title: "Chat",
      url: "/chat",
      icon: MessageSquare,
      items: [
        { title: "New Conversation", url: "/chat" },
      ],
    },
    {
      title: "Channels",
      url: "/channels",
      icon: Radio,
      items: [
        { title: "WhatsApp", url: "/channels" },
        { title: "Telegram", url: "/channels" },
      ],
    },
    {
      title: "Settings",
      url: "/settings",
      icon: Settings2,
      items: [
        { title: "API Keys", url: "/settings" },
        { title: "Providers", url: "/settings" },
        { title: "Workspace", url: "/settings" },
      ],
    },
  ],
  navSecondary: [
    {
      title: "Support",
      url: "#",
      icon: LifeBuoy,
    },
    {
      title: "Feedback",
      url: "#",
      icon: Send,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link to="/">
                <div className="flex aspect-square size-8 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground">
                  <Sparkles className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">MyAI</span>
                  <span className="truncate text-xs text-muted-foreground">
                    Personal Agent
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link to="/settings">
                <div className="flex aspect-square size-8 items-center justify-center rounded-xl bg-muted">
                  <Bot className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">Agent</span>
                  <span className="truncate text-xs text-emerald-500">Online</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
