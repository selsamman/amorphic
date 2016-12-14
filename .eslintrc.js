var OFF = 0, WARN = 1, ERROR = 2;

module.exports = exports = {
    
    "env": {
        "node": true,
        "browser": true,
        "mocha": true,
        "jquery": true,
        "es6": true
    },
    
    "extends": "eslint:recommended",
    
    // Overrides from recommended set
    "rules": {
        // Ignore unused vars that start with underscore
        "no-unused-vars": [ ERROR, { "args": "all", "argsIgnorePattern": "^_" } ],
        
        // Possible Errors
        "no-unexpected-multiline": ERROR,
        
        // All JSDoc comments must be valid
        "valid-jsdoc": [ ERROR, {
            "requireReturn": false,
            "requireReturnDescription": false,
            "requireParamDescription": true,
            "prefer": {
                "return": "returns"
            }
        }],
        
        // Produce warnings when something is commented as TODO or FIXME
        "no-warning-comments": [ WARN, {
            "terms": [ "TODO", "FIXME" ],
            "location": "start"
        }],
        
        // Whitespace
        "indent": [OFF, 4],
        "no-trailing-spaces": OFF,
        "space-before-blocks": OFF,
        "keyword-spacing": OFF,
        "semi-spacing": OFF,
        "comma-spacing": OFF,
        "space-infix-ops": OFF,
        "space-in-parens": OFF,
        "array-bracket-spacing": OFF,
        
        // Low Risk
        "curly": OFF,
        "brace-style": [OFF, "stroustrup"],
        "semi": OFF,
        "comma-style": OFF,
        "comma-dangle": OFF,
        "max-statements-per-line": OFF,
        "quotes": [OFF, "single", { "avoidEscape": true }],
        
        // Medium Risk
        "eqeqeq": OFF,
        "no-nested-ternary": OFF,
        "no-new-object": OFF,
        "no-eval": OFF,
        "no-extend-native": OFF,
        "no-implicit-coercion": [OFF, { "allow": ["!!"] } ],
        "no-extra-boolean-cast": OFF,
        
        // Renaming
        "camelcase": OFF,
        "new-cap": OFF,
        "func-names": OFF,
        "no-useless-rename": OFF,
        
        // High Risk
        "strict": OFF,
        "no-loop-func": OFF,
        "max-len": [OFF, 120],
        "max-lines": [OFF, {"max": 600, "skipBlankLines": true, "skipComments": true}],
        "max-params": [OFF, 6],
        "max-statements": [OFF, 35],
        "max-depth": [OFF, 5]
    }
};
