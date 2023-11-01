import prisma from "../config/prisma";
import { responseFn } from "../utils/dynamicReturnFunction";

export const createNewAddress = async (address: string) => {
  try {
    const result = await prisma.address.create({
      data: {
        address: address.toLowerCase(),
      },
    });
    if (result == null) {
      return responseFn(false, result);
    }
    return responseFn(true, result);
  } catch (error: any) {
    console.error("ERROR - createNewAddress -  " + error.message);
    return responseFn(false, null);
  }
};
