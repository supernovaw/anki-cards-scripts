import { allLoadedDetails } from "./kanji-details-loader.js";
import { initAnimations } from "./kanji-animations.js";
import { radicalNames, partsOfSpeech } from "./hardcoded.js";
import { convertWordsTable } from "./words-table-converter.js";

function getDetails(element) {
  return allLoadedDetails[element.getAttribute("kanji")];
}

/* E.g. puts "N5, 328/2500, grade 2" into
 * <div class="kanji-info" kanji="食"></div> */
function assignKanjiInfo(element) {
  const details = getDetails(element);
  if (!details) return;
  element.textContent = [details.nLevel, details.frequency, details.grade].filter(v => v).join(", ");
}

/* Fills a table of this form: <table class="radicals-table" kanji="猫"></table>
 * with radicals info like this:
 *    田   field
 *    犭   Variant of 犬 (dog)
 *    ⺾   grass, vegetation */
function assignRadicals(element) {
  const radicals = getDetails(element)?.radicals;
  if (!radicals) return;

  const tbody = document.createElement("tbody");
  radicals.forEach(radical => { // create a row for each radical
    const row = document.createElement("tr");
    const cells = [document.createElement("td"), document.createElement("td")];
    cells[0].textContent = radical;
    cells[1].textContent = radicalNames[radical];
    row.append(...cells);
    tbody.appendChild(row);
  });
  element.replaceChildren(tbody);
}

// Formats a list of example words and their translation to be a table, optionally hiding a given kanji character
function assignKanjiUseExamples(element) {
  // check if it has already been processed (happens when spamming reload in Anki)
  if (element.childNodes[0].nodeName === "TABLE") return;

  const table = convertWordsTable(element.childNodes, element.getAttribute("hidekanji"));
  element.replaceChildren(table);
}

function assignNanori(element) {
  const nanori = getDetails(element)?.nanori;
  if (nanori) element.textContent = "名乗り：" + nanori;
}

// E.g. converts "n,vs,adj-no" into (roughly) "noun (common) (futsuumeishi)<br>noun or participle which takes the aux. verb suru"
function assignPartOfSpeech(element) {
  const nodes = element.childNodes;
  if (nodes.length != 1 || nodes[0].nodeName !== "#text") return;
  const names = nodes[0].nodeValue.split(",");
  const newChildNodes = [];

  names.forEach((name, i) => {
    if (i > 0) newChildNodes.push(document.createElement("br"));
    const fullName = partsOfSpeech[name];
    newChildNodes.push(document.createTextNode(fullName || name));
    if (fullName) { // in this case, display both the full name and the abbreviation in small lettering
      const span = document.createElement("span");
      span.className = "part-of-speech-abbr";
      span.textContent = " " + name;
      newChildNodes.push(span);
    }
  });
  element.replaceChildren(...newChildNodes);
}

// Fills a table with row, where each row has an animated kanji and its details (info, readings, meaning)
function assignWordKanjiTable(element) {
  const kanjiList = [];
  [...element.getAttribute("word")].forEach(char => {
    if (allLoadedDetails[char] && !kanjiList.includes(char))
      kanjiList.push(char);
  });
  const tbody = document.createElement("tbody");

  kanjiList.forEach(kanji => {
    const details = allLoadedDetails[kanji];

    const row = document.createElement("tr");
    const cellKanji = document.createElement("td");
    const cellDetails = document.createElement("td");
    cellDetails.className = "details-column";

    // init the cell with the kanji: e.g. "学" and "N5, 63/2500, grade 1"
    const canvas = document.createElement("canvas");
    canvas.className = "kanji-animated";
    canvas.setAttribute("kanji", kanji);
    const infoDiv = document.createElement("div");
    infoDiv.className = "table-kanji-info";
    infoDiv.textContent = [details.nLevel, details.frequency, details.grade].filter(v => v).join(", ");
    cellKanji.append(canvas, infoDiv);

    // init the cell with details (onyomi, kunyomi, nanori, meaning)
    const divOnyomi = document.createElement("div");
    const divKunyomi = document.createElement("div");
    const divNanori = document.createElement("div"); divNanori.className = "nanori";
    const divMeaning = document.createElement("div");
    const divRadicals = document.createElement("div"); divRadicals.className = "radicals"
    divOnyomi.textContent = details.onyomi;
    divKunyomi.textContent = details.kunyomi;
    divNanori.textContent = (details.nanori && "名乗り：") + details.nanori;
    divMeaning.textContent = details.meaning;
    divRadicals.textContent = details.radicals.map(r => `${r} ${radicalNames[r]}`).join(", ");
    cellDetails.append(divOnyomi, divKunyomi, divNanori, divMeaning, divRadicals);

    row.append(cellKanji, cellDetails);
    tbody.appendChild(row);
  });
  element.replaceChildren(tbody);
}

export function assignEverything() {
  // assigners are functions that put relevant data into elements based on their kanji="…" or other DOM attribute
  const assigners = {
    ".kanji-info": assignKanjiInfo,
    ".radicals-table": assignRadicals,
    ".kanji-use-examples": assignKanjiUseExamples,
    ".nanori": assignNanori,
    ".part-of-speech": assignPartOfSpeech,
    "table.word-kanji": assignWordKanjiTable,
  }
  // for each selector, run its corresponding function for each of the matching elements
  Object.keys(assigners).forEach(sel => document.querySelectorAll(sel).forEach(assigners[sel]));
  initAnimations(); // as a last step, init animations
}
