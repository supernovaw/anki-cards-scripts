/* Converts a list of kanji usage examples such as below into a table.
 * The list is stored in notes this way:
 *    食[た]べる to eat
 *    食[た]べ 物[もの] food
 *    食堂[しょくどう] cafeteria
 * This list is referenced in Anki as {{furigana:examples}}, which causes Anki to
 * convert parts of furigana enclosed in square brackets into ruby, rb and rt tags,
 * so that furigana is displayed above corresponding kanji. This results in the following:
 *    <div class="kanji-use-examples">
 *      <ruby><rb>食</rb><rt>た</rt></ruby>べる to eat
 *      <br>
 *      <ruby><rb>食</rb><rt>た</rt></ruby>べ<ruby><rb>物</rb><rt>もの</rt></ruby> food
 *      <br>
 *      <ruby><rb>食堂</rb><rt>しょくどう</rt></ruby> cafeteria
 *    </div>
 * Note: trailing kana characters end up in the same text node as the translation
 * The result is a table with 2 columns that looks like this (furigana omitted):
 *    食べる  to eat
 *    食べ物  food
 *    　食堂  cafeteria
 * If a kanjiToHide is provided, also replace the kanji with a placeholder */
export function convertWordsTable(rawNodes, kanjiToHide) {
  const examplesNodesArrays = splitIntoSubarrays([...rawNodes], n => n.nodeName === "BR"); // nodes of each example
  const examplesRows = []; // rows for each example

  examplesNodesArrays.forEach(nodes => {
    /* examples of 'nodes':
     *    0: <ruby><rb>食</rb><rt>た</rt></ruby>
     *    1: "べる to eat"
     * or
     *    0: <ruby><rb>食</rb><rt>た</rt></ruby>
     *    1: "べ"
     *    2: <ruby><rb>物</rb><rt>もの</rt></ruby>
     *    3: " food" */
    const row = document.createElement("tr");
    const cellJapanese = document.createElement("td"); //    will be, e.g. "<ruby><rb>食</rb><rt>た</rt></ruby>べる"
    const cellTranslation = document.createElement("td"); // will be, e.g. "to eat"
    row.append(cellJapanese, cellTranslation);

    // all nodes before and including the last ruby tag are the Japanese part;
    // the next node (which typically is the last) can have the trailing part of the word in Japanese (okurigana);
    // part or all of the next node is the translation part (along with anything after)
    const lastRubyNodeIndex = findIndexFromEnd(nodes, n => n.nodeName === "RUBY");
    nodes.forEach((node, i) => {
      if (i <= lastRubyNodeIndex) cellJapanese.appendChild(node);
      else if (i === lastRubyNodeIndex + 1) separateJapaneseAndTranslationTextNode(node, cellJapanese, cellTranslation);
      else cellTranslation.appendChild(node);
    });
    examplesRows.push(row);
    if (kanjiToHide) hideAllKanjiInElement(row, kanjiToHide);
  });
  const table = document.createElement("table");
  const tbody = document.createElement("tbody");
  table.appendChild(tbody);
  tbody.append(...examplesRows)
  return table;
}

/* When Anki creates ruby tags, the translation can end up in the same node as okurigana, e.g.:
 * "食[た]べる to eat" gets converted into the following nodes:
 * node[0]: <ruby><rb>食</rb><rt>た</rt></ruby>
 * node[1]: "べる to eat"
 * This function separates node[1] into "べる" and "to eat" and appends the two nodes to corresponding cells.
 * If the node does not contain okurigana, the node itself is just appended to cellTranslation. */
function separateJapaneseAndTranslationTextNode(node, cellJapanese, cellTranslation) {
  if (node.nodeName !== "#text") {
    cellTranslation.appendChild(node);
    return;
  }
  const nodeText = node.nodeValue;
  // matches trailing kana followed by a space, for instance "べる " in "べる to eat"
  const japanesePartMatch = nodeText.match(/^[\u3040-\u30ff]+ /);
  if (!japanesePartMatch) {
    cellTranslation.appendChild(node);
  } else {
    const spaceIndex = japanesePartMatch[0].length - 1;
    cellJapanese.appendChild(document.createTextNode(nodeText.substring(0, spaceIndex)));
    cellTranslation.appendChild(document.createTextNode(nodeText.substring(spaceIndex + 1)));
  }
}

/* For example:
 * splitIntoSubarrays(["Hello", "world", "<br>", "Text", "on", "second line"], s => s === "<br>")
 * returns
 * [
 *   ["Hello", "world"],
 *   ["Text", "on", "second line"]
 * ] */
function splitIntoSubarrays(array, separatorMatcher) {
  let lastGroup = [];
  const result = [lastGroup];

  array.forEach(item => {
    if (separatorMatcher(item)) {
      if (lastGroup.length > 0) {
        lastGroup = [];
        result.push(lastGroup);
      }
    } else {
      lastGroup.push(item);
    }
  });
  if (lastGroup.length === 0) result.pop();
  return result;
}

function findIndexFromEnd(array, matcher) {
  for (let i = array.length - 1; i >= 0; i--)
    if (matcher(array[i])) return i;
  return -1;
}

// goes through all text nodes and hides a kanji, e.g.: "食堂" -> "＿堂"
function hideAllKanjiInElement(root, kanji) {
  root.querySelectorAll("*").forEach(el => [...el.childNodes].forEach(node => {
    if (node.nodeName === "#text" && node.nodeValue.includes(kanji))
      node.nodeValue = node.nodeValue.replaceAll(kanji.toString(), "\uff3f");
  }));
}
