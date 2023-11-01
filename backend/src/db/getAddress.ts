import prisma from "../config/prisma";
import { responseFn } from "../utils/dynamicReturnFunction";

export const getAddress = async (address: string) => {
  try {
    const result = await prisma.address.findUnique({
      where: {
        address: address.toLowerCase(),
      },
    });
    if (result == null) {
      return responseFn(false, result);
    }
    return responseFn(true, result);
  } catch (error: any) {
    console.error("ERROR - getAddress - " + error.message);
    return responseFn(false, null);
  }
};
