vscode = acquireVsCodeApi();

class WasmWrapper {
    constructor(){
        Module.onRuntimeInitialized = async _ => {
            this.api = {
                init: Module.cwrap('init', null, null, null),
                destroy: Module.cwrap('destroy', null, null, null),
                compileDasm: Module.cwrap('compileDasm', 'string', ['string'], null),
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
                let new_state = webview.compileToJson(msg.text);
                // console.log(new_state);
                if(new_state == null){
                    return null;
                }
                webview.calc.setState(new_state)
                vscode.postMessage({
                    type: "success"
                });
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
    
    static createGraphStateFromExpressions(explist) {
        return {
            "expressions": {
                "list": explist
            },
            "graph": {
                "polarNumbers": false,
                "showGrid": false,
                "showXAxis": false,
                "showYAxis": false,
                "viewport": {
                    "xmax": 10,
                    "xmin": -10,
                    "ymax": 6.410928257925068,
                    "ymin": -6.410928257925068
                },
                "xAxisMinorSubdivisions": 1,
                "xAxisNumbers": false,
                "yAxisMinorSubdivisions": 1,
                "yAxisNumbers": false
            },
            "randomSeed": "f09cf492494e7aa4304b3edd13458065",
            "version": 7
        };
    }

    compileToJson(documentText){
        let compiled = this.comp.api.compileDasm(documentText);
        if(compiled[0] == '!') {
            vscode.postMessage({
                type: "error",
                content: compiled.substr(1)
            });
            return null;
        }
        try {
            var explist = JSON.parse(compiled);
        } catch (err) {
            vscode.postMessage({
                type: "error",
                content: `Internal Error: Compiler output is not in a valid json format.\n\t${err}` 
            });
            console.debug("compiled output json was: ", compiled);
            throw err;
        }
        return ClientWebview.createGraphStateFromExpressions(explist);
    }
}

WEBVIEW = new ClientWebview();
