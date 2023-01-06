import { NetworkBasedGasPriceType } from '../types';
import { GasPriceType } from '../types';

export interface IGasPrice {

  setGasPrice(gasType: GasPriceType, price: string): Promise<void>
  getGasPrice(gasType?: GasPriceType): Promise<NetworkBasedGasPriceType>
  getGasPriceForSimulation(gasType?: GasPriceType): Promise<string>

  setMaxFeeGasPrice(gasType: GasPriceType, price: string): Promise<void>
  getMaxFeeGasPrice(gasType: GasPriceType): Promise<string>

  setMaxPriorityFeeGasPrice(gasType: GasPriceType, price: string): Promise<void>
  getMaxPriorityFeeGasPrice(gasType: GasPriceType): Promise<string>

  getBumpedUpGasPrice(
    pastGasPrice: NetworkBasedGasPriceType,
    bumpingPercentage: number
  ): NetworkBasedGasPriceType
}