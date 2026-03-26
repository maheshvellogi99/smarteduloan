function generateEmiSchedule({ principalAmount, interestRate, tenureMonths, startDate = new Date() }) {
  const monthlyRate = interestRate / (12 * 100);
  const n = tenureMonths;
  const P = principalAmount;

  const emi = (P * monthlyRate * Math.pow(1 + monthlyRate, n)) / (Math.pow(1 + monthlyRate, n) - 1);

  const schedule = [];
  for (let i = 1; i <= n; i++) {
    const dueDate = new Date(startDate);
    dueDate.setMonth(dueDate.getMonth() + i);
    schedule.push({
      emiNumber: i,
      dueDate,
      amount: Math.round(emi)
    });
  }

  return schedule;
}

function calculateStandardEmi(principalAmount, interestRate, tenureMonths) {
  const monthlyRate = interestRate / (12 * 100);
  const n = tenureMonths;
  const P = principalAmount;
  const emi = (P * monthlyRate * Math.pow(1 + monthlyRate, n)) / (Math.pow(1 + monthlyRate, n) - 1);
  const totalPaid = emi * n;
  const totalInterest = totalPaid - P;
  return {
    monthlyEmi: Math.round(emi),
    totalPaid: Math.round(totalPaid),
    totalInterest: Math.round(totalInterest)
  };
}

function buildRepaymentPlans({ principalAmount, interestRate, tenureMonths }) {
  const standard = calculateStandardEmi(principalAmount, interestRate, tenureMonths);

  const stepUp = (() => {
    const startEmi = Math.round(standard.monthlyEmi * 0.7);
    const endEmi = Math.round(standard.monthlyEmi * 1.2);
    const avgEmi = (startEmi + endEmi) / 2;
    const totalPaid = avgEmi * tenureMonths;
    const totalInterest = totalPaid - principalAmount;
    return {
      startEmi,
      endEmi,
      totalPaid: Math.round(totalPaid),
      totalInterest: Math.round(totalInterest)
    };
  })();

  const moratorium = (() => {
    const graceMonths = Math.min(12, tenureMonths);
    const monthlyRate = interestRate / (12 * 100);
    const interestDuringGrace = principalAmount * monthlyRate * graceMonths;
    const newPrincipal = principalAmount + interestDuringGrace;
    const remainingMonths = tenureMonths;
    const inner = calculateStandardEmi(newPrincipal, interestRate, remainingMonths);
    const totalPaid = inner.totalPaid;
    const totalInterest = totalPaid - principalAmount;
    return {
      graceMonths,
      monthlyEmi: inner.monthlyEmi,
      totalPaid: Math.round(totalPaid),
      totalInterest: Math.round(totalInterest)
    };
  })();

  return { standard, stepUp, moratorium };
}

module.exports = { generateEmiSchedule, buildRepaymentPlans };

