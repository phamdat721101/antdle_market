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
} from "@/components/ui/dropdown-menu"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Menu } from "lucide-react"
import { LayoutList } from "lucide-react"
import leofiLogo from '@/assets/leofi-logo.png';
import { formatAddress } from '@/utils/contractHelpers';

export const Header = () => {
  const { isConnected, walletAddress, connectWallet, disconnectWallet } = useWallet();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center">
              <img src={leofiLogo} alt="LeoFi Logo" className="h-8 mr-2" />
              <span className="text-xl font-bold text-gray-900">LeoFi</span>
            </Link>
          </div>
          
          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link to="/markets" className="text-gray-600 hover:text-orange-600 px-3 py-2 text-sm font-medium">
              Markets
            </Link>
            <Link to="/my-positions" className="text-gray-600 hover:text-orange-600 px-3 py-2 text-sm font-medium">
              My Positions
            </Link>
            <Link to="/transactions" className="text-gray-600 hover:text-orange-600 px-3 py-2 text-sm font-medium">
              Transactions
            </Link>
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
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="cursor-pointer">
                    <a
                      href={`https://etherscan.io/address/${walletAddress}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center w-full"
                    >
                      <span className="mr-2">
                        {formatAddress(walletAddress)}
                      </span>
                      {/* <ExternalLink className="h-4 w-4 ml-auto" /> */}
                    </a>
                  </DropdownMenuItem>
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
                  <DropdownMenuItem onClick={disconnectWallet}>
                    Log out
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
                <Link to="/markets" className="text-gray-600 hover:text-orange-600 px-3 py-2 text-sm font-medium block">
                  Markets
                </Link>
                <Link to="/my-positions" className="text-gray-600 hover:text-orange-600 px-3 py-2 text-sm font-medium block">
                  My Positions
                </Link>
                 <Link to="/transactions" className="text-gray-600 hover:text-orange-600 px-3 py-2 text-sm font-medium block">
                  Transactions
                </Link>
                <ModeToggle />
                {!isConnected && !walletAddress && (
                  <Button onClick={connectWallet}>Connect Wallet</Button>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
      
      {/* Mobile Menu (Hidden by default) */}
    </header>
  );
};
