const vscode = require("vscode");

const MERMAID_COMMENT_SYMBOL = "%%";
const MARKDOWN_COMMENT_SYMBOLS = ["<!--", "-->"];

async function main() {
  const [mermaidCommentString, markdownCommentStrings] = await getCommentString();

  const editor = vscode.window.activeTextEditor;

  const mermaidLineNums = getMermaidLineNums(editor);
  const selectionsLineNums = getSelectionsLineNums(editor);

  await editor.edit(editBuilder => {
    for (const selectionLineNums of selectionsLineNums) {
      const selectionLines = selectionLineNums.map(i => editor.document.lineAt(i));
      const isMermaidSelection = selectionLineNums.every(i => mermaidLineNums.includes(i));
      if (isMermaidSelection) {
        toggleMermaidComment(editBuilder, selectionLines, mermaidCommentString);
      } else {
        toggleMarkdownComment(editBuilder, selectionLines, markdownCommentStrings);
      }
    }
  });
}

async function getCommentString() {
  const commentSpaceSetting = await vscode.workspace
    .getConfiguration()
    .get("editor.comments.insertSpace");
  if (commentSpaceSetting) {
    mermaidCommentString = MERMAID_COMMENT_SYMBOL + " ";
    markdownCommentStrings = [MARKDOWN_COMMENT_SYMBOLS[0] + " ", " " + MARKDOWN_COMMENT_SYMBOLS[1]];
  } else {
    mermaidCommentString = MERMAID_COMMENT_SYMBOL;
    markdownCommentStrings = MARKDOWN_COMMENT_SYMBOLS;
  }
  return [mermaidCommentString, markdownCommentStrings];
}

function getMermaidLineNums(editor) {
  const mermaidRegex = new RegExp("```mermaid[\\s\\S]*```", "gm");
  const matches = [...editor.document.getText().matchAll(mermaidRegex)];

  const mermaidLines = matches
    .map(match => {
      const startLineNum = editor.document.positionAt(match.index).line;
      const endLineNum = editor.document.positionAt(match.index + match[0].length).line;
      return Array.from(Array(endLineNum - startLineNum + 1).keys())
        .map(i => i + startLineNum)
        .slice(1, -1); // to remove fence of code block
    })
    .flat();
  return mermaidLines;
}

function getSelectionsLineNums(editor) {
  const selectionsLineNums = editor.selections.map(selection => {
    const startLineNum = selection.start.line;
    const endLineNum = selection.end.line;
    const selectionLineNums = Array.from(Array(endLineNum - startLineNum + 1).keys()).map(
      i => i + startLineNum
    );
    return selectionLineNums;
  });
  return selectionsLineNums;
}

function toggleMermaidComment(editBuilder, selectionLines, mermaidCommentString) {
  const mermaidCommentRegex = new RegExp(`^\\s*${MERMAID_COMMENT_SYMBOL}`);
  const shouldComment = !selectionLines.every(line => mermaidCommentRegex.test(line.text));
  if (shouldComment) {
    const selectionIndentationIndex = getIndentationIndex(selectionLines);

    for (const selectionLine of selectionLines) {
      editBuilder.insert(
        new vscode.Position(selectionLine.lineNumber, selectionIndentationIndex),
        mermaidCommentString
      );
    }
  } else {
    for (const selectionLine of selectionLines) {
      const commentRange = getTextRangeInLine(mermaidCommentString, selectionLine);
      editBuilder.delete(commentRange);
    }
  }
}

function toggleMarkdownComment(editBuilder, selectionLines, markdownCommentStrings) {
  const markdownCommentRegex = new RegExp(
    `^\\s*${MARKDOWN_COMMENT_SYMBOLS[0]}[\\s\\S]*${MARKDOWN_COMMENT_SYMBOLS[1]}[^\\S\\r\\n]*$`
  );
  const shouldComment = !markdownCommentRegex.test(selectionLines.map(e => e.text).join("\n"));

  const startLine = selectionLines[0];
  const endLine = selectionLines[selectionLines.length - 1];
  if (shouldComment) {
    const selectionIndentationIndex = getIndentationIndex(selectionLines);

    editBuilder.insert(
      new vscode.Position(startLine.lineNumber, selectionIndentationIndex),
      markdownCommentStrings[0]
    );
    editBuilder.insert(endLine.range.end, markdownCommentStrings[1]);
  } else {
    const openingCommentRange = getTextRangeInLine(markdownCommentStrings[0], startLine);
    const closingCommentRange = getTextRangeInLine(markdownCommentStrings[1], endLine);
    editBuilder.delete(openingCommentRange);
    editBuilder.delete(closingCommentRange);
  }
}

function getIndentationIndex(targetLines) {
  const selectionIndentationIndex = targetLines
    .filter(targetLine => !targetLine.isEmptyOrWhitespace)
    .map(targetLine => getTextRangeInLine(/^\s*/, targetLine).end.character)
    .reduce((a, b) => Math.min(a, b), Infinity);
  return selectionIndentationIndex;
}

function getTextRangeInLine(searchText, targetLine) {
  const lineNum = targetLine.lineNumber;
  const match = targetLine.text.match(searchText);
  const textRange = new vscode.Range(lineNum, match.index, lineNum, match.index + match[0].length);
  return textRange;
}

module.exports = main;
