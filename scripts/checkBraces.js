const fs = require('fs');
const content = fs.readFileSync('js/admin.js', 'utf8');
let stack = [];
let lines = content.split('\n');
for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    for (let char of line) {
        if (char === '{') stack.push(i + 1);
        if (char === '}') {
            if (stack.length === 0) {
                console.log(`Unmatched } at line ${i + 1}`);
            } else {
                stack.pop();
            }
        }
    }
}
if (stack.length > 0) {
    console.log(`Unclosed { starting at line(s): ${stack.join(', ')}`);
} else {
    console.log('All braces matched!');
}
