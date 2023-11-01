import prisma from "../config/prisma";
import { responseFn } from "../utils/dynamicReturnFunction";

export const createNewCredential = async ({
  claimId,
  validTill,
  issuedDate,
  addressId,
  daoId,
  previousClaimId,
  previousCredentialId,
}: {
  claimId: string;
  validTill: Date;
  issuedDate: Date;
  addressId: string;
  daoId: string;
  previousClaimId: string | undefined;
  previousCredentialId: string | undefined;
}) => {
  try {
    const data =
      previousCredentialId != undefined && previousClaimId != undefined
        ? {
            claimId,
            validTill,
            issuedDate,
            addressId,
            daoId,
            revoked: false,
            previousClaimId,
            previousCredentialId,
          }
        : {
            claimId,
            validTill,
            issuedDate,
            addressId,
            daoId,
            revoked: false,
          };
    const result = await prisma.polygonIdCredentialIssued.create({
      data: data,
    });
    if (result == null) {
      return responseFn(false, result);
    }
    return responseFn(true, result);
  } catch (error: any) {
    console.error("ERROR - createNewCredential - " + error.message);
    return responseFn(false, null);
  }
};
