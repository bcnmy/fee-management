import { ethers } from "ethers";
import { config } from "../config";
import { NetworkParams } from "../types";
import { INetwork } from "./interface/INetwork";
export class Network implements INetwork {

  provider: ethers.providers.JsonRpcProvider;
  liquidityPoolAddress: string;

  constructor(networkParams: NetworkParams){
    this.provider = networkParams.provider;
    this.liquidityPoolAddress = networkParams.liquidityPoolAddress; 
  }

  getLiquidityPoolInstance (): ethers.Contract {
    const lpContractInstance = new ethers.Contract(
      this.liquidityPoolAddress, 
      config.hyphenBridgeAbi, 
      this.provider
    );

    return lpContractInstance;
  }
}