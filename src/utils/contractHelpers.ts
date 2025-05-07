
import { ethers } from "ethers";

// Prediction Market Contract ABI (simplified for the functions we need)
export const PREDICTION_CONTRACT_ABI = [
  "function placePrediction(string marketId, bool isYesPrediction, uint256 amount) external returns (bool)",
  "function swapTokens(uint256 amount) external payable returns (uint256)",
  "function deposit(uint256 campaignId, uint256 outcome, uint256 amount) external",
  "function withdraw(uint256 campaignId) external",
  "function getCampaign(uint256 campaignId) view returns (address creator, string description, uint256 endTime, uint256 creatorFeeBP, bool resolved, uint256 winningOutcome, address tokenAddress, uint256 totalPool, uint256[] outcomePools)",
  "function createCampaign(string description, uint256 endTime, bytes32[] outcomes, address tokenAddress, uint256 creatorFeeBP) external returns (uint256)",
  "function numberOfCampaigns() view returns (uint256)",
];

// This would be your deployed contract address in a real application
export const PREDICTION_CONTRACT_ADDRESS = "0x42a2F4e5389F6e7466D97408724Dba38812f184E";
// Default token address to use for markets (this would be your platform token in a real application)
export const DEFAULT_TOKEN_ADDRESS = "0xA1F002bf7cAD148a639418D77b93912871901875";

// Check if the connected wallet is on a supported chain
export const checkSupportedChain = (chainId: string | null): boolean => {
  if (!chainId) return false;
  
  const supportedChains = [
    '0x1', // Ethereum Mainnet
    '0x5', // Goerli
    '0x89', // Polygon
    '0xa86a', // Avalanche
    '0x13881', // Mumbai
    '0xa869', // Avalanche Fuji
    // Add any other chains you want to support
  ];
  
  return supportedChains.includes(chainId);
};

// Get chain-specific details like block explorer URL
export const getChainDetails = (chainId: string | null) => {
  if (!chainId) return { name: 'Unknown Network', explorer: '' };
  
  const chains: Record<string, { name: string, explorer: string }> = {
    '0x1': { name: 'Ethereum Mainnet', explorer: 'https://etherscan.io' },
    '0x5': { name: 'Goerli Testnet', explorer: 'https://goerli.etherscan.io' },
    '0x89': { name: 'Polygon', explorer: 'https://polygonscan.com' },
    '0xa86a': { name: 'Avalanche', explorer: 'https://snowtrace.io' },
    '0x13881': { name: 'Mumbai Testnet', explorer: 'https://mumbai.polygonscan.com' },
    '0xa869': { name: 'Avalanche Fuji', explorer: 'https://testnet.snowtrace.io' },
  };
  
  return chains[chainId] || { name: 'Unknown Network', explorer: '' };
};

// Create signer from provider
export const getSigner = async (provider: ethers.BrowserProvider): Promise<ethers.Signer> => {
  return await provider.getSigner();
};

// Create contract instance with signer
export const getPredictionContract = (signer: ethers.Signer): ethers.Contract => {
  return new ethers.Contract(PREDICTION_CONTRACT_ADDRESS, PREDICTION_CONTRACT_ABI, signer);
};

// Convert external market ID to on-chain campaign ID (for demo)
export const mapMarketIdToCampaignId = (marketId: string): number => {
  // In a real app, you would have a mapping in your database
  // For demo purposes, we'll convert the UUID to a small number
  const hashCode = marketId.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
  
  return Math.abs(hashCode % 1000); // Keep it to a reasonable number
};

// Format address for display
export const formatAddress = (address: string): string => {
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
};

// Resolve ENS name regardless of chain (with fallback to formatted address)
export const resolveNameOrFormatAddress = async (address: string, provider?: ethers.BrowserProvider): Promise<string> => {
  try {
    // Only try to resolve ENS if we have a provider and are on Ethereum mainnet
    if (provider) {
      const chainId = (await provider.getNetwork()).chainId;
      // Only attempt ENS lookup on Ethereum mainnet (chainId 1) or Goerli testnet (chainId 5)
      if (chainId === 1n || chainId === 5n) {
        try {
          const ensName = await provider.lookupAddress(address);
          if (ensName) return ensName;
        } catch (error) {
          console.log("ENS lookup failed, using formatted address");
        }
      }
    }
    // Fallback to formatted address
    return formatAddress(address);
  } catch (error) {
    console.error("Error resolving name:", error);
    return formatAddress(address);
  }
};

// Create a campaign on-chain
export const createCampaignOnChain = async (
  signer: ethers.Signer,
  description: string,
  expiryHours: number,
  gasLimit = 500000
): Promise<string> => {
  try {
    const contract = getPredictionContract(signer);
    
    // Calculate end time in seconds from now
    const now = Math.floor(Date.now() / 1000);
    const endTime = now + (parseInt(expiryHours.toString()) * 60 * 60);
    
    // Create outcomes for Yes/No market
    const outcomes = [
      ethers.keccak256(ethers.toUtf8Bytes("Yes")),
      ethers.keccak256(ethers.toUtf8Bytes("No")),
    ];
    
    // Use default token address (platform token)
    const tokenAddress = DEFAULT_TOKEN_ADDRESS;
    
    // Default creator fee (2%)
    const feeBP = 200;
    
    // Create the campaign
    console.log("Creating campaign on-chain...");
    console.log("Description:", description);
    console.log("End time:", new Date(endTime * 1000).toISOString());
    
    const tx = await contract.createCampaign(
      description,
      endTime,
      outcomes,
      tokenAddress,
      feeBP,
      { gasLimit }
    );
    
    console.log("Transaction sent:", tx.hash);
    
    // Wait for transaction confirmation
    const receipt = await tx.wait();
    console.log("Transaction confirmed:", receipt.hash);
    
    // Instead of parsing logs, pull the new total and subtract 1
    const totalCampaigns = await contract.numberOfCampaigns();
    const campaignId = (totalCampaigns - 1n).toString();
    console.log("Campaign created with ID (via length):", campaignId);
    return campaignId;
  } catch (error: any) {
    console.error("Error creating campaign on-chain:", error);
    throw new Error(error.message || "Failed to create campaign on-chain");
  }
};
