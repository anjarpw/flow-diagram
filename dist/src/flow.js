"use strict";
var __awaiter = (this && this.__awaiter) || function(thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function(resolve) { resolve(value); }); }
    return new(P || (P = Promise))(function(resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }

        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }

        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateFlow = exports.When = exports.PostEvaluationCriteria = exports.Mergeable = exports.Flow = void 0;
class Flow {
    constructor(triggeringFunc) {
        this.triggeringFunc = triggeringFunc;
    }
    continuedBy(func) {
        return new Flow((start, ctx) => __awaiter(this, void 0, void 0, function*() {
            try {
                const x = yield this.triggeringFunc(start, ctx);
                if (x.action !== "CONTINUED") {
                    return x;
                }
                const nextResult = yield func(x.result, ctx);
                return {
                    result: nextResult,
                    action: "CONTINUED"
                };
            } catch (e) {
                return {
                    error: new Error(e),
                    action: "ERROR"
                };
            }
        }));
    }
    continued() {
        return new When(this.triggeringFunc, (isCriteriaMet, prev) => __awaiter(this, void 0, void 0, function*() {
            if (isCriteriaMet) {
                return prev;
            }
            return {
                action: "STOPPED",
            };
        }));
    }
    stopped() {
        return new When(this.triggeringFunc, (isCriteriaMet, prev) => __awaiter(this, void 0, void 0, function*() {
            if (isCriteriaMet) {
                return {
                    action: "STOPPED",
                };
            }
            return prev;
        }));
    }
    alteredTo(flow) {
        return new When(this.triggeringFunc, (isCriteriaMet, prev, ctx) => __awaiter(this, void 0, void 0, function*() {
            if (isCriteriaMet) {
                const result = yield flow.startWith(prev.result, ctx);
                return {
                    action: "ALTERED",
                    result
                };
            }
            return prev;
        }));
    }
    alteredToAnyOf(flows) {
        return new PostEvaluationCriteria(this.triggeringFunc, (criteria, prev, ctx) => __awaiter(this, void 0, void 0, function*() {
            if (criteria && flows[criteria]) {
                const result = yield flows[criteria].startWith(prev.result, ctx);
                return {
                    action: "ALTERED",
                    result
                };
            }
            return prev;
        }));
    }
    steppingInto(flow) {
        return new When(this.triggeringFunc, (isCriteriaMet, prev, ctx) => __awaiter(this, void 0, void 0, function*() {
            if (isCriteriaMet) {
                return yield flow.evaluate(prev.result, ctx);
            }
            return prev;
        }));
    }
    steppingIntoAnyOf(flows) {
        return new PostEvaluationCriteria(this.triggeringFunc, (criteria, prev, ctx) => __awaiter(this, void 0, void 0, function*() {
            if (criteria && flows[criteria]) {
                return yield flows[criteria].evaluate(prev.result, ctx);
            }
            return prev;
        }));
    }
    evaluate(start, ctx) {
        return __awaiter(this, void 0, void 0, function*() {
            return yield this.triggeringFunc(start, ctx);
        });
    }
    startWith(start, ctx) {
        return __awaiter(this, void 0, void 0, function*() {
            const x = yield this.triggeringFunc(start, ctx);
            if (x.action === "CONTINUED" || x.action == "ALTERED") {
                return x.result;
            }
            if (x.action === "ERROR") {
                throw x.error;
            }
            if (x.action === "STOPPED") {
                throw new Error("FLOW HAS BEEN STOPPED");
            }
            return null;
        });
    }
    splittedInto(flows) {
        return new Mergeable(this.triggeringFunc, flows);
    }
}
exports.Flow = Flow;
class Mergeable {
    constructor(triggeringFunc, flows) {
        this.triggeringFunc = triggeringFunc;
        this.flows = flows;
    }
    onMerge(func) {
        return new Flow((start, ctx) => __awaiter(this, void 0, void 0, function*() {
            try {
                const x = yield this.triggeringFunc(start, ctx);
                if (x.action !== "CONTINUED") {
                    return x;
                }
                const promises = {};
                Object.keys(this.flows).forEach(key => {
                    promises[key] = this.flows[key].startWith(x.result, ctx);
                });
                const result = yield func(promises, ctx);
                return {
                    result,
                    action: "CONTINUED"
                };
            } catch (e) {
                return {
                    error: new Error(e),
                    action: "ERROR"
                };
            }
        }));
    }
}
exports.Mergeable = Mergeable;
class PostEvaluationCriteria {
    constructor(triggeringFunc, onCriteriaConcluded) {
        this.triggeringFunc = triggeringFunc;
        this.onCriteriaConcluded = onCriteriaConcluded;
    }
    basedOn(func) {
        return new Flow((start, ctx) => __awaiter(this, void 0, void 0, function*() {
            try {
                const x = yield this.triggeringFunc(start, ctx);
                if (x.action !== "CONTINUED") {
                    return x;
                }
                const criteria = yield func(x.result);
                return yield this.onCriteriaConcluded(criteria, x, ctx);
            } catch (e) {
                return {
                    error: new Error(e),
                    action: "ERROR"
                };
            }
        }));
    }
}
exports.PostEvaluationCriteria = PostEvaluationCriteria;
class When extends PostEvaluationCriteria {
    when(func) {
        return this.basedOn(func);
    }
}
exports.When = When;

function generateFlow() {
    return new Flow((result, ctx) => Promise.resolve({
        result,
        action: "CONTINUED"
    }));
}
exports.generateFlow = generateFlow;
//# sourceMappingURL=flow.js.map