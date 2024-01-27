vscode = acquireVsCodeApi();

class WasmWrapper {
    constructor(){
        Module.onRuntimeInitialized = async _ => {
            this.api = {
                init: Module.cwrap('init', null, null, null),
                destroy: Module.cwrap('destroy', null, null, null),
                compileDasm: Module.cwrap('compileDasm', 'string', '[string]', null),
            };
            this.api.init();
            vscode.postMessage({type: 'initDone'});
        };
    }
}

class ClientWebview {
    activate(){
        let webview = this;
        window.addEventListener('message', event => {
            let msg = event.data;
            switch (msg.type) {
            case 'update':
                webview.calc.setState(webview.compileToJson(msg.text))
                break;
            }
        });
    }

    constructor(){
        this.calc = Desmos.GraphingCalculator(document.querySelector('#calculator'));
        this.comp = new WasmWrapper();

        //TODO: activate only after 'initDone'...
        this.activate();
    }
    
    static createGraphStateFromExpressions(expressions) {
        return {
            "expressions": {
                "list": expressions.map(exp => {
                    return {
                        "color": "#c74440",
                        "id": "1",
                        "latex": exp,
                        "type": "expression"
                    }
                })
            },
            "graph": {
                "viewport": {
                    "xmax": 10,
                    "xmin": -10,
                    "ymax": 15.886699507389164,
                    "ymin": -15.886699507389164
                }
            },
            "randomSeed": "f09cf492494e7aa4304b3edd13458065",
            "version": 7
        };
    }

    compileToJson(documentText){
        return ClientWebview.createGraphStateFromExpressions(this.comp.api.compileDasm(documentText).split('\n'));
    }
}

WEBVIEW = new ClientWebview();
