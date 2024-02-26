import * as vscode from 'vscode';


function getMediaPath(filename: string, context: vscode.ExtensionContext, panel: vscode.WebviewPanel) {
	return panel.webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'media', filename));
}

function getPathLastName(full_path: string): string {
	
	let parts = full_path.split('/');
	if (parts.length == 1) {
		parts = full_path.split('\\');
	} 
	return parts[parts.length-1];
}


var isense: Array<any> | null = null;

class DasmTextEditorProvider implements vscode.CustomTextEditorProvider {
	public constructor(
		private context: vscode.ExtensionContext,
	) {}

	
	public resolveCustomTextEditor(
		document: vscode.TextDocument, 
		webviewPanel: vscode.WebviewPanel, 
		token: vscode.CancellationToken
	): void | Thenable<void> {
		let out = vscode.window.createOutputChannel(`Dasm: '${getPathLastName(document.fileName)}'`);
	
		let online = `<script src="https://www.desmos.com/api/v1.8/calculator.js?apiKey=dcb31709b452b1cf9dc26972add0fda6"></script>`
		let ver = "1.8";
		let offline = `<script type="text/javascript" src="${getMediaPath(`DesmosEngine${ver}.js`, this.context, webviewPanel)}"></script>/`

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
				${online}	
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
				out.clear();
				out.appendLine(msg.content);
				out.show(true);
				break;
			case 'initDone':
				break;
			case 'success':
				out.clear();
				out.appendLine("compilation done.");
				break;
			case 'intellisense':
				isense = msg.content;
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
		//TODO: eventually put 'registerCompletionItemProvider' since it should depend on specific document?
		//		alternatively, might have to register it globally, and allow it to dispatch querying information
		//		based on the document it's provided with.
		//		this would require saving some global parsed open documents state.

	}
}

export function activate(context: vscode.ExtensionContext) {
	//see https://github.com/microsoft/vscode-extension-samples/blob/main/custom-editor-sample/src/catScratchEditor.ts
	//	seems like most relevant example.
	let disposable = vscode.window.registerCustomEditorProvider(
		"dasm-preview",
		new DasmTextEditorProvider(context),
		{
			supportsMultipleEditorsPerDocument: false
		}
	);
	
	vscode.languages.registerCompletionItemProvider({
		language: 'dsm',
		scheme: 'file'
	}, {
		provideCompletionItems(doc, pos, _tok, context) {
			let cur_token_range = doc.getWordRangeAtPosition(pos);
			if (cur_token_range == undefined || isense == null) {
				console.log("not generating comp items due to missing intellisense");
				return [];
			}
			let token_start = doc.getText(cur_token_range);
			
			let completions = isense?.filter((sym_info) => {
				return sym_info["symbol"]?.startsWith(token_start);
			}).map((sym_info) => {
				let sym = sym_info["symbol"] as string;
				// let comp_str = sym?.substring(token_start.length, sym?.length);
				let comp_type = sym_info.hasOwnProperty("args")
					? vscode.CompletionItemKind.Function
					: vscode.CompletionItemKind.Variable;
				let comp_item = new vscode.CompletionItem(sym, comp_type);
				comp_item.range = cur_token_range;
				return comp_item;
			});
			return completions;
		}
	}, '.');
	
	vscode.languages.registerHoverProvider({
		language: 'dsm',
		scheme: 'file'
	}, {
		provideHover(doc, pos, _tok) {
			// let ran = doc.getWordRangeAtPosition(pos, /'[A-Za-z0-9_']+|[A-Za-z][A-Za-z0-9_']*|[!%&$#+\-/:<=>?@\\~`^|*]+|~?[0-9]+\.[0-9]+([Ee]~?[0-9]+)?|~?[0-9]+|~?0x[0-9A-Fa-f]+|0w[0-9]+|0wx[0-9A-Fa-f]+/);
			let ran = doc.getWordRangeAtPosition(pos);
			if (ran) {
				return new vscode.Hover(doc.getText(ran));
			}
		}
	});

	vscode.languages.registerDefinitionProvider({
		language: 'dsm',
		scheme: 'file'
	}, {
		provideDefinition(doc, pos, _tok) {
			let cur_tok_range = doc.getWordRangeAtPosition(pos);
			if (cur_tok_range == undefined || isense == null) {
				console.log("not generating comp items due to missing intellisense");
				return [];
			}
			let cur_tok = doc.getText(cur_tok_range);
			let res = null;
			isense?.forEach((sym_info) => {
				if (sym_info["symbol"] == cur_tok) {
					let line = Number(sym_info["lineno"])-1;
					res = new vscode.Location(doc.uri, new vscode.Range(line, 0, line, 0));
				}
			});

			return res;
		}
	});

	context.subscriptions.push(disposable);
}	


export function deactivate() {}
