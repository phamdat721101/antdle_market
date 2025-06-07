
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { formatAddress, ANT_TOKEN_ADDRESS, getTokenBalance } from '@/utils/contractHelpers';
import { ethers } from 'ethers';

export const useWallet = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [antBalance, setAntBalance] = useState("0");
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [accounts, setAccounts] = useState<string[]>([]);

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
        
        // Fetch ANT token balance
        fetchAntBalance(savedAddress, ethProvider);
        
        // Get all accounts
        fetchAccounts();
      }
    }
    
    // Listen for account changes
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', handleAccountsChanged);
    }
    
    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      }
    };
  }, []);
  
  // Handle account changes from the wallet
  const handleAccountsChanged = async (newAccounts: string[]) => {
    console.log("Accounts changed:", newAccounts);
    if (newAccounts.length === 0) {
      // User disconnected wallet
      disconnectWallet();
    } else {
      // User switched accounts
      const newAccount = newAccounts[0];
      setWalletAddress(newAccount);
      localStorage.setItem('walletAddress', newAccount);
      setAccounts(newAccounts);
      
      // Refresh balance for new account
      if (provider) {
        fetchAntBalance(newAccount, provider);
      }
      
      toast.success("Account Changed", {
        description: `Switched to ${formatAddress(newAccount)}`,
      });
    }
  };
  
  // Fetch all accounts from wallet
  const fetchAccounts = async () => {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        setAccounts(accounts || []);
      } catch (error) {
        console.error("Error fetching accounts:", error);
      }
    }
  };
  
  // Switch to a specific account
  const switchAccount = async (accountAddress: string) => {
    if (!window.ethereum) {
      toast.error("Wallet not available");
      return;
    }
    
    try {
      // Request to switch to the specified account
      // Note: Some wallets may not support direct account switching and might show their own UI
      await window.ethereum.request({
        method: 'wallet_requestPermissions',
        params: [{
          eth_accounts: {}
        }]
      });
      
      // After permission request, check if the active account changed
      const currentAccounts = await window.ethereum.request({ method: 'eth_accounts' });
      handleAccountsChanged(currentAccounts);
      
      // Refresh accounts list
      fetchAccounts();
    } catch (error: any) {
      toast.error("Failed to switch account", {
        description: error.message || "Please try manually switching in your wallet"
      });
    }
  };
  
  // Function to fetch ANT token balance
  const fetchAntBalance = async (address: string, ethProvider: ethers.BrowserProvider | null) => {
    if (!address) return;
    
    try {
      // Try to get actual on-chain balance
      if (ethProvider) {
        const balance = await getTokenBalance(ANT_TOKEN_ADDRESS, address, ethProvider);
        setAntBalance(balance);
        // Cache balance in localStorage for persistence
        localStorage.setItem('antBalance', balance);
      } else {
        // Use cached balance if provider not available
        const cachedBalance = localStorage.getItem('antBalance') || "0";
        setAntBalance(cachedBalance);
      }
    } catch (error) {
      console.error("Error fetching ANT balance:", error);
      // Fallback to cached balance
      const cachedBalance = localStorage.getItem('antBalance') || "0";
      setAntBalance(cachedBalance);
    }
  };

  const connectWallet = async () => {
    try {
      // Check if MetaMask is installed
      if (window.ethereum) {
        // Request account access
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        const userAddress = accounts[0];
        
        // Store all accounts
        setAccounts(accounts);
        
        // Store in localStorage
        localStorage.setItem('walletAddress', userAddress);
        
        // Set up provider
        const ethProvider = new ethers.BrowserProvider(window.ethereum);
        setProvider(ethProvider);
        
        // Update state
        setWalletAddress(userAddress);
        setIsConnected(true);
        
        // Fetch ANT balance
        fetchAntBalance(userAddress, ethProvider);
        
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
        setAccounts([simulatedAddress]);
        
        // Set simulated balance
        const simulatedBalance = "100.00";
        setAntBalance(simulatedBalance);
        localStorage.setItem('antBalance', simulatedBalance);
        
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
    localStorage.removeItem('antBalance');
    
    setWalletAddress(null);
    setIsConnected(false);
    setAntBalance("0");
    setProvider(null);
    setAccounts([]);
    
    toast.info("Wallet Disconnected", {
      description: "Your wallet has been disconnected",
    });
  };

  // Function to refresh balance (for when transactions happen)
  const refreshBalance = () => {
    if (walletAddress) {
      fetchAntBalance(walletAddress, provider);
    }
  };

  return {
    isConnected,
    walletAddress,
    antBalance,
    accounts,
    connectWallet,
    disconnectWallet,
    switchAccount,
    refreshBalance,
    provider
  };
};
