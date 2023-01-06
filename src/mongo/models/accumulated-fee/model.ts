import mongoose from 'mongoose';
import { AccumulatedFeeSchema } from './schema';

const AccumulatedFee = mongoose.model("AccumulatedFee", AccumulatedFeeSchema);

export { AccumulatedFee };