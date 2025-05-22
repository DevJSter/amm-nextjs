// app/utility/fn.js

// AMM Formula Types
export const AMM_FORMULAS = {
  CPMM: 'cpmm',
  CONSTANT_SUM: 'constant_sum',
  CONSTANT_MEAN: 'constant_mean',
  CURVE_STABLE: 'curve_stable',
  CONCENTRATED: 'concentrated'
};

// AMM Formula Configurations
export const AMM_CONFIGS = {
  [AMM_FORMULAS.CPMM]: {
    name: 'Constant Product (CPMM)',
    description: 'x * y = k - Used by Uniswap V2',
    formula: 'x × y = k',
    bestFor: 'General trading pairs',
    slippage: 'Higher for large trades'
  },
  [AMM_FORMULAS.CONSTANT_SUM]: {
    name: 'Constant Sum',
    description: 'x + y = k - Linear pricing',
    formula: 'x + y = k',
    bestFor: 'Perfectly correlated assets',
    slippage: 'Zero until one token depletes'
  },
  [AMM_FORMULAS.CONSTANT_MEAN]: {
    name: 'Constant Mean (Balancer)',
    description: 'Weighted geometric mean',
    formula: 'x^w1 × y^w2 = k',
    bestFor: 'Multi-token pools with weights',
    slippage: 'Varies by weights'
  },
  [AMM_FORMULAS.CURVE_STABLE]: {
    name: 'Curve StableSwap',
    description: 'Hybrid sum + product for stables',
    formula: 'Complex hybrid formula',
    bestFor: 'Stablecoins and pegged assets',
    slippage: 'Very low for similar prices'
  },
  [AMM_FORMULAS.CONCENTRATED]: {
    name: 'Concentrated Liquidity',
    description: 'CPMM within price ranges',
    formula: 'x × y = k (in ranges)',
    bestFor: 'Capital efficient trading',
    slippage: 'Lower with concentrated ranges'
  }
};

// Initialize pool based on formula
export function initializePool(formula, amountA, amountB, priceA, priceB, config = {}) {
  switch (formula) {
    case AMM_FORMULAS.CPMM:
      return initializeCPMM(amountA, amountB);
    
    case AMM_FORMULAS.CONSTANT_SUM:
      return initializeConstantSum(amountA, amountB, priceA, priceB);
    
    case AMM_FORMULAS.CONSTANT_MEAN:
      return initializeConstantMean(amountA, amountB, config.weightA || 0.5, config.weightB || 0.5);
    
    case AMM_FORMULAS.CURVE_STABLE:
      return initializeCurveStable(amountA, amountB, priceA, priceB);
    
    case AMM_FORMULAS.CONCENTRATED:
      return initializeConcentrated(amountA, amountB, config.minPrice || 0.5, config.maxPrice || 2.0);
    
    default:
      throw new Error(`Unsupported AMM formula: ${formula}`);
  }
}

// Calculate swap output based on formula
export function calculateSwapOutput(formula, inputAmount, direction, poolState, tokenPrices) {
  switch (formula) {
    case AMM_FORMULAS.CPMM:
      return calculateCPMMSwap(inputAmount, direction, poolState);
    
    case AMM_FORMULAS.CONSTANT_SUM:
      return calculateConstantSumSwap(inputAmount, direction, poolState, tokenPrices);
    
    case AMM_FORMULAS.CONSTANT_MEAN:
      return calculateConstantMeanSwap(inputAmount, direction, poolState);
    
    case AMM_FORMULAS.CURVE_STABLE:
      return calculateCurveStableSwap(inputAmount, direction, poolState, tokenPrices);
    
    case AMM_FORMULAS.CONCENTRATED:
      return calculateConcentratedSwap(inputAmount, direction, poolState);
    
    default:
      throw new Error(`Unsupported AMM formula: ${formula}`);
  }
}

// Execute swap and update pool state
export function executeSwap(formula, inputAmount, direction, poolState, tokenPrices) {
  const swapResult = calculateSwapOutput(formula, inputAmount, direction, poolState, tokenPrices);
  
  switch (formula) {
    case AMM_FORMULAS.CPMM:
      return executeCPMMSwap(inputAmount, direction, poolState);
    
    case AMM_FORMULAS.CONSTANT_SUM:
      return executeConstantSumSwap(inputAmount, direction, poolState);
    
    case AMM_FORMULAS.CONSTANT_MEAN:
      return executeConstantMeanSwap(inputAmount, direction, poolState);
    
    case AMM_FORMULAS.CURVE_STABLE:
      return executeCurveStableSwap(inputAmount, direction, poolState);
    
    case AMM_FORMULAS.CONCENTRATED:
      return executeConcentratedSwap(inputAmount, direction, poolState);
    
    default:
      throw new Error(`Unsupported AMM formula: ${formula}`);
  }
}

