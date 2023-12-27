const vscode = require("vscode");
const toggleLineComment = require("./toggle-line-comment.js");

function activate(context) {
  context.subscriptions.push(
    vscode.commands.registerCommand("mermaid-comment.toggleLineComment", toggleLineComment)
  );

  return;
}

function deactivate() {
  return undefined;
}

// console.log("for debug message");
// vscode.window.showInformationMessage("for debug message");

module.exports = { activate, deactivate };
