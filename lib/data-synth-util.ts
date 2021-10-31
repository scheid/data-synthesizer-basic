

// Client Side data generation configuration utilities.
export abstract class DataSynthUtil {


  /*
    additional types to add:

       step through / sequence - each record steps through a sequence in a list or a range of numbers. If the end of the list is reached, will start back at end of list.

       types such as SSN, phone numbers, addresses.
  * */

  // The field types; how to generate data for a field

  public static RANDOM_NUMERIC_RANGE_UNIFORM = 0x01;  // values uniformly distributed across a range; all values in the range have equal probability of being selected.
  public static RANDOM_NUMERIC_RANGE_NORMAL = 0x02;  // choose based on a normal frequency distribution, supply mean and std

  public static RANDOM_NUMERIC_RANGE_LOGNORMAL = 0x12;

  public static RANDOM_LIST_WEIGHTED = 0x03;  // picking items from a list need to supply the weights array if using this.
  public static RANDOM_LIST_UNIFORM = 0x04;  // just pick an item from a list; all weights/probabilities equal.
  public static DATE_IN_PAST_EXACT = 0x05;
  public static DATE_IN_FUTURE_EXACT = 0x06;

  // NOTE that decimals are supported in the min and max days values. so a min of 0 and max of 0.5 will be a date/time in the past 12 hours.
  public static DATE_IN_PAST_RANGE = 0x07;
  public static DATE_IN_FUTURE_RANGE = 0x08;
  public static UNIQUE_ID_UUID = 0x09;
  public static UNIQUE_ID_AUTOINCREMENT = 0x0a;

  public static OBJECT = 0x0c;  // indicates that the field should be recursed into to generate child object data.

  // choose values based on an exponential frequency distribution.
  public static RANDOM_NUMERIC_RANGE_EXPONENTIAL = 0x0d;

  // you would use this if the field value was calculated completely from one or more other field values on the same record.
  // this type of field is handled differently in that all other field values will be calculated first,
  // and this field would be calculated in somewhat of a second pass through the values.
  public static CALCULATED = 0x0e;

  // will be sequence of items from a list
  public static SEQUENCE_LIST = 0x13;


  // not sure if useful; just to assign a constant string or number to this field for all records
  // public static CONSTANT = 0x0f;

  // useful if you have a list of items that you want to choose n items from,
  // and ensure the same item is only picked once, like picking cards from a deck.
  // you will need to supply a list/array to choose from, and the n items selected will be put into an array.
  public static N_RANDOM_ITEMS_FROM_LIST = 0x10;

  // get today's date and a random time; you can optionally force to be during business hours.
  public static TIME_TODAY_IN_PAST_RANGE = 0x11;


  public static LOREM_IPSUM = 0x14;

}
