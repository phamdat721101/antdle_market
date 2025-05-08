
// simulationService.ts
import { faker } from '@faker-js/faker';
import { supabase } from '@/integrations/supabase/client';
import { TransactionStatusResult, TransactionDetails } from './typeHelpers';

const generateRandomMarketData = () => {
  // Fixed faker function calls that were causing TypeScript errors
  const assetName = faker.finance.currencyName();
  const strikePrice = parseFloat(faker.finance.amount({ min: 10, max: 200, dec: 2 }));
  const expiryTimestamp = faker.date.future().toISOString();
  const yesPool = parseFloat(faker.finance.amount({ min: 100, max: 1000, dec: 2 }));
  const noPool = parseFloat(faker.finance.amount({ min: 100, max: 1000, dec: 2 }));
  const status = faker.helpers.arrayElement(['active', 'settled']);
  const description = faker.lorem.sentence();

  return {
    asset_name: assetName,
    strike_price: strikePrice,
    expiry_timestamp: expiryTimestamp,
    yes_pool: yesPool,
    no_pool: noPool,
    status: status,
    description: description,
  };
};

const simulateMarketCreation = async (): Promise<TransactionStatusResult> => {
  try {
    const marketData = generateRandomMarketData();
    const { data, error } = await supabase
      .from('prediction_markets')
      .insert([marketData])
      .select()
      .single();

    if (error) {
      console.error("Supabase error:", error);
      return { status: 'failed', details: { error: error.message } };
    }

    return { status: 'success', details: { marketId: data.id, ...marketData } };
  } catch (error: any) {
    console.error("Unexpected error:", error);
    return { status: 'failed', details: { error: error.message } };
  }
};

const simulateTrade = async (marketId: string, isYes: boolean, amount: number): Promise<TransactionStatusResult> => {
  try {
    // Fetch the current market data
    const { data: marketData, error: marketError } = await supabase
      .from('prediction_markets')
      .select('*')
      .eq('id', marketId)
      .single();

    if (marketError) {
      console.error("Error fetching market:", marketError);
      return { status: 'failed', details: { error: marketError.message } };
    }

    if (!marketData) {
      return { status: 'failed', details: { error: 'Market not found' } };
    }

    // Simulate the trade by updating the pool values
    const updatedYesPool = isYes ? marketData.yes_pool + amount : marketData.yes_pool;
    const updatedNoPool = !isYes ? marketData.no_pool + amount : marketData.no_pool;

    // Update the market in Supabase
    const { error: updateError } = await supabase
      .from('prediction_markets')
      .update({ yes_pool: updatedYesPool, no_pool: updatedNoPool })
      .eq('id', marketId);

    if (updateError) {
      console.error("Error updating market:", updateError);
      return { status: 'failed', details: { error: updateError.message } };
    }

    return { status: 'success', details: { marketId, isYes, amount, updatedYesPool, updatedNoPool } };
  } catch (error: any) {
    console.error("Trade simulation error:", error);
    return { status: 'failed', details: { error: error.message } };
  }
};

const simulateMarketSettlement = async (marketId: string, settlementValue: boolean): Promise<TransactionStatusResult> => {
  try {
    // Fetch the market data
    const { data: marketData, error: marketError } = await supabase
      .from('prediction_markets')
      .select('*')
      .eq('id', marketId)
      .single();

    if (marketError) {
      console.error("Error fetching market:", marketError);
      return { status: 'failed', details: { error: marketError.message } };
    }

    if (!marketData) {
      return { status: 'failed', details: { error: 'Market not found' } };
    }

    // Simulate settlement by updating the market status
    const { error: updateError } = await supabase
      .from('prediction_markets')
      .update({ status: 'settled', settlement_value: settlementValue })
      .eq('id', marketId);

    if (updateError) {
      console.error("Error settling market:", updateError);
      return { status: 'failed', details: { error: updateError.message } };
    }

    return { status: 'success', details: { marketId, settlementValue } };
  } catch (error: any) {
    console.error("Market settlement error:", error);
    return { status: 'failed', details: { error: error.message } };
  }
};

