import { toZonedTime } from "date-fns-tz";

/** "2026-07-27" a partir de um Date local (sem conversão de fuso). */
export function getLocalDateString(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function formatToLocalDate(
  date: string, // Espera "YYYY-MM-DD"
  timeZone = "America/Sao_Paulo",
) {
  // 1. Criamos a data usando o fuso local, SEM o "Z" no final.
  // Isso evita que o JS aplique o offset de -3 horas e mude o dia.
  const dateParts = date.split("-").map(Number);
  const localDate = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);

  // 2. Usamos o toZonedTime para garantir que a instância respeite o fuso
  const zonedTime = toZonedTime(localDate, timeZone);

  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(zonedTime);
}
