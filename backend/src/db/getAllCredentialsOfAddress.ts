import prisma from "../config/prisma";
import { responseFn } from "../utils/dynamicReturnFunction";

export const getAllCredentialsOfAddress = async (address: string) => {
  try {
    const result = await prisma.polygonIdCredentialIssued.findMany({
      where: {
        Address: {
          address: { equals: address, mode: "insensitive" },
        },
      },
      select: {
        claimId: true,
        issuedDate: true,
        DAO: {
          select: {
            daoName: true,
          },
        },
        validTill: true,
        revoked: true,
      },
    });
    if (result == null) {
      return responseFn(false, result);
    }
    return responseFn(true, result);
  } catch (error: any) {
    console.error("ERROR - getAllCredentialsOfAddress - " + error.message);
    return responseFn(false, null);
  }
};
