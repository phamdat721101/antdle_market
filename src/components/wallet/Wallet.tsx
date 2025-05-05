
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Loader2, ChevronDown, ExternalLink, LogOut, Wallet as WalletIcon } from 'lucide-react';
import { ethers } from 'ethers';
import { checkSupportedChain, getChainDetails, formatAddress } from '@/utils/contractHelpers';

// Supported wallet types
type WalletProvider = 'metamask' | 'walletconnect' | 'coinbase';

interface ChainInfo {
  id: string;
  name: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
}

const SUPPORTED_CHAINS: Record<string, ChainInfo> = {
  '0x1': {
    id: '0x1',
    name: 'Ethereum Mainnet',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }
  },
  '0x5': {
    id: '0x5',
    name: 'Goerli Testnet',
    nativeCurrency: { name: 'Goerli ETH', symbol: 'GoETH', decimals: 18 }
  },
  '0x89': {
    id: '0x89',
    name: 'Polygon',
    nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 }
  },
  '0xa86a': {
    id: '0xa86a',
    name: 'Avalanche',
    nativeCurrency: { name: 'AVAX', symbol: 'AVAX', decimals: 18 }
  },
  '0x13881': { 
    id: '0x13881', 
    name: 'Mumbai Testnet',
    nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 }
  },
  '0xa869': {
    id: '0xa869',
    name: 'Avalanche Fuji',
    nativeCurrency: { name: 'AVAX', symbol: 'AVAX', decimals: 18 }
  }
};

