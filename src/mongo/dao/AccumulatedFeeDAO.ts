import { AccumulatedFee } from '../models/accumulated-fee';
import { log } from '../../logs';
import { formatMessage, stringify } from '../../utils/common-utils';
import { config } from '../../config';
export class AccumulatedFeeDAO {

  async getOne(searchParams: {}) {
    log.info(`Get AccumulatedFee data with params ${stringify(searchParams)}`);
    try {
      let result: any;

      if (searchParams) {
        const getUnique: JSON = await AccumulatedFee.findOne(searchParams);

        if (getUnique) {
          result = formatMessage(config.RESPONSE_CODES.SUCCESS, 'AccumulatedFee data fetched successfully');
          result.accumulatedFeeData = getUnique;
          log.info(`AccumulatedFee found in db with id ${result.accumulatedFeeData._id}`);
        } else {
          log.info(`No Data found in DB with searchParam: ${searchParams}`);
          result = formatMessage(config.RESPONSE_CODES.NOT_FOUND, 'Not Found');
        }
      } else {
        result = formatMessage(config.RESPONSE_CODES.BAD_REQUEST, `searchParams is either not valid or not in correct format`);
        log.error(`AccumulatedFee.findOne response: ${stringify(result)}`);
        throw new Error(`AccumulatedFee.findOne response: ${stringify(result)}`);
      }

      return result;
    } catch (error: any) {
      log.error(stringify(error.message ? error.message : error));
      throw new Error(`Error while getting accumulatedFee data from  db`);
    }
  }

  async add(fieldsToAdd: {}) {
    let response: any;

    try {
      log.info(`AccumulatedFee db Fields to be added : ${stringify({ ...fieldsToAdd })}`);
      const accumulatedFee = new AccumulatedFee({ ...fieldsToAdd });
      const dbObject = await accumulatedFee.save();
      response = formatMessage(config.RESPONSE_CODES.SUCCESS, 'Added Successfully');
      response.dbObject = dbObject;
      log.info(`Fields Added Successfully into AccumulatedFee`);
    } catch (error: any) {
      log.error(stringify(error.message ? error.message : error));
      throw new Error(
        `Error while adding to AccumulatedFee, Fields to be added : ${stringify({ ...fieldsToAdd })}`
      );
    }
    return response;
  }

  async update(fieldsToUpdate: {}, accumulatedFeeId: string) {
    try {
      log.info(`Update Withdraw data with id ${accumulatedFeeId} and data ${stringify(fieldsToUpdate)}`);

      let result;
      if (accumulatedFeeId && fieldsToUpdate) {
        const updatePair = await AccumulatedFee.findByIdAndUpdate(
          { _id: accumulatedFeeId },
          { $set: fieldsToUpdate },
          { new: true }
        );

        log.info(`AccumulatedFee successfully updated`);
        result = formatMessage(config.RESPONSE_CODES.SUCCESS, 'AccumulatedFee updated successfully');
      } else {
        result = formatMessage(
          config.RESPONSE_CODES.EXPECTATION_FAILED,
          `accumulatedFeeId is not defined or fieldsToUpdate is not in correct format`
        );
        throw new Error(`AccumulatedFee.findByIdAndUpdate response: ${stringify(result)}`);
      }

      log.info(`AccumulatedFee.update response: ${stringify(result)}`);

      return result;
    } catch (error: any) {
      log.error(stringify(error.message ? error.message : error));
      throw new Error(`Error while updating data in AccumulatedFee db`);
    }
  }
}
