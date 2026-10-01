export type AffordabilityAdvice = {
  level: "safe" | "careful" | "over";
  title: string;
  note: string;
  ratio: number;
};

function money(value: number) {
  return `${Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")}đ`;
}

export function affordabilityAdvice(totalCost: number, monthlyBudgetText: string): AffordabilityAdvice | null {
  const budget = Number(monthlyBudgetText.replace(/\D/g, ""));
  if (!Number.isFinite(budget) || budget <= 0 || totalCost <= 0) return null;

  const ratio = Math.round((totalCost / budget) * 100);
  if (ratio <= 85) {
    return {
      level: "safe",
      title: "Ngân sách còn dư địa",
      note: `Ước tính ${money(totalCost)}/tháng, khoảng ${ratio}% ngân sách bạn nhập.`,
      ratio,
    };
  }
  if (ratio <= 100) {
    return {
      level: "careful",
      title: "Sát ngân sách",
      note: `Ước tính ${money(totalCost)}/tháng, khoảng ${ratio}% ngân sách. Nên chừa thêm tiền ăn, đi lại và phát sinh.`,
      ratio,
    };
  }
  return {
    level: "over",
    title: "Vượt ngân sách",
    note: `Ước tính ${money(totalCost)}/tháng, cao hơn ngân sách ${money(budget)} bạn nhập.`,
    ratio,
  };
}
