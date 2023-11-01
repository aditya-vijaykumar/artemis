import prisma from "../config/prisma";
import { responseFn } from "../utils/dynamicReturnFunction";

export const createNewDao = async ({
  daoKey,
  daoName,
  contractAddress,
  chainId,
}: {
  daoKey: string;
  daoName: string;
  contractAddress: string;
  chainId: number;
}) => {
  try {
    const result = await prisma.dAO.create({
      data: {
        daoKey,
        daoName,
        contractAddress,
        chainId,
      },
    });
    if (result == null) {
      return responseFn(false, result);
    }
    return responseFn(true, result);
  } catch (error: any) {
    console.error("ERROR - createNewDao- " + error.message);
    return responseFn(false, null);
  }
};
