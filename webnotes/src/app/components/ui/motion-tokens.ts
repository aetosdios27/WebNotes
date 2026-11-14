export function motionTiming(
  element: Element,
  duration: "fast" | "normal" | "slow",
) {
  const tokens = getComputedStyle(element);
  const time = tokens.getPropertyValue(`--duration-${duration}`).trim();
  return {
    duration: Number.parseFloat(time) * (time.endsWith("ms") ? 1 : 1000),
    easing: tokens.getPropertyValue("--ease-settle").trim(),
  };
}
