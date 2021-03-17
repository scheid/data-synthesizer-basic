

import { BehaviorSubject } from 'rxjs';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { DataSynthUtil } from './data-synth-util';
import * as _ from 'lodash';

import { LoremIpsum } from 'lorem-ipsum';


// NOTE: this is the same as the angular service, but with all angular dependencies removed, to use in plain js projects like React.
// When you update or make edits, probably best to edit the angular service, then copy that file here, and remove angular dep. and
// rename class to DataSynthesizerServiceBasic

// NOTE: when you regenerate the prng-wasm.js file (i.e., by recompiling the wasm file with emscripten),
// you will need to edit this line at the top of the generated js:
//  var _scriptDir;// = import.meta.url; -> comment out import.meta.url;
//  import.meta is not recognized when importing into angular this way.

// NOTE: prng-wasm is an npm package, that you need to install via npm install.
import {PrngEnscriptenModule, PrngWasmByteArray} from 'prng-wasm';


// TODO: Field types to add:  CONSTANT, and integer range

export class DataSynthesizerServiceBasic {

  module: any;
  wasmReady = new BehaviorSubject<boolean>(false);
  msecInDay = 1000 * 60 * 60 * 24;  // milliseconds in a day.

  holdAutoIncrementId: number;


  // accept seed value from injected value, if present.
  constructor() {

    this.holdAutoIncrementId = 1;

    const url = 'assets/prng-wasm.wasm';
    this.instantiateWasm(url);

  }



  // get a date that is today's date with a random time.
  // if you forcebusiness hours and current time is before business hours, will return null;
  public getRndDateTimeTodayInPast(randomVariate: number, forceBusinessHours: boolean) {

    let d = new Date();

    // choose rnd # between 0 and hours value.
    let hours = 0;
    const currHour = d.getHours();

    if (forceBusinessHours) {
      hours = Math.round((randomVariate * 8) + 8);
    } else {
      hours = Math.round(randomVariate * currHour);
    }

    d.setSeconds(Math.round(randomVariate * 60));
    d.setHours(hours);
    d.setMinutes(Math.round(randomVariate * 60));

    return (forceBusinessHours && (hours > currHour)) ? null : d;

  }

  // returns a date object in the past; if exactDays is false, then a random date up to max days ago is returned;
  //  if exactDays is true, then a non-random date is returned that is exactly maxDaysAgo in the past
  // NOTE: you could also achieve the same effect as exactDays by passing in a 1 for randomVariate.
  // TODO: option to force time to be during business hours.; also force date to be during week, or weekend, etc.
  public getRndDateInPast(minDaysAgo: number, maxDaysAgo: number, exactDays: boolean, randomVariate: number): Date {
    const currDateMs = new Date().getTime();

    const msInDays = this.msecInDay * (maxDaysAgo - minDaysAgo);
    const msInDaysMin = this.msecInDay *  minDaysAgo;
    let rndMs = 0;

    if (exactDays) {
      rndMs = msInDays;
    } else {
      rndMs = Math.round(randomVariate * msInDays);
    }

    return new Date(currDateMs - rndMs - msInDaysMin); // .setTime(currDateMs - rndMs);
  }


  // same as above but for future dates.
  public getRndDateInFuture(minDaysAhead: number, maxDaysAhead: number, exactDays: boolean, randomVariate: number): Date {
    return this.getRndDateInPast(-1 * minDaysAhead, -1 * maxDaysAhead, exactDays, randomVariate);
  }

  // manually set the seed; you only need to use this if you are using the lower level random number functions. the generatedataset
  // function sets the seed as part of its generation.
  public setSeed(seed: number): Observable<boolean> {
    return this.wasmReady.pipe(filter(value => value === true)).pipe(
      map( () => {
        this.module._setSeed(seed);
        return true;
      } )

    ) ;


  }


