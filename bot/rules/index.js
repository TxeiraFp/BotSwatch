const greetingsRule = require('./greetings');
const helpRule = require('./help');
const animalsRule = require('./animals');

// Array de regras
const rules = [greetingsRule, helpRule, animalsRule];

async function runRules(context) {
  for (const rule of rules) {
    const result = await rule(context);
    if (result) {
      return result;
    }
  }
  return null;
}

module.exports = { runRules };
