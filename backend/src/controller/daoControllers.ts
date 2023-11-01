import { Request, Response } from "express";
import {
  internalServerError,
  responseInvalidArgumentsError,
  responseSuccess,
} from "../utils/serverResponses";
import httpStatusCodes from "../config/httpStatusCodes";
import { getAllDao } from "../db/getAllDaos";
import Joi from "joi";
import { createNewDao } from "../db/createNewDao";

export const fetchAllDao = async (req: Request, res: Response) => {
  const functionName = "fetchCredentialsOfAddress";
  try {
    const daoData = await getAllDao();

    if (!daoData.status) {
      return internalServerError(
        res,
        "Something went wrong, please try again later."
      );
    }
    return responseSuccess(res, httpStatusCodes.OK, daoData, "");
  } catch (error: any) {
    console.error(functionName + error.message + JSON.stringify(req));
    return internalServerError(res, error);
  }
};

export const createDao = async (req: Request, res: Response) => {
  const functionName = "fetchCredentialsOfAddress";
  try {
    const validation = Joi.object({
      daoName: Joi.string().required().min(3),
      daoKey: Joi.string().required().min(3),
      contractAddress: Joi.string().required().min(42),
      chainId: Joi.number().integer().required(),
    });

    const responseValidation = validation.validate(req.body);
    if (responseValidation.error) {
      return responseInvalidArgumentsError(res, responseValidation);
    }

    const createDao = await createNewDao({
      daoName: req.body.daoName,
      daoKey: req.body.daoKey,
      contractAddress: req.body.contractAddress,
      chainId: req.body.chainId,
    });

    if (!createDao.status) {
      return internalServerError(
        res,
        "Something went wrong, please try again later."
      );
    }
    return responseSuccess(res, httpStatusCodes.OK, createDao, "");
  } catch (error: any) {
    console.error(functionName + error.message + JSON.stringify(req));
    return internalServerError(res, error);
  }
};
