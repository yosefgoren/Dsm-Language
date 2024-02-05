import * as vscode from 'vscode';


function getMediaPath(filename: string, context: vscode.ExtensionContext, panel: vscode.WebviewPanel) {
	return panel.webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'media', filename));
}

class DasmTextEditorProvider implements vscode.CustomTextEditorProvider {
	public constructor(
		private context: vscode.ExtensionContext,
		private out: vscode.OutputChannel
	) {}
	
	public resolveCustomTextEditor(
		document: vscode.TextDocument, 
		webviewPanel: vscode.WebviewPanel, 
		token: vscode.CancellationToken
	): void | Thenable<void> {
		webviewPanel.webview.options = {
			enableScripts: true
		}
		webviewPanel.webview.html = `
		<!DOCTYPE html>
		<html>
			<head>
				<title>Untitled</title>
				<meta charset="utf-8">
				<meta name="viewport" content="width=device-width, initial-scale=1">
				<script src="https://www.desmos.com/api/v1.8/calculator.js?apiKey=dcb31709b452b1cf9dc26972add0fda6"></script>
				<!-- <script type="text/javascript" src="${getMediaPath("DesmosEngine.js", this.context, webviewPanel)}"></script> -->
			</head>
			<body style="margin: 0;">
				<script type='text/javascript'>
					console.log("initing Module");
					var Module = {
						print: function(text) {
							if(arguments.length > 1){
								text = Array.prototype.slice.call(arguments).join(' ');
							}
							console.log(text);
						},
						printErr: function(text) {console.error(\`WASM Error: '\${text}'\`)}
					};
				</script>

				<script async type="text/javascript" src="${getMediaPath("dasm.js", this.context, webviewPanel)}"></script>
				<script async type="text/javascript" src="${getMediaPath("ClientWebview.js", this.context, webviewPanel)}"></script>
				
				<div id="calculator" style="position: absolute; top: 0; bottom: 0; left: 0; right: 0;"></div>
			</body>
		</html>		
		`;
		webviewPanel.webview.onDidReceiveMessage((msg) => {
			switch (msg.type) {
			case 'error':
				this.out.clear();
				this.out.appendLine(msg.content);
				this.out.show(true);
				break;
			case 'initDone':
				break;
			case 'success':
				this.out.clear();
				this.out.appendLine("compilation done.");
				break;
			default:
				console.error("extension webview generated an unexpected message: ", msg);
			}
		});

		function updateWebview() {
			webviewPanel.webview.postMessage({
				type: 'update',
				text: document.getText(),
			});
			
		}

		const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(e => {
			if (e.document.uri.toString() === document.uri.toString()) {
				updateWebview();
			}
		});
	}
}

export function activate(context: vscode.ExtensionContext) {
	//see https://github.com/microsoft/vscode-extension-samples/blob/main/custom-editor-sample/src/catScratchEditor.ts
	//	seems like most relevant example.
	let out = vscode.window.createOutputChannel("Dasm Output");
	let disposable = vscode.window.registerCustomEditorProvider(
		"dasm-preview",
		new DasmTextEditorProvider(context, out),
		{
			supportsMultipleEditorsPerDocument: false
		}
	);
	
	context.subscriptions.push(disposable);
}

export function deactivate() {}
