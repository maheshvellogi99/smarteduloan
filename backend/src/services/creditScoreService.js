function computeCreditScore({
  academicScore,
  attendance,
  internshipStatus,
  familyIncome,
  previousLoanHistory,
  spendingBehaviorScore,
  courseName
}) {
  let score = 300;

  score += academicScore * 2; // up to +200
  score += attendance * 1; // up to +100
  score += spendingBehaviorScore * 2; // up to +200

  if (internshipStatus === 'ongoing') score += 50;
  if (internshipStatus === 'completed') score += 80;

  if (familyIncome > 800000) score += 80;
  else if (familyIncome > 400000) score += 50;
  else if (familyIncome > 200000) score += 20;

  if (previousLoanHistory === 'no defaults') score += 80;
  if (previousLoanHistory === 'defaults') score -= 100;

  const course = (courseName || '').toLowerCase();

  let reputationScore = 60;
  if (course.includes('computer') || course.includes('engineering') || course.includes('medicine')) {
    reputationScore += 5;
  } else if (course.includes('diploma') || course.includes('skill')) {
    reputationScore += 0;
  }

  if (reputationScore > 100) reputationScore = 100;
  if (reputationScore < 0) reputationScore = 0;

  score += (reputationScore - 60) * 1;

  if (score < 0) score = 0;
  if (score > 900) score = 900;

  let riskCategory = 'high';
  if (score >= 750) riskCategory = 'low';
  else if (score >= 600) riskCategory = 'medium';

  let maxEligibleAmount = 0;
  let recommendedInterestRate = 0;

  if (riskCategory === 'low') {
    maxEligibleAmount = 500000;
    recommendedInterestRate = 8;
  } else if (riskCategory === 'medium') {
    maxEligibleAmount = 300000;
    recommendedInterestRate = 11;
  } else {
    maxEligibleAmount = 150000;
    recommendedInterestRate = 14;
  }

  return {
    creditScore: score,
    riskCategory,
    maxEligibleAmount,
    recommendedInterestRate
  };
}

module.exports = { computeCreditScore };

