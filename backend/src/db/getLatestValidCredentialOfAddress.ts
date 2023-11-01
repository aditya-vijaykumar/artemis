import prisma from "../config/prisma";
import { responseFn } from "../utils/dynamicReturnFunction";

export const getLatestValidCredentialOfAddress = async ({
  address,
  daoKey,
}: {
  address: string;
  daoKey: string;
}) => {
  try {
    const result = await prisma.polygonIdCredentialIssued.findFirst({
      where: {
        Address: {
          address: { equals: address, mode: "insensitive" },
        },
        DAO: {
          daoKey,
        },
        revoked: false,
        validTill: {
          gt: new Date(),
        },
      },
      select: {
        credentialId: true,
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
    console.error(
      "ERROR - getLatestValidCredentialOfAddress - " + error.message
    );
    return responseFn(false, null);
  }
};
