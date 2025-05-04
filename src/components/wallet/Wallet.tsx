
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export const Wallet = () => {
  const [address, setAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [chainConnected, setChainConnected] = useState(false);
  const [chainId, setChainId] = useState<string | null>(null);
  const [chainName, setChainName] = useState<string | null>(null);
  const { toast } = useToast();

  // Check if wallet is already connected when component mounts
  useEffect(() => {
    const savedAddress = localStorage.getItem('walletAddress');
    const savedChainStatus = localStorage.getItem('chainConnected') === 'true';
    const savedChainId = localStorage.getItem('chainId');
    const savedChainName = localStorage.getItem('chainName');
    
    if (savedAddress) {
      setAddress(savedAddress);
      setChainConnected(savedChainStatus);
      setChainId(savedChainId);
      setChainName(savedChainName);
    }

    // Listen for chain changes
    if (window.ethereum) {
      window.ethereum.on('chainChanged', handleChainChanged);
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      }
    };
  }, []);

  const handleChainChanged = async (chainIdHex: string) => {
    // Update chain information when the user changes networks in MetaMask
    setChainId(chainIdHex);
    try {
      if (window.ethereum) {
        const chainData = await window.ethereum.request({
          method: 'eth_chainId',
        });
        
        if (chainData) {
          setChainConnected(true);
          localStorage.setItem('chainConnected', 'true');
          localStorage.setItem('chainId', chainIdHex);
          
          // Try to get chain name
          try {
            const chainInfo = await window.ethereum.request({
              method: 'eth_getChainId',
            });
            
            // Set a default chain name based on common chain IDs
            let name = 'Unknown Network';
            if (chainIdHex === '0x1') name = 'Ethereum Mainnet';
            else if (chainIdHex === '0x5') name = 'Goerli Testnet';
            else if (chainIdHex === '0x89') name = 'Polygon';
            else if (chainIdHex === '0xa86a') name = 'Avalanche';
            
            setChainName(name);
            localStorage.setItem('chainName', name);
          } catch (error) {
            console.log('Could not get chain name', error);
          }
        }
      }
    } catch (error) {
      console.error('Error handling chain change:', error);
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
      
      // Get current chain ID
      const chainIdHex = await window.ethereum.request({ method: 'eth_chainId' });
      
      // Set chain as connected
      setChainConnected(true);
      setChainId(chainIdHex);
      localStorage.setItem('chainConnected', 'true');
      localStorage.setItem('chainId', chainIdHex);
      
      // Try to get chain name
      let chainName = 'Connected Chain';
      if (chainIdHex === '0x1') chainName = 'Ethereum Mainnet';
      else if (chainIdHex === '0x5') chainName = 'Goerli Testnet';
      else if (chainIdHex === '0x89') chainName = 'Polygon';
      else if (chainIdHex === '0xa86a') chainName = 'Avalanche';
      
      setChainName(chainName);
      localStorage.setItem('chainName', chainName);
      
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
        description: `Connected to ${userAddress.substring(0, 6)}...${userAddress.substring(userAddress.length - 4)} on ${chainName}`,
      });
    } catch (error: any) {
      toast({
        title: "Connection Failed",
        description: error.message || "Could not connect to wallet",
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    // Remove from localStorage
    localStorage.removeItem('walletAddress');
    localStorage.removeItem('chainConnected');
    localStorage.removeItem('chainId');
    localStorage.removeItem('chainName');
    
    setAddress(null);
    setChainConnected(false);
    setChainId(null);
    setChainName(null);
    
    toast({
      title: "Wallet Disconnected",
      description: "Your wallet has been disconnected",
    });
  };

  if (address) {
    return (
      <div className="flex items-center">
        <div className="px-3 py-2 rounded-md mr-2 text-white bg-purple-600">
          {`${address.substring(0, 6)}...${address.substring(address.length - 4)}`}
          {chainName && (
            <span className="text-xs block">{chainName}</span>
          )}
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
