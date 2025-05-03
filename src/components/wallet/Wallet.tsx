
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export const Wallet = () => {
  const [address, setAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [chainConnected, setChainConnected] = useState(false);
  const { toast } = useToast();

  // Custom chain parameters
  const customChain = {
    chainId: '0x539', // 1337 in hex
    chainName: 'LeoFi Prediction Chain',
    nativeCurrency: {
      name: 'LEO',
      symbol: 'LEO',
      decimals: 18
    },
    rpcUrls: ['https://rpc.leofi-prediction.network'],
    blockExplorerUrls: ['https://explorer.leofi-prediction.network']
  };

  // Check if wallet is already connected when component mounts
  useEffect(() => {
    const savedAddress = localStorage.getItem('walletAddress');
    const savedChainStatus = localStorage.getItem('chainConnected') === 'true';
    
    if (savedAddress) {
      setAddress(savedAddress);
      setChainConnected(savedChainStatus);
    }
  }, []);

  const addCustomChain = async () => {
    if (!window.ethereum) {
      toast({
        title: "MetaMask Not Found",
        description: "Please install MetaMask to use this feature",
        variant: "destructive",
      });
      return false;
    }

    try {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [customChain],
      });
      
      // Switch to the custom chain
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: customChain.chainId }],
      });
      
      localStorage.setItem('chainConnected', 'true');
      setChainConnected(true);
      
      toast({
        title: "Network Connected",
        description: `Connected to ${customChain.chainName}`,
      });
      
      return true;
    } catch (error: any) {
      console.error("Error adding custom chain:", error);
      toast({
        title: "Network Connection Failed",
        description: error.message || "Failed to connect to prediction network",
        variant: "destructive",
      });
      return false;
    }
  };

  const connectWallet = async () => {
    setIsConnecting(true);
    try {
      // Check if MetaMask is installed
      if (!window.ethereum) {
        throw new Error("MetaMask is not installed. Please install MetaMask to use this feature.");
      }
      
      // Request account access
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const userAddress = accounts[0];
      
      // Connect to custom chain
      const chainAdded = await addCustomChain();
      if (!chainAdded) {
        throw new Error("Failed to connect to prediction network");
      }
      
      // Save address to localStorage
      localStorage.setItem('walletAddress', userAddress);
      
      // Check if user already exists in database, create if not
      const { data: existingUser } = await supabase
        .from('users')
        .select('*')
        .eq('wallet_address', userAddress)
        .single();
      
      if (!existingUser) {
        await supabase.from('users').insert({
          wallet_address: userAddress,
          email: `${userAddress.substring(0, 6)}@example.com` // placeholder email
        });
      }
      
      setAddress(userAddress);
      toast({
        title: "Wallet Connected",
        description: `Connected to ${userAddress.substring(0, 6)}...${userAddress.substring(userAddress.length - 4)}`,
      });
    } catch (error: any) {
      toast({
        title: "Connection Failed",
        description: error.message || "Could not connect to wallet",
        variant: "destructive",
      });
    } finally {
      setIsConnitting(false);
    }
  };

  const disconnectWallet = () => {
    // Remove from localStorage
    localStorage.removeItem('walletAddress');
    localStorage.removeItem('chainConnected');
    
    setAddress(null);
    setChainConnected(false);
    toast({
      title: "Wallet Disconnected",
      description: "Your wallet has been disconnected",
    });
  };

  if (address) {
    return (
      <div className="flex items-center">
        <div className={`px-3 py-2 rounded-md mr-2 text-white ${chainConnected ? 'bg-green-600' : 'bg-purple-600'}`}>
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
