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
  chainId: {
    type: Number,
    required: true
  },
  feeAccumulatedInNative: {
    type: String,
    required: true
  },
  feeAccumulatedInUSD: {
    type: Number,
    required: true
  },
  tokenSymbol: {
    type: String,
    required: true
  },
  transactionType: {
    type: String,
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
