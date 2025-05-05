
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { simulatePlacePrediction } from '@/utils/simulationService';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { ArrowDownUp, AlertCircle, CheckCircle, ArrowRight } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ethers } from 'ethers';

interface TradeFormProps {
  marketId: string;
  assetName: string;
  strikePrice: number;
  onSuccess: () => void;
}

// Simplified ABI for simulation purposes
const PREDICTION_CONTRACT_ABI = [
  "function placePrediction(string marketId, bool isYesPrediction, uint256 amount) external returns (bool)",
  "function swapTokens(uint256 amount) external payable returns (uint256)"
];

// This would be your deployed contract address in a real application
const PREDICTION_CONTRACT_ADDRESS = "0xPredictionContractAddressWouldGoHere";

export const TradeForm = ({ marketId, assetName, strikePrice, onSuccess }: TradeFormProps) => {
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
  const { toast } = useToast();

  // Check wallet connection and balance on mount
  useEffect(() => {
    const checkWalletAndBalance = async () => {
      const walletAddress = localStorage.getItem('walletAddress');
      const chainId = localStorage.getItem('chainId');
      
      if (chainId) {
        // Get native token symbol based on chain
        switch (chainId) {
          case '0x89':
            setNativeToken('MATIC');
            break;
          case '0xa86a':
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
    
    // Simulate price calculation - in real app, this would be a price feed or DEX quote
    // For demo, we'll use a simple 10:1 ratio (1 ETH = 10 LEO)
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
      
      // Set up ethers provider and signer
      const ethProvider = new ethers.BrowserProvider(window.ethereum);
      setProvider(ethProvider);
      const ethSigner = await ethProvider.getSigner();
      setSigner(ethSigner);
      
      // Save to localStorage for app-wide access
      localStorage.setItem('walletAddress', userAddress);
      localStorage.setItem('chainConnected', 'true');
      localStorage.setItem('chainId', chainIdHex);
      
      // Try to get chain name
      const network = await ethProvider.getNetwork();
      const chainName = network.name || 'Connected Chain';
      localStorage.setItem('chainName', chainName);
      
      // Set native token based on chain
      switch (chainIdHex) {
        case '0x89':
          setNativeToken('MATIC');
          break;
        case '0xa86a':
          setNativeToken('AVAX');
          break;
        default:
          setNativeToken('ETH');
      }
      
      toast({
        title: "Wallet Connected",
        description: `Connected to ${userAddress.substring(0, 6)}...${userAddress.substring(userAddress.length - 4)}`,
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

    setIsSubmitting(true);
    setTxStatus('pending');
    try {
      // If we have an actual web3 connection, try to use it
      if (window.ethereum && signer) {
        try {
          // In a real app, we'd interface with an actual smart contract
          const contract = new ethers.Contract(
            PREDICTION_CONTRACT_ADDRESS, 
            PREDICTION_CONTRACT_ABI, 
            signer
          );
          
          // Convert amount to Wei (or appropriate units)
          const amountBigInt = ethers.parseUnits(amount, 18);
          
          // Call the contract function
          const tx = await contract.placePrediction(
            marketId,
            position === 'yes', // true for yes, false for no
            amountBigInt
          );
          
          // Set pending transaction hash
          setTxHash(tx.hash);
          
          // Wait for transaction confirmation
          const receipt = await tx.wait();
          
          if (receipt.status === 1) {
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
          
          // Fall back to simulation if on-chain transaction fails
          fallbackToSimulation(walletAddress);
        }
      } else {
        // Fall back to simulation if no web3 connection
        fallbackToSimulation(walletAddress);
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
  
  // Fallback to simulation if actual transaction fails
  const fallbackToSimulation = async (walletAddress: string) => {
    try {
      // Simulate on-chain transaction
      const amountValue = parseFloat(amount);
      const result = await simulatePlacePrediction(
        walletAddress,
        marketId,
        position,
        amountValue
      );
      
      setTxHash(result.txHash);
      setTxStatus('confirmed');
      
      // Get chain name for better user experience
      const chainName = localStorage.getItem('chainName') || 'blockchain';
      
      toast({
        title: "Transaction Confirmed (Simulated)",
        description: `Your ${position.toUpperCase()} prediction for ${amount} LEO has been placed on ${chainName}`,
      });
      
      // Update simulated LEO balance
      const newBalance = (parseFloat(leoBalance) - amountValue).toFixed(2);
      setLeoBalance(newBalance);
      localStorage.setItem('leoBalance', newBalance);
      
      setAmount('');
      onSuccess();
    } catch (error: any) {
      console.error("Simulation error:", error);
      setTxStatus('failed');
      
      toast({
        title: "Transaction Failed",
        description: error.message || "Failed to place prediction (simulation)",
        variant: "destructive",
      });
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
          // In a real app, we'd interface with an actual DEX contract
          const contract = new ethers.Contract(
            PREDICTION_CONTRACT_ADDRESS, 
            PREDICTION_CONTRACT_ABI, 
            signer
          );
          
          // Convert amount to Wei
          const amountInWei = ethers.parseEther(swapAmount);
          
          // Call the swap function with ETH value
          const tx = await contract.swapTokens(
            amountInWei, 
            { value: amountInWei }
          );
          
          // Wait for transaction confirmation
          const receipt = await tx.wait();
          
          if (receipt.status === 1) {
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
          
          // Fall back to simulated swap
          simulateSwap();
        }
      } else {
        // Fall back to simulated swap
        simulateSwap();
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
  
  const simulateSwap = async () => {
    try {
      // Simulate swap delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Get chain name for better user experience
      const chainName = localStorage.getItem('chainName') || 'blockchain';
      
      toast({
        title: "Swap Successful (Simulated)",
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
    } catch (error) {
      console.error("Simulation error:", error);
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
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm flex items-center">
                <span className="inline-block h-2 w-2 bg-blue-600 rounded-full animate-pulse mr-2"></span>
                Transaction pending: {txHash.substring(0, 6)}...{txHash.substring(txHash.length - 4)}
              </p>
            </div>
          )}
          
          <Button 
            type="submit" 
            className="w-full bg-orange-600 hover:bg-orange-700" 
            disabled={isSubmitting || !hasBalance || !localStorage.getItem('walletAddress')}
          >
            {isSubmitting ? 'Processing On-Chain...' : 'Place On-Chain Prediction'}
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
