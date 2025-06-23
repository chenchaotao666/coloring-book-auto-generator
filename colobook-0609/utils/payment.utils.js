function calculateRechargeAmount(type, level) {
  const prices = {
    monthly: { lite: 5, pro: 12 },
    yearly:  { lite: 48, pro: 115  }
  };

  return prices[type][level] || 0;
}

module.exports = { calculateRechargeAmount };