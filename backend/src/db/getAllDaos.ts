import prisma from "../config/prisma";
import { responseFn } from "../utils/dynamicReturnFunction";

export const getAllDao = async () => {
  try {
    const result = await prisma.dAO.findMany();
    if (result == null) {
      return responseFn(false, result);
    }
    return responseFn(true, result);
  } catch (error: any) {
    console.error("ERROR - getAllDao - " + error.message);
    return responseFn(false, null);
  }
};
