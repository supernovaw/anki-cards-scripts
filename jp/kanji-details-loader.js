// Returns a list of all kanji from all elements that need detailing, not yet in the cache object
function getRequiredKanjiToLoad() {
  const result = [];
  const addKanji = char => {
    if (char >= "\u4e00" && char < "\uffff" && !allLoadedDetails[char] && !result.includes(char))
      result.push(char);
  };
  const addFromElement = element => {
    const kanji = element.getAttribute("kanji");
    const word = element.getAttribute("word");
    if (word) [...word].forEach(addKanji);
    if (kanji) addKanji(kanji);
  };
  const selectors = [
    "canvas.kanji-animated",
    ".kanji-info",
    ".nanori",
    ".radicals-table",
    "table.word-kanji"
  ];
  // iterate over each element from each selector and add its kanji to result
  selectors.forEach(sel => document.querySelectorAll(sel).forEach(addFromElement));
  return result;
}

function urlPathForKanji(kanji) { // e.g.: "内" -> "/mine/jp/kanji-details/u5185.json"
  const hex = kanji.charCodeAt(0).toString(16);
  return `/mine/jp/kanji-details/u${hex}.json`;
}

export const allLoadedDetails = {};

// This function invokes all the necessary kanji fetch requests and calls a function after their reception.
// In case all the needed kanji are already present in cache, the callback is invoked immediately.
export function loadKanjiDetails(callback) {
  const kanjiToFetch = getRequiredKanjiToLoad();
  const allPromises = [];

  kanjiToFetch.forEach(kanji => {
    const url = urlPathForKanji(kanji);
    const promise = fetch(url)
      .then(response => response.json())
      .then(json => allLoadedDetails[kanji] = json)
      .catch(() => allLoadedDetails[kanji] = null);
    allPromises.push(promise);
  })
  Promise.all(allPromises).then(callback);
}
