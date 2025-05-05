
import { ethers } from "ethers";

// Prediction Market Contract ABI (simplified for the functions we need)
export const PREDICTION_CONTRACT_ABI = [
  "function placePrediction(string marketId, bool isYesPrediction, uint256 amount) external returns (bool)",
  "function swapTokens(uint256 amount) external payable returns (uint256)",
  "function deposit(uint256 campaignId, uint256 outcome, uint256 amount) external",
  "function withdraw(uint256 campaignId) external",
  "function getCampaign(uint256 campaignId) view returns (address creator, string description, uint256 endTime, uint256 creatorFeeBP, bool resolved, uint256 winningOutcome, address tokenAddress, uint256 totalPool, uint256[] outcomePools)"
];

// This would be your deployed contract address in a real application
export const PREDICTION_CONTRACT_ADDRESS = "0x42a2F4e5389F6e7466D97408724Dba38812f184E";

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
