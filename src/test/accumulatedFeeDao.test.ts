import { AccumulatedFeeDAO } from "../mongo/dao";
import { Mode } from "../types";
import { config } from '../config';
import { AccumulatedFee } from "../mongo/models/accumulated-fee";

describe('Transaction Service: Sending Transaction on chainId: 5', () => {

    let accumulatedFeeDao: AccumulatedFeeDAO;
    beforeAll(async () => {
        accumulatedFeeDao = new AccumulatedFeeDAO();
    })
    afterEach(async () => {
        jest.resetAllMocks();
    });

    it('getOne() returns Data', async () => {

        let mockDBResponse = {
            feeAccumulatedInNative: 5,
            feeAccumulatedInUSD: 100
        }
        jest.spyOn(AccumulatedFee, "findOne").mockImplementation(() => Promise.resolve(mockDBResponse))

        expect(await accumulatedFeeDao.getOne(
            { chainId: 5, transactionType: Mode.SINGLE_CHAIN, status: config.FEE_CONVERSION_DB_STATUSES.PENDING }
        )).toEqual({
            code: 200,
            message: 'AccumulatedFee data fetched successfully',
            accumulatedFeeData: { feeAccumulatedInNative: 5, feeAccumulatedInUSD: 100 }
        });
    });

    it('getOne() returns Data NOT FOUND', async () => {

        jest.spyOn(AccumulatedFee, "findOne").mockImplementation(() => Promise.resolve())

        expect(await accumulatedFeeDao.getOne(
            { chainId: 5, transactionType: Mode.SINGLE_CHAIN, status: config.FEE_CONVERSION_DB_STATUSES.PENDING }
        )).toEqual({
            "code": 404,
            "message": "Not Found"
        });
    });

    it('getOne(): searchParams is either not valid or not in correct format', async () => {

        jest.spyOn(AccumulatedFee, "findOne").mockImplementation(() => Promise.resolve())

        expect(await accumulatedFeeDao.getOne({})).toEqual({
            "code": 400,
            "message": "searchParams is either not valid or not in correct format"
        });
    });

    it('getOne(): Throws error', async () => {

        jest.spyOn(AccumulatedFee, "findOne").mockImplementation(() => { throw new Error("Error") })

        await expect(accumulatedFeeDao.getOne(
            { chainId: 5, transactionType: Mode.SINGLE_CHAIN, status: config.FEE_CONVERSION_DB_STATUSES.PENDING }
        )).rejects.toThrow();
    });

    // test cases for add()

    it('add() returns Data', async () => {

        let mockDBResponse = {
            feeAccumulatedInNative: 5,
            feeAccumulatedInUSD: 100
        }
        jest.spyOn(AccumulatedFee.prototype, "save").mockImplementation(() => Promise.resolve(mockDBResponse))

        expect(await accumulatedFeeDao.add(
            {
                startTime: 12345,
                feeAccumulatedInNative: 1,
                feeAccumulatedInUSD: 1,
                tokenSymbol: "USDC",
                chainId: 5,
                status: config.FEE_CONVERSION_DB_STATUSES.PENDING,
                createdOn: 1233,
                transactionType: Mode.SINGLE_CHAIN
            }
        )).toEqual({
            code: 200,
            message: 'Added Successfully',
            dbObject: { feeAccumulatedInNative: 5, feeAccumulatedInUSD: 100 }
        });
    });

    it('add() throws error', async () => {

        jest.spyOn(AccumulatedFee.prototype, "save").mockImplementation(() => { throw new Error("Error") });

        await expect(accumulatedFeeDao.add(
            {
                startTime: 12345,
                feeAccumulatedInNative: 1,
                feeAccumulatedInUSD: 1,
                tokenSymbol: "USDC",
                chainId: 5,
                status: config.FEE_CONVERSION_DB_STATUSES.PENDING,
                createdOn: 1233,
                transactionType: Mode.SINGLE_CHAIN
            }
        )).rejects.toThrow();
    });

    // test cases for add()

    it('update(): success', async () => {

        let mockDBResponse = {
            feeAccumulatedInNative: 5,
            feeAccumulatedInUSD: 100
        }
        jest.spyOn(AccumulatedFee, "findByIdAndUpdate").mockImplementation(() => Promise.resolve(mockDBResponse))

        expect(await accumulatedFeeDao.update(
            {
                startTime: 12345,
                feeAccumulatedInNative: 1,
                feeAccumulatedInUSD: 1,
                tokenSymbol: "USDC",
                chainId: 5,
                status: config.FEE_CONVERSION_DB_STATUSES.PENDING,
                createdOn: 1233,
                transactionType: Mode.SINGLE_CHAIN
            },
            "1234"
        )).toEqual(
            { "code": 200, "message": "AccumulatedFee updated successfully" }
        );
    });

    it('update(): returns accumulatedFeeId is not defined or fieldsToUpdate is not in correct format', async () => {

        let mockDBResponse = {
            feeAccumulatedInNative: 5,
            feeAccumulatedInUSD: 100
        }
        jest.spyOn(AccumulatedFee, "findByIdAndUpdate").mockImplementation(() => Promise.resolve(mockDBResponse))

        expect(await accumulatedFeeDao.update(
            {
                startTime: 12345,
                feeAccumulatedInNative: 1,
                feeAccumulatedInUSD: 1,
                tokenSymbol: "USDC",
                chainId: 5,
                status: config.FEE_CONVERSION_DB_STATUSES.PENDING,
                createdOn: 1233,
                transactionType: Mode.SINGLE_CHAIN
            },
            ""
        )).toEqual(
            {
                "code": 417,
                "message": "accumulatedFeeId is not defined or fieldsToUpdate is not in correct format"
            }
        );
    });

    it('update() throws error', async () => {

        jest.spyOn(AccumulatedFee, "findByIdAndUpdate").mockImplementation(() => { throw new Error("Error") });

        await expect(accumulatedFeeDao.update(
            {
                startTime: 12345,
            },
            "1234"
        )).rejects.toThrow();
    });


})