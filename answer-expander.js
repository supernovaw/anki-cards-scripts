function getTransitionDurationMs(element) {
  const tDur = getComputedStyle(element).transitionDuration;
  return +tDur.substring(0, tDur.length - 1) * 1000; // 0.25s -> 250
}

function expand(element) {
  const normalHeight = element.clientHeight + "px";
  element.style.maxHeight = "0px";
  requestAnimationFrame(() => {
    element.classList.add("expanded"); // makes it visible and not absolute (by the time its height is zeroed)
    element.style.maxHeight = normalHeight;
  });
  setTimeout(() => element.style.maxHeight = "none", getTransitionDurationMs(element));
}

window["expandAnswer"] = function expandAnswer() {
  document.querySelectorAll(".expansible-answer").forEach(expand);
}
