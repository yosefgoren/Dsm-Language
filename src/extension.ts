import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
	let disposable = vscode.commands.registerCommand('desmos-calculator-window.create-desmos-window', () => {
		let panel = vscode.window.createWebviewPanel(
			'graphView',
			'Node Graph Panel',
			vscode.ViewColumn.One,
			{enableScripts: true}
		);

		panel.webview.html = `
			<!DOCTYPE html>
			<html lang="en">
			<head>
				<style>
					#cont {
						width: 100%; /* Make the container div take up the full width of the parent element */
						height: 100vh; /* Make the container div take up the full height of the viewport */
					}
					#calculator {
						width: 100%; /* Make the calculator div take up the full width of the container */
						height: 100%; /* Make the calculator div take up the full height of the container */
					}
				</style>
			</head>
			<body>
				<script src="https://www.desmos.com/api/v1.8/calculator.js?apiKey=dcb31709b452b1cf9dc26972add0fda6"></script>
				<div id="cont">
					<div id="calculator"></div>
				</div>
				<script>
					var elt = document.getElementById('calculator');
					var calculator = Desmos.GraphingCalculator(elt);
				</script>
			</body>
			</html>
		`;
		// panel.onDidDispose(() => ...);
	});

	context.subscriptions.push(disposable);
}

export function deactivate() {}
