/**
 * @file 表达式计算
 * @author errorrik(errorrik@gmail.com)
 */

var ExprType = require('../parser/expr-type');
var DEFAULT_FILTERS = require('./default-filters');
var escapeHTML = require('./escape-html');
var evalArgs = require('./eval-args');
var dataCache = require('./data-cache');

/**
 * 计算表达式的值
 *
 * @param {Object} expr 表达式对象
 * @param {Data} data 数据容器对象
 * @param {Component=} owner 所属组件环境
 * @param {boolean?} escapeInterpHtml 是否对插值进行html转义
 * @return {*}
 */
function evalExpr(expr, data, owner, escapeInterpHtml) {
    if (expr.value != null) {
        return expr.value;
    }

    var value = dataCache.get(data, expr);

    if (value == null) {
        switch (expr.type) {
            case ExprType.UNARY:
                value = !evalExpr(expr.expr, data, owner);
                break;

            case ExprType.BINARY:
                var leftValue = evalExpr(expr.segs[0], data, owner);
                var rightValue = evalExpr(expr.segs[1], data, owner);

                /* eslint-disable eqeqeq */
                switch (expr.operator) {
                    case 37:
                        value = leftValue % rightValue;
                        break;
                    case 43:
                        value = leftValue + rightValue;
                        break;
                    case 45:
                        value = leftValue - rightValue;
                        break;
                    case 42:
                        value = leftValue * rightValue;
                        break;
                    case 47:
                        value = leftValue / rightValue;
                        break;
                    case 60:
                        value = leftValue < rightValue;
                        break;
                    case 62:
                        value = leftValue > rightValue;
                        break;
                    case 76:
                        value = leftValue && rightValue;
                        break;
                    case 94:
                        value = leftValue != rightValue;
                        break;
                    case 121:
                        value = leftValue <= rightValue;
                        break;
                    case 122:
                        value = leftValue == rightValue;
                        break;
                    case 123:
                        value = leftValue >= rightValue;
                        break;
                    case 155:
                        value = leftValue !== rightValue;
                        break;
                    case 183:
                        value = leftValue === rightValue;
                        break;
                    case 248:
                        value = leftValue || rightValue;
                        break;
                }
                /* eslint-enable eqeqeq */
                break;

            case ExprType.TERTIARY:
                value = evalExpr(
                    expr.segs[evalExpr(expr.segs[0], data, owner) ? 1 : 2],
                    data,
                    owner
                );
                break;

            case ExprType.ACCESSOR:
                value = data.get(expr);
                break;

            case ExprType.INTERP:
                value = evalExpr(expr.expr, data, owner);

                if (owner) {
                    for (var i = 0, l = expr.filters.length; i < l; i++) {
                        var filter = expr.filters[i];

                        /* eslint-disable no-use-before-define */
                        var filterName = filter.name.paths[0].value;
                        var filterFn = owner.filters[filterName] || DEFAULT_FILTERS[filterName];
                        /* eslint-enable no-use-before-define */

                        if (typeof filterFn === 'function') {
                            value = filter.args.length
                                ? filterFn.apply(owner, [value].concat(evalArgs(filter.args, data, owner)))
                                : filterFn.call(owner, value);
                        }
                    }
                }

                if (value == null) {
                    value = '';
                }

                break;

            /* eslint-disable no-redeclare */
            case ExprType.TEXT:
                var buf = '';
                for (var i = 0, l = expr.segs.length; i < l; i++) {
                    var seg = expr.segs[i];
                    buf += seg.value || evalExpr(seg, data, owner, escapeInterpHtml);
                }
                return buf;
        }

        dataCache.set(data, expr, value);
    }

    if (expr.type === ExprType.INTERP && escapeInterpHtml && !expr.original) {
        value = escapeHTML(value);
    }

    return value;
}

exports = module.exports = evalExpr;
