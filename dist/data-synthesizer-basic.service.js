var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { BehaviorSubject } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { DataSynthUtil } from './data-synth-util';
import * as _ from 'lodash';
import { LoremIpsum } from 'lorem-ipsum';
import { PrngEnscriptenModule, PrngWasmByteArray } from 'prng-wasm';
export class DataSynthesizerServiceBasic {
    constructor() {
        this.wasmReady = new BehaviorSubject(false);
        this.msecInDay = 1000 * 60 * 60 * 24;
        this.holdAutoIncrementId = 1;
        const url = 'assets/prng-wasm.wasm';
        this.instantiateWasm(url);
    }
    getRndDateTimeTodayInPast(randomVariate, forceBusinessHours) {
        let d = new Date();
        let hours = 0;
        const currHour = d.getHours();
        if (forceBusinessHours) {
            hours = Math.round((randomVariate * 8) + 8);
        }
        else {
            hours = Math.round(randomVariate * currHour);
        }
        d.setSeconds(Math.round(randomVariate * 60));
        d.setHours(hours);
        d.setMinutes(Math.round(randomVariate * 60));
        return (forceBusinessHours && (hours > currHour)) ? null : d;
    }
    getRndDateInPast(minDaysAgo, maxDaysAgo, exactDays, randomVariate) {
        const currDateMs = new Date().getTime();
        const msInDays = this.msecInDay * (maxDaysAgo - minDaysAgo);
        const msInDaysMin = this.msecInDay * minDaysAgo;
        let rndMs = 0;
        if (exactDays) {
            rndMs = msInDays;
        }
        else {
            rndMs = Math.round(randomVariate * msInDays);
        }
        return new Date(currDateMs - rndMs - msInDaysMin);
    }
    getRndDateInFuture(minDaysAhead, maxDaysAhead, exactDays, randomVariate) {
        return this.getRndDateInPast(-1 * minDaysAhead, -1 * maxDaysAhead, exactDays, randomVariate);
    }
    setSeed(seed) {
        return this.wasmReady.pipe(filter(value => value === true)).pipe(map(() => {
            this.module._setSeed(seed);
            return true;
        }));
    }
    instantiateWasm(url) {
        return __awaiter(this, void 0, void 0, function* () {
            const binary = new Uint8Array(PrngWasmByteArray);
            const moduleArgs = {
                wasmBinary: binary,
                onRuntimeInitialized: () => {
                    this.wasmReady.next(true);
                },
            };
            this.module = PrngEnscriptenModule(moduleArgs);
        });
    }
    generateObject(config) {
        let dataset = [];
        let i = 0;
        let j = 0;
        let k = 0;
        let m = 0;
        const me = this;
        let holdTmpVals = [];
        let tmpRnd;
        const lorem = new LoremIpsum({
            sentencesPerParagraph: {
                max: 8,
                min: 5
            },
            wordsPerSentence: {
                max: 16,
                min: 6
            },
        });
        const assignDatasetVals = (recIdx, configFieldIdx, type) => {
            if (Array.isArray(config.fields[configFieldIdx].name)) {
                for (k = 0; k < config.fields[configFieldIdx].name.length; k++) {
                    if (config.fields[configFieldIdx].name[k].indexOf(':') > -1) {
                        const tmp = config.fields[configFieldIdx].name[k].split(':');
                        if (config.fields[configFieldIdx].listObjectFieldName) {
                            if (type === DataSynthUtil.N_RANDOM_ITEMS_FROM_LIST) {
                                dataset[recIdx][tmp[0]] = [];
                                for (m = 0; m < holdTmpVals[configFieldIdx][recIdx].length; m++) {
                                    dataset[recIdx][tmp[0]].push(config.valueFormattingFunctions[tmp[1]](config.fields[configFieldIdx].list[holdTmpVals[configFieldIdx][recIdx][m]][config.fields[configFieldIdx].listObjectFieldName[k]]));
                                }
                            }
                            if ((type === DataSynthUtil.RANDOM_LIST_WEIGHTED) || (type === DataSynthUtil.RANDOM_LIST_UNIFORM) || (type === DataSynthUtil.SEQUENCE_LIST)) {
                                dataset[recIdx][tmp[0]] = config.valueFormattingFunctions[tmp[1]](config.fields[configFieldIdx].list[holdTmpVals[configFieldIdx][recIdx]][config.fields[configFieldIdx].listObjectFieldName[k]]);
                            }
                        }
                        else {
                            if (type === DataSynthUtil.N_RANDOM_ITEMS_FROM_LIST) {
                                dataset[recIdx][tmp[0]] = [];
                                for (m = 0; m < holdTmpVals[configFieldIdx][recIdx].length; m++) {
                                    dataset[recIdx][tmp[0]].push(config.valueFormattingFunctions[tmp[1]](config.fields[configFieldIdx].list[holdTmpVals[configFieldIdx][recIdx][m]]));
                                }
                            }
                            if ((type === DataSynthUtil.RANDOM_LIST_WEIGHTED) || (type === DataSynthUtil.RANDOM_LIST_UNIFORM) || (type === DataSynthUtil.SEQUENCE_LIST)) {
                                dataset[recIdx][tmp[0]] = config.valueFormattingFunctions[tmp[1]](config.fields[configFieldIdx].list[holdTmpVals[configFieldIdx][recIdx]]);
                            }
                        }
                        if ((type === DataSynthUtil.RANDOM_NUMERIC_RANGE_UNIFORM) ||
                            (type === DataSynthUtil.RANDOM_NUMERIC_RANGE_NORMAL) ||
                            (type === DataSynthUtil.RANDOM_NUMERIC_RANGE_EXPONENTIAL) ||
                            (type === DataSynthUtil.DATE_IN_FUTURE_EXACT) ||
                            (type === DataSynthUtil.DATE_IN_FUTURE_RANGE) ||
                            (type === DataSynthUtil.DATE_IN_PAST_EXACT) ||
                            (type === DataSynthUtil.DATE_IN_PAST_RANGE)) {
                            dataset[recIdx][tmp[0]] = config.valueFormattingFunctions[tmp[1]](holdTmpVals[configFieldIdx][recIdx]);
                        }
                    }
                    else {
                        if (config.fields[configFieldIdx].listObjectFieldName) {
                            if (type === DataSynthUtil.N_RANDOM_ITEMS_FROM_LIST) {
                                dataset[recIdx][config.fields[configFieldIdx].name[k]] = [];
                                for (m = 0; m < holdTmpVals[configFieldIdx][recIdx].length; m++) {
                                    dataset[recIdx][config.fields[configFieldIdx].name[k]].push(config.fields[configFieldIdx].list[holdTmpVals[configFieldIdx][recIdx][m]][config.fields[configFieldIdx].listObjectFieldName[k]]);
                                }
                            }
                            if ((type === DataSynthUtil.RANDOM_LIST_WEIGHTED) || (type === DataSynthUtil.RANDOM_LIST_UNIFORM) || (type === DataSynthUtil.SEQUENCE_LIST)) {
                                dataset[recIdx][config.fields[configFieldIdx].name[k]] = config.fields[configFieldIdx].list[holdTmpVals[configFieldIdx][recIdx]][config.fields[configFieldIdx].listObjectFieldName[k]];
                            }
                        }
                        else {
                            if (type === DataSynthUtil.N_RANDOM_ITEMS_FROM_LIST) {
                                dataset[recIdx][config.fields[configFieldIdx].name[k]] = [];
                                for (m = 0; m < holdTmpVals[configFieldIdx][recIdx].length; m++) {
                                    dataset[recIdx][config.fields[configFieldIdx].name[k]].push(config.fields[configFieldIdx].list[holdTmpVals[configFieldIdx][recIdx][m]]);
                                }
                            }
                            if ((type === DataSynthUtil.RANDOM_LIST_WEIGHTED) || (type === DataSynthUtil.RANDOM_LIST_UNIFORM) || (type === DataSynthUtil.SEQUENCE_LIST)) {
                                dataset[recIdx][config.fields[configFieldIdx].name[k]] = config.fields[configFieldIdx].list[holdTmpVals[configFieldIdx][recIdx]];
                            }
                        }
                        if ((type === DataSynthUtil.RANDOM_NUMERIC_RANGE_UNIFORM) ||
                            (type === DataSynthUtil.RANDOM_NUMERIC_RANGE_NORMAL) ||
                            (type === DataSynthUtil.RANDOM_NUMERIC_RANGE_EXPONENTIAL) ||
                            (type === DataSynthUtil.DATE_IN_FUTURE_EXACT) ||
                            (type === DataSynthUtil.DATE_IN_FUTURE_RANGE) ||
                            (type === DataSynthUtil.DATE_IN_PAST_EXACT) ||
                            (type === DataSynthUtil.DATE_IN_PAST_RANGE)) {
                            dataset[recIdx][config.fields[configFieldIdx].name[k]] = holdTmpVals[configFieldIdx][recIdx];
                        }
                    }
                }
            }
            else {
                if (config.fields[configFieldIdx].name.indexOf(':') > -1) {
                    const tmp = config.fields[configFieldIdx].name.split(':');
                    if (type === DataSynthUtil.N_RANDOM_ITEMS_FROM_LIST) {
                        dataset[recIdx][tmp[0]] = [];
                        for (m = 0; m < holdTmpVals[configFieldIdx][recIdx].length; m++) {
                            dataset[recIdx][tmp[0]].push(config.valueFormattingFunctions[tmp[1]](config.fields[configFieldIdx].list[holdTmpVals[configFieldIdx][recIdx][m]]));
                        }
                    }
                    if ((type === DataSynthUtil.RANDOM_LIST_WEIGHTED) || (type === DataSynthUtil.RANDOM_LIST_UNIFORM) || (type === DataSynthUtil.SEQUENCE_LIST)) {
                        dataset[recIdx][tmp[0]] = config.valueFormattingFunctions[tmp[1]](config.fields[configFieldIdx].list[holdTmpVals[configFieldIdx][recIdx]]);
                    }
                    if ((type === DataSynthUtil.RANDOM_NUMERIC_RANGE_UNIFORM) ||
                        (type === DataSynthUtil.RANDOM_NUMERIC_RANGE_NORMAL) ||
                        (type === DataSynthUtil.RANDOM_NUMERIC_RANGE_EXPONENTIAL) ||
                        (type === DataSynthUtil.DATE_IN_FUTURE_EXACT) ||
                        (type === DataSynthUtil.DATE_IN_FUTURE_RANGE) ||
                        (type === DataSynthUtil.DATE_IN_PAST_EXACT) ||
                        (type === DataSynthUtil.DATE_IN_PAST_RANGE)) {
                        dataset[recIdx][tmp[0]] = config.valueFormattingFunctions[tmp[1]](holdTmpVals[configFieldIdx][recIdx]);
                    }
                }
                else {
                    if (type === DataSynthUtil.N_RANDOM_ITEMS_FROM_LIST) {
                        dataset[recIdx][config.fields[configFieldIdx].name] = [];
                        for (m = 0; m < holdTmpVals[configFieldIdx][recIdx].length; m++) {
                            dataset[recIdx][config.fields[configFieldIdx].name].push(config.fields[configFieldIdx].list[holdTmpVals[configFieldIdx][recIdx][m]]);
                        }
                    }
                    if ((type === DataSynthUtil.RANDOM_LIST_WEIGHTED) || (type === DataSynthUtil.RANDOM_LIST_UNIFORM) || (type === DataSynthUtil.SEQUENCE_LIST)) {
                        dataset[recIdx][config.fields[configFieldIdx].name] = config.fields[configFieldIdx].list[holdTmpVals[configFieldIdx][recIdx]];
                    }
                    if ((type === DataSynthUtil.RANDOM_NUMERIC_RANGE_UNIFORM) ||
                        (type === DataSynthUtil.RANDOM_NUMERIC_RANGE_NORMAL) ||
                        (type === DataSynthUtil.RANDOM_NUMERIC_RANGE_EXPONENTIAL) ||
                        (type === DataSynthUtil.DATE_IN_FUTURE_EXACT) ||
                        (type === DataSynthUtil.DATE_IN_FUTURE_RANGE) ||
                        (type === DataSynthUtil.DATE_IN_PAST_EXACT) ||
                        (type === DataSynthUtil.DATE_IN_PAST_RANGE)) {
                        dataset[recIdx][config.fields[configFieldIdx].name] = holdTmpVals[configFieldIdx][recIdx];
                    }
                }
            }
        };
        for (i = 0; i < config.recordsToGenerate; i++) {
            dataset.push({});
        }
        for (j = 0; j < config.fields.length; j++) {
            holdTmpVals.push({});
        }
        let temporaryFields = [];
        let calculatedFields = [];
        let a;
        for (j = 0; j < config.fields.length; j++) {
            if (config.fields[j].temporary) {
                temporaryFields.push(config.fields[j].name);
            }
            if (config.fields[j].type === DataSynthUtil.CALCULATED) {
                calculatedFields.push({ name: config.fields[j].name, calculatedOrder: config.fields[j].calculatedOrder || 999999, fieldIdx: j });
            }
            switch (config.fields[j].type) {
                case DataSynthUtil.RANDOM_NUMERIC_RANGE_UNIFORM:
                    holdTmpVals[j] = this.getUniform01DistributionVariatesInternal(config.recordsToGenerate);
                    if (config.fields[j].min && config.fields[j].max) {
                        for (a = 0; a < holdTmpVals[j].length; a++) {
                            holdTmpVals[j][a] = config.fields[j].min + holdTmpVals[j][a] * (config.fields[j].max - config.fields[j].min);
                        }
                    }
                    if (config.fields[j].decimalPlaces === 0) {
                        for (a = 0; a < holdTmpVals[j].length; a++) {
                            holdTmpVals[j][a] = Math.round(holdTmpVals[j][a]);
                        }
                    }
                    else {
                        if (config.fields[j].decimalPlaces) {
                            for (a = 0; a < holdTmpVals[j].length; a++) {
                                holdTmpVals[j][a] = _.round(holdTmpVals[j][a], config.fields[j].decimalPlaces);
                            }
                        }
                        else {
                        }
                    }
                    break;
                case DataSynthUtil.RANDOM_NUMERIC_RANGE_NORMAL:
                    holdTmpVals[j] = this.getNormalDistributionVariatesInternal(config.fields[j].mean, config.fields[j].stDev, config.recordsToGenerate);
                    if (config.fields[j].decimalPlaces === 0) {
                        for (a = 0; a < holdTmpVals[j].length; a++) {
                            holdTmpVals[j][a] = Math.round(holdTmpVals[j][a]);
                        }
                    }
                    else {
                        if (config.fields[j].decimalPlaces) {
                            for (a = 0; a < holdTmpVals[j].length; a++) {
                                holdTmpVals[j][a] = _.round(holdTmpVals[j][a], config.fields[j].decimalPlaces);
                            }
                        }
                        else {
                        }
                    }
                    break;
                case DataSynthUtil.RANDOM_NUMERIC_RANGE_LOGNORMAL:
                    holdTmpVals[j] = this.getLogNormalDistributionVariatesInternal(config.fields[j].mean, config.fields[j].stDev, true, config.recordsToGenerate);
                case DataSynthUtil.RANDOM_NUMERIC_RANGE_EXPONENTIAL:
                    holdTmpVals[j] = this.getExponentialDistributionVariatesInternal(config.fields[j].lambda, config.recordsToGenerate);
                    break;
                case DataSynthUtil.RANDOM_LIST_WEIGHTED:
                    holdTmpVals[j] = this.chooseRandomItemWeightedInternal(config.fields[j].weights, config.recordsToGenerate);
                    break;
                case DataSynthUtil.RANDOM_LIST_UNIFORM:
                    if (config.fields[j].ensureNoDuplicates) {
                        if (config.fields[j].list.length < config.recordsToGenerate) {
                            console.log("ERROR: error in RANDOM_LIST_UNIFORM item; list to pick from is smaller than number of records, and ensureNoDuplicates has been specified.");
                        }
                        let _tmpItems = this.chooseRandomItemsInternal(config.fields[j].list.length, config.recordsToGenerate, 1);
                        for (a = 0; a < _tmpItems[0].length; a++) {
                            holdTmpVals[j][a] = _tmpItems[0][a];
                        }
                    }
                    else {
                        holdTmpVals[j] = this.getRandomRangeInternal(0, config.fields[j].list.length - 1, config.recordsToGenerate);
                    }
                    break;
                case DataSynthUtil.DATE_IN_PAST_EXACT:
                    holdTmpVals[j] = [];
                    for (k = 0; k < config.recordsToGenerate; k++) {
                        holdTmpVals[j].push(this.getRndDateInPast(0, config.fields[j].daysAgo, true, 1));
                    }
                    break;
                case DataSynthUtil.DATE_IN_FUTURE_EXACT:
                    holdTmpVals[j] = [];
                    for (k = 0; k < config.recordsToGenerate; k++) {
                        holdTmpVals[j].push(this.getRndDateInFuture(0, config.fields[j].daysAhead, true, 1));
                    }
                    break;
                case DataSynthUtil.DATE_IN_PAST_RANGE:
                    holdTmpVals[j] = [];
                    tmpRnd = this.getUniform01DistributionVariatesInternal(config.recordsToGenerate);
                    for (k = 0; k < config.recordsToGenerate; k++) {
                        holdTmpVals[j].push(this.getRndDateInPast(config.fields[j].minDaysAgo, config.fields[j].maxDaysAgo, false, tmpRnd[k]));
                    }
                    break;
                case DataSynthUtil.TIME_TODAY_IN_PAST_RANGE:
                    holdTmpVals[j] = [];
                    tmpRnd = this.getUniform01DistributionVariatesInternal(config.recordsToGenerate);
                    for (k = 0; k < config.recordsToGenerate; k++) {
                        holdTmpVals[j].push(this.getRndDateTimeTodayInPast(config.fields[j].forceBusinessHours || false, tmpRnd[k]));
                    }
                    break;
                case DataSynthUtil.DATE_IN_FUTURE_RANGE:
                    holdTmpVals[j] = [];
                    tmpRnd = this.getUniform01DistributionVariatesInternal(config.recordsToGenerate);
                    for (k = 0; k < config.recordsToGenerate; k++) {
                        holdTmpVals[j].push(this.getRndDateInFuture(config.fields[j].minDaysAhead, config.fields[j].maxDaysAhead, false, tmpRnd[k]));
                    }
                    break;
                case DataSynthUtil.UNIQUE_ID_UUID:
                    holdTmpVals[j] = this.getUUidsInternal(config.recordsToGenerate);
                    break;
                case DataSynthUtil.UNIQUE_ID_AUTOINCREMENT:
                    tmpRnd = [];
                    for (k = 0; k < config.recordsToGenerate; k++) {
                        tmpRnd.push(this.holdAutoIncrementId);
                        this.holdAutoIncrementId++;
                    }
                    holdTmpVals[j] = tmpRnd;
                    break;
                case DataSynthUtil.N_RANDOM_ITEMS_FROM_LIST:
                    holdTmpVals[j] = this.chooseRandomItemsInternal(config.fields[j].list.length, config.fields[j].itemCount, config.recordsToGenerate);
                    break;
                case DataSynthUtil.SEQUENCE_LIST:
                    let cntr = 0;
                    tmpRnd = [];
                    for (k = 0; k < config.recordsToGenerate; k++) {
                        tmpRnd.push(cntr);
                        cntr++;
                        if (cntr >= config.fields[j].list.length) {
                            cntr = 0;
                        }
                    }
                    holdTmpVals[j] = tmpRnd.slice();
                    break;
                case DataSynthUtil.OBJECT:
                    break;
                case DataSynthUtil.LOREM_IPSUM:
                    tmpRnd = [];
                    let paragraphCounts = [];
                    if (!config.fields[j].singleSentence) {
                        paragraphCounts = this.getRandomRangeInternal(config.fields[j].minParagraphs, config.fields[j].maxParagraphs, config.recordsToGenerate);
                    }
                    for (k = 0; k < config.recordsToGenerate; k++) {
                        if (config.fields[j].singleSentence) {
                            tmpRnd.push(lorem.generateSentences(1));
                        }
                        else {
                            tmpRnd.push(lorem.generateParagraphs(paragraphCounts[k]));
                        }
                    }
                    holdTmpVals[j] = tmpRnd.slice();
                    break;
            }
        }
        for (i = 0; i < config.recordsToGenerate; i++) {
            for (j = 0; j < config.fields.length; j++) {
                switch (config.fields[j].type) {
                    case DataSynthUtil.OBJECT:
                        dataset[i][config.fields[j].name] = me.generateObject(config.fields[j].config);
                        break;
                    case DataSynthUtil.UNIQUE_ID_UUID:
                    case DataSynthUtil.UNIQUE_ID_AUTOINCREMENT:
                        dataset[i][config.fields[j].name] = holdTmpVals[j][i];
                        break;
                    case DataSynthUtil.RANDOM_NUMERIC_RANGE_UNIFORM:
                    case DataSynthUtil.RANDOM_NUMERIC_RANGE_NORMAL:
                    case DataSynthUtil.RANDOM_NUMERIC_RANGE_EXPONENTIAL:
                    case DataSynthUtil.DATE_IN_FUTURE_EXACT:
                    case DataSynthUtil.DATE_IN_FUTURE_RANGE:
                    case DataSynthUtil.DATE_IN_PAST_EXACT:
                    case DataSynthUtil.DATE_IN_PAST_RANGE:
                    case DataSynthUtil.RANDOM_LIST_WEIGHTED:
                    case DataSynthUtil.RANDOM_LIST_UNIFORM:
                    case DataSynthUtil.N_RANDOM_ITEMS_FROM_LIST:
                    case DataSynthUtil.SEQUENCE_LIST:
                        assignDatasetVals(i, j, config.fields[j].type);
                        break;
                    case DataSynthUtil.LOREM_IPSUM:
                        dataset[i][config.fields[j].name] = holdTmpVals[j][i];
                        break;
                }
            }
        }
        calculatedFields = _.orderBy(calculatedFields, ['calculatedOrder'], ['asc']);
        for (i = 0; i < config.recordsToGenerate; i++) {
            for (j = 0; j < calculatedFields.length; j++) {
                dataset[i][calculatedFields[j].name] = config.fields[calculatedFields[j].fieldIdx].fn(dataset[i], dataset, i);
            }
        }
        if (temporaryFields.length > 0) {
            for (i = 0; i < config.recordsToGenerate; i++) {
                for (j = 0; j < temporaryFields.length; j++) {
                    delete dataset[i][temporaryFields[j]];
                }
            }
        }
        return dataset.length === 1 ? dataset[0] : dataset;
    }
    generateDataset(config) {
        return this.wasmReady.pipe(filter(value => value === true)).pipe(map(() => {
            this.module._setSeed(config.seed);
            const dataset = this.generateObject(config);
            return dataset;
        }));
    }
    getSimpleNumericIds(min, max, count) {
        return this.wasmReady.pipe(filter(value => value === true)).pipe(map(() => {
            const offset = this.module._getSimpleNumericIds(min, max, count);
            const returnData = [];
            const typedOffset = offset / Int32Array.BYTES_PER_ELEMENT;
            for (let v = 0; v < count; v++) {
                returnData.push(this.module.HEAP32[typedOffset + v]);
            }
            return returnData;
        }));
    }
    getRandomRangeInternal(min, max, count) {
        const offset = this.module._getRandomRange(min, max, count);
        const returnData = [];
        const typedOffset = offset / Int32Array.BYTES_PER_ELEMENT;
        for (let v = 0; v < count; v++) {
            returnData.push(this.module.HEAP32[typedOffset + v]);
        }
        return returnData;
    }
    getRandomRange(min, max, count) {
        return this.wasmReady.pipe(filter(value => value === true)).pipe(map(() => {
            return this.getRandomRangeInternal(min, max, count);
        }));
    }
    getLogNormalDistributionVariatesInternal(mu, sigma, reinterpretParams, count) {
        const offset = this.module._getLogNormalDistributionVariates(mu, sigma, reinterpretParams, count);
        const returnData = [];
        for (let v = 0; v < count; v++) {
            returnData.push(this.module.HEAPF64[(offset / Float64Array.BYTES_PER_ELEMENT) + v]);
        }
        return returnData;
    }
    getLogNormalDistributionVariates(mu, sigma, reinterpretParams, count) {
        return this.wasmReady.pipe(filter(value => value === true)).pipe(map(() => {
            return this.getLogNormalDistributionVariatesInternal(mu, sigma, reinterpretParams, count);
        }));
    }
    getNormalDistributionVariatesInternal(mean, stDev, count) {
        const offset = this.module._getNormalDistributionVariates(mean, stDev, count);
        const returnData = [];
        for (let v = 0; v < count; v++) {
            returnData.push(this.module.HEAPF64[(offset / Float64Array.BYTES_PER_ELEMENT) + v]);
        }
        return returnData;
    }
    getNormalDistributionVariates(mean, stDev, count) {
        return this.wasmReady.pipe(filter(value => value === true)).pipe(map(() => {
            return this.getNormalDistributionVariatesInternal(mean, stDev, count);
        }));
    }
    getExponentialDistributionVariatesInternal(lambda, count) {
        const offset = this.module._getExponentialDistributionVariates(lambda, count);
        const returnData = [];
        for (let v = 0; v < count; v++) {
            returnData.push(this.module.HEAPF64[(offset / Float64Array.BYTES_PER_ELEMENT) + v]);
        }
        return returnData;
    }
    getExponentialDistributionVariates(lambda, count) {
        return this.wasmReady.pipe(filter(value => value === true)).pipe(map(() => {
            return this.getExponentialDistributionVariatesInternal(lambda, count);
        }));
    }
    getUniform01DistributionVariatesInternal(count) {
        const offset = this.module._getUniform01DistributionVariates(count);
        const returnData = [];
        for (let v = 0; v < count; v++) {
            returnData.push(this.module.HEAPF64[(offset / Float64Array.BYTES_PER_ELEMENT) + v]);
        }
        return returnData;
    }
    getUniform01DistributionVariates(count) {
        return this.wasmReady.pipe(filter(value => value === true)).pipe(map(() => {
            return this.getUniform01DistributionVariatesInternal(count);
        }));
    }
    getUUidsInternal(count) {
        const offset = this.module._getUuids(count);
        let returnData = [];
        const idStringSize = 36;
        const typedOffset = (offset / Uint8Array.BYTES_PER_ELEMENT);
        let tmp = [];
        for (let i = 0; i < (count * idStringSize); i += idStringSize) {
            tmp = this.module.HEAPU8.slice(typedOffset + i, typedOffset + i + idStringSize);
            returnData.push(_.map(tmp, c => String.fromCharCode(c)).join(''));
        }
        return returnData;
    }
    getUuids(count) {
        return this.wasmReady.pipe(filter(value => value === true)).pipe(map(() => {
            return this.getUUidsInternal(count);
        }));
    }
    makeIdsForStrings(items) {
        return this.wasmReady.pipe(filter(value => value === true)).pipe(map(() => {
            let returnData = [];
            const itemStr = items.join('\x5e');
            const typedArray = new Uint8Array(itemStr.length);
            for (let i = 0; i < itemStr.length; i++) {
                typedArray[i] = itemStr.charCodeAt(i);
            }
            const itemsBuffer = this.module._malloc(typedArray.length * Uint8Array.BYTES_PER_ELEMENT);
            this.module['HEAPU8'].set(typedArray, itemsBuffer / Uint8Array.BYTES_PER_ELEMENT);
            const offset = this.module._makeIdsForStrings(itemsBuffer, items.length, 94);
            const typedOffset = offset / Int32Array.BYTES_PER_ELEMENT;
            for (let v = 0; v < items.length; v++) {
                returnData.push(this.module.HEAP32[typedOffset + v]);
            }
            return returnData;
        }));
    }
    chooseRandomItemWeightedInternal(weights, valueCount) {
        let returnData = [];
        let weightsBuffer;
        try {
            const typedArray = new Float64Array(weights.length);
            for (let i = 0; i < weights.length; i++) {
                typedArray[i] = weights[i];
            }
            weightsBuffer = this.module._malloc(typedArray.length * Float64Array.BYTES_PER_ELEMENT);
            this.module['HEAPF64'].set(typedArray, weightsBuffer / Float64Array.BYTES_PER_ELEMENT);
            const offset = this.module._chooseRandomItemWeighted(weightsBuffer, weights.length, valueCount);
            const typedOffset = (offset / Int32Array.BYTES_PER_ELEMENT);
            for (let v = 0; v < valueCount; v++) {
                returnData.push(this.module.HEAP32[typedOffset + v]);
            }
        }
        catch (e) {
            console.log('error', e);
        }
        finally {
            this.module._free(weightsBuffer);
        }
        return returnData;
    }
    chooseRandomItemWeighted(weights, valueCount) {
        return this.wasmReady.pipe(filter(value => value === true)).pipe(map(() => {
            return this.chooseRandomItemWeightedInternal(weights, valueCount);
        }));
    }
    getCharacterIds(count) {
        return this.wasmReady.pipe(filter(value => value === true)).pipe(map(() => {
            const offset = this.module._getCharacterIds(count);
            let returnData = [];
            const idStringSize = 4;
            const typedOffset = (offset / Uint8Array.BYTES_PER_ELEMENT);
            let tmp = [];
            for (let i = 0; i < (count * idStringSize); i += idStringSize) {
                tmp = this.module.HEAPU8.slice(typedOffset + i, typedOffset + i + idStringSize);
                returnData.push(_.map(tmp, c => String.fromCharCode(c)).join(''));
            }
            return returnData;
        }));
    }
    chooseRandomItems(sourceArraySize, itemsToPick, valueSetCount) {
        return this.wasmReady.pipe(filter(value => value === true)).pipe(map(() => {
            return this.chooseRandomItemsInternal(sourceArraySize, itemsToPick, valueSetCount);
        }));
    }
    chooseRandomItemsInternal(sourceArraySize, itemsToPick, valueSetCount) {
        const offset = this.module._chooseRandomItems(sourceArraySize, itemsToPick, valueSetCount);
        const returnData = [];
        let cntr = -1;
        const typedOffset = (offset / Int32Array.BYTES_PER_ELEMENT);
        for (let i = 0; i < valueSetCount; i++) {
            returnData[i] = [];
            for (let v = 0; v < itemsToPick; v++) {
                cntr++;
                returnData[i].push(this.module.HEAP32[typedOffset + cntr]);
            }
        }
        return returnData;
    }
}