export const Wallet = () => {
  const [address, setAddress] = useState<string | null>(null);
  const [displayAddress, setDisplayAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [walletProvider, setWalletProvider] = useState<WalletProvider | null>(null);
  const [chainConnected, setChainConnected] = useState(false);
  const [chainId, setChainId] = useState<string | null>(null);
  const [chainName, setChainName] = useState<string | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [ethBalance, setEthBalance] = useState<string | null>(null);
  const [explorer, setExplorer] = useState<string | null>(null);
  const { toast } = useToast();

  // Check if wallet is already connected when component mounts
  useEffect(() => {
    const savedAddress = localStorage.getItem('walletAddress');
    const savedChainStatus = localStorage.getItem('chainConnected') === 'true';
    const savedChainId = localStorage.getItem('chainId');
    const savedChainName = localStorage.getItem('chainName');
    const savedProvider = localStorage.getItem('walletProvider') as WalletProvider | null;
    
    if (savedAddress) {
      setAddress(savedAddress);
      setDisplayAddress(savedAddress); // Set initially, will be updated if ENS is available
      setChainConnected(savedChainStatus);
      setChainId(savedChainId);
      setChainName(savedChainName);
      setWalletProvider(savedProvider);
      
      // Get chain explorer URL
      if (savedChainId) {
        const chainDetails = getChainDetails(savedChainId);
        setExplorer(chainDetails.explorer);
      }
      
      // Get balance if wallet is connected
      if (window.ethereum && savedAddress) {
        getWalletBalances(savedAddress);
        
        // Try to resolve ENS name if connected to Ethereum mainnet
        if (savedChainId === '0x1') {
          resolveEnsName(savedAddress);
        }
      }
    }

    // Listen for account changes
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);
      window.ethereum.on('disconnect', handleDisconnect);
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
        window.ethereum.removeListener('disconnect', handleDisconnect);
      }
    };
  }, []);

  // Resolve ENS name if available
  const resolveEnsName = async (walletAddress: string) => {
    try {
      if (window.ethereum) {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const ensName = await provider.lookupAddress(walletAddress);
        if (ensName) {
          setDisplayAddress(ensName);
          return;
        }
      }
      // If no ENS name or error, use formatted address
      setDisplayAddress(formatAddress(walletAddress));
    } catch (error) {
      console.error("Error resolving ENS name:", error);
      setDisplayAddress(formatAddress(walletAddress));
    }
  };

  const handleAccountsChanged = async (accounts: string[]) => {
    if (accounts.length === 0) {
      // User disconnected their wallet
      disconnectWallet();
    } else {
      // User switched accounts
      const newAccount = accounts[0];
      setAddress(newAccount);
      localStorage.setItem('walletAddress', newAccount);
      
      // Try to resolve ENS name
      if (chainId === '0x1') {
        await resolveEnsName(newAccount);
      } else {
        setDisplayAddress(formatAddress(newAccount));
      }
      
      // Check if user already exists in database, create if not
      await checkOrCreateUser(newAccount);
      
      // Update balance
      getWalletBalances(newAccount);
      
      toast({
        title: "Account Changed",
        description: `Switched to ${formatAddress(newAccount)}`,
      });
    }
  };

  const handleDisconnect = () => {
    disconnectWallet();
  };

  const handleChainChanged = async (chainIdHex: string) => {
    // Update chain information when the user changes networks in wallet
    setChainId(chainIdHex);
    
    try {
      if (window.ethereum) {
        setChainConnected(true);
        localStorage.setItem('chainConnected', 'true');
        localStorage.setItem('chainId', chainIdHex);
        
        // Get chain information from our supported chains or from the wallet
        const chainInfo = SUPPORTED_CHAINS[chainIdHex] || {
          name: 'Unknown Network',
          nativeCurrency: { symbol: 'ETH', name: 'Ether', decimals: 18 }
        };
        
        // Get chain details including explorer URL
        const chainDetails = getChainDetails(chainIdHex);
        setExplorer(chainDetails.explorer);
        
        const chainName = chainInfo.name;
        setChainName(chainName);
        localStorage.setItem('chainName', chainName);
        
        // If Ethereum mainnet, try to resolve ENS name
        if (chainIdHex === '0x1' && address) {
          await resolveEnsName(address);
        } else if (address) {
          setDisplayAddress(formatAddress(address));
        }
        
        // Fetch updated balance for the new chain
        if (address) {
          getWalletBalances(address);
        }
        
        toast({
          title: "Network Changed",
          description: `Connected to ${chainName}`,
        });
      }
    } catch (error) {
      console.error('Error handling chain change:', error);
    }
  };

  const checkOrCreateUser = async (userAddress: string) => {
    try {
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
    } catch (error) {
      console.error('Error checking/creating user:', error);
    }
  };

  const getWalletBalances = async (address: string) => {
    if (!window.ethereum || !address) return;
    
    try {
      // Get ETH/native balance
      const balanceHex = await window.ethereum.request({
        method: 'eth_getBalance',
        params: [address, 'latest'],
      });
      
      const balanceInWei = parseInt(balanceHex as string, 16);
      const balanceInEth = balanceInWei / 1e18;
      
      // Format to 4 decimal places
      const formattedBalance = balanceInEth.toFixed(4);
      setEthBalance(formattedBalance);
      
      // In a real app, we'd also get LEO token balance here
      // This is simulated for demo purposes
      const simulatedLeoBalance = (balanceInEth * 10).toFixed(2);
      setBalance(simulatedLeoBalance);
    } catch (error) {
      console.error('Error getting wallet balance:', error);
    }
  };

  const connectMetaMask = async () => {
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
      
      // Set wallet provider
      setWalletProvider('metamask');
      localStorage.setItem('walletProvider', 'metamask');
      
      // Set chain as connected
      setChainConnected(true);
      setChainId(chainIdHex as string);
      localStorage.setItem('chainConnected', 'true');
      localStorage.setItem('chainId', chainIdHex as string);
      
      // Try to get chain name
      const chainDetails = getChainDetails(chainIdHex as string);
      const chainName = chainDetails.name;
      setExplorer(chainDetails.explorer);
      
      setChainName(chainName);
      localStorage.setItem('chainName', chainName);
      
      // Save address to localStorage
      localStorage.setItem('walletAddress', userAddress);
      
      // Get wallet balance
      getWalletBalances(userAddress);
      
      // Check if user already exists in database, create if not
      await checkOrCreateUser(userAddress);
      
      setAddress(userAddress);
      
      // Try to resolve ENS name if on Ethereum mainnet
      if (chainIdHex === '0x1') {
        await resolveEnsName(userAddress);
      } else {
        setDisplayAddress(formatAddress(userAddress));
      }
      
      toast({
        title: "Wallet Connected",
        description: `Connected to ${displayAddress || formatAddress(userAddress)} on ${chainName}`,
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

  const connectWalletConnect = () => {
    toast({
      title: "Coming Soon",
      description: "WalletConnect integration will be available soon",
    });
  };

  const connectCoinbaseWallet = () => {
    toast({
      title: "Coming Soon",
      description: "Coinbase Wallet integration will be available soon",
    });
  };

  const disconnectWallet = () => {
    // Remove from localStorage
    localStorage.removeItem('walletAddress');
    localStorage.removeItem('chainConnected');
    localStorage.removeItem('chainId');
    localStorage.removeItem('chainName');
    localStorage.removeItem('walletProvider');
    
    setAddress(null);
    setDisplayAddress(null);
    setChainConnected(false);
    setChainId(null);
    setChainName(null);
    setWalletProvider(null);
    setBalance(null);
    setEthBalance(null);
    setExplorer(null);
    
    toast({
      title: "Wallet Disconnected",
      description: "Your wallet has been disconnected",
    });
  };

  // Open account on blockchain explorer
  const openBlockchainExplorer = () => {
    if (!address || !explorer) return;
    
    window.open(`${explorer}/address/${address}`, '_blank');
  };

  if (address) {
    return (
      <div className="flex items-center space-x-2">
        {balance && (
          <div className="px-3 py-1 rounded-md bg-gradient-to-r from-purple-600 to-purple-800 text-white">
            <p className="text-sm font-medium">{balance} LEO</p>
            {ethBalance && chainId && (
              <p className="text-xs opacity-80">
                {ethBalance} {SUPPORTED_CHAINS[chainId]?.nativeCurrency.symbol || 'ETH'}
              </p>
            )}
          </div>
        )}
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="outline" 
              className="border-purple-400 bg-white text-purple-700 hover:bg-purple-100 flex items-center"
            >
              <div className="flex items-center">
                <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
                <span className="mr-1">{displayAddress}</span>
                <ChevronDown size={16} />
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {chainName && (
              <div className="px-2 py-1.5 text-sm text-gray-500">
                Connected to {chainName}
              </div>
            )}
            {explorer && (
              <DropdownMenuItem onClick={openBlockchainExplorer} className="cursor-pointer">
                <ExternalLink size={16} className="mr-2" />
                View on Explorer
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={disconnectWallet} className="cursor-pointer text-red-600">
              <LogOut size={16} className="mr-2" />
              Disconnect Wallet
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          className="bg-purple-600 hover:bg-purple-700 flex items-center" 
          disabled={isConnecting}
        >
          {isConnecting ? (
            <>
              <Loader2 size={16} className="mr-2 animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              <WalletIcon size={16} className="mr-2" />
              Connect Wallet
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={connectMetaMask} className="cursor-pointer">
          <img src="https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg" alt="MetaMask" className="w-5 h-5 mr-2" />
          MetaMask
        </DropdownMenuItem>
        <DropdownMenuItem onClick={connectWalletConnect} className="cursor-pointer">
          <img src="https://raw.githubusercontent.com/WalletConnect/walletconnect-assets/master/Icon/Blue%20(Default)/Icon.svg" alt="WalletConnect" className="w-5 h-5 mr-2" />
          WalletConnect
        </DropdownMenuItem>
        <DropdownMenuItem onClick={connectCoinbaseWallet} className="cursor-pointer">
          <img src="https://www.svgrepo.com/show/331345/coinbase-v2.svg" alt="Coinbase Wallet" className="w-5 h-5 mr-2" />
          Coinbase Wallet
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
