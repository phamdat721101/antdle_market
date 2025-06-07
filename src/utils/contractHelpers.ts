
import { ethers } from 'ethers';
import { supabase } from '@/integrations/supabase/client';

// Contract addresses
export const ANT_TOKEN_ADDRESS = "0xA1F8E7b2a68b4BB7a9cA8d4A3a3e3F2d1C5B8E1875";
export const DEFAULT_TOKEN_ADDRESS = ANT_TOKEN_ADDRESS; // Alias for backward compatibility
export const PREDICTION_CONTRACT_ADDRESS = "0x1234567890123456789012345678901234567890"; // Demo address

// Contract ABIs
export const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)"
];

export const PREDICTION_CONTRACT_ABI = [
  "function createCampaign(string memory description, uint256 duration) returns (uint256)",
  "function deposit(uint256 campaignId, uint256 outcomeIndex, uint256 amount)",
  "function swapTokens(uint256 amount) payable",
  "function getCampaign(uint256 campaignId) view returns (tuple(string description, uint256 endTime, uint256 totalYes, uint256 totalNo, bool resolved))",
  "function claim(uint256 campaignId)",
  "event CampaignCreated(uint256 indexed campaignId, string description, uint256 endTime)",
  "event Deposit(uint256 indexed campaignId, address indexed user, uint256 outcomeIndex, uint256 amount)"
];

// Chain configurations
const SUPPORTED_CHAINS = {
  '0x1': { name: 'Ethereum Mainnet', explorer: 'https://etherscan.io' },
  '0x89': { name: 'Polygon', explorer: 'https://polygonscan.com' },
  '0x13881': { name: 'Polygon Mumbai', explorer: 'https://mumbai.polygonscan.com' },
  '0xa86a': { name: 'Avalanche', explorer: 'https://snowtrace.io' },
  '0xa869': { name: 'Avalanche Fuji', explorer: 'https://testnet.snowtrace.io' }
};

// Utility function to format addresses
export const formatAddress = (address: string | null | undefined): string => {
  if (!address) return 'N/A';
  return address.slice(0, 6) + '...' + address.slice(-4);
};

// Function to validate Ethereum address
export const isAddressValid = (address: string): boolean => {
  try {
    ethers.getAddress(address);
    return true;
  } catch (error) {
    return false;
  }
};

// Function to check if chain is supported
export const checkSupportedChain = (chainId: string): boolean => {
  return chainId in SUPPORTED_CHAINS;
};

// Function to get chain details
export const getChainDetails = (chainId: string) => {
  return SUPPORTED_CHAINS[chainId as keyof typeof SUPPORTED_CHAINS] || { 
    name: 'Unknown Network', 
    explorer: '' 
  };
};

// Function to get signer
export const getSigner = async (): Promise<ethers.Signer> => {
  if (!window.ethereum) {
    throw new Error("MetaMask is not installed");
  }
  
  const provider = new ethers.BrowserProvider(window.ethereum);
  return await provider.getSigner();
};

// Function to get prediction contract instance
export const getPredictionContract = (signer: ethers.Signer) => {
  return new ethers.Contract(PREDICTION_CONTRACT_ADDRESS, PREDICTION_CONTRACT_ABI, signer);
};

// Function to get token contract instance
export const getTokenContract = (tokenAddress: string, signer: ethers.Signer) => {
  return new ethers.Contract(tokenAddress, ERC20_ABI, signer);
};

// Function to create campaign on-chain
export const createCampaignOnChain = async (
  signer: ethers.Signer,
  description: string,
  durationHours: number
): Promise<string> => {
  try {
    const contract = getPredictionContract(signer);
    
    // Convert hours to seconds
    const durationSeconds = durationHours * 60 * 60;
    
    // Call the contract function
    const tx = await contract.createCampaign(description, durationSeconds);
    
    // Wait for transaction to be mined
    const receipt = await tx.wait();
    
    // Parse the logs to get the campaign ID
    const event = receipt.logs.find((log: any) => {
      try {
        const parsed = contract.interface.parseLog(log);
        return parsed?.name === 'CampaignCreated';
      } catch {
        return false;
      }
    });
    
    if (event) {
      const parsed = contract.interface.parseLog(event);
      return parsed?.args.campaignId.toString();
    }
    
    // Fallback: return transaction hash as campaign ID
    return tx.hash;
  } catch (error) {
    console.error("Error creating campaign on-chain:", error);
    throw error;
  }
};

// Function to get on-chain ID from Supabase
export const getOnChainIdFromSupabase = async (marketId: string): Promise<string | null> => {
  try {
    const { data, error } = await supabase
      .from('prediction_markets')
      .select('on_chain_id')
      .eq('id', marketId)
      .single();

    if (error) {
      console.error("Error fetching on-chain ID:", error);
      return null;
    }

    return data?.on_chain_id || null;
  } catch (error) {
    console.error("Error in getOnChainIdFromSupabase:", error);
    return null;
  }
};

// Function to update market pools after a trade
export const updateMarketPools = async (
  marketId: string,
  position: 'yes' | 'no',
  amount: number
): Promise<void> => {
  try {
    // Get current market data
    const { data: market, error: fetchError } = await supabase
      .from('prediction_markets')
      .select('yes_pool, no_pool')
      .eq('id', marketId)
      .single();

    if (fetchError) {
      console.error("Error fetching market data:", fetchError);
      return;
    }

    // Calculate new pool values
    const currentYesPool = market.yes_pool || 0;
    const currentNoPool = market.no_pool || 0;
    
    const newYesPool = position === 'yes' ? currentYesPool + amount : currentYesPool;
    const newNoPool = position === 'no' ? currentNoPool + amount : currentNoPool;

    // Update the market pools
    const { error: updateError } = await supabase
      .from('prediction_markets')
      .update({
        yes_pool: newYesPool,
        no_pool: newNoPool
      })
      .eq('id', marketId);

    if (updateError) {
      console.error("Error updating market pools:", updateError);
      return;
    }

    // Record the user's position
    const userWallet = localStorage.getItem('walletAddress');
    if (userWallet) {
      const { error: positionError } = await supabase
        .from('user_positions')
        .upsert({
          user_wallet_address: userWallet,
          market_id: marketId,
          position_type: position,
          amount: amount,
          created_at: new Date().toISOString()
        });

      if (positionError) {
        console.error("Error recording user position:", positionError);
      }
    }
  } catch (error) {
    console.error("Error in updateMarketPools:", error);
  }
};

export const getTokenBalance = async (
  tokenAddress: string,
  walletAddress: string,
  provider: ethers.BrowserProvider
): Promise<string> => {
  try {
    // ERC-20 ABI for balanceOf function
    const erc20Abi = [
      "function balanceOf(address) view returns (uint256)",
      "function decimals() view returns (uint8)"
    ];
    
    const contract = new ethers.Contract(tokenAddress, erc20Abi, provider);
    const balance = await contract.balanceOf(walletAddress);
    const decimals = await contract.decimals();
    
    // Convert from wei to token units
    const formattedBalance = ethers.formatUnits(balance, decimals);
    
    // Round to 2 decimal places
    return parseFloat(formattedBalance).toFixed(2);
  } catch (error) {
    console.error("Error fetching token balance:", error);
    return "0.00";
  }
};
