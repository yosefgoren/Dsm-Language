vscode = acquireVsCodeApi();

function createGraphStateFromExpressions(expressions) {
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

function compileToJson(documentText){
    return createGraphStateFromExpressions(documentText.split('\n'));
}

window.Calc = Desmos.GraphingCalculator(document.querySelector('#calculator'));

window.addEventListener('message', event => {
    msg = event.data;
    switch (msg.type) {
    case 'update':
        window.Calc.setState(compileToJson(msg.text))
        break;
    }
});