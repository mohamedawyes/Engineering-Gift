import { Link, useLocation } from "wouter";
import { 
  Calculator, 
  Home, 
  History, 
  Zap, 
  Activity,
  Wifi,
  Moon,
  Sun,
  Menu,
  Flame
} from "lucide-react";
import { useTheme } from "../theme-provider";
import { Button } from "../ui/button";
import { Sheet, SheetContent } from "../ui/sheet";
import { DialogTitle } from "../ui/dialog";
import { useState } from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const navItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/fire-alarm", label: "Fire Alarm LSN", icon: Flame, badge: "NEW" },
  { href: "/voltage-drop", label: "Voltage Drop", icon: Zap },
  { href: "/fiber-budget", label: "Fiber Budget", icon: Wifi },
  { href: "/inrush-current", label: "Inrush Current", icon: Activity },
  { href: "/history", label: "History", icon: History },
];

export function Sidebar() {
  const [location] = useLocation();
  const { theme, setTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);

  const NavContent = () => (
    <div className="flex flex-col h-full py-6">
      <div className="flex items-center gap-3 px-6 mb-10">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-cyan-400 flex items-center justify-center shadow-lg shadow-primary/20 text-white">
          <Calculator className="w-6 h-6" />
        </div>
        <div className="flex flex-col">
          <span className="font-display font-bold text-lg leading-none tracking-tight">Engineering</span>
          <span className="text-primary font-medium text-sm leading-none">Gift</span>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {navItems.map((item) => {
          const isActive = location === item.href;
          return (
            <Link 
              key={item.href} 
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group",
                isActive 
                  ? "bg-primary/10 text-primary font-semibold" 
                  : "text-muted-foreground hover:bg-slate-100 dark:hover:bg-white/5 hover:text-foreground"
              )}
            >
              <item.icon className={cn("w-5 h-5 transition-transform group-hover:scale-110", isActive && "text-primary")} />
              <span className="flex-1">{item.label}</span>
              {"badge" in item && item.badge && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-500 text-white leading-none">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="px-6 pt-6 border-t border-border mt-auto flex justify-between items-center">
        <span className="text-sm font-medium text-muted-foreground">Theme</span>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="rounded-full w-10 h-10 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10"
        >
          {theme === "dark" ? <Moon className="w-5 h-5 text-blue-400" /> : <Sun className="w-5 h-5 text-orange-500" />}
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Toggle */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 glass z-40 flex items-center px-4 justify-between border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-cyan-400 flex items-center justify-center text-white">
            <Calculator className="w-4 h-4" />
          </div>
          <span className="font-display font-bold">Engineering Gift</span>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setMobileOpen(true)}>
          <Menu className="w-6 h-6" />
        </Button>
      </div>

      {/* Mobile Drawer */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="p-0 w-72 glass border-r-white/20">
          <DialogTitle className="sr-only">Navigation Menu</DialogTitle>
          <NavContent />
        </SheetContent>
      </Sheet>

      {/* Desktop Sidebar */}
      <div className="hidden lg:block fixed inset-y-0 left-0 w-72 glass-card border-r border-slate-200/50 dark:border-white/10 z-40 bg-white/50 dark:bg-black/20">
        <NavContent />
      </div>
    </>
  );
}