// ========== CPMM Implementation ==========
function initializeCPMM(amountA, amountB) {
  return {
    reserveA: amountA,
    reserveB: amountB,
    constantK: amountA * amountB
  };
}

function calculateCPMMSwap(inputAmount, direction, poolState) {
  const { reserveA, reserveB, constantK } = poolState;
  const input = parseFloat(inputAmount);
  
  if (direction === 'AtoB') {
    const newReserveA = reserveA + input;
    const newReserveB = constantK / newReserveA;
    const output = reserveB - newReserveB;
    
    // Price impact calculation
    const oldPrice = reserveA / reserveB;
    const newPrice = newReserveA / newReserveB;
    const impact = ((newPrice - oldPrice) / oldPrice) * 100;
    
    return { output, impact, newReserveA, newReserveB };
  } else {
    const newReserveB = reserveB + input;
    const newReserveA = constantK / newReserveB;
    const output = reserveA - newReserveA;
    
    const oldPrice = reserveB / reserveA;
    const newPrice = newReserveB / newReserveA;
    const impact = ((newPrice - oldPrice) / oldPrice) * 100;
    
    return { output, impact, newReserveA, newReserveB };
  }
}

function executeCPMMSwap(inputAmount, direction, poolState) {
  const swapResult = calculateCPMMSwap(inputAmount, direction, poolState);
  return {
    ...poolState,
    reserveA: swapResult.newReserveA,
    reserveB: swapResult.newReserveB,
    constantK: swapResult.newReserveA * swapResult.newReserveB
  };
}

// ========== Constant Sum Implementation ==========
function initializeConstantSum(amountA, amountB, priceA, priceB) {
  // Normalize to USD value for constant sum
  const valueA = amountA * priceA;
  const valueB = amountB * priceB;
  return {
    reserveA: amountA,
    reserveB: amountB,
    constantSum: valueA + valueB,
    priceA,
    priceB
  };
}

function calculateConstantSumSwap(inputAmount, direction, poolState, tokenPrices) {
  const { reserveA, reserveB } = poolState;
  const input = parseFloat(inputAmount);
  
  if (direction === 'AtoB') {
    // In constant sum, exchange rate is based on relative prices
    const exchangeRate = tokenPrices.priceA / tokenPrices.priceB;
    const output = input * exchangeRate;
    
    // Check if we have enough reserves
    if (output > reserveB) {
      return { output: 0, impact: Infinity, error: 'Insufficient liquidity' };
    }
    
    return {
      output,
      impact: 0, // No price impact in pure constant sum
      newReserveA: reserveA + input,
      newReserveB: reserveB - output
    };
  } else {
    const exchangeRate = tokenPrices.priceB / tokenPrices.priceA;
    const output = input * exchangeRate;
    
    if (output > reserveA) {
      return { output: 0, impact: Infinity, error: 'Insufficient liquidity' };
    }
    
    return {
      output,
      impact: 0,
      newReserveA: reserveA - output,
      newReserveB: reserveB + input
    };
  }
}

function executeConstantSumSwap(inputAmount, direction, poolState) {
  const swapResult = calculateConstantSumSwap(inputAmount, direction, poolState, {
    priceA: poolState.priceA,
    priceB: poolState.priceB
  });
  
  if (swapResult.error) return poolState;
  
  return {
    ...poolState,
    reserveA: swapResult.newReserveA,
    reserveB: swapResult.newReserveB
  };
}

// ========== Constant Mean (Balancer) Implementation ==========
function initializeConstantMean(amountA, amountB, weightA = 0.5, weightB = 0.5) {
  const constantMean = Math.pow(amountA, weightA) * Math.pow(amountB, weightB);
  return {
    reserveA: amountA,
    reserveB: amountB,
    weightA,
    weightB,
    constantMean
  };
}

