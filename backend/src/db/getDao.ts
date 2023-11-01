import prisma from "../config/prisma";
import { responseFn } from "../utils/dynamicReturnFunction";

export const getDao = async (daoKey: string) => {
  try {
    const result = await prisma.dAO.findUnique({
      where: {
        daoKey,
      },
    });
    if (result == null) {
      return responseFn(false, result);
    }
    return responseFn(true, result);
  } catch (error: any) {
    console.error("ERROR - getDao - " + error.message);
    return responseFn(false, null);
  }
};
