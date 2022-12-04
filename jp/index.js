import { loadKanjiDetails } from "./kanji-details-loader.js";
import { assignEverything } from "./details-assigners.js";

window["jpUpdate"] = function jpUpdate(afterUpdate) {
  loadKanjiDetails(() => {
    assignEverything();
    document.querySelectorAll(".jp-hide-before-loaded").forEach(el => el.classList.remove("jp-hide-before-loaded"));
    if (typeof afterUpdate === "function") afterUpdate();
  });
}
