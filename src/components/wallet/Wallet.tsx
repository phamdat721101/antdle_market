
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

export const Wallet = () => {
  const [address, setAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const { toast } = useToast();

  // Check if wallet is already connected when component mounts
  useEffect(() => {
    const savedAddress = localStorage.getItem('walletAddress');
    if (savedAddress) {
      setAddress(savedAddress);
    }
  }, []);

  const connectWallet = async () => {
    setIsConnecting(true);
    try {
      // Mock wallet connection - in a real app, we would use wagmi or web3modal
      await new Promise(resolve => setTimeout(resolve, 1000));
      const mockAddress = '0x' + Math.random().toString(16).substring(2, 14);
      
      // Save address to localStorage
      localStorage.setItem('walletAddress', mockAddress);
      
      setAddress(mockAddress);
      toast({
        title: "Wallet Connected",
        description: `Connected to ${mockAddress.substring(0, 6)}...${mockAddress.substring(mockAddress.length - 4)}`,
      });
    } catch (error) {
      toast({
        title: "Connection Failed",
        description: "Could not connect to wallet",
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    // Remove from localStorage
    localStorage.removeItem('walletAddress');
    
    setAddress(null);
    toast({
      title: "Wallet Disconnected",
      description: "Your wallet has been disconnected",
    });
  };

  if (address) {
    return (
      <div className="flex items-center">
        <div className="bg-purple-600 text-white px-3 py-2 rounded-md mr-2">
          {`${address.substring(0, 6)}...${address.substring(address.length - 4)}`}
        </div>
        <Button 
          variant="outline" 
          className="border-purple-400 text-purple-400 hover:bg-purple-100" 
          onClick={disconnectWallet}
        >
          Disconnect
        </Button>
      </div>
    );
  }

  return (
    <Button 
      className="bg-purple-600 hover:bg-purple-700" 
      onClick={connectWallet} 
      disabled={isConnecting}
    >
      {isConnecting ? 'Connecting...' : 'Connect Wallet'}
    </Button>
  );
};
