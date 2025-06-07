import { ethers } from 'ethers';
import { supabase } from '@/integrations/supabase/client';

// Contract addresses
export const ANT_TOKEN_ADDRESS = "0xA1F8E7b2a68b4BB7a9cA8d4A3a3e3F2d1C5B8E1875";

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