function calculateConstantMeanSwap(inputAmount, direction, poolState) {
  const { reserveA, reserveB, weightA, weightB, constantMean } = poolState;
  const input = parseFloat(inputAmount);
  
  if (direction === 'AtoB') {
    const newReserveA = reserveA + input;
    // Solve for newReserveB: (newReserveA)^wA * (newReserveB)^wB = constantMean
    const newReserveB = Math.pow(constantMean / Math.pow(newReserveA, weightA), 1 / weightB);
    const output = reserveB - newReserveB;
    
    // Price impact
    const oldSpotPrice = (reserveA / reserveB) * (weightB / weightA);
    const newSpotPrice = (newReserveA / newReserveB) * (weightB / weightA);
    const impact = ((newSpotPrice - oldSpotPrice) / oldSpotPrice) * 100;
    
    return { output, impact, newReserveA, newReserveB };
  } else {
    const newReserveB = reserveB + input;
    const newReserveA = Math.pow(constantMean / Math.pow(newReserveB, weightB), 1 / weightA);
    const output = reserveA - newReserveA;
    
    const oldSpotPrice = (reserveB / reserveA) * (weightA / weightB);
    const newSpotPrice = (newReserveB / newReserveA) * (weightA / weightB);
    const impact = ((newSpotPrice - oldSpotPrice) / oldSpotPrice) * 100;
    
    return { output, impact, newReserveA, newReserveB };
  }
}

function executeConstantMeanSwap(inputAmount, direction, poolState) {
  const swapResult = calculateConstantMeanSwap(inputAmount, direction, poolState);
  return {
    ...poolState,
    reserveA: swapResult.newReserveA,
    reserveB: swapResult.newReserveB,
    constantMean: Math.pow(swapResult.newReserveA, poolState.weightA) * Math.pow(swapResult.newReserveB, poolState.weightB)
  };
}

// ========== Curve StableSwap Implementation ==========
function initializeCurveStable(amountA, amountB, priceA, priceB) {
  // Simplified StableSwap - assumes similar-priced assets
  const amplificationFactor = 100; // A parameter in Curve
  return {
    reserveA: amountA,
    reserveB: amountB,
    amplificationFactor,
    priceA,
    priceB
  };
}

function calculateCurveStableSwap(inputAmount, direction, poolState, tokenPrices) {
  const { reserveA, reserveB, amplificationFactor } = poolState;
  const input = parseFloat(inputAmount);
  
  // Simplified Curve formula (actual implementation is more complex)
  // This is a hybrid between constant sum and constant product
  
  const n = 2; // number of tokens
  const sum = reserveA + reserveB;
  const product = reserveA * reserveB;
  
  if (direction === 'AtoB') {
    const newReserveA = reserveA + input;
    
    // Curve invariant: A * sum^n + D = A * D * n^n + D^(n+1)/(n^n * product)
    // Simplified approximation
    const alpha = 0.0001; // Curve factor (small for stable assets)
    const beta = 1 - alpha;
    
    const newSum = newReserveA + (sum - reserveA);
    const targetReserveB = beta * (sum - newReserveA) + alpha * (product / newReserveA);
    const output = reserveB - targetReserveB;
    
    // Very low price impact for stable assets
    const impact = (input / (reserveA + reserveB)) * 0.1; // Much lower than CPMM
    
    return {
      output: Math.max(0, output),
      impact,
      newReserveA,
      newReserveB: targetReserveB
    };
  } else {
    const newReserveB = reserveB + input;
    const alpha = 0.0001;
    const beta = 1 - alpha;
    
    const targetReserveA = beta * (sum - newReserveB) + alpha * (product / newReserveB);
    const output = reserveA - targetReserveA;
    const impact = (input / (reserveA + reserveB)) * 0.1;
    
    return {
      output: Math.max(0, output),
      impact,
      newReserveA: targetReserveA,
      newReserveB
    };
  }
}

function executeCurveStableSwap(inputAmount, direction, poolState) {
  const swapResult = calculateCurveStableSwap(inputAmount, direction, poolState, {
    priceA: poolState.priceA,
    priceB: poolState.priceB
  });
  
  return {
    ...poolState,
    reserveA: swapResult.newReserveA,
    reserveB: swapResult.newReserveB
  };
}

// ========== Concentrated Liquidity Implementation ==========
function initializeConcentrated(amountA, amountB, minPrice = 0.5, maxPrice = 2.0) {
  const currentPrice = amountA / amountB;
  return {
    reserveA: amountA,
    reserveB: amountB,
    minPrice,
    maxPrice,
    currentPrice,
    constantK: amountA * amountB, // Within the range
    isActive: currentPrice >= minPrice && currentPrice <= maxPrice
  };
}