const simulateTransaction = async (action: string, details: any): Promise<TransactionStatusResult> => {
  const transactionDetails: TransactionDetails = {
    hash: faker.string.alphanumeric(42),
    from: faker.finance.ethereumAddress(),
    to: faker.finance.ethereumAddress(),
    value: faker.finance.amount({ min: 0.001, max: 1, dec: 10 }),
    gasUsed: faker.number.int({ min: 21000, max: 100000 }).toString(),
    blockNumber: faker.number.int({ min: 1000000, max: 2000000 }),
    timestamp: faker.date.recent().toISOString(),
    action,
    details,
  };

  // Simulate different transaction outcomes
  const outcome = faker.helpers.arrayElement(['success', 'failed', 'pending']);

  switch (outcome) {
    case 'success':
      return { status: 'success', details: transactionDetails };
    case 'failed':
      return { status: 'failed', details: { ...transactionDetails, error: faker.lorem.sentence() } };
    case 'pending':
      return { status: 'pending', details: transactionDetails };
    default:
      return { status: 'unknown', details: { message: 'Unexpected simulation outcome.' } };
  }
};

const simulatePlacePrediction = async (
  walletAddress: string,
  marketId: string,
  position: 'yes' | 'no',
  amount: number
): Promise<{ txHash: string }> => {
  try {
    // First record the user position in the database
    const { data, error } = await supabase
      .from('user_positions')
      .insert([{
        user_wallet_address: walletAddress,
        market_id: marketId,
        position_type: position,
        amount: amount,
        claimed: false
      }])
      .select()
      .single();

    if (error) {
      console.error("Error recording position:", error);
      throw new Error(error.message);
    }

    // Then simulate the trade on the market
    const tradeResult = await simulateTrade(
      marketId,
      position === 'yes',
      amount
    );

    if (tradeResult.status !== 'success') {
      throw new Error('Trade simulation failed');
    }

    // Generate a fake transaction hash
    const txHash = faker.string.alphanumeric(64).toLowerCase();

    return {
      txHash
    };
  } catch (error: any) {
    console.error("Prediction placement error:", error);
    throw error;
  }
};

// Update the return type to include txHash
const simulateClaimRewards = async (
  walletAddress: string,
  positionId: string
): Promise<{ rewardAmount: number; txHash: string }> => {
  try {
    // First check if the position exists and belongs to the user
    const { data: position, error: positionError } = await supabase
      .from('user_positions')
      .select(`
        *,
        market:market_id (
          id,
          status,
          settled_price,
          strike_price
        )
      `)
      .eq('id', positionId)
      .eq('user_wallet_address', walletAddress)
      .single();

    if (positionError || !position) {
      throw new Error(positionError?.message || 'Position not found');
    }

    // Check if position is already claimed
    if (position.claimed) {
      throw new Error('This position has already been claimed');
    }

    // Check if market is settled
    if (position.market.status !== 'settled') {
      throw new Error('Market is not settled yet');
    }

    // Check if position is a winning position
    const isWinning = (
      (position.position_type === 'yes' && position.market.settled_price > position.market.strike_price) ||
      (position.position_type === 'no' && position.market.settled_price <= position.market.strike_price)
    );

    if (!isWinning) {
      throw new Error('This position did not win');
    }

    // Update position to claimed
    const { error: updateError } = await supabase
      .from('user_positions')
      .update({ claimed: true })
      .eq('id', positionId);

    if (updateError) {
      throw new Error(updateError.message);
    }

    // Calculate reward (in a real app this would use proper math based on pool sizes)
    // For demo purposes, just return the position amount multiplied by a random factor
    const rewardMultiplier = faker.number.float({ min: 1.1, max: 2.5 });
    const rewardAmount = Number((position.amount * rewardMultiplier).toFixed(2));
    
    // Generate a fake transaction hash
    const txHash = faker.string.alphanumeric(64).toLowerCase();

    return {
      rewardAmount,
      txHash
    };
  } catch (error: any) {
    console.error("Claim rewards error:", error);
    throw error;
  }
};

// Export both the SimulationService object and individual functions
export const SimulationService = {
  simulateMarketCreation,
  simulateTrade,
  simulateMarketSettlement,
  simulateTransaction,
  simulatePlacePrediction,
  simulateClaimRewards
};

// Export individual functions for direct imports
export {
  simulateMarketCreation,
  simulateTrade,
  simulateMarketSettlement,
  simulateTransaction,
  simulatePlacePrediction,
  simulateClaimRewards
};
