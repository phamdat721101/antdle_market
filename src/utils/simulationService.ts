
import { supabase } from '@/integrations/supabase/client';

// Admin wallet that will receive all funds
export const ADMIN_WALLET = '0x8742fa092eEf9C337AC1720Cf60E7f0D4EF35054';

// Simulated contract address
export const PREDICTION_CONTRACT_ADDRESS = '0x9d76B7fBaD6A93565C0D4ABD9B9b14343d2D9AC4';

interface SimulatedTransaction {
  txHash: string;
  fromAddress: string;
  toAddress: string;
  value: number;
  data: any;
  status: 'pending' | 'confirmed' | 'failed';
  timestamp: string; // Using string timestamp for JSON compatibility
}

// Define transaction status return type to avoid deep type instantiation
interface TransactionStatusResult {
  status: 'pending' | 'confirmed' | 'failed' | 'not_found';
  transaction?: Record<string, any>;
}

// Generate a random transaction hash
const generateTxHash = () => {
  return '0x' + [...Array(64)].map(() => Math.floor(Math.random() * 16).toString(16)).join('');
};

// Simulate a delay for transaction processing
const simulateTransactionDelay = () => {
  const delay = Math.floor(Math.random() * 3000) + 2000; // 2-5 seconds
  return new Promise(resolve => setTimeout(resolve, delay));
};

// Simulate placing a bet (prediction)
export const simulatePlacePrediction = async (
  userAddress: string, 
  marketId: string, 
  position: 'yes' | 'no', 
  amount: number
) => {
  try {
    const txHash = generateTxHash();
    
    // Log the transaction - using string timestamp for JSON compatibility
    const transaction: SimulatedTransaction = {
      txHash,
      fromAddress: userAddress,
      toAddress: PREDICTION_CONTRACT_ADDRESS,
      value: amount,
      data: { marketId, position },
      status: 'pending',
      timestamp: new Date().toISOString(),
    };
    
    // Convert transaction to a plain object for Supabase
    await supabase.from('logs').insert({
      action: 'place_prediction',
      user_id: null, // Not using the users table ID
      details: transaction as any, // Use simple type assertion
    });
    
    // Simulate blockchain delay
    await simulateTransactionDelay();
    
    // First get the current pool amount
    const poolField = position === 'yes' ? 'yes_pool' : 'no_pool';
    
    const { data: marketData, error: fetchError } = await supabase
      .from('prediction_markets')
      .select(poolField)
      .eq('id', marketId)
      .single();

    if (fetchError) throw fetchError;

    // Update pool amount
    const currentPoolAmount = marketData[poolField] as number;
    const newTotal = currentPoolAmount + amount;
    
    // Update the market's pool
    const { error: marketError } = await supabase
      .from('prediction_markets')
      .update({
        [poolField]: newTotal
      })
      .eq('id', marketId);

    if (marketError) throw marketError;

    // Record the user's position
    const { error: positionError } = await supabase
      .from('user_positions')
      .insert({
        market_id: marketId,
        user_wallet_address: userAddress,
        position_type: position,
        amount: amount
      });

    if (positionError) throw positionError;
    
    // Update transaction status
    const updatedTransaction = { 
      ...transaction, 
      status: 'confirmed' 
    };
    
    await supabase.from('logs').insert({
      action: 'prediction_confirmed',
      user_id: null,
      details: updatedTransaction as any, // Use simple type assertion
    });

    return { success: true, txHash };
  } catch (error) {
    console.error('Simulation error:', error);
    throw error;
  }
};

// Get transaction status
export const getTransactionStatus = async (txHash: string): Promise<TransactionStatusResult> => {
  try {
    const { data, error } = await supabase
      .from('logs')
      .select('details')
      .eq('details->txHash', txHash)
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (error) throw error;
    
    if (!data || data.length === 0) {
      return { status: 'not_found' };
    }
    
    // Using any type to avoid deep instantiation issues
    const details = data[0].details as any;
    
    return {
      status: details.status as 'pending' | 'confirmed' | 'failed',
      transaction: details
    };
  } catch (error) {
    console.error('Error fetching transaction status:', error);
    throw error;
  }
};

// Simulate claiming rewards
export const simulateClaimRewards = async (userAddress: string, positionId: string) => {
  try {
    const txHash = generateTxHash();
    
    // Log the transaction
    const transaction: SimulatedTransaction = {
      txHash,
      fromAddress: PREDICTION_CONTRACT_ADDRESS,
      toAddress: userAddress,
      value: 0, // Will be updated after calculating reward
      data: { positionId },
      status: 'pending',
      timestamp: new Date().toISOString(),
    };
    
    await supabase.from('logs').insert({
      action: 'claim_rewards',
      user_id: null,
      details: transaction as any, // Use simple type assertion
    });
    
    // Simulate blockchain delay
    await simulateTransactionDelay();
    
    // Get position details
    const { data: position, error: positionError } = await supabase
      .from('user_positions')
      .select(`
        *,
        market:market_id (
          settled_price,
          strike_price,
          status
        )
      `)
      .eq('id', positionId)
      .single();
    
    if (positionError) throw positionError;
    
    // Check if position exists and market is settled
    if (!position || position.market.status !== 'settled') {
      throw new Error('Position not found or market not settled');
    }
    
    // Update position as claimed
    const { error: updateError } = await supabase
      .from('user_positions')
      .update({ claimed: true })
      .eq('id', positionId);
    
    if (updateError) throw updateError;
    
    // Calculate reward (simplified)
    const isWinner = (position.position_type === 'yes' && 
                     position.market.settled_price > position.market.strike_price) ||
                     (position.position_type === 'no' && 
                     position.market.settled_price <= position.market.strike_price);
    
    const rewardAmount = isWinner ? position.amount * 2 : 0;
    
    // Update transaction with reward amount
    const updatedTransaction = { 
      ...transaction, 
      status: 'confirmed',
      value: rewardAmount
    };
    
    await supabase.from('logs').insert({
      action: 'rewards_claimed',
      user_id: null,
      details: updatedTransaction as any, // Use simple type assertion
    });
    
    return { 
      success: true, 
      txHash,
      rewardAmount
    };
  } catch (error) {
    console.error('Simulation error:', error);
    throw error;
  }
};
