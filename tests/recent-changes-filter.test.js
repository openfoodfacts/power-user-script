// Regression test for the "recent changes" filter (issue #20).
// Loads recentChangesFilterMatch from OpenFoodFactsPower.user.js and checks its behaviour.
const fs = require("fs");
const path = require("path");
const assert = require("assert");

const src = fs.readFileSync(path.join(__dirname, "..", "OpenFoodFactsPower.user.js"), "utf8");
const m = src.match(/\/\/ BEGIN recentChangesFilterMatch\r?\n([\s\S]*?)\/\/ END recentChangesFilterMatch/);
if (!m) {
    console.error("FAIL: recentChangesFilterMatch not found in OpenFoodFactsPower.user.js");
    process.exit(1);
}
const match = new Function(m[1] + "\nreturn recentChangesFilterMatch;")();

const cases = [
    // [filter, item text, expected]
    ["", "any text", true],
    ["image", "Image of a product", true],
    ["image", "photo", false],
    // exclusions
    ["-hungergames", "edit by hungergames bot", false],
    ["-hungergames", "edit by someone", true],
    ["-hunger -date-limite", "hunger edit", false],
    ["-hunger -date-limite", "date-limite edit", false],
    ["-hunger -date-limite", "plain edit", true],
    ["image -hunger", "image of a cat", true],
    ["image -hunger", "image by hunger app", false],
    ["image -hunger", "cat photo", false],
    // negative numbers and lone dashes are plain text, not exclusions
    ["-200", "weight 200 g", false],
    ["-200", "value -200 kcal", true],
    ["-", "a - b", true],
    // whitespace in plain text is matched literally, as before
    ["a  b", "a  b", true],
    ["a  b", "a b", false],
];

let failed = 0;
for (const [filter, text, expected] of cases) {
    try {
        assert.strictEqual(match(filter, text), expected);
    } catch (e) {
        failed++;
        console.error(`FAIL: filter=${JSON.stringify(filter)} text=${JSON.stringify(text)} expected=${expected}`);
    }
}
if (failed) {
    process.exit(1);
}
console.log(`OK: ${cases.length} recent changes filter cases passed`);
