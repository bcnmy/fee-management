import { AccumulatedFee } from "../models/accumulated-fee";
import { log } from "../../logs";
import { formatMessage } from '../../utils/common-utils';
import { RESPONSE_CODES } from '../../config';

export class AccumulatedFeeDAO {

  async getOne(searchParams: {}) {
    log.info(`Get BurnTransactions data with params ${JSON.stringify(searchParams)}`);
    try {
      let result;

      if (searchParams) {
        const getUnique: JSON = await AccumulatedFee.findOne(searchParams);

        if (getUnique) {
          result = formatMessage(RESPONSE_CODES.SUCCESS, "AccumulatedFee data fetched successfully");
          result.accumulatedFeeData = getUnique;
          log.info(`AccumulatedFee found in db with id ${result.accumulatedFeeData._id}`);
        } else {
          result = formatMessage(RESPONSE_CODES.NOT_FOUND, "Not Found");
          throw new Error(`AccumulatedFee.findOne response: ${JSON.stringify(result)}`);
        }
      } else {
        result = formatMessage(RESPONSE_CODES.BAD_REQUEST, `searchParams is either not valid or not in correct format`);
        throw new Error(`AccumulatedFee.findOne response: ${JSON.stringify(result)}`);
      }

      return result;
    } catch (error) {
      log.error(`Error while getting accumulatedFee data from  db`);
      log.error(JSON.stringify(error));
      throw new Error(JSON.stringify(error));
    }
  }

  async add(fieldsToAdd: {}) {
    let response;

    try {
      log.info(`AccumulatedFee db Fields to be added : ${JSON.stringify({ ...fieldsToAdd })}`);
      const accumulatedFee = new AccumulatedFee({ ...fieldsToAdd });
      const dbObject = await accumulatedFee.save();
      response = formatMessage(RESPONSE_CODES.SUCCESS, "Added Successfully");
      response.dbObject = dbObject;
      log.info(`Fields Added Successfully into AccumulatedFee`);
    }
    catch (error) {
      log.error(`Error while adding to AccumulatedFee, Fields to be added : ${JSON.stringify({ ...fieldsToAdd })}`);
      log.error(JSON.stringify(error));
      throw new Error(JSON.stringify(error));
    }
    return response;
  }

  async update(fieldsToUpdate: {}, accumulatedFeeId: string) {
    try {
          log.info(`Update Withdraw data with id ${accumulatedFeeId} and data ${JSON.stringify(fieldsToUpdate)}`);

        let result;
        if (accumulatedFeeId && fieldsToUpdate) {
            const updatePair = await AccumulatedFee.findByIdAndUpdate(
                { _id: accumulatedFeeId },
                { $set: fieldsToUpdate },
                { new: true }
            );

            log.info(`AccumulatedFee successfully updated`);
            result = formatMessage(RESPONSE_CODES.SUCCESS, "AccumulatedFee updated successfully");
        } else {
            result = formatMessage(RESPONSE_CODES.EXPECTATION_FAILED, `accumulatedFeeId is not defined or fieldsToUpdate is not in correct format`);
        }

        log.info(`AccumulatedFee.update response: ${JSON.stringify(result)}`);

        return result;
    } catch (error) {
        log.error(`Error while updating data in AccumulatedFee db`);
        log.error(JSON.stringify(error))
        throw error;
    }
};
}