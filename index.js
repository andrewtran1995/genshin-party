"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var genshin_db_1 = require("genshin-db");
var fp_1 = require("lodash/fp");
var extra_typings_1 = require("@commander-js/extra-typings");
var chalk_1 = require("chalk");
var select_1 = require("@inquirer/select");
var ts_pattern_1 = require("ts-pattern");
var Rarities = ['4', '5'];
function main() {
    var _this = this;
    extra_typings_1.program
        .option('-l, --list', 'List all elegible characters.', false)
        .addOption(new extra_typings_1.Option('-r, --rarity <rarity>', 'Rarity of the desired character.').choices(Rarities))
        .action(function (_a) {
        var list = _a.list, rarity = _a.rarity;
        var filteredChars = getChars(rarity);
        if (list) {
            console.log('Possible characters include:');
            console.log(filteredChars.map(formatChar).join(', '));
        }
        console.log("Random character: ".concat(formatChar((0, fp_1.sample)(filteredChars))));
    });
    extra_typings_1.program
        .command('order')
        .description('Generate a random order in which to select characters.')
        .action(function () { return console.log((0, fp_1.shuffle)([1, 2, 3, 4])); });
    extra_typings_1.program
        .command('interactive')
        .alias('i')
        .description('Random, interactive party selection, balancing four and five star characters.')
        .action(function () { return __awaiter(_this, void 0, void 0, function () {
        var playerChoices, _loop_1, _i, _a, playerNumber, _b, playerChoices_1, _c, char, number;
        var _d, _e;
        return __generator(this, function (_f) {
            switch (_f.label) {
                case 0:
                    playerChoices = [];
                    _loop_1 = function (playerNumber) {
                        var _loop_2, state_1;
                        return __generator(this, function (_g) {
                            switch (_g.label) {
                                case 0:
                                    console.log("Now choosing for ".concat(formatPlayer(playerNumber), "."));
                                    _loop_2 = function () {
                                        var char, choice, _h;
                                        return __generator(this, function (_j) {
                                            switch (_j.label) {
                                                case 0:
                                                    char = (0, fp_1.sample)(getChars(((_e = (_d = (0, fp_1.last)(playerChoices)) === null || _d === void 0 ? void 0 : _d.isMain) !== null && _e !== void 0 ? _e : false)
                                                        ? '4'
                                                        : '5'));
                                                    console.log("Rolled: ".concat(formatChar(char), "."));
                                                    _h = ts_pattern_1.match;
                                                    return [4 /*yield*/, (0, select_1.default)({
                                                            message: 'Accept character?',
                                                            choices: [
                                                                { value: 'Accept' },
                                                                { value: 'Accept (and character is a main)' },
                                                                { value: 'Reroll' }
                                                            ]
                                                        })];
                                                case 1:
                                                    choice = _h.apply(void 0, [_j.sent()])
                                                        .returnType()
                                                        .with('Accept', function () { return ({
                                                        char: char,
                                                        isMain: false,
                                                        number: playerNumber
                                                    }); })
                                                        .with('Accept (and character is a main)', function () { return ({
                                                        char: char,
                                                        isMain: true,
                                                        number: playerNumber
                                                    }); })
                                                        .otherwise(function () { return null; });
                                                    if (choice == null) {
                                                        return [2 /*return*/, "continue"];
                                                    }
                                                    playerChoices.push(choice);
                                                    return [2 /*return*/, "break"];
                                            }
                                        });
                                    };
                                    _g.label = 1;
                                case 1:
                                    if (!true) return [3 /*break*/, 3];
                                    return [5 /*yield**/, _loop_2()];
                                case 2:
                                    state_1 = _g.sent();
                                    if (state_1 === "break")
                                        return [3 /*break*/, 3];
                                    return [3 /*break*/, 1];
                                case 3:
                                    console.log('\n');
                                    return [2 /*return*/];
                            }
                        });
                    };
                    _i = 0, _a = (0, fp_1.shuffle)((0, fp_1.range)(1, 5));
                    _f.label = 1;
                case 1:
                    if (!(_i < _a.length)) return [3 /*break*/, 4];
                    playerNumber = _a[_i];
                    return [5 /*yield**/, _loop_1(playerNumber)];
                case 2:
                    _f.sent();
                    _f.label = 3;
                case 3:
                    _i++;
                    return [3 /*break*/, 1];
                case 4:
                    console.log('Chosen characters are:');
                    for (_b = 0, playerChoices_1 = playerChoices; _b < playerChoices_1.length; _b++) {
                        _c = playerChoices_1[_b], char = _c.char, number = _c.number;
                        console.log("".concat(formatPlayer(number), ": ").concat(formatChar(char)));
                    }
                    return [2 /*return*/];
            }
        });
    }); });
    extra_typings_1.program.name('genshin-party-roller').parse();
}
var getChars = (0, fp_1.memoize)(function (rarity) { return genshin_db_1.default
    .characters('names', { matchCategories: true, verboseCategories: true })
    .map((0, fp_1.pick)(['elementType', 'name', 'rarity']))
    .filter(function (_) {
    switch (rarity) {
        case '4':
        case '5':
            return _.rarity === Number(rarity);
        default:
            return true;
    }
})
    .filter(function (_) { return _.name !== 'Aether'; }); });
var formatChar = function (char) {
    var formatFn = (function () {
        switch (char.elementType) {
            case 'ELEMENT_ANEMO':
                return chalk_1.default.rgb(117, 194, 168);
            case 'ELEMENT_CRYO':
                return chalk_1.default.rgb(160, 215, 228);
            case 'ELEMENT_DENDRO':
                return chalk_1.default.rgb(165, 200, 56);
            case 'ELEMENT_ELECTRO':
                return chalk_1.default.rgb(176, 143, 194);
            case 'ELEMENT_GEO':
                return chalk_1.default.rgb(249, 182, 46);
            case 'ELEMENT_HYDRO':
                return chalk_1.default.rgb(75, 195, 241);
            case 'ELEMENT_PYRO':
                return chalk_1.default.rgb(239, 122, 53);
            default:
                return chalk_1.default.white;
        }
    })();
    return formatFn(char.name);
};
var formatPlayer = function (playerNumber) { return chalk_1.default.italic("Player ".concat(chalk_1.default.rgb(251, 217, 148)(playerNumber))); };
main();
