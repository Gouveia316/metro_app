export type ArrivalCountdownInput = {
  displayMinutes?: number;
  minutes?: number;
  responseUpdatedAt?: string;
  secondsUntilArrival?: number;
};

const ARRIVING_GRACE_SECONDS = 30;

export function getRemainingArrivalSeconds(arrival: ArrivalCountdownInput, now: number): number | null {
  if (typeof arrival.secondsUntilArrival !== "number" || !arrival.responseUpdatedAt) {
    return null;
  }

  const updatedAtMs = new Date(arrival.responseUpdatedAt).getTime();

  if (Number.isNaN(updatedAtMs)) {
    return arrival.secondsUntilArrival;
  }

  const elapsedSeconds = Math.floor((now - updatedAtMs) / 1000);

  return arrival.secondsUntilArrival - elapsedSeconds;
}

export function isArrivalVisible(arrival: ArrivalCountdownInput, now: number): boolean {
  const remainingSeconds = getRemainingArrivalSeconds(arrival, now);

  return remainingSeconds === null || remainingSeconds >= -ARRIVING_GRACE_SECONDS;
}

export function formatArrivalCountdown(
  arrival: ArrivalCountdownInput,
  now: number,
  arrivingLabel: string,
  minuteLabel: string,
): string | null {
  const remainingSeconds = getRemainingArrivalSeconds(arrival, now);

  if (remainingSeconds !== null) {
    if (remainingSeconds < -ARRIVING_GRACE_SECONDS) {
      return null;
    }

    if (remainingSeconds <= 30) {
      return arrivingLabel;
    }

    if (remainingSeconds < 90) {
      return `1 ${minuteLabel}`;
    }

    return `${Math.ceil(remainingSeconds / 60)} ${minuteLabel}`;
  }

  const fallbackMinutes =
    typeof arrival.displayMinutes === "number" ? arrival.displayMinutes : arrival.minutes;

  return typeof fallbackMinutes === "number" ? `${fallbackMinutes} ${minuteLabel}` : null;
}
