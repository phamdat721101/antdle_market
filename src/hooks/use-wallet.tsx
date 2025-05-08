
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { formatAddress } from '@/utils/contractHelpers';

export const useWallet = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  useEffect(() => {
    // Check if wallet is already connected
    const savedAddress = localStorage.getItem('walletAddress');
    if (savedAddress) {
      setWalletAddress(savedAddress);
      setIsConnected(true);
    }
  }, []);

  const connectWallet = async () => {
    try {
      // For demo, we'll simulate a wallet connection
      const simulatedAddress = '0x' + Math.random().toString(16).substring(2, 42);
      
      // Store in localStorage
      localStorage.setItem('walletAddress', simulatedAddress);
      
      // Update state
      setWalletAddress(simulatedAddress);
      setIsConnected(true);
      
      toast.success("Wallet Connected", {
        description: `Connected to ${formatAddress(simulatedAddress)}`,
      });
      
      return simulatedAddress;
    } catch (error: any) {
      toast.error("Connection Failed", {
        description: error.message || "Could not connect to wallet",
      });
      return null;
    }
  };

  const disconnectWallet = () => {
    // Remove from localStorage
    localStorage.removeItem('walletAddress');
    
    setWalletAddress(null);
    setIsConnected(false);
    
    toast.info("Wallet Disconnected", {
      description: "Your wallet has been disconnected",
    });
  };

  return {
    isConnected,
    walletAddress,
    connectWallet,
    disconnectWallet,
  };
};
