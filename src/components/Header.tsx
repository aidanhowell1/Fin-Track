import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Logo from './Logo';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { NavigationMenu, NavigationMenuItem, NavigationMenuList } from './ui/navigation-menu';
import Link from 'next/link';
import { BarChart3, Settings, LogOut, Brain, LayoutList } from 'lucide-react';
import { cn } from '@/lib/utils';
import UserAvatar from './UserAvatar';

const Header = () => {
  const router = useRouter();
  const [user, setUser] = useState<{ firstName?: string; lastName?: string; email: string; } | null>(null);
  const [dailyMoodCount, setDailyMoodCount] = useState(0);

  useEffect(() => {
    const handleStorageChange = () => {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        try {
          const userData = JSON.parse(userStr);
          setUser(userData);
        } catch (error) {
          console.error('Failed to parse user data:', error);
        }
      }
    };

    const fetchDailyMoodCount = async () => {
      try {
        const response = await fetch('/api/moods?count=today');
        if (response.ok) {
          const data = await response.json();
          setDailyMoodCount(data.count);
        }
      } catch (error) {
        console.error('Failed to fetch daily mood count:', error);
      }
    };

    // Initial load
    handleStorageChange();
    fetchDailyMoodCount();

    // Listen for changes
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('userUpdate', handleStorageChange);

    const interval = setInterval(fetchDailyMoodCount, 60000); // Refresh every minute

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('userUpdate', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/auth/login');
  };

  return (
    <header className="sticky top-0 z-50 w-full glass-panel border-b border-white/10">
      <div className="container flex h-14 items-center">
        <div className="mr-4 flex">
          <Link 
            href="/" 
            className="mr-6 flex items-center space-x-2 transition-all-smooth hover:scale-105"
          >
            <Logo />
          </Link>
        </div>
        {user && (
          <NavigationMenu className="flex-1">
            <NavigationMenuList className="gap-2">
              <NavigationMenuItem>
                <Link href="/transactions" legacyBehavior passHref>
                  <Button 
                    variant="ghost" 
                    className={cn(
                      "transition-all-smooth hover:translate-y-[-2px]",
                      router.pathname === '/transactions' && "neon-glow text-blue-400"
                    )}
                  >
                    Transactions
                  </Button>
                </Link>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <Link href="/analytics" legacyBehavior passHref>
                  <Button 
                    variant="ghost"
                    className={cn(
                      "transition-all-smooth hover:translate-y-[-2px]",
                      router.pathname === '/analytics' && "neon-glow text-blue-400"
                    )}
                  >
                    Analytics
                  </Button>
                </Link>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <Link href="/mood-analytics" legacyBehavior passHref>
                  <Button 
                    variant="ghost"
                    className={cn(
                      "transition-all-smooth hover:translate-y-[-2px]",
                      router.pathname === '/mood-analytics' && "neon-glow text-purple-400"
                    )}
                  >
                    Mood
                  </Button>
                </Link>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>
        )}
        {user && (
          <div className="flex items-center gap-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  className="relative h-9 w-9 rounded-full transition-all-smooth hover:scale-110 p-0"
                >
                  <UserAvatar
                    firstName={user.firstName}
                    lastName={user.lastName}
                    size="sm"
                    dailyEntriesCount={dailyMoodCount}
                  />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 glass-panel animate-slide-in">
                <DropdownMenuLabel className="neon-text font-bold">My Account</DropdownMenuLabel>
                <div className="px-2 py-1.5 text-sm font-medium">
                  {user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.email}
                </div>
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem 
                  onClick={() => router.push('/transactions')}
                  className="transition-all-smooth hover:translate-x-1 hover:bg-blue-500/10"
                >
                  <LayoutList className="mr-2 h-4 w-4" />
                  <span>Transactions</span>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => router.push('/analytics')}
                  className="transition-all-smooth hover:translate-x-1 hover:bg-blue-500/10"
                >
                  <BarChart3 className="mr-2 h-4 w-4" />
                  <span>Analytics</span>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => router.push('/settings')}
                  className="transition-all-smooth hover:translate-x-1 hover:bg-blue-500/10"
                >
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem 
                  onClick={handleLogout}
                  className="text-red-400 transition-all-smooth hover:translate-x-1 hover:bg-red-500/10"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;