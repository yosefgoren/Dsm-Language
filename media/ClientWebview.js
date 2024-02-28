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
                "showGrid": true,
                "showXAxis": false,
                "showYAxis": false,
                "viewport": {
                    "xmax": 3,
                    "xmin": -3,
                    "ymax": 3,
                    "ymin": -3
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
        let raw_output = this.comp.api.compileDasm(documentText);
        if(raw_output[0] == '!') {
            vscode.postMessage({
                type: "error",
                content: raw_output.substr(1)
            });
            return null;
        }
        try {
            var output = JSON.parse(raw_output)
        } catch (err) {
            vscode.postMessage({
                type: "error",
                content: `Internal Error: Compiler output is not in a valid json format.\n\t${err}` 
            });
            console.debug("compiled output json was: ", raw_output);
            throw err;
        }
        vscode.postMessage({
            type: "intellisense",
            content: output["intellisense"]
        });
        return ClientWebview.createGraphStateFromExpressions(output["instructions"]);
    }
}

WEBVIEW = new ClientWebview();
