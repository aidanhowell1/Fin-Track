import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Receipt,
  PieChart,
  Settings,
  Menu,
  Brain,
} from 'lucide-react';
import { Button } from './ui/button';
import { Sheet, SheetContent, SheetTrigger } from './ui/sheet';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Header from './Header';

interface LayoutProps {
  children: ReactNode;
}

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Transactions', href: '/transactions', icon: Receipt },
 // { name: 'Analytics', href: '/analytics', icon: PieChart },
  { name: 'Mood', href: '/mood-analytics', icon: Brain },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function Layout({ children }: LayoutProps) {
  const router = useRouter();

  return (
    <div className="relative min-h-screen bg-background">
      <div className="fixed inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-green-500/5 pointer-events-none" />
      <Header />
      
      {/* Mobile navigation */}
      <Sheet>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden fixed left-4 top-20 z-40 hover:neon-glow"
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Open navigation menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 glass-panel pt-16">
          <nav className="flex flex-col gap-2">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = router.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all-smooth hover:translate-x-1',
                    isActive
                      ? 'glass-effect neon-glow bg-blue-500/10 text-blue-400'
                      : 'hover:glass-effect text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Icon className={cn(
                    'h-4 w-4 transition-transform',
                    isActive && 'animate-pulse-slow'
                  )} />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </SheetContent>
      </Sheet>

      {/* Desktop navigation */}
      <div className="hidden lg:fixed lg:inset-y-14 lg:flex lg:w-72 lg:flex-col">
        <div className="flex flex-col gap-2 flex-grow overflow-y-auto glass-panel m-4 px-4 py-8">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = router.pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all-smooth hover:translate-x-1',
                  isActive
                    ? 'glass-effect neon-glow bg-blue-500/10 text-blue-400'
                    : 'hover:glass-effect text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className={cn(
                  'h-4 w-4 transition-transform',
                  isActive && 'animate-pulse-slow'
                )} />
                {item.name}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-72 pt-14">
        <main className="min-h-[calc(100vh-3.5rem)] py-8 animate-slide-in">
          <div className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}