function calculateConcentratedSwap(inputAmount, direction, poolState) {
  const { reserveA, reserveB, minPrice, maxPrice, constantK } = poolState;
  const input = parseFloat(inputAmount);
  
  // Check if we're still in range after swap
  if (direction === 'AtoB') {
    const newReserveA = reserveA + input;
    const newReserveB = constantK / newReserveA;
    const newPrice = newReserveA / newReserveB;
    
    // If price goes out of range, limit the swap
    if (newPrice > maxPrice) {
      // Calculate max input that keeps us in range
      const maxReserveA = maxPrice * reserveB;
      const maxInput = maxReserveA - reserveA;
      const actualInput = Math.min(input, maxInput);
      const actualNewReserveA = reserveA + actualInput;
      const actualNewReserveB = constantK / actualNewReserveA;
      const output = reserveB - actualNewReserveB;
      
      return {
        output,
        impact: ((actualInput / reserveA) * 100) * 0.5, // Lower impact due to concentration
        newReserveA: actualNewReserveA,
        newReserveB: actualNewReserveB,
        partialFill: actualInput < input
      };
    }
    
    const output = reserveB - newReserveB;
    const impact = ((input / reserveA) * 100) * 0.5; // Concentrated liquidity has lower impact
    
    return { output, impact, newReserveA, newReserveB };
  } else {
    const newReserveB = reserveB + input;
    const newReserveA = constantK / newReserveB;
    const newPrice = newReserveA / newReserveB;
    
    if (newPrice < minPrice) {
      const minReserveA = minPrice * reserveB;
      const maxInput = reserveB - (constantK / minReserveA);
      const actualInput = Math.min(input, maxInput);
      const actualNewReserveB = reserveB + actualInput;
      const actualNewReserveA = constantK / actualNewReserveB;
      const output = reserveA - actualNewReserveA;
      
      return {
        output,
        impact: ((actualInput / reserveB) * 100) * 0.5,
        newReserveA: actualNewReserveA,
        newReserveB: actualNewReserveB,
        partialFill: actualInput < input
      };
    }
    
    const output = reserveA - newReserveA;
    const impact = ((input / reserveB) * 100) * 0.5;
    
    return { output, impact, newReserveA, newReserveB };
  }
}

function executeConcentratedSwap(inputAmount, direction, poolState) {
  const swapResult = calculateConcentratedSwap(inputAmount, direction, poolState);
  const newPrice = swapResult.newReserveA / swapResult.newReserveB;
  
  return {
    ...poolState,
    reserveA: swapResult.newReserveA,
    reserveB: swapResult.newReserveB,
    currentPrice: newPrice,
    isActive: newPrice >= poolState.minPrice && newPrice <= poolState.maxPrice,
    constantK: swapResult.newReserveA * swapResult.newReserveB
  };
}

// Helper function to get pool pricing info
export function getPoolPricing(formula, poolState, tokenPrices) {
  switch (formula) {
    case AMM_FORMULAS.CPMM:
      return {
        priceA: (poolState.reserveB * tokenPrices.priceB) / poolState.reserveA,
        priceB: (poolState.reserveA * tokenPrices.priceA) / poolState.reserveB
      };
    
    case AMM_FORMULAS.CONSTANT_SUM:
      return {
        priceA: tokenPrices.priceA,
        priceB: tokenPrices.priceB
      };
    
    case AMM_FORMULAS.CONSTANT_MEAN:
      return {
        priceA: (poolState.reserveB / poolState.reserveA) * (poolState.weightA / poolState.weightB) * tokenPrices.priceB,
        priceB: (poolState.reserveA / poolState.reserveB) * (poolState.weightB / poolState.weightA) * tokenPrices.priceA
      };
    
    case AMM_FORMULAS.CURVE_STABLE:
      // For stable assets, pool price should be very close to market price
      return {
        priceA: tokenPrices.priceA * (1 + (poolState.reserveB - poolState.reserveA) / (poolState.reserveA + poolState.reserveB) * 0.001),
        priceB: tokenPrices.priceB * (1 + (poolState.reserveA - poolState.reserveB) / (poolState.reserveA + poolState.reserveB) * 0.001)
      };
    
    case AMM_FORMULAS.CONCENTRATED:
      return {
        priceA: poolState.currentPrice * tokenPrices.priceB,
        priceB: tokenPrices.priceB / poolState.currentPrice
      };
    
    default:
      return { priceA: 0, priceB: 0 };
  }
}