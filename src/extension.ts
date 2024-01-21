import * as vscode from 'vscode';


function getMediaPath(filename: string, context: vscode.ExtensionContext, panel: vscode.WebviewPanel) {
	return panel.webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'media', filename));
}

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
		<html>
			<head>
				<title>Untitled</title>
				<meta charset="utf-8">
				<meta name="viewport" content="width=device-width, initial-scale=1">
				<!-- <script src="https://www.desmos.com/api/v1.4/calculator.js?apiKey=dcb31709b452b1cf9dc26972add0fda6"></script> -->
				<script type="text/javascript" src="${getMediaPath("calculator.js", context, panel)}"></script>
			</head>
			<body style="margin: 0;">
				
				<div style="line-height: 46px;">
					<input id="file" type="file" accept=".json" style="display: none;"/>
					<button id="load">load</button>
					<button id="save">save</button>
					<input id="title" type="text" value="Untitled">
				</div>
				<div id="calculator" style="position: absolute; top: 46px; bottom: 0; left: 0; right: 0;"></div>
				<script>            
					window.Calc = Desmos.GraphingCalculator(document.querySelector('#calculator'));
					window.Calc.settingsMenu.reverseContrast = true;
					
					function loadDesmosState(jsonString){
						var state = JSON.parse(jsonString);
						window.Calc.setState(state);
					};
					
					document.querySelector('#file').onchange = function(e){
						let file = e.target.files[0];
						name = file.name.replace(/\.(json|JSON)$/, '');
						document.querySelector('#title').value = name;
						document.querySelector('head>title').text = name;
						let reader = new FileReader();
						reader.onload = function(e){
							loadDesmosState(e.target.result);
						};
						reader.readAsText(file);
					};
					
					document.querySelector('#load').onclick = function(e){
						document.querySelector('#file').click();
					};
					
					function download(content, fileName, contentType) {
						let a = document.createElement('a');
						a.href = URL.createObjectURL(new Blob([content], {type: contentType}));
						a.download = fileName;
						a.click();
					};
					
					document.querySelector('#save').onclick = function(e){
						let state = JSON.stringify(window.Calc.getState());
						let title = document.querySelector('#title').value;
						download(state, title+'.json', 'text/plain');
					};
				</script>
			</body>
		</html>		
		`;
		// panel.onDidDispose(() => ...);
	});

	context.subscriptions.push(disposable);
}

export function deactivate() {}
