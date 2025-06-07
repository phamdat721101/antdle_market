
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useWallet } from '@/hooks/use-wallet';
import { ModeToggle } from '@/components/layout/ModeToggle';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Menu, Users, LogOut, Wallet as WalletIcon, LayoutList } from "lucide-react"
import antdleLogo from '/lovable-uploads/6f3a6f5a-5ffc-4057-940b-dd98966c1f00.png';
import { formatAddress } from '@/utils/contractHelpers';
import { ClaimAntModal } from '@/components/claim/ClaimAntModal';

export const Header = () => {
  const { isConnected, walletAddress, accounts, connectWallet, disconnectWallet, switchAccount } = useWallet();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  return (
    <header className="border-b border-border bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center">
              <img src={antdleLogo} alt="Antdle Logo" className="h-8 mr-2" />
              <span className="text-xl font-bold text-foreground">Antdle</span>
            </Link>
          </div>
          
          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link to="/markets" className="text-muted-foreground hover:text-primary px-3 py-2 text-sm font-medium">
              Markets
            </Link>
            <Link to="/my-positions" className="text-muted-foreground hover:text-primary px-3 py-2 text-sm font-medium">
              My Positions
            </Link>
            <Link to="/transactions" className="text-muted-foreground hover:text-primary px-3 py-2 text-sm font-medium">
              Transactions
            </Link>
            <ClaimAntModal />
          </nav>
          
          {/* Wallet and Theme Toggle */}
          <div className="flex items-center space-x-4">
            <ModeToggle />
            {isConnected && walletAddress ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={`https://api.dicebear.com/7.x/pixel-art/svg?seed=${walletAddress}`} alt={walletAddress} />
                      <AvatarFallback>
                        {walletAddress.substring(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuLabel className="font-normal text-xs text-muted-foreground">
                    {formatAddress(walletAddress)}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  
                  {/* Account Switcher */}
                  {accounts.length > 1 && (
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger>
                        <Users className="mr-2 h-4 w-4" />
                        <span>Switch Account</span>
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent className="w-48">
                        {accounts.map((account) => (
                          <DropdownMenuItem 
                            key={account}
                            className={`cursor-pointer ${account === walletAddress ? 'bg-primary/10 dark:bg-primary/20' : ''}`}
                            onClick={() => account !== walletAddress && switchAccount(account)}
                          >
                            <div className="flex items-center w-full">
                              <Avatar className="h-5 w-5 mr-2">
                                <AvatarImage src={`https://api.dicebear.com/7.x/pixel-art/svg?seed=${account}`} />
                                <AvatarFallback>{account.substring(0, 2)}</AvatarFallback>
                              </Avatar>
                              <span className="truncate">{formatAddress(account)}</span>
                              {account === walletAddress && (
                                <span className="ml-auto text-xs text-green-600">•</span>
                              )}
                            </div>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                  )}
                  
                  <DropdownMenuItem asChild>
                    <Link to="/my-positions" className="w-full">
                      <LayoutList className="mr-2 h-4 w-4" />
                      <span>My Positions</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/transactions" className="w-full">
                      <LayoutList className="mr-2 h-4 w-4" />
                      <span>Transactions</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={disconnectWallet} className="text-destructive cursor-pointer">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Disconnect</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button onClick={connectWallet}>Connect Wallet</Button>
            )}
          </div>
          
          {/* Responsive Menu Button */}
          <Sheet>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" className="mr-2 px-0">
                <Menu className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-full sm:w-64">
              <SheetHeader>
                <SheetTitle>Menu</SheetTitle>
                <SheetDescription>
                  Explore and manage your account.
                </SheetDescription>
              </SheetHeader>
              <div className="grid gap-4 py-4">
                <Link to="/markets" className="text-muted-foreground hover:text-primary px-3 py-2 text-sm font-medium block">
                  Markets
                </Link>
                <Link to="/my-positions" className="text-muted-foreground hover:text-primary px-3 py-2 text-sm font-medium block">
                  My Positions
                </Link>
                <Link to="/transactions" className="text-muted-foreground hover:text-primary px-3 py-2 text-sm font-medium block">
                  Transactions
                </Link>
                <ClaimAntModal />
                <ModeToggle />
                {!isConnected && !walletAddress && (
                  <Button onClick={connectWallet}>Connect Wallet</Button>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
};
