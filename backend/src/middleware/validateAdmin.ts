import { Response, NextFunction, Request } from "express";
import { internalServerError, requestFailed } from "../utils/serverResponses";
import httpStatusCodes from "../config/httpStatusCodes";

export const validateAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const functionName = "validateAdmin";
  try {
    const headerKey = req.header("x-api-key") || "";

    if (headerKey == null || headerKey == undefined) {
      return requestFailed(
        res,
        httpStatusCodes.UNAUTHORIZED,
        "Unauthorized, access key is not provided"
      );
    }
    const adminKey = process.env.ADMIN_API_SECRET;

    if (adminKey != headerKey) {
      return requestFailed(
        res,
        httpStatusCodes.UNAUTHORIZED,
        "Unauthorized, api key is not valid"
      );
    }

    return next();
  } catch (error: any) {
    console.error(functionName + error.message);
    return internalServerError(res, error.message);
  }
};
