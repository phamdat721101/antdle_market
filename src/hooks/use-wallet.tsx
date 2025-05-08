
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { formatAddress, LEO_TOKEN_ADDRESS, getTokenBalance } from '@/utils/contractHelpers';
import { ethers } from 'ethers';

export const useWallet = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [leoBalance, setLeoBalance] = useState("0");
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);

  useEffect(() => {
    // Check if wallet is already connected
    const savedAddress = localStorage.getItem('walletAddress');
    if (savedAddress) {
      setWalletAddress(savedAddress);
      setIsConnected(true);
      
      // Set up provider if window.ethereum exists
      if (window.ethereum) {
        const ethProvider = new ethers.BrowserProvider(window.ethereum);
        setProvider(ethProvider);
        
        // Fetch LEO token balance
        fetchLeoBalance(savedAddress, ethProvider);
      }
    }
  }, []);
  
  // Function to fetch LEO token balance
  const fetchLeoBalance = async (address: string, ethProvider: ethers.BrowserProvider | null) => {
    if (!address) return;
    
    try {
      // Try to get actual on-chain balance
      if (ethProvider) {
        const balance = await getTokenBalance(LEO_TOKEN_ADDRESS, address, ethProvider);
        setLeoBalance(balance);
        // Cache balance in localStorage for persistence
        localStorage.setItem('leoBalance', balance);
      } else {
        // Use cached balance if provider not available
        const cachedBalance = localStorage.getItem('leoBalance') || "0";
        setLeoBalance(cachedBalance);
      }
    } catch (error) {
      console.error("Error fetching LEO balance:", error);
      // Fallback to cached balance
      const cachedBalance = localStorage.getItem('leoBalance') || "0";
      setLeoBalance(cachedBalance);
    }
  };

  const connectWallet = async () => {
    try {
      // Check if MetaMask is installed
      if (window.ethereum) {
        // Request account access
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        const userAddress = accounts[0];
        
        // Store in localStorage
        localStorage.setItem('walletAddress', userAddress);
        
        // Set up provider
        const ethProvider = new ethers.BrowserProvider(window.ethereum);
        setProvider(ethProvider);
        
        // Update state
        setWalletAddress(userAddress);
        setIsConnected(true);
        
        // Fetch LEO balance
        fetchLeoBalance(userAddress, ethProvider);
        
        toast.success("Wallet Connected", {
          description: `Connected to ${formatAddress(userAddress)}`,
        });
        
        return userAddress;
      } else {
        // For demo, simulate a wallet connection if MetaMask not available
        const simulatedAddress = '0x' + Math.random().toString(16).substring(2, 42);
        
        // Store in localStorage
        localStorage.setItem('walletAddress', simulatedAddress);
        
        // Update state
        setWalletAddress(simulatedAddress);
        setIsConnected(true);
        
        // Set simulated balance
        const simulatedBalance = "100.00";
        setLeoBalance(simulatedBalance);
        localStorage.setItem('leoBalance', simulatedBalance);
        
        toast.success("Wallet Connected", {
          description: `Connected to ${formatAddress(simulatedAddress)}`,
        });
        
        return simulatedAddress;
      }
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
    localStorage.removeItem('leoBalance');
    
    setWalletAddress(null);
    setIsConnected(false);
    setLeoBalance("0");
    setProvider(null);
    
    toast.info("Wallet Disconnected", {
      description: "Your wallet has been disconnected",
    });
  };

  // Function to refresh balance (for when transactions happen)
  const refreshBalance = () => {
    if (walletAddress) {
      fetchLeoBalance(walletAddress, provider);
    }
  };

  return {
    isConnected,
    walletAddress,
    leoBalance,
    connectWallet,
    disconnectWallet,
    refreshBalance,
    provider
  };
};
