import { Link } from "@tanstack/react-router"
import {
  Bot,
  MessageSquare,
  Settings2,
  Radio,
  LayoutDashboard,
  LifeBuoy,
  Send,
  Shield,
  Rocket,
  Fingerprint,
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
      title: "Audit",
      url: "/settings",
      icon: Shield,
      items: [
        { title: "Security Scan", url: "/settings" },
        { title: "Reports", url: "/settings" },
      ],
    },
    {
      title: "Deploy",
      url: "/settings",
      icon: Rocket,
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
                <div className="flex aspect-square size-9 items-center justify-center rounded-lg bg-primary/15 ring-1 ring-primary/20">
                  <Fingerprint className="size-5 text-primary" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold font-heading tracking-tight text-[15px]">Brilion AI</span>
                  <span className="truncate text-[11px] text-muted-foreground font-medium">
                    OpenClaw Platform
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
                <div className="relative flex aspect-square size-9 items-center justify-center rounded-lg bg-muted">
                  <Bot className="size-4" />
                  <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-emerald-500 ring-2 ring-sidebar" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium text-[13px]">Agent</span>
                  <span className="truncate text-[11px] text-emerald-500 font-medium">Online</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
