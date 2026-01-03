import { useState, useEffect } from "react";

export const useNumberInput = (initialValue = 0) => {
  const [displayValue, setDisplayValue] = useState("");
  const [actualValue, setActualValue] = useState(initialValue);

  // 初期値をフォーマットする
  useEffect(() => {
    if (initialValue !== undefined && initialValue !== null) {
      const formatted = Number(initialValue).toLocaleString();
      setDisplayValue(formatted);
      setActualValue(Number(initialValue));
    }
  }, [initialValue]);

  const handleChange = (input) => {
    const cleaned = input.replace(/[^\d,-]/g, "");
    const isNegative = cleaned.startsWith("-");
    const numericString = cleaned.replace(/[,-]/g, "");

    if (numericString === "") {
      setDisplayValue(isNegative ? "-" : "");
      setActualValue(0);
      return;
    }

    const withoutLeadingZeros = numericString.replace(/^0+/, "") || "0";
    const valueWithSign = isNegative
      ? "-" + withoutLeadingZeros
      : withoutLeadingZeros;
    const formatted = Number(valueWithSign).toLocaleString();

    setDisplayValue(formatted);
    setActualValue(Number(valueWithSign));
  };

  return { displayValue, actualValue, handleChange };
};