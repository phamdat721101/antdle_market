import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { ArrowDownUp, AlertCircle, CheckCircle, ArrowRight, ExternalLink } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ethers } from 'ethers';
import { 
  PREDICTION_CONTRACT_ADDRESS, 
  PREDICTION_CONTRACT_ABI,
  checkSupportedChain,
  getChainDetails,
  getSigner,
  getPredictionContract,
  getOnChainIdFromSupabase,
  formatAddress
} from '@/utils/contractHelpers';
import { supabase } from '@/integrations/supabase/client';

interface TradeFormProps {
  marketId: string;
  assetName: string;
  strikePrice: number;
  onSuccess: () => void;
  onChainId?: string;
}

export const TradeForm = ({ marketId, assetName, strikePrice, onSuccess, onChainId }: TradeFormProps) => {
  const [position, setPosition] = useState<'yes' | 'no'>('yes');
  const [amount, setAmount] = useState('');
  const [swapAmount, setSwapAmount] = useState('');
  const [estimatedLeo, setEstimatedLeo] = useState('0');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSwapping, setIsSwapping] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [txStatus, setTxStatus] = useState<'pending' | 'confirmed' | 'failed' | null>(null);
  const [activeTab, setActiveTab] = useState('predict');
  const [hasBalance, setHasBalance] = useState(false);
  const [leoBalance, setLeoBalance] = useState('0');
  const [nativeToken, setNativeToken] = useState('ETH');
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [walletConnecting, setWalletConnecting] = useState(false);
  const [explorer, setExplorer] = useState('');
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const { toast } = useToast();

  // Fetch the on-chain ID when component mounts
  useEffect(() => {
    const fetchOnChainId = async () => {
      try {
        // If onChainId is provided directly as a prop, use it
        if (onChainId) {
          setCampaignId(onChainId);
          return;
        }

        // Otherwise, try to fetch from Supabase
        const { data, error } = await supabase
          .from('prediction_markets')
          .select('on_chain_id')
          .eq('id', marketId)
          .single();

        if (error) {
          console.error("Error fetching on-chain ID:", error);
          return;
        }

        if (data && data.on_chain_id) {
          console.log("Found on-chain ID:", data.on_chain_id);
          setCampaignId(data.on_chain_id);
        } else {
          console.log("No on-chain ID found for this market");
        }
      } catch (error) {
        console.error("Error in fetchOnChainId:", error);
      }
    };

    fetchOnChainId();
  }, [marketId, onChainId]);

  // Check wallet connection and balance on mount
  useEffect(() => {
    const checkWalletAndBalance = async () => {
      const walletAddress = localStorage.getItem('walletAddress');
      const chainId = localStorage.getItem('chainId');
      
      if (chainId) {
        // Get chain details
        const chainDetails = getChainDetails(chainId);
        setExplorer(chainDetails.explorer);
        
        // Get native token symbol based on chain
        switch (chainId) {
          case '0x89':
          case '0x13881':
            setNativeToken('MATIC');
            break;
          case '0xa86a':
          case '0xa869':
            setNativeToken('AVAX');
            break;
          default:
            setNativeToken('ETH');
        }
      }
      
      if (walletAddress) {
        // Check if we can get actual wallet provider
        if (window.ethereum) {
          try {
            const ethProvider = new ethers.BrowserProvider(window.ethereum);
            setProvider(ethProvider);
            const ethSigner = await ethProvider.getSigner();
            setSigner(ethSigner);
            
            // For demo, still use simulated balance
            const simulatedLeoBalance = localStorage.getItem('leoBalance') || '100.00';
            setLeoBalance(simulatedLeoBalance);
            setHasBalance(parseFloat(simulatedLeoBalance) > 0);
          } catch (error) {
            console.error("Error connecting to wallet provider:", error);
          }
        } else {
          // Fallback to simulated data
          const simulatedLeoBalance = localStorage.getItem('leoBalance') || '100.00';
          setLeoBalance(simulatedLeoBalance);
          setHasBalance(parseFloat(simulatedLeoBalance) > 0);
        }
      } else {
        setHasBalance(false);
        setLeoBalance('0');
        setProvider(null);
        setSigner(null);
      }
    };
    
    checkWalletAndBalance();
    
    // Listen for storage changes (wallet connections/disconnections)
    window.addEventListener('storage', checkWalletAndBalance);
    
    return () => {
      window.removeEventListener('storage', checkWalletAndBalance);
    };
  }, []);

  // Calculate estimated LEO tokens when swap amount changes
  useEffect(() => {
    if (!swapAmount || parseFloat(swapAmount) <= 0) {
      setEstimatedLeo('0');
      return;
    }
    
    // Token swap rate calculation
    const amountValue = parseFloat(swapAmount);
    const estimatedAmount = (amountValue * 10).toFixed(2);
    setEstimatedLeo(estimatedAmount);
  }, [swapAmount]);

  const connectWallet = async () => {
    setWalletConnecting(true);
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
      
      // Check if chain is supported
      if (!checkSupportedChain(chainIdHex as string)) {
        toast({
          title: "Unsupported Network",
          description: "Please connect to a supported network to continue.",
          variant: "destructive",
        });
        // Don't return here, let the user continue with an unsupported chain if they want
      }
      
      // Set up ethers provider and signer
      const ethProvider = new ethers.BrowserProvider(window.ethereum);
      setProvider(ethProvider);
      const ethSigner = await ethProvider.getSigner();
      setSigner(ethSigner);
      
      // Save to localStorage for app-wide access
      localStorage.setItem('walletAddress', userAddress);
      localStorage.setItem('chainConnected', 'true');
      localStorage.setItem('chainId', chainIdHex as string);
      
      // Try to get chain name
      const chainDetails = getChainDetails(chainIdHex as string);
      localStorage.setItem('chainName', chainDetails.name);
      setExplorer(chainDetails.explorer);
      
      // Set native token based on chain
      switch (chainIdHex) {
        case '0x89':
        case '0x13881':
          setNativeToken('MATIC');
          break;
        case '0xa86a':
        case '0xa869':
          setNativeToken('AVAX');
          break;
        default:
          setNativeToken('ETH');
      }
      
      toast({
        title: "Wallet Connected",
        description: `Connected to ${formatAddress(userAddress)} on ${chainDetails.name}`,
      });
      
      // For demo, set simulated LEO balance
      const simulatedLeoBalance = '100.00';
      localStorage.setItem('leoBalance', simulatedLeoBalance);
      setLeoBalance(simulatedLeoBalance);
      setHasBalance(true);
    } catch (error: any) {
      toast({
        title: "Connection Failed",
        description: error.message || "Could not connect to wallet",
        variant: "destructive",
      });
    } finally {
      setWalletConnecting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!amount || parseFloat(amount) <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount",
        variant: "destructive",
      });
      return;
    }

    // Check if wallet is connected
    const walletAddress = localStorage.getItem('walletAddress');
    
    if (!walletAddress || !signer) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet to trade",
        variant: "destructive",
      });
      return;
    }

    // Check if connected to any chain
    const chainConnected = localStorage.getItem('chainConnected') === 'true';
    if (!chainConnected) {
      toast({
        title: "No Network Connected",
        description: "Please connect to a blockchain network via your wallet",
        variant: "destructive",
      });
      return;
    }

    // Make sure we have a campaign ID
    if (!campaignId) {
      toast({
        title: "Campaign Not Found",
        description: "This market is not available on-chain",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    setTxStatus('pending');
    try {
      // Execute the on-chain transaction
      if (window.ethereum && signer) {
        try {
          // Interface with the smart contract
          const contract = getPredictionContract(signer);
          
          // Convert amount to Wei (or appropriate units)
          const amountBigInt = ethers.parseUnits(amount, 18);
          
          // Use the actual on-chain campaign ID from state
          console.log(`Using campaign ID: ${campaignId}`);
          
          // On-chain outcome: 0 for Yes, 1 for No
          const outcomeIndex = position === 'yes' ? 0 : 1;
          
          // Call the contract function with the actual campaign ID
          const tx = await contract.deposit(
            campaignId, // Use the campaign ID from state
            outcomeIndex,
            amountBigInt,
            { gasLimit: 300000 }
          );
          
          // Set pending transaction hash
          setTxHash(tx.hash);
          
          toast({
            title: "Transaction Submitted",
            description: `Your transaction has been submitted to the blockchain. It may take a few moments to confirm.`,
          });
          
          // Wait for transaction confirmation
          const receipt = await tx.wait();
          
          if (receipt && receipt.status === 1) {
            setTxStatus('confirmed');
            
            // Update local state and LEO balance
            const newBalance = (parseFloat(leoBalance) - parseFloat(amount)).toFixed(2);
            setLeoBalance(newBalance);
            localStorage.setItem('leoBalance', newBalance);
            
            toast({
              title: "Transaction Confirmed",
              description: `Your ${position.toUpperCase()} prediction for ${amount} LEO has been placed on-chain`,
            });
            
            setAmount('');
            onSuccess();
          } else {
            throw new Error("Transaction failed");
          }
        } catch (error: any) {
          console.error("On-chain transaction error:", error);
          setTxStatus('failed');
          
          toast({
            title: "Transaction Failed",
            description: error.message || "Failed to place prediction on-chain",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Wallet Not Available",
          description: "Please make sure your wallet is properly connected",
          variant: "destructive",
        });
        setTxStatus('failed');
      }
    } catch (error: any) {
      console.error("Transaction error:", error);
      setTxStatus('failed');
      toast({
        title: "Transaction Failed",
        description: error.message || "Failed to place prediction on-chain",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSwap = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!swapAmount || parseFloat(swapAmount) <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount",
        variant: "destructive",
      });
      return;
    }

    // Check if wallet is connected
    const walletAddress = localStorage.getItem('walletAddress');
    
    if (!walletAddress || !signer) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet to swap tokens",
        variant: "destructive",
      });
      return;
    }

    // Check if connected to any chain
    const chainConnected = localStorage.getItem('chainConnected') === 'true';
    if (!chainConnected) {
      toast({
        title: "No Network Connected",
        description: "Please connect to a blockchain network via your wallet",
        variant: "destructive",
      });
      return;
    }

    setIsSwapping(true);
    try {
      if (window.ethereum && signer) {
        try {
          // Interface with the swap contract
          const contract = getPredictionContract(signer);
          
          // Convert amount to Wei
          const amountInWei = ethers.parseEther(swapAmount);
          
          // Call the swap function with ETH value
          const tx = await contract.swapTokens(
            amountInWei, 
            { value: amountInWei, gasLimit: 200000 }
          );
          
          toast({
            title: "Swap Transaction Submitted",
            description: `Your token swap has been submitted to the blockchain. It may take a few moments to confirm.`,
          });
          
          // Wait for transaction confirmation
          const receipt = await tx.wait();
          
          if (receipt && receipt.status === 1) {
            // Transaction successful
            // Get chain name for better user experience
            const chainName = localStorage.getItem('chainName') || 'blockchain';
            
            toast({
              title: "Swap Successful",
              description: `Successfully swapped ${swapAmount} ${nativeToken} for ${estimatedLeo} LEO on ${chainName}`,
            });
            
            // Update simulated LEO balance
            const newBalance = (parseFloat(leoBalance) + parseFloat(estimatedLeo)).toFixed(2);
            setLeoBalance(newBalance);
            localStorage.setItem('leoBalance', newBalance);
            setHasBalance(true);
            
            // Clear form
            setSwapAmount('');
            setEstimatedLeo('0');
            
            // Switch to predict tab
            setActiveTab('predict');
          } else {
            throw new Error("Swap transaction failed");
          }
        } catch (error: any) {
          console.error("On-chain swap error:", error);
          
          toast({
            title: "Swap Failed",
            description: error.message || "Failed to swap tokens on-chain",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Wallet Not Available",
          description: "Please make sure your wallet is properly connected",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Swap Failed",
        description: error.message || "Failed to swap tokens",
        variant: "destructive",
      });
    } finally {
      setIsSwapping(false);
    }
  };

  // Check if user needs to connect wallet first
  const renderConnectWalletButton = () => {
    if (!localStorage.getItem('walletAddress')) {
      return (
        <Button 
          type="button" 
          onClick={connectWallet} 
          className="w-full bg-purple-600 hover:bg-purple-700 mb-4"
          disabled={walletConnecting}
        >
          {walletConnecting ? (
            <>
              <span className="inline-block h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
              Connecting Wallet...
            </>
          ) : (
            <>
              Connect Wallet to Trade
            </>
          )}
        </Button>
      );
    }
    return null;
  };

  // View transaction on block explorer
  const viewTransaction = () => {
    if (txHash && explorer) {
      window.open(`${explorer}/tx/${txHash}`, '_blank');
    }
  };

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid grid-cols-2 mb-4">
        <TabsTrigger value="predict">Predict</TabsTrigger>
        <TabsTrigger value="swap">Get LEO</TabsTrigger>
      </TabsList>
      
      <TabsContent value="predict">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="p-4 bg-orange-50 rounded-lg border border-orange-100">
            <h3 className="font-medium text-lg mb-2">Market</h3>
            <p>Will {assetName} be above ${strikePrice} at expiry?</p>
            {campaignId && (
              <p className="text-xs text-purple-700 mt-2">
                On-Chain ID: {campaignId}
              </p>
            )}
          </div>
          
          {renderConnectWalletButton()}
          
          <div className="flex justify-between items-center">
            <h3 className="font-medium">Choose Position</h3>
            <div className="text-sm text-gray-500">
              Balance: {leoBalance} LEO
            </div>
          </div>
          
          <RadioGroup 
            value={position} 
            onValueChange={(value) => setPosition(value as 'yes' | 'no')}
            className="flex gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="yes" id="yes" />
              <Label htmlFor="yes" className="font-medium text-green-600">YES</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="no" id="no" />
              <Label htmlFor="no" className="font-medium text-red-600">NO</Label>
            </div>
          </RadioGroup>
          
          <div>
            <Label htmlFor="amount">Amount (LEO)</Label>
            <div className="mt-1">
              <Input
                id="amount"
                placeholder="0.0"
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="flex justify-between mt-1">
              <p className="text-xs text-gray-500">
                *Transaction will be processed on-chain
              </p>
              <button 
                type="button"
                className="text-xs text-purple-600 hover:text-purple-800"
                onClick={() => hasBalance ? setAmount(leoBalance) : null}
                disabled={!hasBalance}
              >
                Max
              </button>
            </div>
          </div>
          
          {!campaignId && (
            <Alert className="bg-amber-50 border-amber-200">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800">
                This market is not available on-chain.
              </AlertDescription>
            </Alert>
          )}
          
          {!localStorage.getItem('walletAddress') && (
            <Alert className="bg-purple-50 border-purple-200">
              <AlertCircle className="h-4 w-4 text-purple-600" />
              <AlertDescription className="text-purple-800">
                Connect your wallet to place on-chain predictions
              </AlertDescription>
            </Alert>
          )}
          
          {localStorage.getItem('walletAddress') && !hasBalance && (
            <Alert className="bg-blue-50 border-blue-200">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                You need LEO tokens to participate. Switch to the "Get LEO" tab to swap your {nativeToken}.
              </AlertDescription>
            </Alert>
          )}
          
          {txStatus === 'pending' && txHash && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md flex justify-between items-center">
              <p className="text-sm flex items-center">
                <span className="inline-block h-2 w-2 bg-blue-600 rounded-full animate-pulse mr-2"></span>
                Transaction pending
              </p>
              {explorer && (
                <Button variant="link" onClick={viewTransaction} className="text-blue-600 p-0">
                  <ExternalLink size={14} className="mr-1" />
                  View
                </Button>
              )}
            </div>
          )}
          
          {txStatus === 'confirmed' && txHash && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-md flex justify-between items-center">
              <p className="text-sm flex items-center text-green-700">
                <CheckCircle size={16} className="mr-2" />
                Transaction confirmed
              </p>
              {explorer && (
                <Button variant="link" onClick={viewTransaction} className="text-green-600 p-0">
                  <ExternalLink size={14} className="mr-1" />
                  View
                </Button>
              )}
            </div>
          )}
          
          <Button 
            type="submit" 
            className="w-full bg-orange-600 hover:bg-orange-700" 
            disabled={isSubmitting || !hasBalance || !localStorage.getItem('walletAddress') || !campaignId}
          >
            {isSubmitting ? (
              <>
                <span className="inline-block h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
                Processing On-Chain...
              </>
            ) : (
              'Place On-Chain Prediction'
            )}
          </Button>
        </form>
      </TabsContent>
      
      <TabsContent value="swap">
        <form onSubmit={handleSwap} className="space-y-6">
          <div className="p-4 bg-purple-50 rounded-lg border border-purple-100">
            <h3 className="font-medium text-lg mb-2">Swap Tokens</h3>
            <p>Exchange your {nativeToken} for LEO tokens to participate in prediction markets</p>
          </div>
          
          {renderConnectWalletButton()}
          
          <div>
            <Label htmlFor="swapAmount">From ({nativeToken})</Label>
            <div className="mt-1">
              <Input
                id="swapAmount"
                placeholder="0.0"
                type="number"
                step="0.001"
                min="0"
                value={swapAmount}
                onChange={(e) => setSwapAmount(e.target.value)}
              />
            </div>
          </div>
          
          <div className="flex justify-center">
            <div className="bg-purple-100 p-2 rounded-full">
              <ArrowDownUp className="h-6 w-6 text-purple-600" />
            </div>
          </div>
          
          <div>
            <Label htmlFor="estimatedLeo">To (LEO)</Label>
            <div className="mt-1">
              <Input
                id="estimatedLeo"
                value={estimatedLeo}
                disabled
                className="bg-gray-50"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              *Estimated amount based on current exchange rate
            </p>
          </div>
          
          <Alert className="bg-amber-50 border-amber-200">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              Rate: 1 {nativeToken} = 10 LEO (Fixed rate for demo purposes)
            </AlertDescription>
          </Alert>
          
          <Button 
            type="submit" 
            className="w-full bg-purple-600 hover:bg-purple-700" 
            disabled={isSwapping || !localStorage.getItem('walletAddress')}
          >
            {isSwapping ? (
              <>
                <span className="inline-block h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
                Swapping...
              </>
            ) : (
              <>
                Swap for LEO
              </>
            )}
          </Button>
        </form>
      </TabsContent>
    </Tabs>
  );
};