  private async instantiateWasm(url: string) {

    // fetch the wasm file, then convert it into a binary array
 //   const wasmFile = await fetch(url);
 //   const buffer = await wasmFile.arrayBuffer();
 //   const binary = new Uint8Array(buffer);

    // use an inline wasm byte array directly, instead of fetching an external wasm file.
    const binary = new Uint8Array(PrngWasmByteArray);

    // NOTE: if you already have the byte array (i.e., inlined in a js file), then you can feed that in to the init obj
    // for the wasmBinary value. if your byte array is named wasmBytes, for example, the 'wasmBinary' value below
    // could either be just 'wasmBytes', or could be 'new Uint8Array(wasmBytes)'

    const moduleArgs = {
      wasmBinary: binary,
      onRuntimeInitialized: () => {

   //     console.log('runtime initialized fired');
        this.wasmReady.next(true);

    //    console.log('module functions', this.module.asm);
      },
    };

    // instantiate the module
    this.module = PrngEnscriptenModule(moduleArgs);


  }


  // generates data for a single hierarchical level; nested/child data objects will recursively call this.
  private generateObject(config): any[] {

    let dataset = [];
    let i = 0;
    let j = 0;
    let k = 0;
    let m = 0;
    const me = this;
    let holdTmpVals = [];
    let tmpRnd: any[];

    const lorem = new LoremIpsum({
      sentencesPerParagraph: {
        max: 8,
        min: 5
      },
      wordsPerSentence: {
        max: 16,
        min: 6
      },
  //    random:  (put prng function here that returns the number 0.0 - 1.0)
   //   seed
    });


    // local convenience function for assigning values for most of the types.
    const assignDatasetVals = (recIdx: number, configFieldIdx: number, type: any) => {

      // are the fields specified as an array?
      if (Array.isArray(config.fields[configFieldIdx].name)) {

        for (k = 0; k < config.fields[configFieldIdx].name.length; k++) {

          // is there a value formatting  function specified? (presence of colon implies there is)
          if (config.fields[configFieldIdx].name[k].indexOf(':') > -1) {

            // first array el is field name, second is formatting function.
            const tmp = config.fields[configFieldIdx].name[k].split(':');

            // for list assignment; the holdTmpVals values each represents an array index.
            // is listObjectFieldName specified?
            if (config.fields[configFieldIdx].listObjectFieldName) {

              if (type === DataSynthUtil.N_RANDOM_ITEMS_FROM_LIST) {
                  dataset[recIdx][tmp[0]] = [];
                  for (m = 0; m < holdTmpVals[configFieldIdx][recIdx].length; m++) {
                    dataset[recIdx][tmp[0]].push( config.valueFormattingFunctions[tmp[1]](config.fields[configFieldIdx].list[holdTmpVals[configFieldIdx][recIdx][m]][config.fields[configFieldIdx].listObjectFieldName[k]]) );
                  }
              }

              if ((type === DataSynthUtil.RANDOM_LIST_WEIGHTED) || (type === DataSynthUtil.RANDOM_LIST_UNIFORM) || (type === DataSynthUtil.SEQUENCE_LIST)) {
                dataset[recIdx][tmp[0]] = config.valueFormattingFunctions[tmp[1]](config.fields[configFieldIdx].list[holdTmpVals[configFieldIdx][recIdx]][config.fields[configFieldIdx].listObjectFieldName[k]]);
              }
            } else {

              if (type === DataSynthUtil.N_RANDOM_ITEMS_FROM_LIST) {
                dataset[recIdx][tmp[0]] = [];
                for (m = 0; m < holdTmpVals[configFieldIdx][recIdx].length; m++) {
                  dataset[recIdx][tmp[0]].push( config.valueFormattingFunctions[tmp[1]](config.fields[configFieldIdx].list[holdTmpVals[configFieldIdx][recIdx][m]]) );
                }
              }

              // if no list object field is specified, then assign entire array element
              if ((type === DataSynthUtil.RANDOM_LIST_WEIGHTED) || (type === DataSynthUtil.RANDOM_LIST_UNIFORM) || (type === DataSynthUtil.SEQUENCE_LIST)) {
                dataset[recIdx][tmp[0]] = config.valueFormattingFunctions[tmp[1]](config.fields[configFieldIdx].list[holdTmpVals[configFieldIdx][recIdx]]);
              }
            }

            // for these, can directly assign holdTmpVals to the field value.
            // this case really doesn't make sense; an array of fields would really only be used when using source lists that are arrays of objects
            // this will work, but will assign the exact same random value to all fields in the array.
            if ( (type === DataSynthUtil.RANDOM_NUMERIC_RANGE_UNIFORM) ||
              (type === DataSynthUtil.RANDOM_NUMERIC_RANGE_NORMAL) ||
              (type === DataSynthUtil.RANDOM_NUMERIC_RANGE_EXPONENTIAL) ||
              (type === DataSynthUtil.DATE_IN_FUTURE_EXACT) ||
              (type === DataSynthUtil.DATE_IN_FUTURE_RANGE) ||
              (type === DataSynthUtil.DATE_IN_PAST_EXACT) ||
              (type === DataSynthUtil.DATE_IN_PAST_RANGE)
            ) {
              dataset[recIdx][tmp[0]] = config.valueFormattingFunctions[tmp[1]](holdTmpVals[configFieldIdx][recIdx]);
            }

          } else {  // else if no formatting function specified


            // is listObjectFieldName specified?
            if (config.fields[configFieldIdx].listObjectFieldName) {

              if (type === DataSynthUtil.N_RANDOM_ITEMS_FROM_LIST) {
                dataset[recIdx][config.fields[configFieldIdx].name[k]] = [];
                for (m = 0; m < holdTmpVals[configFieldIdx][recIdx].length; m++) {
                  dataset[recIdx][config.fields[configFieldIdx].name[k]].push( config.fields[configFieldIdx].list[holdTmpVals[configFieldIdx][recIdx][m]][config.fields[configFieldIdx].listObjectFieldName[k]] );
                }
              }

              if ((type === DataSynthUtil.RANDOM_LIST_WEIGHTED) || (type === DataSynthUtil.RANDOM_LIST_UNIFORM) || (type === DataSynthUtil.SEQUENCE_LIST)) {
                dataset[recIdx][config.fields[configFieldIdx].name[k]] = config.fields[configFieldIdx].list[holdTmpVals[configFieldIdx][recIdx]][config.fields[configFieldIdx].listObjectFieldName[k]];
              }
            } else {

              if (type === DataSynthUtil.N_RANDOM_ITEMS_FROM_LIST) {
                dataset[recIdx][config.fields[configFieldIdx].name[k]] = [];
                for (m = 0; m < holdTmpVals[configFieldIdx][recIdx].length; m++) {
                  dataset[recIdx][config.fields[configFieldIdx].name[k]].push( config.fields[configFieldIdx].list[holdTmpVals[configFieldIdx][recIdx][m]] );
                }
              }

              // if no list object field is specified, then assign entire list array element to the field
              if ((type === DataSynthUtil.RANDOM_LIST_WEIGHTED) || (type === DataSynthUtil.RANDOM_LIST_UNIFORM) || (type === DataSynthUtil.SEQUENCE_LIST)) {
                dataset[recIdx][config.fields[configFieldIdx].name[k]] = config.fields[configFieldIdx].list[holdTmpVals[configFieldIdx][recIdx]];
              }
            }




            // for these, can directly assign holdTmpVals to the field value.
            // this case really doesn't make sense; an array of fields would really only be used when using source lists that are arrays of objects
            // this will work, but will assign the exact same random value to all fields in the array.
            if ( (type === DataSynthUtil.RANDOM_NUMERIC_RANGE_UNIFORM) ||
              (type === DataSynthUtil.RANDOM_NUMERIC_RANGE_NORMAL) ||
              (type === DataSynthUtil.RANDOM_NUMERIC_RANGE_EXPONENTIAL) ||
              (type === DataSynthUtil.DATE_IN_FUTURE_EXACT) ||
              (type === DataSynthUtil.DATE_IN_FUTURE_RANGE) ||
              (type === DataSynthUtil.DATE_IN_PAST_EXACT) ||
              (type === DataSynthUtil.DATE_IN_PAST_RANGE)
            ) {
              dataset[recIdx][config.fields[configFieldIdx].name[k]] = holdTmpVals[configFieldIdx][recIdx];
            }




          }

        }

      } else {  // field value is single string, not an array

        // is there a value formatting  function specified? (presence of colon implies there is)
        if (config.fields[configFieldIdx].name.indexOf(':') > -1) {

          // first array el, tmp[0], is field name, second, tmp[1], is formatting function.
          const tmp = config.fields[configFieldIdx].name.split(':');

          if (type === DataSynthUtil.N_RANDOM_ITEMS_FROM_LIST) {
            dataset[recIdx][tmp[0]] = [];
            for (m = 0; m < holdTmpVals[configFieldIdx][recIdx].length; m++) {
              dataset[recIdx][tmp[0]].push( config.valueFormattingFunctions[tmp[1]](config.fields[configFieldIdx].list[holdTmpVals[configFieldIdx][recIdx][m]]) );
            }
          }

          // TODO: need err handling if fn not found/defined.
          // call formatting function
          if ((type === DataSynthUtil.RANDOM_LIST_WEIGHTED) || (type === DataSynthUtil.RANDOM_LIST_UNIFORM) || (type === DataSynthUtil.SEQUENCE_LIST)) {
            dataset[recIdx][tmp[0]] = config.valueFormattingFunctions[tmp[1]](config.fields[configFieldIdx].list[holdTmpVals[configFieldIdx][recIdx]]);
          }

          if ( (type === DataSynthUtil.RANDOM_NUMERIC_RANGE_UNIFORM) ||
            (type === DataSynthUtil.RANDOM_NUMERIC_RANGE_NORMAL) ||
            (type === DataSynthUtil.RANDOM_NUMERIC_RANGE_EXPONENTIAL) ||
            (type === DataSynthUtil.DATE_IN_FUTURE_EXACT) ||
            (type === DataSynthUtil.DATE_IN_FUTURE_RANGE) ||
            (type === DataSynthUtil.DATE_IN_PAST_EXACT) ||
            (type === DataSynthUtil.DATE_IN_PAST_RANGE)
          ) {
            dataset[recIdx][tmp[0]] = config.valueFormattingFunctions[tmp[1]](holdTmpVals[configFieldIdx][recIdx]);
          }

        } else {  // else if field value is not an array, and no formatting function.

          if (type === DataSynthUtil.N_RANDOM_ITEMS_FROM_LIST) {
            dataset[recIdx][config.fields[configFieldIdx].name] = [];
            for (m = 0; m < holdTmpVals[configFieldIdx][recIdx].length; m++) {
              dataset[recIdx][config.fields[configFieldIdx].name].push( config.fields[configFieldIdx].list[holdTmpVals[configFieldIdx][recIdx][m]] );
            }
          }

          if ((type === DataSynthUtil.RANDOM_LIST_WEIGHTED) || (type === DataSynthUtil.RANDOM_LIST_UNIFORM) || (type === DataSynthUtil.SEQUENCE_LIST)) {
            dataset[recIdx][config.fields[configFieldIdx].name] = config.fields[configFieldIdx].list[holdTmpVals[configFieldIdx][recIdx]];
          }

          if ( (type === DataSynthUtil.RANDOM_NUMERIC_RANGE_UNIFORM) ||
            (type === DataSynthUtil.RANDOM_NUMERIC_RANGE_NORMAL) ||
            (type === DataSynthUtil.RANDOM_NUMERIC_RANGE_EXPONENTIAL) ||
            (type === DataSynthUtil.DATE_IN_FUTURE_EXACT) ||
            (type === DataSynthUtil.DATE_IN_FUTURE_RANGE) ||
            (type === DataSynthUtil.DATE_IN_PAST_EXACT) ||
            (type === DataSynthUtil.DATE_IN_PAST_RANGE)
          ) {
            dataset[recIdx][config.fields[configFieldIdx].name] = holdTmpVals[configFieldIdx][recIdx];
          }






        }

      }
    };   // end assignDatasetVals


    for (i = 0; i < config.recordsToGenerate; i++) {
      dataset.push({});
    }

    for (j = 0; j < config.fields.length; j++) {
      holdTmpVals.push({});
    }


    let temporaryFields = [];
    let calculatedFields = [];

    // pre-populate arrays with the necesssary raw random values.
    // each of the calls here populate each field value with raw values for all records
    // so, each holdTmpVals[j] is an array that contains all values for a single field.
    for (j = 0; j < config.fields.length; j++) {

      if (config.fields[j].temporary) {
        temporaryFields.push(config.fields[j].name);
      }

      // save any calculated fields along with calculation order
      // if no calculation order is specified, it will be below any fields that do have order specified.
      if (config.fields[j].type === DataSynthUtil.CALCULATED) {
        // if calculated, but no order specified, then assign really large number so sort puts below fields with a value for order.
        calculatedFields.push({name: config.fields[j].name, calculatedOrder: config.fields[j].calculatedOrder || 999999, fieldIdx: j});
      }


      switch (config.fields[j].type) {


        // TODO: make internal functions

        case DataSynthUtil.RANDOM_NUMERIC_RANGE_UNIFORM:
          holdTmpVals[j] = this.getUniform01DistributionVariatesInternal(config.recordsToGenerate);
          break;

        case DataSynthUtil.RANDOM_NUMERIC_RANGE_NORMAL:
          holdTmpVals[j] = this.getNormalDistributionVariatesInternal(config.fields[j].mean, config.fields[j].stDev, config.recordsToGenerate);
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
          holdTmpVals[j] = this.getRandomRangeInternal(0, config.fields[j].list.length - 1 , config.recordsToGenerate);
          break;

        case DataSynthUtil.DATE_IN_PAST_EXACT:
          holdTmpVals[j] = [];

          for (k = 0; k < config.recordsToGenerate; k++) {
            holdTmpVals[j].push( this.getRndDateInPast(0, config.fields[j].daysAgo, true, 1) );
          }

          break;

        case DataSynthUtil.DATE_IN_FUTURE_EXACT:
          holdTmpVals[j] = [];

          for (k = 0; k < config.recordsToGenerate; k++) {
            holdTmpVals[j].push( this.getRndDateInFuture(0, config.fields[j].daysAhead, true, 1) );
          }
          break;

        case DataSynthUtil.DATE_IN_PAST_RANGE:

          holdTmpVals[j] = [];
          tmpRnd =  this.getUniform01DistributionVariatesInternal(config.recordsToGenerate);
          for (k = 0; k < config.recordsToGenerate; k++) {
            holdTmpVals[j].push( this.getRndDateInPast(config.fields[j].minDaysAgo, config.fields[j].maxDaysAgo, false, tmpRnd[k]) );
          }

          break;



        case DataSynthUtil.TIME_TODAY_IN_PAST_RANGE:

          holdTmpVals[j] = [];
          tmpRnd =  this.getUniform01DistributionVariatesInternal(config.recordsToGenerate);
          for (k = 0; k < config.recordsToGenerate; k++) {
            holdTmpVals[j].push( this.getRndDateTimeTodayInPast(config.fields[j].forceBusinessHours || false, tmpRnd[k]) );
          }

          break;


        case DataSynthUtil.DATE_IN_FUTURE_RANGE:
          holdTmpVals[j] = [];
          tmpRnd = this.getUniform01DistributionVariatesInternal(config.recordsToGenerate);
          for (k = 0; k < config.recordsToGenerate; k++) {
            holdTmpVals[j].push( this.getRndDateInFuture(config.fields[j].minDaysAhead, config.fields[j].maxDaysAhead, false, tmpRnd[k]) );
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
            // tmpRnd.push( config.fields[j].list[cntr] );
            tmpRnd.push( cntr );
            cntr++;

            // if we exceed the length of the list, then start over, sequencing it from the beginning.
            if (cntr >= config.fields[j].list.length) { cntr = 0; }
          }

          holdTmpVals[j] = tmpRnd.slice();

          break;


        // no-op; handled by recursing in. . .
        case DataSynthUtil.OBJECT:
          break;

          // create empty array; will be filled below.
        case DataSynthUtil.LOREM_IPSUM:
          tmpRnd = [];



          let paragraphCounts = [];

          // populate an array with randomly selected paragraph counts across all records.
          if (!config.fields[j].singleSentence) {
            paragraphCounts = this.getRandomRangeInternal(config.fields[j].minParagraphs, config.fields[j].maxParagraphs, config.recordsToGenerate);
          }

          // config should contain either paragraphs or sentences; single sentence of true will take precedance over paragraph settings.
          for (k = 0; k < config.recordsToGenerate; k++) {

            // the configuration will be either a single sentence, or 1 or more paragraphs.
            if (config.fields[j].singleSentence) {
              tmpRnd.push(lorem.generateSentences(1));
            } else {
              tmpRnd.push(lorem.generateParagraphs(paragraphCounts[k]));
            }

          }

          holdTmpVals[j] = tmpRnd.slice();
          break;


      }


    }


    // Now, go through and assign final values (to all except calculated fields).
    for (i = 0; i < config.recordsToGenerate; i++) {
      for (j = 0; j < config.fields.length; j++) {

        switch (config.fields[j].type) {

          // if an object, then recurse in and generate the child object data.
          // you must define a 'config' object that contains all of the child obj config.
          // structure is same as for root config obj.

          case DataSynthUtil.OBJECT:
            dataset[i][config.fields[j].name] = me.generateObject(config.fields[j].config);
            break;


          // id's will always (or should) be a direct assignment; no field name arrays or value formatting functions.
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


    // sort by specified calculation order.
    calculatedFields = _.orderBy(calculatedFields, ['calculatedOrder'], ['asc']);

    // a second pass through to assign calculated fields, which can only be done
    // after all of the final values have been assigned to the other fields.
    for (i = 0; i < config.recordsToGenerate; i++) {
      for (j = 0; j < calculatedFields.length; j++) {

          dataset[i][calculatedFields[j].name] = config.fields[calculatedFields[j].fieldIdx].fn(dataset[i], dataset, i);


      }
    }



    if (temporaryFields.length > 0) {

      // Now, remove any fields marked with temporary: true. hidden fields would only be used to help in calculated fields.
      for (i = 0; i < config.recordsToGenerate; i++) {
        for (j = 0; j < temporaryFields.length; j++) {
            delete dataset[i][temporaryFields[j]];
        }
      }
    }



    // if you specify to generate a single record, this will return an object, not an array;
    return dataset.length === 1 ? dataset[0] : dataset;

  }



  // generate an entire data set.
  public generateDataset(config): Observable<any[]> {
    return this.wasmReady.pipe(filter(value => value === true)).pipe(
      map(() => {
        this.module._setSeed(config.seed);

        // start the generation; also handles all recursing into child objects.
        const dataset = this.generateObject(config);

        return dataset;

      })
    );
  }



  public getSimpleNumericIds(min, max, count: number): Observable<number[]> {
    return this.wasmReady.pipe(filter(value => value === true)).pipe(
      map(() => {

        const offset = this.module._getSimpleNumericIds(min, max, count);

        const returnData: number[] = [];
        const typedOffset = offset / Int32Array.BYTES_PER_ELEMENT;

        for (let v = 0; v < count; v++) {
          returnData.push(this.module.HEAP32[typedOffset + v]);
        }

        return returnData;
      })
    );
  }


  private getRandomRangeInternal(min, max, count: number): number[] {
    const offset = this.module._getRandomRange(min, max, count);
    const returnData: number[] = [];
    const typedOffset = offset / Int32Array.BYTES_PER_ELEMENT;

    for (let v = 0; v < count; v++) {
      returnData.push(this.module.HEAP32[typedOffset + v]);
    }

    return returnData;
  }

  public getRandomRange(min, max, count: number): Observable<number[]> {
    return this.wasmReady.pipe(filter(value => value === true)).pipe(
      map(() => {

        return this.getRandomRangeInternal(min, max, count);
      })
    );
  }


  private getLogNormalDistributionVariatesInternal(mu: number, sigma: number, reinterpretParams: boolean, count: number): number[] {
    const offset = this.module._getLogNormalDistributionVariates(mu, sigma, reinterpretParams, count);
    const returnData: number[] = [];

    for (let v = 0; v < count; v++) {
      // normal variate values are returned as doubles
      returnData.push(this.module.HEAPF64[(offset / Float64Array.BYTES_PER_ELEMENT) + v]);
    }

    return returnData;

  }

  public getLogNormalDistributionVariates(mu: number, sigma: number, reinterpretParams: boolean, count: number): Observable<number[]> {

    return this.wasmReady.pipe(filter(value => value === true)).pipe(
      map( () => {

        return this.getLogNormalDistributionVariatesInternal(mu, sigma, reinterpretParams, count);
      } )

    ) ;
  }


  private getNormalDistributionVariatesInternal(mean: number, stDev: number, count: number): number[] {

    const offset = this.module._getNormalDistributionVariates(mean, stDev, count);
    const returnData: number[] = [];

    for (let v = 0; v < count; v++) {
      // normal variate values are returned as doubles
      returnData.push(this.module.HEAPF64[(offset / Float64Array.BYTES_PER_ELEMENT) + v]);
    }

    return returnData;
  }


  public getNormalDistributionVariates(mean: number, stDev: number, count: number): Observable<number[]> {
    return this.wasmReady.pipe(filter(value => value === true)).pipe(
      map(() => {

        return this.getNormalDistributionVariatesInternal(mean, stDev, count);
      })
    );
  }


  private getExponentialDistributionVariatesInternal(lambda: number, count: number): number[] {

    const offset = this.module._getExponentialDistributionVariates(lambda, count);
    const returnData: number[] = [];

    for (let v = 0; v < count; v++) {
      returnData.push(this.module.HEAPF64[(offset / Float64Array.BYTES_PER_ELEMENT) + v]);
    }
    return returnData;
  }

  public getExponentialDistributionVariates(lambda: number, count: number): Observable<number[]> {
    return this.wasmReady.pipe(filter(value => value === true)).pipe(
      map(() => {

        return this.getExponentialDistributionVariatesInternal(lambda, count);

      })
    );
  }



  private getUniform01DistributionVariatesInternal(count: number): number[] {
    const offset = this.module._getUniform01DistributionVariates(count);
    const returnData: number[] = [];

    for (let v = 0; v < count; v++) {
      // normal variate values are returned as doubles
      returnData.push(this.module.HEAPF64[(offset / Float64Array.BYTES_PER_ELEMENT) + v]);
    }

    return returnData;
  }



  // returns uniform 0.0 - 1.0 distribution
  public getUniform01DistributionVariates(count: number): Observable<number[]> {
    return this.wasmReady.pipe(filter(value => value === true)).pipe(
      map(() => {
        return this.getUniform01DistributionVariatesInternal(count);
      })
    );
  }



  // you must already know that you have the module defined to call this.
  private getUUidsInternal(count: number): string[] {

    const offset = this.module._getUuids(count);
    let returnData: string[] = [];

    // NOTE: uuid function from the wasm returns  char pointers; a char is of type uint_8, which is accessed in the heap HEAPU8

    const idStringSize = 36;
    const typedOffset = (offset / Uint8Array.BYTES_PER_ELEMENT);

    let tmp = [];
    for (let i = 0; i < (count * idStringSize); i += idStringSize) {
      tmp = this.module.HEAPU8.slice(typedOffset + i, typedOffset + i + idStringSize);
      returnData.push(_.map(tmp, c => String.fromCharCode(c)).join(''));

    }

    return returnData;
  }


  public getUuids(count: number): Observable<string[]> {
    return this.wasmReady.pipe(filter(value => value === true)).pipe(
      map(() => {

        return this.getUUidsInternal(count);

      })
    );
  }


  public makeIdsForStrings(items: string[]): Observable<number[]> {

    return this.wasmReady.pipe( filter( value => value === true ) ).pipe(

      map(
        () => {

          let returnData: number[] = [];

          // join with char 94, caret; will break back apart inside wasm module
          const itemStr = items.join('\x5e');

          // Init the typed array with the same length as the number of items in the array parameter
          // NOTE: a character is of type Uint8
          const typedArray = new Uint8Array(itemStr.length);

          // Populate the array with the values
          for (let i = 0; i < itemStr.length; i++) {
            typedArray[i] = itemStr.charCodeAt(i);
          }

          // Allocate some space in the heap for the string (which is an array of bytes at this point) (making sure to use the appropriate memory size of the elements)
          const itemsBuffer = this.module._malloc(typedArray.length * Uint8Array.BYTES_PER_ELEMENT);

          // Assign the data to the heap - Keep in mind bytes per element
          this.module['HEAPU8'].set(typedArray, itemsBuffer / Uint8Array.BYTES_PER_ELEMENT);


          const offset = this.module._makeIdsForStrings(itemsBuffer, items.length, 94);

          // the ID's coming back are int32
          const typedOffset = offset / Int32Array.BYTES_PER_ELEMENT;

          for (let v = 0; v < items.length; v++) {
            returnData.push(this.module.HEAP32[typedOffset + v]);
          }


          return returnData;
        })
    );
  }


  private chooseRandomItemWeightedInternal(weights: number[], valueCount: number): number[] {
    let returnData: number[] = [];
    let weightsBuffer;

    try {

      // NOTE: shows how to allocate an array to pass into a webassembly C function that takes an array.

      // Init the typed array with the same length as the number of items in the array parameter
      const typedArray = new Float64Array(weights.length);

      // Populate the array with the values
      for (let i = 0; i < weights.length; i++) {
        typedArray[i] = weights[i];
      }

      // Allocate some space in the heap for the data (making sure to use the appropriate memory size of the elements)
      weightsBuffer = this.module._malloc(typedArray.length * Float64Array.BYTES_PER_ELEMENT);

      // Assign the data to the heap - Keep in mind bytes per element
      // to turn off the forbidden bitwise lint error, in the lint config, do:  "no-bitwise": false,
      this.module['HEAPF64'].set(typedArray, weightsBuffer / Float64Array.BYTES_PER_ELEMENT);

      // call the wasm function; the weightsBuffer is what contains a pointer to our weights, and the wasm module will be able to understand and read that pointer address.
      const offset = this.module._chooseRandomItemWeighted(weightsBuffer, weights.length, valueCount);

      // values coming back are signed ints: int32_t
      const typedOffset = (offset / Int32Array.BYTES_PER_ELEMENT);

      for (let v = 0; v < valueCount; v++) {
        returnData.push(this.module.HEAP32[typedOffset + v]);
      }

    } catch (e) {
      console.log('error', e);
    } finally {

      this.module._free(weightsBuffer);
    }



    return returnData;
  }


  public chooseRandomItemWeighted(weights: number[], valueCount: number): Observable<number[]> {

    return this.wasmReady.pipe( filter(value => value === true)).pipe(
      map( () => {
        return this.chooseRandomItemWeightedInternal(weights, valueCount);
      } )

    );


  }

  public getCharacterIds(count: number): Observable<string[]> {

    return this.wasmReady.pipe( filter(value => value === true) ).pipe(


      map( () => {
          const offset = this.module._getCharacterIds(count);
          let returnData: string[] = [];

          // NOTE: uuid function from the wasm returns  char pointers; a char is of type uint_8, which is accessed in the heap HEAPU8

          const idStringSize = 4;
          const typedOffset = (offset / Uint8Array.BYTES_PER_ELEMENT);

          let tmp = [];
          for (let i = 0; i < (count * idStringSize); i += idStringSize) {
            tmp = this.module.HEAPU8.slice(typedOffset + i, typedOffset + i + idStringSize);
            returnData.push(_.map(tmp, c => String.fromCharCode(c)).join(''));

          }

          return returnData;

        }
      )
    );

  }

  public chooseRandomItems(sourceArraySize, itemsToPick, valueSetCount): Observable<number[]> {

    return this.wasmReady.pipe(filter(value => value === true)).pipe(
      map( () => {

          return this.chooseRandomItemsInternal(sourceArraySize, itemsToPick, valueSetCount);

        }
      )
    );

  }

  // internal; call only when you know wasm module is already instantiated.
  private chooseRandomItemsInternal(sourceArraySize, itemsToPick, valueSetCount): number[] {

    const offset = this.module._chooseRandomItems(sourceArraySize, itemsToPick, valueSetCount);
    const returnData: any[] = [];
    let cntr = -1;

    const typedOffset = (offset / Int32Array.BYTES_PER_ELEMENT);

    // break the 1d array returned by wasm back into a 2d itemsToPick x valueSetCount array.
    for (let i = 0; i < valueSetCount; i++) {
      returnData[i] = [];

      for (let v = 0; v < itemsToPick; v++) {
        cntr++;
        returnData[i].push( this.module.HEAP32[typedOffset + cntr] );
      }
    }

    return returnData;
  }






}

