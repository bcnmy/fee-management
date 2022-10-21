import mongoose from "mongoose";
import { IAccumulatedFee } from '../../interface/IAccumulatedFee';

const { Schema } = mongoose;

export const AccumulatedFeeSchema = new Schema<IAccumulatedFee>({

  startTime: {
    type: Number,
    required: true
  },
  endTime: {
    type: Number,
  },
  network: {
    type: Number,
    required: true
  },
  feeAccumulated: {
    type: Number,
    required: true
  },
  status: { // Failed, Pending, Processed
    type: String,
    required: true
  },
  createdOn: {
    type: Number,
    required: true
  },
  updatedOn: {
    type: Number,
  }
});
